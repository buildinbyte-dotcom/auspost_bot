'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'stopping' | 'error';
type Speaker = 'caller' | 'assistant' | 'system';

interface HistoryItem {
  id: string;
  speaker: Speaker;
  text: string;
  timestamp: number;
}

interface RealtimeSessionResponse {
  value?: string;
  client_secret?: {
    value?: string;
  };
}

const HISTORY_WINDOW_MS = 5 * 60 * 1000;

function getClientSecret(data: RealtimeSessionResponse) {
  return data.value || data.client_secret?.value || '';
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(timestamp);
}

export default function VoicePage() {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [connectionLabel, setConnectionLabel] = useState('Ready');
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const appendHistory = useCallback((speaker: Speaker, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const now = Date.now();
    setHistory((items) => [
      ...items.filter((item) => now - item.timestamp <= HISTORY_WINDOW_MS),
      {
        id: `${speaker}-${now}-${crypto.randomUUID()}`,
        speaker,
        text: trimmed,
        timestamp: now,
      },
    ]);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      setHistory((items) => items.filter((item) => now - item.timestamp <= HISTORY_WINDOW_MS));
    }, 15_000);

    return () => window.clearInterval(interval);
  }, []);

  const stopSession = useCallback(() => {
    setStatus('stopping');

    dataChannelRef.current?.close();
    dataChannelRef.current = null;

    peerConnectionRef.current?.getSenders().forEach((sender) => sender.track?.stop());
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    setConnectionLabel('Ready');
    setStatus('idle');
  }, []);

  useEffect(() => stopSession, [stopSession]);

  const handleRealtimeEvent = useCallback((event: MessageEvent<string>) => {
    let payload: { type?: string; transcript?: string; text?: string; error?: { message?: string } };

    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }

    if (payload.type === 'conversation.item.input_audio_transcription.completed') {
      appendHistory('caller', payload.transcript || '');
      return;
    }

    if (payload.type === 'response.audio_transcript.done' || payload.type === 'response.output_text.done') {
      appendHistory('assistant', payload.transcript || payload.text || '');
      return;
    }

    if (payload.type === 'error') {
      setError(payload.error?.message || 'Realtime session error.');
      setStatus('error');
    }
  }, [appendHistory]);

  const startSession = useCallback(async () => {
    if (status === 'connecting' || status === 'connected') return;

    setStatus('connecting');
    setConnectionLabel('Creating OpenAI session');
    setError('');

    try {
      const tokenResponse = await fetch('/api/openai/realtime-session', { method: 'POST' });
      const tokenData = (await tokenResponse.json()) as RealtimeSessionResponse & { error?: string };

      if (!tokenResponse.ok) {
        throw new Error(tokenData.error || 'Could not create OpenAI Realtime session.');
      }

      const clientSecret = getClientSecret(tokenData);
      if (!clientSecret) {
        throw new Error('OpenAI did not return a Realtime client secret.');
      }

      setConnectionLabel('Requesting microphone');
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = localStream;

      const peerConnection = new RTCPeerConnection();
      peerConnectionRef.current = peerConnection;

      peerConnection.onconnectionstatechange = () => {
        setConnectionLabel(peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          setStatus('connected');
        } else if (peerConnection.connectionState === 'failed') {
          setStatus('error');
          setError('WebRTC connection failed.');
        }
      };

      peerConnection.ontrack = (trackEvent) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = trackEvent.streams[0];
        }
      };

      localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

      const dataChannel = peerConnection.createDataChannel('oai-events');
      dataChannelRef.current = dataChannel;
      dataChannel.addEventListener('message', handleRealtimeEvent);
      dataChannel.addEventListener('open', () => {
        appendHistory('system', 'Connected. Ask an Australia Post question by voice.');
        dataChannel.send(JSON.stringify({
          type: 'response.create',
          response: {
            output_modalities: ['audio'],
            instructions: 'Briefly greet the caller as the Australia Post voice assistant and ask how you can help.',
          },
        }));
      });

      setConnectionLabel('Connecting WebRTC');
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      const sdpResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(await sdpResponse.text());
      }

      await peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: await sdpResponse.text(),
      });
    } catch (startError) {
      stopSession();
      setStatus('error');
      setConnectionLabel('Error');
      setError(startError instanceof Error ? startError.message : 'Voice session failed.');
    }
  }, [appendHistory, handleRealtimeEvent, status, stopSession]);

  const isRunning = status === 'connecting' || status === 'connected';

  return (
    <main className="min-h-screen bg-[#f7f2ea] text-[#241c15]">
      <audio ref={remoteAudioRef} autoPlay />

      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6">
        <header className="flex items-center justify-between gap-4 border-b border-[#d9cfc0] pb-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#c41230]">Australia Post prototype</p>
            <h1 className="mt-1 text-3xl font-black">OpenAI Voice Chat</h1>
          </div>
          <Link
            href="/"
            className="rounded-md border border-[#c9bdae] px-3 py-2 text-sm font-semibold text-[#5b5148] transition hover:bg-white"
          >
            Story app
          </Link>
        </header>

        <div className="grid flex-1 gap-6 py-6 md:grid-cols-[320px_1fr]">
          <aside className="flex flex-col gap-4">
            <div className="rounded-lg border border-[#d9cfc0] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#6c6258]">Status</span>
                <span className="rounded-full bg-[#f2e8d8] px-3 py-1 text-xs font-bold uppercase text-[#6c4d16]">
                  {connectionLabel}
                </span>
              </div>

              <button
                onClick={isRunning ? stopSession : startSession}
                disabled={status === 'stopping'}
                className={`mt-6 h-14 w-full rounded-md text-base font-black text-white transition ${
                  isRunning ? 'bg-[#5b5148] hover:bg-[#463d36]' : 'bg-[#c41230] hover:bg-[#a90f28]'
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {isRunning ? 'Stop voice chat' : 'Start voice chat'}
              </button>

              <p className="mt-4 text-sm leading-6 text-[#6c6258]">
                Uses your microphone and plays the model reply as live audio. The visible transcript is kept to the last five minutes.
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-[#efb1b8] bg-[#fff4f5] p-4 text-sm font-medium leading-6 text-[#8a1023]">
                {error}
              </div>
            )}
          </aside>

          <section className="flex min-h-[520px] flex-col rounded-lg border border-[#d9cfc0] bg-white shadow-sm">
            <div className="border-b border-[#eee6dc] px-5 py-4">
              <h2 className="text-lg font-black">Last five minutes</h2>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {history.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center text-sm leading-6 text-[#7a7169]">
                  Start the voice chat, allow microphone access, then ask something like:
                  <br />
                  “Where can I collect a missed parcel?”
                </div>
              ) : (
                history.map((item) => (
                  <article
                    key={item.id}
                    className={`rounded-lg border p-4 ${
                      item.speaker === 'caller'
                        ? 'border-[#ffd6a8] bg-[#fff8ef]'
                        : item.speaker === 'assistant'
                          ? 'border-[#d9e7ff] bg-[#f3f8ff]'
                          : 'border-[#e7e0d7] bg-[#faf7f2]'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-xs font-black uppercase tracking-[0.12em] text-[#6c6258]">
                        {item.speaker === 'caller' ? 'Caller' : item.speaker === 'assistant' ? 'Assistant' : 'System'}
                      </span>
                      <time className="text-xs text-[#8d8379]">{formatTime(item.timestamp)}</time>
                    </div>
                    <p className="text-sm leading-6">{item.text}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
