'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';

const KoalaMascot = dynamic(() => import('./components/KoalaMascot'), {
  ssr: false,
  loading: () => (
    <div className="mascot-loading">
      <div className="mascot-loading-pulse" />
    </div>
  ),
});

// ── Types ────────────────────────────────────────────────────────────────────

type Phase = 'booting' | 'idle' | 'listening' | 'thinking' | 'speaking';

interface VoucherData {
  code: string;
  reward: string;
  description: string;
  icon: string;
  storyTitle: string;
  expiryDate: string;
  validAt: string;
}

// ── Confetti ──────────────────────────────────────────────────────────────────

const CONFETTI = [
  { color: '#FFD700', size: 14, left: '7%',  anim: 'animate-confetti-1' },
  { color: '#FF6B9D', size: 10, left: '20%', anim: 'animate-confetti-2' },
  { color: '#7C5CFC', size: 8,  left: '36%', anim: 'animate-confetti-3' },
  { color: '#00D4AA', size: 12, left: '50%', anim: 'animate-confetti-4' },
  { color: '#FFD700', size: 9,  left: '64%', anim: 'animate-confetti-5' },
  { color: '#FF6B9D', size: 14, left: '78%', anim: 'animate-confetti-6' },
  { color: '#7C5CFC', size: 11, left: '88%', anim: 'animate-confetti-7' },
  { color: '#00D4AA', size: 8,  left: '14%', anim: 'animate-confetti-8' },
];

// ── Speech Bubble ─────────────────────────────────────────────────────────────

function SpeechBubble({ text, visible }: { text: string; visible: boolean }) {
  if (!visible || !text) return null;
  return (
    <div className="speech-bubble-container animate-slide-up">
      <div className="speech-bubble">
        <div className="speech-bubble-tail" />
        <p className="speech-bubble-text">{text}</p>
      </div>
    </div>
  );
}

