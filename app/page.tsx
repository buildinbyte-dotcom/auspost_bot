'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { KoalaAvatar, Emotion } from './components/KoalaAvatar';

// ── Types ────────────────────────────────────────────────────────────────────

type Phase = 'booting' | 'idle' | 'listening' | 'thinking' | 'speaking';

interface StorySegment {
  narration: string;
  emotion: string;
  choices: string[];
  storyComplete: boolean;
}

interface VoucherData {
  code: string;
  reward: string;
  description: string;
  icon: string;
  storyTitle: string;
  expiryDate: string;
  validAt: string;
}

interface ChatTurn { user: string; kody: string; }

// ── Story catalogue ──────────────────────────────────────────────────────────

const STORIES: Record<string, string> = {
  magical_parcel: 'The Magical Parcel',
  big_day_out:    "Kody's Big Day Out",
  reef_mail:      'Reef Mail',
  lost_star:      'The Star That Got Lost',
};

// ── Greeting lines (spoken on mount) ─────────────────────────────────────────

const GREETINGS = [
  "G'day mate! I'm Kody the Koala! Tap the phone button and tell me which story you'd like — The Magical Parcel, Kody's Big Day Out, Reef Mail, or The Star That Got Lost!",
  "Hello there! I'm Kody! Ready for an adventure? Tap the phone and tell me which story sounds the most fun!",
  "Crikey, welcome! I'm Kody the Koala! Tap that phone button and pick an adventure — I've got four amazing stories for you!",
];

// ── Confetti ──────────────────────────────────────────────────────────────────

const CONFETTI = [
  { color: '#FFD700', size: 14, left: '7%',  anim: 'animate-confetti-1' },
  { color: '#FFFFFF', size: 10, left: '20%', anim: 'animate-confetti-2' },
  { color: '#FFD700', size: 8,  left: '36%', anim: 'animate-confetti-3' },
  { color: '#FFFFFF', size: 12, left: '50%', anim: 'animate-confetti-4' },
  { color: '#FFD700', size: 9,  left: '64%', anim: 'animate-confetti-5' },
  { color: '#FFFFFF', size: 14, left: '78%', anim: 'animate-confetti-6' },
  { color: '#FFD700', size: 11, left: '88%', anim: 'animate-confetti-7' },
  { color: '#FFFFFF', size: 8,  left: '14%', anim: 'animate-confetti-8' },
];

// ── Background: gold stars ────────────────────────────────────────────────────

function Stars() {
  const stars = [
    { top: '4%',  left: '18%', s: 32, d: '0s',   o: 1 },
    { top: '6%',  left: '68%', s: 28, d: '0.6s',  o: 0.9 },
    { top: '16%', left: '8%',  s: 20, d: '1.2s',  o: 0.85 },
    { top: '20%', left: '78%', s: 22, d: '0.3s',  o: 0.9 },
    { top: '38%', left: '12%', s: 18, d: '0.9s',  o: 0.8 },
    { top: '35%', left: '80%', s: 16, d: '1.5s',  o: 0.75 },
    { top: '55%', left: '6%',  s: 14, d: '0.5s',  o: 0.7 },
    { top: '58%', left: '85%', s: 20, d: '1.1s',  o: 0.8 },
    { top: '72%', left: '14%', s: 24, d: '0.8s',  o: 0.85 },
    { top: '70%', left: '74%', s: 18, d: '0.2s',  o: 0.8 },
    { top: '85%', left: '28%', s: 16, d: '1.3s',  o: 0.7 },
    { top: '88%', left: '60%', s: 22, d: '0.7s',  o: 0.85 },
    { top: '50%', left: '48%', s: 12, d: '1.7s',  o: 0.6 },
  ];
  return (
    <>
      {stars.map((p, i) => (
        <span key={i} className="absolute pointer-events-none select-none animate-twinkle"
          style={{ top: p.top, left: p.left, fontSize: p.s, animationDelay: p.d, opacity: p.o,
            color: '#FFD700', textShadow: '0 0 8px rgba(255,215,0,0.8), 0 0 20px rgba(255,215,0,0.4)', zIndex: 1 }}>
          ✦
        </span>
      ))}
    </>
  );
}

