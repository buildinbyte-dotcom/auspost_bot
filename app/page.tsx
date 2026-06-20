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

// ── Lead Form ─────────────────────────────────────────────────────────────────

function LeadForm({ onClose }: { onClose: () => void }) {
  const [name, setName]     = useState('');
  const [phone, setPhone]   = useState('');
  const [email, setEmail]   = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email }),
      });
      setStatus(res.ok ? 'done' : 'error');
    } catch {
      setStatus('error');
    }
  };

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 100,
    background: 'rgba(0,0,0,0.55)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', padding: 16,
  };
  const card: React.CSSProperties = {
    background: '#fff', borderRadius: 16, padding: 28,
    width: '100%', maxWidth: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  };
  const input: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 15,
    border: '1.5px solid #ddd', marginTop: 6, marginBottom: 14, boxSizing: 'border-box',
    color: '#111827', background: '#fff', caretColor: '#111827',
  };
  const label: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#444' };

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#c41230' }}>Register Interest</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
        </div>

        {status === 'done' ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 40 }}>🎉</div>
            <p style={{ fontWeight: 700, marginTop: 12, color: '#26734d' }}>Thanks! We&apos;ll be in touch.</p>
            <button onClick={onClose} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 20, background: '#c41230', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={label}>Full Name</label>
            <input className="lead-form-input" style={input} type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" />

            <label style={label}>Phone Number</label>
            <input className="lead-form-input" style={input} type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="04xx xxx xxx" />

            <label style={label}>Email</label>
            <input className="lead-form-input" style={input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />

            {status === 'error' && (
              <p style={{ color: '#c41230', fontSize: 13, marginBottom: 10 }}>Something went wrong. Please try again.</p>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 24,
                background: status === 'sending' ? '#aaa' : '#c41230',
                color: '#fff', border: 'none', fontWeight: 800, fontSize: 15,
                cursor: status === 'sending' ? 'not-allowed' : 'pointer',
              }}
            >
              {status === 'sending' ? 'Sending…' : 'Submit'}
            </button>
          </form>
        )}
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
  const [showCC, setShowCC]             = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);

  const pcRef              = useRef<RTCPeerConnection | null>(null);
  const dcRef              = useRef<RTCDataChannel | null>(null);
  const audioRef           = useRef<HTMLAudioElement | null>(null);
  const localStreamRef     = useRef<MediaStream | null>(null);
  const transcriptRef      = useRef('');
  const processedToolCallsRef = useRef<Set<string>>(new Set());
  const audioCtxRef        = useRef<AudioContext | null>(null);
  const animFrameRef       = useRef<number | null>(null);
  const bubbleClearRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voucherTimerRef    = useRef<number | null>(null);

  // Use a ref for the event handler so it always has fresh state without stale closures
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onDataEventRef = useRef<(event: Record<string, any>) => void>(() => {});

  // ── Schedule bubble clear (cancels any pending clear first) ───────────────
  const scheduleBubbleClear = useCallback((ms = 4000) => {
    if (bubbleClearRef.current) clearTimeout(bubbleClearRef.current);
    bubbleClearRef.current = setTimeout(() => {
      setBubble('');
      bubbleClearRef.current = null;
    }, ms);
  }, []);

  const cancelBubbleClear = useCallback(() => {
    if (bubbleClearRef.current) { clearTimeout(bubbleClearRef.current); bubbleClearRef.current = null; }
  }, []);

  // ── Prize claim ────────────────────────────────────────────────────────────

  const handlePrizeClaim = useCallback(async (callId: string) => {
    if (processedToolCallsRef.current.has(callId)) return;
    processedToolCallsRef.current.add(callId);

    const res = await fetch('/api/prize/claim', { method: 'POST' });
    const data = await res.json();

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
          break;

        case 'input_audio_buffer.speech_started':
          setPhase('listening');
          cancelBubbleClear();
          setBubble('');
          break;

        case 'input_audio_buffer.speech_stopped':
          setPhase('thinking');
          break;

        case 'conversation.item.input_audio_transcription.completed':
          setBubble(`You: ${(event.transcript as string) || ''}`);
          scheduleBubbleClear(3000);
          break;

        case 'response.audio.delta':
          setIsTalking(true);
          setPhase('speaking');
          break;

        case 'response.audio_transcript.delta': {
          const delta = (event.delta as string) || '';
          transcriptRef.current += delta;
          setSpeakingText(delta);
          cancelBubbleClear();
          setBubble(transcriptRef.current);
          break;
        }

        case 'response.audio_transcript.done':
          transcriptRef.current = '';
          setSpeakingText('');
          break;

        case 'response.text.delta': {
          const td = (event.delta as string) || '';
          transcriptRef.current += td;
          cancelBubbleClear();
          setBubble(transcriptRef.current);
          break;
        }

        case 'response.text.done':
          transcriptRef.current = '';
          break;

        case 'response.audio.done':
          setSpeakingText('');
          break;

        case 'response.done': {
          setPhase('idle');
          cancelBubbleClear(); // cancel any pending clear from user-speech transcription timer

          // Extract transcript from response.output (fallback when delta events don't fire)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const items = (event.response?.output as any[]) || [];
          for (const item of items) {
            if (item.type === 'message' && Array.isArray(item.content)) {
              for (const part of item.content) {
                if ((part.type === 'audio' || part.type === 'output_audio') && part.transcript) {
                  setBubble(part.transcript);
                  break;
                }
              }
            }
          }
          // CC stays visible until user starts speaking (speech_started clears it)
          break;
        }

        case 'response.function_call_arguments.done':
          if (event.name === 'claim_prize_code') {
            handlePrizeClaim((event.call_id as string) || '');
          }
          break;

        case 'error': {
          const message = typeof event.error?.message === 'string' ? event.error.message : '';
          if (message.includes('Audio content') && message.includes('already shorter')) {
            break;
          }
          setPhase('idle');
          break;
        }

        default:
          break;
      }
    };
  }, [handlePrizeClaim, scheduleBubbleClear, cancelBubbleClear]);

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
  }, []);

  // ── Start WebRTC session ───────────────────────────────────────────────────

  const startSession = useCallback(async () => {
    try {
      // 1. Get ephemeral token from server
      const res = await fetch('/api/openai/realtime-session', { method: 'POST' });
      const tokenData = await res.json();

      if (!res.ok) {
        throw new Error(tokenData.error || 'Could not create OpenAI Realtime session.');
      }

      const token = tokenData.value || tokenData.client_secret?.value || '';

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
        if (pc.connectionState === 'connected') setPhase('idle');
        if (pc.connectionState === 'failed') { setPhase('idle'); stopSession(); }
      };

      pc.ontrack = (e) => {
        if (audioRef.current) audioRef.current.srcObject = e.streams[0];

        // Drive mouth animation directly from audio amplitude
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        const source = ctx.createMediaStreamSource(e.streams[0]);
        source.connect(analyser); // analyse only, don't connect to speakers (audio element handles playback)

        const data = new Uint8Array(analyser.frequencyBinCount);
        let prevTalking = false;
        const tick = () => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          const nowTalking = avg > 8;

          if (nowTalking !== prevTalking) {
            prevTalking = nowTalking;
            if (nowTalking) {
              setIsTalking(true);
              setPhase('speaking');
            } else {
              setIsTalking(false);
              // CC stays visible — only cleared when user starts talking (speech_started)
            }
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
        processedToolCallsRef.current.clear();
        setPhase('thinking');

        // Trigger greeting
        dc.send(JSON.stringify({
          type: 'response.create',
          response: {
            instructions: 'Use a gentle Australian accent from the first word. Say "G’day mate!, I’m the Australia Post Koala", greet the child warmly, and offer exactly three choices: story, quiz, or chat. Keep it clear and easy for young kids.',
          },
        }));
      });

      // 5. SDP exchange — proxy through Next to avoid browser-side cross-origin fetch failures
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch('/api/openai/realtime-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sdp: offer.sdp, token }),
      });

      if (!sdpRes.ok) throw new Error(await sdpRes.text());

      await pc.setRemoteDescription({ type: 'answer', sdp: await sdpRes.text() });

    } catch (err) {
      void err;
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

      {/* ── Closed captions ── */}
      {showCC && bubble && bubble.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 90, left: 0, right: 0, zIndex: 50,
          display: 'flex', justifyContent: 'center', padding: '0 16px',
          pointerEvents: 'none',
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.82)', color: '#fff', borderRadius: 10,
            padding: '10px 20px', maxWidth: 600, textAlign: 'center',
            fontSize: 17, lineHeight: 1.55, fontWeight: 500,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            border: '1.5px solid rgba(255,255,255,0.15)',
          }}>
            {bubble}
          </div>
        </div>
      )}

      {/* ── Lead form modal ── */}
      {showLeadForm && (
        <LeadForm onClose={() => setShowLeadForm(false)} />
      )}

      {/* Speech bubble intentionally removed — CC button controls text display */}

      {/* ── Thinking dots ── */}
      {phase === 'thinking' && <ThinkingDots />}

      {/* ── Mic + buttons ── */}
      <div className="mic-area">
        <div className="mic-container">
          {!inConversation && phase === 'idle' && (
            <>
              <div className="mic-pulse-ring mic-pulse-ring-1" />
              <div className="mic-pulse-ring mic-pulse-ring-2" />
            </>
          )}
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
              {phase === 'listening' ? '🎤' : phase === 'speaking' ? '🔊' : phase === 'thinking' ? '⏳' : inConversation ? '🎤' : '💬'}
            </span>
          </button>

          <p className="mic-label">
            {phase === 'listening' ? '🎧 Listening…' : phase === 'speaking' ? '🔊 Kody is talking…' : phase === 'thinking' ? '🤔 Thinking…' : phase === 'booting' ? '✨ Waking up…' : inConversation ? '🎧 Listening…' : "Let's Talk!"}
          </p>

        </div>

        {/* All secondary buttons on one row */}
        <div className="secondary-buttons">
          {inConversation && (
            <button className="secondary-btn finish-chat-btn" onClick={stopSession}>
              👋 Finish
            </button>
          )}
          <button
            onClick={() => setShowCC((v) => !v)}
            className={`secondary-btn cc-btn${showCC ? ' cc-btn-on' : ''}`}
          >
            CC {showCC ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setShowLeadForm(true)}
            className="secondary-btn lead-btn"
          >
            📋 Register Interest
          </button>
        </div>
      </div>
    </div>
  );
}
