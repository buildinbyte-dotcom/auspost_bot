'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Lazy-load Rive mascot (WebGL2 requires browser APIs)
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

interface ChatTurn {
  user: string;
  kody: string;
}

// ── Story catalogue ──────────────────────────────────────────────────────────

const STORIES: Record<string, string> = {
  magical_parcel: 'The Magical Parcel',
  big_day_out: "Kody's Big Day Out",
  reef_mail: 'Reef Mail',
  lost_star: 'The Star That Got Lost',
};

// ── Greetings ────────────────────────────────────────────────────────────────

const GREETINGS = [
  "G'day mate! I'm Kody the Koala! Tap the microphone and tell me which story you'd like — The Magical Parcel, Kody's Big Day Out, Reef Mail, or The Star That Got Lost!",
  "Hello there! I'm Kody! Ready for an adventure? Tap the mic and tell me which story sounds the most fun!",
  "Crikey, welcome! I'm Kody the Koala! Tap that microphone and pick an adventure — I've got four amazing stories for you!",
];

// ── Dev mode presets ─────────────────────────────────────────────────────────

const DEV_PRESETS = [
  { label: '👋 Hi greeting', text: "Hi there! Welcome, mate!" },
  { label: '📖 Short sentence', text: "Let's go on an adventure!" },
  { label: '🗣️ Lip sync test', text: "A big open mouth. E wide. O round. MBP closed." },
  { label: '🦘 Aussie paragraph', text: "G'day mate! Crikey, you won't believe what happened at the post office today! A magical sparkling parcel arrived, glowing with rainbow colours. Shall we open it together?" },
  { label: '🎉 Celebration', text: "Woohoo! You did it, champion! That was absolutely brilliant! I'm so proud of you, mate!" },
  { label: '❓ Question', text: "Hmm, interesting! Would you like Option A — explore the enchanted forest, or Option B — dive into the crystal cave?" },
  { label: '🔤 All letters', text: "A B C D E F G H I J K L M N O P Q R S T U V W X Y Z" },
  { label: '⏱️ Punctuation pauses', text: "Wait... really? Yes! Oh, wow. That is amazing, truly." },
];

// ── Speech synthesis ──────────────────────────────────────────────────────────

function speak(text: string, onStart?: () => void): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onStart?.();
      setTimeout(resolve, Math.min(text.length * 60, 6000));
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.88;
    utterance.pitch = 1.15;
    utterance.volume = 1;
    const tryVoice = () => {
      const v = window.speechSynthesis
        .getVoices()
        .find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Samantha') ||
              v.name.includes('Karen') ||
              v.name.includes('Daniel') ||
              v.name.includes('Google'))
        );
      if (v) utterance.voice = v;
    };
    window.speechSynthesis.getVoices().length
      ? tryVoice()
      : (window.speechSynthesis.onvoiceschanged = tryVoice);
    const t = setTimeout(resolve, text.length * 90 + 5000);
    utterance.onstart = () => {
      onStart?.();
    };
    utterance.onend = () => {
      clearTimeout(t);
      resolve();
    };
    utterance.onerror = () => {
      clearTimeout(t);
      resolve();
    };
    setTimeout(() => window.speechSynthesis.speak(utterance), 80);
  });
}

// ── (No floating elements needed — Rive artboard provides its own scene) ──

// ── Confetti for voucher screen ───────────────────────────────────────────────

const CONFETTI = [
  { color: '#FFD700', size: 14, left: '7%', anim: 'animate-confetti-1' },
  { color: '#FF6B9D', size: 10, left: '20%', anim: 'animate-confetti-2' },
  { color: '#7C5CFC', size: 8, left: '36%', anim: 'animate-confetti-3' },
  { color: '#00D4AA', size: 12, left: '50%', anim: 'animate-confetti-4' },
  { color: '#FFD700', size: 9, left: '64%', anim: 'animate-confetti-5' },
  { color: '#FF6B9D', size: 14, left: '78%', anim: 'animate-confetti-6' },
  { color: '#7C5CFC', size: 11, left: '88%', anim: 'animate-confetti-7' },
  { color: '#00D4AA', size: 8, left: '14%', anim: 'animate-confetti-8' },
];

// ── Microphone Button ─────────────────────────────────────────────────────────

interface MicButtonProps {
  onTranscript: (text: string) => void;
  disabled: boolean;
  phase: Phase;
}