// ── Christmas ornaments ───────────────────────────────────────────────────────

function OrnamentBall({ size, color, stringH }: { size: number; color: string; stringH: number }) {
  const lighten = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${Math.min(255,(n>>16)+a)},${Math.min(255,((n>>8)&0xff)+a)},${Math.min(255,(n&0xff)+a)})`;
  };
  const darken = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${Math.max(0,(n>>16)-a)},${Math.max(0,((n>>8)&0xff)-a)},${Math.max(0,(n&0xff)-a)})`;
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: 2.5, height: stringH, background: 'linear-gradient(to bottom, rgba(255,255,255,0.7), rgba(255,255,255,0.25))' }} />
      <div style={{ width: size*0.28, height: size*0.18, background: '#C8A000', borderRadius: '3px 3px 0 0', marginBottom: -1 }} />
      <div style={{ width: size, height: size, borderRadius: '50%', position: 'relative',
        background: `radial-gradient(circle at 35% 30%, ${lighten(color,30)}, ${color} 55%, ${darken(color,20)} 100%)`,
        boxShadow: `inset -${size*0.2}px -${size*0.15}px ${size*0.35}px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.3)` }}>
        <div style={{ position:'absolute', top:'12%', left:'18%', width:size*0.32, height:size*0.22,
          borderRadius:'50%', background:'rgba(255,255,255,0.55)', filter:'blur(2px)' }} />
      </div>
    </div>
  );
}

function Ornaments() {
  const items = [
    { top: '2%',  left: '0%',   size: 52, color: '#CC0000', string: 18, delay: '0s' },
    { top: '14%', left: '-2%',  size: 38, color: '#AA0000', string: 22, delay: '0.6s' },
    { top: '27%', left: '0%',   size: 44, color: '#DD1111', string: 16, delay: '1.1s' },
    { top: '42%', left: '-1%',  size: 30, color: '#BB0000', string: 20, delay: '0.4s' },
    { top: '2%',  left: '85%',  size: 46, color: '#CC0000', string: 20, delay: '0.3s' },
    { top: '15%', left: '87%',  size: 36, color: '#AA0000', string: 18, delay: '0.9s' },
    { top: '28%', left: '84%',  size: 50, color: '#DD1111', string: 14, delay: '0.7s' },
    { top: '43%', left: '86%',  size: 32, color: '#BB0000', string: 22, delay: '1.3s' },
  ];
  return (
    <>
      {items.map((b, i) => (
        <div key={i} className="absolute pointer-events-none select-none animate-float"
          style={{ top: b.top, left: b.left, animationDelay: b.delay, zIndex: 2 }}>
          <OrnamentBall size={b.size} color={b.color} stringH={b.string} />
        </div>
      ))}
    </>
  );
}

// ── AP Logo chip ──────────────────────────────────────────────────────────────

function APLogo() {
  return (
    <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
      <span className="text-[#CC2128] font-extrabold text-sm">P</span>
    </div>
  );
}

// ── Speech synthesis ──────────────────────────────────────────────────────────

function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setTimeout(resolve, Math.min(text.length * 60, 6000));
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate  = 0.88;
    utterance.pitch = 1.15;
    utterance.volume = 1;
    const tryVoice = () => {
      const v = window.speechSynthesis.getVoices()
        .find(v => v.lang.startsWith('en') &&
          (v.name.includes('Samantha') || v.name.includes('Karen') ||
           v.name.includes('Daniel')   || v.name.includes('Google')));
      if (v) utterance.voice = v;
    };
    window.speechSynthesis.getVoices().length ? tryVoice() : (window.speechSynthesis.onvoiceschanged = tryVoice);
    const t = setTimeout(resolve, text.length * 90 + 5000);
    utterance.onend  = () => { clearTimeout(t); resolve(); };
    utterance.onerror = () => { clearTimeout(t); resolve(); };
    setTimeout(() => window.speechSynthesis.speak(utterance), 80);
  });
}

// ── Phone button — the ONLY interaction ──────────────────────────────────────

interface PhoneButtonProps {
  onTranscript: (text: string) => void;
  disabled: boolean;
}