// ── Thinking Indicator ────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <div className="thinking-container">
      <div className="thinking-bubble">
        <span className="thinking-label">Kody is thinking</span>
        <span className="thinking-dot animate-dot-1" />
        <span className="thinking-dot animate-dot-2" />
        <span className="thinking-dot animate-dot-3" />
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function Home() {
  const [phase, setPhase]               = useState<Phase>('booting');
  const [isTalking, setIsTalking]       = useState(false);
  const [speakingText, setSpeakingText] = useState('');
  const [bubble, setBubble]             = useState('');
  const [voucher, setVoucher]           = useState<VoucherData | null>(null);
  const [showVoucher, setShowVoucher]   = useState(false);
  const [inConversation, setInConversation] = useState(false);

  const pcRef         = useRef<RTCPeerConnection | null>(null);
  const dcRef         = useRef<RTCDataChannel | null>(null);
  const audioRef      = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const transcriptRef  = useRef('');
  const processedToolCallsRef = useRef<Set<string>>(new Set());

  // Use a ref for the event handler so it always has fresh state without stale closures
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onDataEventRef = useRef<(event: Record<string, any>) => void>(() => {});

  // ── Prize claim ────────────────────────────────────────────────────────────

  const handlePrizeClaim = useCallback(async (callId: string) => {
    if (processedToolCallsRef.current.has(callId)) return;
    processedToolCallsRef.current.add(callId);
    console.log('[realtime] tool call: claim_prize_code, callId:', callId);

    const res = await fetch('/api/prize/claim', { method: 'POST' });
    const data = await res.json();
    console.log('[realtime] prize claim result:', data);

    const dc = dcRef.current;
    if (dc?.readyState === 'open') {
      dc.send(JSON.stringify({
        type: 'conversation.item.create',
        item: { type: 'function_call_output', call_id: callId, output: JSON.stringify(data) },
      }));
      dc.send(JSON.stringify({ type: 'response.create', response: { output_modalities: ['audio'] } }));
    }

    if (data.status === 'won') {
      const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU');
      setVoucher({
        code: data.code,
        reward: 'Quiz Champion Reward',
        description: 'You answered all quiz questions correctly!',
        icon: '🏆',
        storyTitle: 'Australia Post Quiz',
        expiryDate: expiry,
        validAt: 'Any Australia Post store',
      });
      setShowVoucher(true);
    }
  }, []);

  // ── Data channel event handler (via ref so it always has latest state) ─────

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onDataEventRef.current = (event: Record<string, any>) => {
      const type = event.type as string;

      switch (type) {
        case 'session.created':
          console.log('[realtime] ✅ session created');
          break;

        case 'input_audio_buffer.speech_started':
          console.log('[realtime] 🎤 user started speaking');
          setPhase('listening');
          setBubble('');
          break;

        case 'input_audio_buffer.speech_stopped':
          console.log('[realtime] 🎤 user stopped speaking');
          setPhase('thinking');
          break;

        case 'conversation.item.input_audio_transcription.completed':
          console.log('[realtime] 👤 user said:', event.transcript);
          break;

        case 'response.audio.delta':
          setIsTalking(true);
          setPhase('speaking');
          break;

        case 'response.audio_transcript.delta':
          transcriptRef.current += (event.delta as string) || '';
          setSpeakingText(transcriptRef.current);
          setBubble(transcriptRef.current);
          break;

        case 'response.audio_transcript.done':
          console.log('[realtime] 🐨 Kody said:', event.transcript);
          transcriptRef.current = '';
          setSpeakingText('');
          break;

        case 'response.audio.done':
          setIsTalking(false);
          break;

        case 'response.done':
          console.log('[realtime] ✅ response done');
          setIsTalking(false);
          setPhase('idle');
          setBubble('');
          break;

        case 'response.function_call_arguments.done':
          if (event.name === 'claim_prize_code') {
            handlePrizeClaim((event.call_id as string) || '');
          }
          break;

        case 'error':
          console.error('[realtime] ❌ error:', event.error);
          setPhase('idle');
          break;

        default:
          // Uncomment below to see all events:
          // console.log('[realtime] event:', type, event);
          break;
      }
    };
  }, [handlePrizeClaim]);

  // ── Stop session ──────────────────────────────────────────────────────────

  const stopSession = useCallback(() => {
    dcRef.current?.close();
    dcRef.current = null;
    pcRef.current?.getSenders().forEach((s) => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (audioRef.current) audioRef.current.srcObject = null;
    setInConversation(false);
    setIsTalking(false);
    setSpeakingText('');
    setBubble('');
    setPhase('idle');
    transcriptRef.current = '';
    console.log('[realtime] session stopped');
  }, []);

  // ── Start WebRTC session ───────────────────────────────────────────────────

  const startSession = useCallback(async () => {
    try {
      // 1. Get ephemeral token from server
      console.log('[realtime] requesting session token...');
      const res = await fetch('/api/openai/realtime-session', { method: 'POST' });
      const tokenData = await res.json();

      if (!res.ok) {
        throw new Error(tokenData.error || 'Could not create OpenAI Realtime session.');
      }

      const token = tokenData.value || tokenData.client_secret?.value || '';
      console.log('[realtime] token received');

      if (!token) {
        throw new Error('OpenAI did not return a Realtime client secret.');
      }

      // 2. Get mic
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = localStream;

      // 3. Setup WebRTC
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.onconnectionstatechange = () => {
        console.log('[realtime] connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') setPhase('idle');
        if (pc.connectionState === 'failed') { setPhase('idle'); stopSession(); }
      };

      pc.ontrack = (e) => {
        console.log('[realtime] 🔊 remote audio track');
        if (audioRef.current) audioRef.current.srcObject = e.streams[0];
      };

      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

      // 4. Data channel
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.addEventListener('message', (e) => onDataEventRef.current(JSON.parse(e.data)));
      dc.addEventListener('open', () => {
        console.log('[realtime] data channel open — triggering greeting');
        processedToolCallsRef.current.clear();
        setPhase('thinking');
        dc.send(JSON.stringify({
          type: 'response.create',
          response: {
            output_modalities: ['audio'],
            instructions: 'Start the kiosk experience now. Say "Hi, I am the Australia Post Koala", greet the child warmly, and offer exactly three choices: story, quiz, or chat.',
          },
        }));
      });

      // 5. SDP exchange — uses /v1/realtime/calls with the ephemeral token
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log('[realtime] exchanging SDP...');
      const sdpRes = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      });

      if (!sdpRes.ok) throw new Error(await sdpRes.text());

      await pc.setRemoteDescription({ type: 'answer', sdp: await sdpRes.text() });
      console.log('[realtime] ✅ WebRTC connected');

    } catch (err) {
      console.error('[realtime] error:', err);
      stopSession();
      setPhase('idle');
    }
  }, [stopSession]);

  // ── Mic button click ──────────────────────────────────────────────────────

  const handleMicClick = useCallback(async () => {
    if (inConversation) {
      stopSession();
    } else {
      setInConversation(true);
      setPhase('booting');
      await startSession();
    }
  }, [inConversation, startSession, stopSession]);

  // ── Boot ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const t = setTimeout(() => setPhase('idle'), 1200);
    return () => clearTimeout(t);
  }, []);

  // ── Reset ─────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    stopSession();
    setVoucher(null);
    setShowVoucher(false);
    setTimeout(() => setPhase('idle'), 400);
  }, [stopSession]);

  // ═══════════════════════════════════════════════════════════════════════════
  // VOUCHER SCREEN
  // ═══════════════════════════════════════════════════════════════════════════

  if (showVoucher && voucher) {
    return (
      <div className="app-screen voucher-screen">
        {CONFETTI.map((c, i) => (
          <div
            key={i}
            className={`confetti-piece ${c.anim}`}
            style={{ left: c.left, width: c.size, height: c.size, backgroundColor: c.color }}
          />
        ))}

        <div className="voucher-header">
          <div className="brand-badge"><span className="brand-letter">P</span></div>
          <span className="brand-name">Australia Post</span>
          <button onClick={reset} className="voucher-reset-btn">↩ Again</button>
        </div>

        <div className="voucher-mascot">
          <KoalaMascot isSpeaking={false} speakingText="" className="voucher-mascot-canvas" />
        </div>

        <h1 className="voucher-title">🎉 You did it!</h1>
        <p className="voucher-subtitle">Amazing story explorer!</p>

        <div className="voucher-card-wrapper">
          <div className="voucher-card animate-pop-in">
            <div className="voucher-card-header">
              <div className="brand-badge-small"><span className="brand-letter-small">P</span></div>
              <div>
                <div className="voucher-card-title">Kody Storyteller Reward</div>
                <div className="voucher-card-sub">Exclusive in-store reward</div>
              </div>
            </div>
            <div className="voucher-card-body">
              <div className="voucher-icon">{voucher.icon}</div>
              <div className="voucher-reward">{voucher.reward}</div>
              <p className="voucher-description">{voucher.description}</p>
              <div className="voucher-code-box">
                <p className="voucher-code-label">Voucher Code</p>
                <p className="voucher-code">{voucher.code}</p>
              </div>
              <div className="voucher-story-badge">
                <span>📖</span>
                <span>Completed: <strong>{voucher.storyTitle}</strong></span>
              </div>
              <div className="voucher-meta">
                <span>{voucher.validAt}</span>
                <span>Expires {voucher.expiryDate}</span>
              </div>
            </div>
            <div className="voucher-card-footer">
              <p>📍 Show this to our team at the counter to claim!</p>
            </div>
          </div>
        </div>

        <div className="voucher-play-again">
          <button onClick={reset} className="play-again-btn">
            <span className="play-again-icon">🔄</span>
            <span className="play-again-text">Play again</span>
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN SCREEN
  // ═══════════════════════════════════════════════════════════════════════════

  const micDisabled = phase === 'booting';

  return (
    <div className="app-screen main-screen">
      <audio ref={audioRef} autoPlay />

      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-badge"><span className="brand-letter">P</span></div>
          <div className="header-brand-text">
            <span className="header-title">Australia Post</span>
            <span className="header-subtitle">Story Time with Kody</span>
          </div>
        </div>
        <button onClick={reset} className="reset-btn" aria-label="Reset">↩</button>
      </header>

      {/* ── Mascot ── */}
      <div className="mascot-area">
        <div className="mascot-glow" />
        <KoalaMascot
          isSpeaking={isTalking}
          speakingText={speakingText}
          className="mascot-canvas"
        />
      </div>

      {/* ── Speech bubble ── */}
      <SpeechBubble text={bubble} visible={!!bubble && phase === 'speaking'} />

      {/* ── Thinking dots ── */}
      {phase === 'thinking' && <ThinkingDots />}

      {/* ── Mic button ── */}
      <div className="mic-area">
        <div className="mic-voucher-row">
          <div className="mic-container">
            {/* Pulse rings when idle and not in conversation */}
            {!inConversation && phase === 'idle' && (
              <>
                <div className="mic-pulse-ring mic-pulse-ring-1" />
                <div className="mic-pulse-ring mic-pulse-ring-2" />
              </>
            )}

            {/* Sound waves when listening */}
            {phase === 'listening' && (
              <div className="mic-waves">
                <div className="mic-wave mic-wave-1" />
                <div className="mic-wave mic-wave-2" />
                <div className="mic-wave mic-wave-3" />
              </div>
            )}

            <button
              id="mic-button"
              onClick={handleMicClick}
              disabled={micDisabled}
              className={[
                'mic-button',
                phase === 'listening' ? 'mic-active' : '',
                inConversation && phase !== 'listening' ? 'mic-in-convo' : '',
                micDisabled ? 'mic-disabled' : '',
              ].join(' ')}
              aria-label={inConversation ? 'Talking with Kody' : "Let's talk to Kody"}
            >
              <span className="mic-icon">
                {phase === 'listening'
                  ? '🎤'
                  : phase === 'speaking'
                    ? '🔊'
                    : phase === 'thinking'
                      ? '⏳'
                      : inConversation
                        ? '🎤'
                        : '💬'}
              </span>
            </button>

            <p className="mic-label">
              {phase === 'listening'
                ? '🎧 Listening…'
                : phase === 'speaking'
                  ? '🔊 Kody is talking…'
                  : phase === 'thinking'
                    ? '🤔 Kody is thinking…'
                    : phase === 'booting'
                      ? '✨ Waking up…'
                      : inConversation
                        ? '🎧 Listening…'
                        : "Let's Talk!"}
            </p>

            {inConversation && (
              <button className="finish-chat-btn" onClick={stopSession}>
                👋 Finish Chatting
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