function MicButton({ onTranscript, disabled, phase }: MicButtonProps) {
  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);

  const toggle = useCallback(() => {
    if (disabled) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SR) {
      alert('Voice not supported — please use Chrome or Safari.');
      return;
    }

    const rec = new SR();
    rec.lang = 'en-AU';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    rec.onstart = () => setListening(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const t = e.results[0]?.[0]?.transcript?.trim();
      if (t) onTranscript(t);
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };
    rec.onerror = () => {
      setListening(false);
      recRef.current = null;
    };
    recRef.current = rec;
    rec.start();
  }, [disabled, listening, onTranscript]);

  const isActive = listening;
  const isBusy = phase === 'speaking' || phase === 'thinking';

  return (
    <div className="mic-container">
      {/* Pulse rings when idle */}
      {phase === 'idle' && !listening && (
        <>
          <div className="mic-pulse-ring mic-pulse-ring-1" />
          <div className="mic-pulse-ring mic-pulse-ring-2" />
        </>
      )}

      {/* Sound waves when listening */}
      {isActive && (
        <div className="mic-waves">
          <div className="mic-wave mic-wave-1" />
          <div className="mic-wave mic-wave-2" />
          <div className="mic-wave mic-wave-3" />
        </div>
      )}

      <button
        id="mic-button"
        onClick={toggle}
        disabled={disabled}
        className={`mic-button ${isActive ? 'mic-active' : ''} ${disabled ? 'mic-disabled' : ''}`}
        aria-label={isActive ? 'Stop listening' : 'Start talking to Kody'}
      >
        <span className="mic-icon">
          {isActive ? '🎤' : isBusy ? '⏳' : '🎤'}
        </span>
      </button>

      <p className="mic-label">
        {isActive
          ? '🎧 Listening to you…'
          : phase === 'speaking'
            ? '🔊 Kody is talking…'
            : phase === 'thinking'
              ? '🤔 Kody is thinking…'
              : phase === 'booting'
                ? '✨ Waking up…'
                : 'Tap to talk to Kody!'}
      </p>
    </div>
  );
}

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

// ── Dev Mode Panel ────────────────────────────────────────────────────────────

interface DevPanelProps {
  onPlay: (text: string) => void;
  onStop: () => void;
  isSpeaking: boolean;
}