function PhoneButton({ onTranscript, disabled }: PhoneButtonProps) {
  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);

  const toggle = useCallback(() => {
    if (disabled) return;
    if (listening) { recRef.current?.stop(); return; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SR) { alert('Voice not supported — please use Chrome or Safari.'); return; }

    const rec = new SR();
    rec.lang = 'en-AU';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    rec.onstart  = () => setListening(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const t = e.results[0]?.[0]?.transcript?.trim();
      if (t) onTranscript(t);
    };
    rec.onend   = () => { setListening(false); recRef.current = null; };
    rec.onerror = () => { setListening(false); recRef.current = null; };
    recRef.current = rec;
    rec.start();
  }, [disabled, listening, onTranscript]);

  return (
    <button
      onClick={toggle}
      disabled={disabled}
      className={`
        relative flex flex-col items-center justify-center rounded-full
        shadow-2xl transition-all duration-200 select-none
        ${listening ? 'scale-110 animate-pulse-ring' : disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-90 hover:scale-105'}
      `}
      style={{ width: 112, height: 112, background: listening ? '#FFFFFF' : 'rgba(255,255,255,0.95)' }}
    >
      <span style={{ fontSize: 46, lineHeight: 1 }}>{listening ? '🎙️' : '📞'}</span>
      <span className={`text-xs font-bold mt-1 ${listening ? 'text-[#CC2128]' : 'text-gray-500'}`}>
        {listening ? 'Listening…' : 'Tap to talk'}
      </span>
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-4 border-white/40" />
    </button>
  );
}

// ── Main app ──────────────────────────────────────────────────────────────────

