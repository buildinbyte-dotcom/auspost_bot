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

  const pcRef              = useRef<RTCPeerConnection | null>(null);
  const dcRef              = useRef<RTCDataChannel | null>(null);
  const audioRef           = useRef<HTMLAudioElement | null>(null);
  const localStreamRef     = useRef<MediaStream | null>(null);
  const transcriptRef      = useRef('');
  const processedToolCallsRef = useRef<Set<string>>(new Set());
  const audioCtxRef        = useRef<AudioContext | null>(null);
  const animFrameRef       = useRef<number | null>(null);
  const voucherTimerRef    = useRef<number | null>(null);

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
      dc.send(JSON.stringify({
        type: 'response.create',
        response: {
          instructions: data.status === 'won'
            ? `Tell the child they won. Spell out the voucher code slowly, character by character: ${data.code}. Then say they can show the code given to the team member, and offer the menu again: story, quiz, or chat.`
            : 'Tell the child there are no prize codes left right now, praise their effort, and offer the menu again: story, quiz, or chat.',
        },
      }));
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
      if (voucherTimerRef.current !== null) window.clearTimeout(voucherTimerRef.current);
      voucherTimerRef.current = window.setTimeout(() => {
        setShowVoucher(false);
        voucherTimerRef.current = null;
      }, 17_000);
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

        case 'response.audio_transcript.delta': {
          const delta = (event.delta as string) || '';
          transcriptRef.current += delta;
          // Pass only the new delta so mouth animation stays in sync with audio
          setSpeakingText(delta);
          setBubble(transcriptRef.current);
          break;
        }

        case 'response.audio_transcript.done':
          console.log('[realtime] 🐨 Kody said:', event.transcript);
          transcriptRef.current = '';
          setSpeakingText('');
          break;

        case 'response.audio.done':
          setSpeakingText('');
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

        case 'error': {
          const message = typeof event.error?.message === 'string' ? event.error.message : '';
          console.warn('[realtime] handled error:', event.error);
          if (message.includes('Audio content') && message.includes('already shorter')) {
            break;
          }
          setPhase('idle');
          break;
        }

        default:
          //console.log('[realtime] event:', type, event);
          break;
      }
    };
  }, [handlePrizeClaim]);

  // ── Stop session ──────────────────────────────────────────────────────────

  const stopSession = useCallback(() => {
    if (animFrameRef.current !== null) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    audioCtxRef.current?.close(); audioCtxRef.current = null;
    dcRef.current?.close();
    dcRef.current = null;
    pcRef.current?.getSenders().forEach((s) => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (audioRef.current) audioRef.current.srcObject = null;
    if (voucherTimerRef.current !== null) {
      window.clearTimeout(voucherTimerRef.current);
      voucherTimerRef.current = null;
    }
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
        console.log('[realtime] 🔊 remote audio track — wiring mouth animation');
        if (audioRef.current) audioRef.current.srcObject = e.streams[0];

        // Drive mouth animation directly from audio amplitude
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        const source = ctx.createMediaStreamSource(e.streams[0]);
        source.connect(analyser); // analyse only, don't connect to speakers (audio element handles playback)

        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          if (avg > 8) {
            setIsTalking(true);
            setPhase('speaking');
          } else {
            setIsTalking(false);
          }
          animFrameRef.current = requestAnimationFrame(tick);
        };
        tick();
      };

      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

      // 4. Data channel
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.addEventListener('message', (e) => onDataEventRef.current(JSON.parse(e.data)));
      dc.addEventListener('open', () => {
        console.log('[realtime] data channel open — configuring audio + triggering greeting');
        processedToolCallsRef.current.clear();
        setPhase('thinking');

        // Trigger greeting
        dc.send(JSON.stringify({
          type: 'response.create',
          response: {
            instructions: 'Say "Hi, I am the Australia Post Koala", greet the child warmly, and offer exactly three choices: story, quiz, or chat.',
          },
        }));
      });

      // 5. SDP exchange — proxy through Next to avoid browser-side cross-origin fetch failures
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log('[realtime] exchanging SDP...');
      const sdpRes = await fetch('/api/openai/realtime-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sdp: offer.sdp, token }),
      });

      if (!sdpRes.ok) throw new Error(await sdpRes.text());

      await pc.setRemoteDescription({ type: 'answer', sdp: await sdpRes.text() });
      console.log('[realtime] ✅ WebRTC connected');

    } catch (err) {
      console.warn('[realtime] session start failed:', err);
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
        {showVoucher && voucher && CONFETTI.map((c, i) => (
          <div
            key={i}
            className={`confetti-piece ${c.anim}`}
            style={{ left: c.left, width: c.size, height: c.size, backgroundColor: c.color }}
          />
        ))}
        <div className="mascot-stage">
          {showVoucher && voucher && (
            <div className="floating-voucher-code animate-pop-in" role="status" aria-live="polite">
              <span className="floating-voucher-icon">{voucher.icon}</span>
              <span className="floating-voucher-title">You won!</span>
              <span className="floating-voucher-label">Voucher code</span>
              <span className="floating-voucher-value">{voucher.code}</span>
              <span className="floating-voucher-hint">Show this to the team member.</span>
            </div>
          )}
          <div className="mascot-glow" />
          <KoalaMascot
            isSpeaking={isTalking}
            speakingText={speakingText}
            className="mascot-canvas"
          />
        </div>
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