function DevPanel({ onPlay, onStop, isSpeaking }: DevPanelProps) {
  return (
    <div className="dev-panel">
      <p className="dev-panel-title">🧪 Dev Mode — Lip Sync Presets</p>
      <div className="dev-presets">
        {DEV_PRESETS.map((preset, i) => (
          <button
            key={i}
            className="dev-preset-btn"
            onClick={() => onPlay(preset.text)}
            disabled={isSpeaking}
          >
            {preset.label}
          </button>
        ))}
        <button
          className="dev-preset-btn dev-stop-btn"
          onClick={onStop}
        >
          ⏹ Stop
        </button>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function Home() {
  const [phase, setPhase] = useState<Phase>('booting');
  const [isTalking, setIsTalking] = useState(false);
  const [speakingText, setSpeakingText] = useState('');
  const [bubble, setBubble] = useState('');
  const [statusText, setStatusText] = useState('');
  const [storyId, setStoryId] = useState('');
  const [storyTitle, setStoryTitle] = useState('');
  const [storyHistory, setStoryHistory] = useState<
    Array<{ narration: string; choice: string }>
  >([]);
  const [pendingChoices, setPendingChoices] = useState<string[]>([]);
  const [inStory, setInStory] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([]);
  const [voucher, setVoucher] = useState<VoucherData | null>(null);
  const [showVoucher, setShowVoucher] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Talk-time tracking for voucher eligibility ─────────────────────────────
  const talkStartRef = useRef<number | null>(null);
  const [totalTalkTime, setTotalTalkTime] = useState(0); // seconds
  const [hasTalked, setHasTalked] = useState(false);
  const VOUCHER_THRESHOLD = 60; // 1 minute in seconds

  const VOUCHER_REJECTIONS = [
    "Haha, nice try mate! But you gotta chat with me first! Tap the mic and let's talk!",
    "Oi! You haven't even said hello yet! Come on, tap the microphone and let's be friends first!",
    "Whoa there, speedy! You need to have a proper yarn with me before you get a prize!",
    "Ha! You think vouchers grow on eucalyptus trees? Talk to me for a bit first, mate!",
    "Not so fast, champion! I need to get to know you first! Tap the mic and tell me something!",
    "Hmm, I don't remember chatting with you yet! Give me a tap on the mic and let's have some fun first!",
  ];

  // ── Kody speaks ─────────────────────────────────────────────────────────────

  const kodySpeak = useCallback(async (text: string) => {
    setPhase('speaking');
    setSpeakingText(text);
    setBubble(text);
    // Lip sync starts only when browser actually begins audio output
    await speak(text, () => setIsTalking(true));
    setIsTalking(false);
    setSpeakingText('');
  }, []);

  // ── Dev mode: play preset (lip-sync only, with TTS) ──────────────────────

  const devPlay = useCallback(async (text: string) => {
    // Cancel anything in progress
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    setSpeakingText(text);
    setBubble(text);
    setPhase('speaking');
    // Lip sync starts only when browser actually begins audio output
    await speak(text, () => setIsTalking(true));
    setIsTalking(false);
    setSpeakingText('');
    setBubble('');
    setPhase('idle');
  }, []);

  const devStop = useCallback(() => {
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    setIsTalking(false);
    setSpeakingText('');
    setBubble('');
    setPhase('idle');
  }, []);

  // ── Idle engagement: spoken prompts to attract kids ────────────────────────

  const IDLE_PROMPTS = [
    "Hey there! Come say hi!",
    "Psst! Want to hear an awesome story?",
    "G'day mate! I'm Kody the Koala!",
    "Hey! Tap the microphone and let's chat!",
    "I've got some really cool stories to tell!",
    "Hello! Want to go on an adventure with me?",
    "Oi! Come over here, I've got a surprise!",
    "Who wants to hear about a magical parcel?",
    "Hi there! I'm waiting for a friend to talk to!",
    "Crikey! Is anyone out there? Come say hello!",
  ];

  const idlePromptIndexRef = useRef(0);

  const armIdle = useCallback(() => {
    if (idleRef.current) clearTimeout(idleRef.current);
    // Speak a random engagement prompt every 15-25 seconds
    const delay = 15000 + Math.random() * 10000;
    idleRef.current = setTimeout(async () => {
      if (inStory) return;
      // Cycle through prompts so kids hear variety
      const prompt = IDLE_PROMPTS[idlePromptIndexRef.current % IDLE_PROMPTS.length];
      idlePromptIndexRef.current += 1;
      await kodySpeak(prompt);
      setPhase('idle');
      armIdle();
    }, delay);
  }, [inStory, kodySpeak]);

  // ── Boot greeting ────────────────────────────────────────────────────────────

  useEffect(() => {
    const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    const t = setTimeout(async () => {
      await kodySpeak(greeting);
      setPhase('idle');
      armIdle();
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Story: narrate a segment ─────────────────────────────────────────────────

  const narrateSegment = useCallback(
    async (
      sid: string,
      history: Array<{ narration: string; choice: string }>,
      choice: string | null,
      title: string
    ) => {
      setPhase('thinking');
      setBubble('');
      setStatusText('Kody is imagining…');

      const res = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: sid, history, choice }),
      });

      if (!res.ok) {
        await kodySpeak(
          "Oops! I need a magic key to tell stories. Check the setup, mate!"
        );
        setPhase('idle');
        setStatusText('');
        return;
      }

      const data: StorySegment = await res.json();
      setStatusText('');

      await kodySpeak(data.narration);

      if (data.storyComplete) {
        setSpeakingText(
          'Woohoo! You finished the story! Here is a special Kody reward just for you!'
        );
        setBubble(
          'Woohoo! You finished the story! Here is a special Kody reward just for you!'
        );
        await speak(
          'Woohoo! You finished the story! Here is a special Kody reward just for you!',
          () => setIsTalking(true)
        );
        setIsTalking(false);
        setSpeakingText('');

        const vRes = await fetch('/api/voucher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storyTitle: title }),
        });
        const vData: VoucherData = await vRes.json();
        setVoucher(vData);
        setShowVoucher(true);
        setInStory(false);
        setBubble('');
        setPhase('idle');
      } else if (data.choices?.length > 0) {
        setPendingChoices(data.choices);
        const choiceText = `You have two choices! Option A: ${data.choices[0]}. Or Option B: ${data.choices[1]}. Tap the microphone and tell me which you'd like!`;
        await kodySpeak(choiceText);
        setPhase('idle');
        setStatusText('Tap 🎤 and say your choice!');
      } else {
        setPhase('idle');
        setStatusText('Tap 🎤 to continue…');
      }
    },
    [kodySpeak]
  );

  // ── Start a story ─────────────────────────────────────────────────────────────

  const startStory = useCallback(
    async (sid: string) => {
      if (idleRef.current) clearTimeout(idleRef.current);
      const title = STORIES[sid] || "Kody's Story";
      setStoryId(sid);
      setStoryTitle(title);
      setStoryHistory([]);
      setPendingChoices([]);
      setInStory(true);
      await narrateSegment(sid, [], null, title);
    },
    [narrateSegment]
  );

  // ── Voice input handler ───────────────────────────────────────────────────────

  const handleVoice = useCallback(
    async (transcript: string) => {
      if (
        phase === 'listening' ||
        phase === 'thinking' ||
        phase === 'speaking'
      )
        return;
      if (idleRef.current) clearTimeout(idleRef.current);

      // Track talk time
      if (!hasTalked) setHasTalked(true);
      if (talkStartRef.current === null) {
        talkStartRef.current = Date.now();
      }
      // Accumulate based on transcript length (~3 words/sec estimate + response time)
      const estimatedSpeechSec = Math.max(transcript.split(/\s+/).length / 2.5, 2);
      setTotalTalkTime((prev) => prev + estimatedSpeechSec + 5); // +5s for round-trip interaction time

      setPhase('thinking');
      setStatusText(`You said: "${transcript}"`);
      setBubble('');

      // ── In story: match a choice ────────────────────────────────────────────
      if (inStory && pendingChoices.length > 0) {
        const lower = transcript.toLowerCase();
        const [choiceA, choiceB] = pendingChoices;

        const aWords = (choiceA || '')
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 3);
        const bWords = (choiceB || '')
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 3);
        const aScore = aWords.filter((w) => lower.includes(w)).length;
        const bScore = bWords.filter((w) => lower.includes(w)).length;
        const pickA =
          /\ba\b|first|option a|one/i.test(lower) || aScore > bScore;
        const pickB =
          /\bb\b|second|option b|two/i.test(lower) || bScore > aScore;

        if (pickA && choiceA) {
          setPendingChoices([]);
          setStatusText('');
          const newHistory = [
            ...storyHistory,
            { narration: '', choice: choiceA },
          ];
          setStoryHistory(newHistory);
          await narrateSegment(storyId, newHistory, choiceA, storyTitle);
        } else if (pickB && choiceB) {
          setPendingChoices([]);
          setStatusText('');
          const newHistory = [
            ...storyHistory,
            { narration: '', choice: choiceB },
          ];
          setStoryHistory(newHistory);
          await narrateSegment(storyId, newHistory, choiceB, storyTitle);
        } else {
          await kodySpeak(
            `Hmm, I heard "${transcript}" — did you mean option A or option B, mate?`
          );
          setStatusText('Tap 🎤 and say A or B!');
          setPhase('idle');
        }
        armIdle();
        return;
      }

      // ── Not in story: chat or pick story ────────────────────────────────────
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: transcript, context: chatHistory }),
      });
      const data = await res.json();

      const newTurn: ChatTurn = { user: transcript, kody: data.reply };
      setChatHistory((h) => [...h, newTurn]);

      await kodySpeak(data.reply);
      setStatusText('');

      if (data.action === 'start_story' && data.storyId) {
        await startStory(data.storyId as string);
      } else {
        setPhase('idle');
        armIdle();
      }
    },
    [
      phase,
      inStory,
      pendingChoices,
      storyHistory,
      storyId,
      storyTitle,
      chatHistory,
      narrateSegment,
      kodySpeak,
      startStory,
      armIdle,
    ]
  );

  // ── Reset ────────────────────────────────────────────────────────────────────

  const reset = useCallback(async () => {
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    if (idleRef.current) clearTimeout(idleRef.current);
    setPhase('booting');
    setIsTalking(false);
    setSpeakingText('');
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
      await kodySpeak(greeting);
      setPhase('idle');
      armIdle();
    }, 400);
  }, [kodySpeak, armIdle]);

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
            style={{
              left: c.left,
              width: c.size,
              height: c.size,
              backgroundColor: c.color,
            }}
          />
        ))}

        <div className="voucher-header">
          <div className="brand-badge">
            <span className="brand-letter">P</span>
          </div>
          <span className="brand-name">Australia Post</span>
          <button onClick={reset} className="voucher-reset-btn">
            ↩ Again
          </button>
        </div>

        <div className="voucher-mascot">
          <KoalaMascot
            isSpeaking={false}
            speakingText=""
            className="voucher-mascot-canvas"
          />
        </div>

        <h1 className="voucher-title">🎉 You did it!</h1>
        <p className="voucher-subtitle">Amazing story explorer!</p>

        <div className="voucher-card-wrapper">
          <div className="voucher-card animate-pop-in">
            <div className="voucher-card-header">
              <div className="brand-badge-small">
                <span className="brand-letter-small">P</span>
              </div>
              <div>
                <div className="voucher-card-title">
                  Kody Storyteller Reward
                </div>
                <div className="voucher-card-sub">
                  Exclusive in-store reward
                </div>
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
                <span>
                  Completed: <strong>{voucher.storyTitle}</strong>
                </span>
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
  // MAIN SCREEN — Voice chat with Kody
  // ═══════════════════════════════════════════════════════════════════════════

  const micDisabled =
    phase === 'speaking' || phase === 'thinking' || phase === 'booting';

  return (
    <div className="app-screen main-screen">

      {/* ── Dev Mode Toggle ── */}
      <button
        className={`dev-toggle ${devMode ? 'dev-toggle-active' : ''}`}
        onClick={() => setDevMode((d) => !d)}
      >
        {devMode ? '🧪 Dev ON' : 'Dev'}
      </button>

      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-badge">
            <span className="brand-letter">P</span>
          </div>
          <div className="header-brand-text">
            <span className="header-title">Australia Post</span>
            <span className="header-subtitle">Story Time with Kody</span>
          </div>
        </div>

        {/* Story progress */}
        {inStory && (
          <div className="story-progress">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`progress-dot ${i < storyHistory.length ? 'progress-dot-filled' : ''}`}
              />
            ))}
          </div>
        )}

        <button onClick={reset} className="reset-btn" aria-label="Reset">
          ↩
        </button>
      </header>

      {/* ── Mascot area ── */}
      <div className="mascot-area">
        <div className="mascot-glow" />
        <KoalaMascot
          isSpeaking={isTalking}
          speakingText={speakingText}
          className="mascot-canvas"
        />
      </div>

      {/* ── Speech bubble (only before user starts talking — keeps koala full size) ── */}
      {!hasTalked && <SpeechBubble text={bubble} visible={!!bubble} />}

      {/* ── Status text (only before user starts talking) ── */}
      {!hasTalked && statusText && !bubble && (
        <div className="status-container">
          <div className="status-bubble">
            <p className="status-text">{statusText}</p>
          </div>
        </div>
      )}

      {/* ── Thinking dots ── */}
      {phase === 'thinking' && !bubble && !statusText && <ThinkingDots />}

      {/* ── Microphone + Voucher row ── */}
      <div className="mic-area">
        <div className="mic-voucher-row">
          <MicButton
            onTranscript={handleVoice}
            disabled={micDisabled}
            phase={phase}
          />
        </div>

        {/* ── Voucher claim button ── */}
        <button
          id="voucher-claim-btn"
          className="voucher-claim-btn"
          disabled={phase === 'speaking' || phase === 'thinking'}
          onClick={async () => {
            if (idleRef.current) clearTimeout(idleRef.current);

            if (!hasTalked || totalTalkTime < VOUCHER_THRESHOLD) {
              // Funny rejection
              const remaining = Math.max(VOUCHER_THRESHOLD - totalTalkTime, 0);
              const rejection = VOUCHER_REJECTIONS[Math.floor(Math.random() * VOUCHER_REJECTIONS.length)];
              const timeMsg = hasTalked && remaining > 0
                ? ` You need about ${Math.ceil(remaining)} more seconds of chatting!`
                : '';
              await kodySpeak(rejection + timeMsg);
              setPhase('idle');
              armIdle();
              return;
            }

            // Eligible! Generate voucher
            await kodySpeak('Woohoo! You earned a special Kody reward! Let me get that for you, champion!');
            setPhase('thinking');
            try {
              const vRes = await fetch('/api/voucher', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyTitle: 'Chat with Kody' }),
              });
              const vData = await vRes.json();
              setVoucher(vData);
              setShowVoucher(true);
              setBubble('');
              setPhase('idle');
            } catch {
              await kodySpeak('Oops! Something went wrong getting your voucher. Try again, mate!');
              setPhase('idle');
              armIdle();
            }
          }}
        >
          <span className="voucher-claim-icon">🎁</span>
          <span className="voucher-claim-text">Get my reward!</span>
        </button>
      </div>

      {/* ── Dev Mode Panel ── */}
      {devMode && (
        <DevPanel
          onPlay={devPlay}
          onStop={devStop}
          isSpeaking={isTalking}
        />
      )}
    </div>
  );
}