export default function Home() {
  const [phase, setPhase]                     = useState<Phase>('booting');
  const [emotion, setEmotion]                 = useState<Emotion>('cheering');
  const [isTalking, setIsTalking]             = useState(false);
  const [bubble, setBubble]                   = useState('');
  const [statusText, setStatusText]           = useState('');
  const [storyId, setStoryId]                 = useState('');
  const [storyTitle, setStoryTitle]           = useState('');
  const [storyHistory, setStoryHistory]       = useState<Array<{ narration: string; choice: string }>>([]);
  const [pendingChoices, setPendingChoices]   = useState<string[]>([]);
  const [inStory, setInStory]                 = useState(false);
  const [chatHistory, setChatHistory]         = useState<ChatTurn[]>([]);
  const [voucher, setVoucher]                 = useState<VoucherData | null>(null);
  const [showVoucher, setShowVoucher]         = useState(false);
  const idleRef                               = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Kody speaks ─────────────────────────────────────────────────────────────
  const kodySpeak = useCallback(async (text: string, em: Emotion = 'happy') => {
    setPhase('speaking');
    setEmotion(em);
    setIsTalking(true);
    setBubble(text);
    await speak(text);
    setIsTalking(false);
  }, []);

  // ── Idle timer ───────────────────────────────────────────────────────────────
  const armIdle = useCallback(() => {
    if (idleRef.current) clearTimeout(idleRef.current);
    idleRef.current = setTimeout(async () => {
      if (inStory) return;
      const res  = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isIdle: true }) });
      const data = await res.json();
      await kodySpeak(data.reply, 'happy');
      setPhase('idle');
      armIdle();
    }, 28_000);
  }, [inStory, kodySpeak]);

  // ── Boot greeting ────────────────────────────────────────────────────────────
  useEffect(() => {
    const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    const t = setTimeout(async () => {
      await kodySpeak(greeting, 'cheering');
      setPhase('idle');
      armIdle();
    }, 800);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Story: narrate a segment ─────────────────────────────────────────────────
  const narrateSegment = useCallback(async (
    sid: string,
    history: Array<{ narration: string; choice: string }>,
    choice: string | null,
    title: string
  ) => {
    setPhase('thinking');
    setEmotion('thinking');
    setBubble('');
    setStatusText('Kody is imagining…');

    const res = await fetch('/api/story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId: sid, history, choice }),
    });

    if (!res.ok) {
      await kodySpeak("Oops! I need a magic key to tell stories. Check the setup, mate!", 'surprised');
      setPhase('idle');
      setStatusText('');
      return;
    }

    const data: StorySegment = await res.json();
    setStatusText('');

    // Speak the narration
    await kodySpeak(data.narration, (data.emotion as Emotion) || 'happy');

    if (data.storyComplete) {
      // Celebrate + voucher
      setEmotion('cheering');
      setIsTalking(true);
      setBubble('Woohoo! You finished the story! Here is a special Kody reward just for you!');
      await speak('Woohoo! You finished the story! Here is a special Kody reward just for you!');
      setIsTalking(false);

      const vRes  = await fetch('/api/voucher', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storyTitle: title }) });
      const vData: VoucherData = await vRes.json();
      setVoucher(vData);
      setShowVoucher(true);
      setInStory(false);
      setBubble('');
      setPhase('idle');
    } else if (data.choices?.length > 0) {
      // Read choices aloud, then wait for voice input
      setPendingChoices(data.choices);
      const choiceText = `You have two choices! Option A: ${data.choices[0]}. Or Option B: ${data.choices[1]}. Tap the phone and tell me which you'd like!`;
      await kodySpeak(choiceText, 'happy');
      setPhase('idle');
      setStatusText('Tap 📞 and say your choice!');
    } else {
      setPhase('idle');
      setStatusText('Tap 📞 to continue…');
    }
  }, [kodySpeak]);

  // ── Start a story ─────────────────────────────────────────────────────────────
  const startStory = useCallback(async (sid: string) => {
    if (idleRef.current) clearTimeout(idleRef.current);
    const title = STORIES[sid] || 'Kody\'s Story';
    setStoryId(sid);
    setStoryTitle(title);
    setStoryHistory([]);
    setPendingChoices([]);
    setInStory(true);
    await narrateSegment(sid, [], null, title);
  }, [narrateSegment]);

  // ── Voice input handler ───────────────────────────────────────────────────────
  const handleVoice = useCallback(async (transcript: string) => {
    if (phase === 'listening' || phase === 'thinking' || phase === 'speaking') return;
    if (idleRef.current) clearTimeout(idleRef.current);

    setPhase('thinking');
    setEmotion('thinking');
    setStatusText(`You said: "${transcript}"`);
    setBubble('');

    // ── In story: match a choice ───────────────────────────────────────────────
    if (inStory && pendingChoices.length > 0) {
      const lower = transcript.toLowerCase();
      const [choiceA, choiceB] = pendingChoices;

      const aWords = (choiceA || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const bWords = (choiceB || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const aScore = aWords.filter(w => lower.includes(w)).length;
      const bScore = bWords.filter(w => lower.includes(w)).length;
      const pickA  = /\ba\b|first|option a|one/i.test(lower) || aScore > bScore;
      const pickB  = /\bb\b|second|option b|two/i.test(lower) || bScore > aScore;

      if (pickA && choiceA) {
        setPendingChoices([]);
        setStatusText('');
        const newHistory = [...storyHistory, { narration: '', choice: choiceA }];
        setStoryHistory(newHistory);
        await narrateSegment(storyId, newHistory, choiceA, storyTitle);
      } else if (pickB && choiceB) {
        setPendingChoices([]);
        setStatusText('');
        const newHistory = [...storyHistory, { narration: '', choice: choiceB }];
        setStoryHistory(newHistory);
        await narrateSegment(storyId, newHistory, choiceB, storyTitle);
      } else {
        // Couldn't match — ask again
        await kodySpeak(`Hmm, I heard "${transcript}" — did you mean option A or option B, mate?`, 'surprised');
        setStatusText('Tap 📞 and say A or B!');
        setPhase('idle');
      }
      armIdle();
      return;
    }

    // ── Not in story: chat with Kody / pick a story ────────────────────────────
    const res  = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: transcript, context: chatHistory }),
    });
    const data = await res.json();

    const newTurn: ChatTurn = { user: transcript, kody: data.reply };
    setChatHistory(h => [...h, newTurn]);

    await kodySpeak(data.reply, (data.emotion as Emotion) || 'happy');
    setStatusText('');

    if (data.action === 'start_story' && data.storyId) {
      await startStory(data.storyId as string);
    } else {
      setPhase('idle');
      armIdle();
    }
  }, [phase, inStory, pendingChoices, storyHistory, storyId, storyTitle, chatHistory, narrateSegment, kodySpeak, startStory, armIdle]);

  // ── Reset ────────────────────────────────────────────────────────────────────
  const reset = useCallback(async () => {
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    if (idleRef.current) clearTimeout(idleRef.current);
    setPhase('booting');
    setEmotion('cheering');
    setIsTalking(false);
    setBubble('');
    setStatusText('');
    setStoryId('');
    setStoryTitle('');
    setStoryHistory([]);
    setPendingChoices([]);
    setInStory(false);
    setChatHistory([]);
    setVoucher(null);
    setShowVoucher(false);

    const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    setTimeout(async () => {
      await kodySpeak(greeting, 'cheering');
      setPhase('idle');
      armIdle();
    }, 400);
  }, [kodySpeak, armIdle]);

  // ═══════════════════════════════════════════════════════════════════════════
  // VOUCHER SCREEN
  // ═══════════════════════════════════════════════════════════════════════════

  if (showVoucher && voucher) {
    return (
      <div className="h-screen flex flex-col select-none overflow-hidden relative"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, #E02530 0%, #CC2128 45%, #A01B21 100%)' }}>
        {CONFETTI.map((c, i) => (
          <div key={i} className={`absolute top-0 rounded-full ${c.anim}`}
            style={{ left: c.left, width: c.size, height: c.size, backgroundColor: c.color }} />
        ))}
        <Stars />

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 z-10">
          <div className="flex items-center gap-2">
            <APLogo />
            <span className="text-white font-extrabold text-base">Australia Post</span>
          </div>
          <button onClick={reset}
            className="text-white/70 text-sm font-medium bg-white/10 rounded-full px-3 py-1 active:scale-95">
            ↩ Again
          </button>
        </div>

        {/* Kody celebrating */}
        <div className="flex-shrink-0 flex flex-col items-center z-10 pt-2">
          <div style={{ height: '26vh', aspectRatio: '300/540', maxHeight: 220 }}>
            <KoalaAvatar emotion="cheering" isTalking={false} className="w-full h-full" />
          </div>
          <h1 className="text-white text-3xl font-extrabold text-center mt-1 drop-shadow-lg">🎉 You did it!</h1>
          <p className="text-red-100 text-sm text-center">Amazing story explorer!</p>
        </div>

        {/* Voucher card */}
        <div className="flex-1 px-5 pt-3 pb-2 z-10 overflow-auto">
          <div className="w-full bg-white rounded-3xl shadow-2xl overflow-hidden animate-pop-in">
            <div className="bg-[#CC2128] px-5 py-3 flex items-center gap-3">
              <APLogo />
              <div>
                <div className="text-white font-extrabold text-sm">Kody Storyteller Reward</div>
                <div className="text-red-200 text-xs">Exclusive in-store reward</div>
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="text-6xl text-center mb-3">{voucher.icon}</div>
              <div className="text-gray-900 font-extrabold text-xl text-center mb-1">{voucher.reward}</div>
              <p className="text-gray-500 text-sm text-center mb-5">{voucher.description}</p>
              <div className="bg-gray-50 border-2 border-dashed border-[#CC2128] rounded-2xl py-4 text-center mb-4">
                <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Voucher Code</p>
                <p className="text-[#CC2128] font-mono font-extrabold text-3xl tracking-widest">{voucher.code}</p>
              </div>
              <div className="flex items-center gap-2 bg-yellow-50 rounded-xl px-4 py-2 mb-3">
                <span className="text-yellow-500">📖</span>
                <span className="text-gray-600 text-xs">Completed: <strong>{voucher.storyTitle}</strong></span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>{voucher.validAt}</span>
                <span>Expires {voucher.expiryDate}</span>
              </div>
            </div>
            <div className="bg-[#CC2128]/10 px-6 py-3 text-center border-t border-gray-100">
              <p className="text-[#CC2128] font-bold text-sm">
                📍 Show this to our team at the counter to claim!
              </p>
            </div>
          </div>
        </div>

        {/* Play again — phone button style */}
        <div className="flex-shrink-0 flex flex-col items-center pb-8 pt-3 z-10 gap-2">
          <button onClick={reset}
            className="w-20 h-20 bg-white rounded-full flex flex-col items-center justify-center shadow-2xl active:scale-90 transition-transform">
            <span style={{ fontSize: 34 }}>🔄</span>
            <span className="text-[#CC2128] text-xs font-bold mt-0.5">Play again</span>
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN KIOSK SCREEN — voice-only
  // ═══════════════════════════════════════════════════════════════════════════

  const phoneDisabled = phase === 'speaking' || phase === 'thinking' || phase === 'booting';

  return (
    <div className="h-screen flex flex-col select-none overflow-hidden relative"
      style={{ background: 'radial-gradient(ellipse at 50% 40%, #E02530 0%, #CC2128 45%, #A01B21 100%)' }}>

      <Stars />
      <Ornaments />

      {/* Top bar — AP logo only */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 z-10">
        <div className="flex items-center gap-2">
          <APLogo />
          <div>
            <div className="text-white font-extrabold text-sm leading-none">Australia Post</div>
            <div className="text-white/60 text-xs">Story Time with Kody</div>
          </div>
        </div>
        {/* Story progress dots — visible during story */}
        {inStory && (
          <div className="flex gap-1.5">
            {[0,1,2,3,4].map(i => (
              <div key={i} className={`w-2 h-2 rounded-full transition-all ${
                i < storyHistory.length ? 'bg-[#FFD700] scale-125' : 'bg-white/30'}`} />
            ))}
          </div>
        )}
        {/* Home reset — subtle */}
        <button onClick={reset} className="text-white/40 text-xs active:text-white/80 transition-colors">
          ↩
        </button>
      </div>

      {/* Kody — large hero */}
      <div className="flex-1 flex justify-center items-end z-10 px-6 pb-2 min-h-0">
        <div style={{ height: '100%', aspectRatio: '300/540', maxHeight: 460, maxWidth: 260 }}>
          <KoalaAvatar emotion={emotion} isTalking={isTalking} className="w-full h-full" />
        </div>
      </div>

      {/* Speech bubble */}
      {bubble && (
        <div className="flex-shrink-0 mx-5 mb-3 z-10 animate-slide-up">
          <div className="bg-white rounded-3xl rounded-bl-none px-6 py-4 shadow-2xl">
            <p className="text-gray-800 text-base leading-relaxed font-semibold">{bubble}</p>
          </div>
        </div>
      )}

      {/* Status / hint text */}
      {statusText && !bubble && (
        <div className="flex-shrink-0 mx-5 mb-3 z-10">
          <div className="bg-white/15 rounded-2xl px-5 py-3 text-center">
            <p className="text-white/90 text-sm font-medium">{statusText}</p>
          </div>
        </div>
      )}

      {/* Loading dots */}
      {phase === 'thinking' && !bubble && !statusText && (
        <div className="flex-shrink-0 flex justify-center mb-4 z-10">
          <div className="bg-white/20 rounded-2xl px-6 py-3 flex items-center gap-2">
            <span className="text-white/80 text-sm">Kody is thinking</span>
            <span className="w-2.5 h-2.5 bg-white rounded-full animate-dot-1" />
            <span className="w-2.5 h-2.5 bg-white rounded-full animate-dot-2" />
            <span className="w-2.5 h-2.5 bg-white rounded-full animate-dot-3" />
          </div>
        </div>
      )}

      {/* ── PHONE BUTTON — the ONLY interaction ── */}
      <div className="flex-shrink-0 flex flex-col items-center pb-10 z-10 gap-3">
        <PhoneButton onTranscript={handleVoice} disabled={phoneDisabled} />
        {phase === 'idle' && !bubble && (
          <p className="text-white/55 text-xs text-center">
            {inStory ? 'Speak your choice' : "Say a story name to begin!"}
          </p>
        )}
        {phase === 'speaking' && (
          <p className="text-white/55 text-xs text-center">🎧 Kody is speaking…</p>
        )}
        {phase === 'booting' && (
          <p className="text-white/55 text-xs text-center">Starting up…</p>
        )}
      </div>
    </div>
  );
}
