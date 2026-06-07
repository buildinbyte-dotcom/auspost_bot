'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  useRive,
  useViewModel,
  useViewModelInstance,
  useViewModelInstanceBoolean,
  useViewModelInstanceNumber,
  useViewModelInstanceTrigger,
  Layout,
  Fit,
  Alignment,
} from '@rive-app/react-webgl2';

const STATE_MACHINE_NAME = 'Koala_StateMachine';

/* ── Mouth shape mapping ─────────────────────────────────────────────────
   mouth_index  →  Rive state
   0            →  M0_rest      (space, pause, punctuation)
   1            →  M1_MBP       (m, b, p — closed lips)
   2            →  M2_small     (all other consonants)
   3            →  M3_A         (a — big open)
   4            →  M4_E         (e, i, y — wide)
   5            →  M5_O         (o, u, w — round)
   ─────────────────────────────────────────────────────────────────────── */

function charToMouthIndex(char: string): number {
  const c = char.toLowerCase();

  // rest / pause
  if (c === ' ' || c === '.' || c === ',' || c === '!' || c === '?' || c === '\n' || c === '-' || c === ':' || c === ';') {
    return 0;
  }
  // closed lips
  if ('mbp'.includes(c)) return 1;
  // big open
  if (c === 'a') return 3;
  // wide mouth
  if ('eiy'.includes(c)) return 4;
  // round mouth
  if ('ouw'.includes(c)) return 5;
  // default small open
  return 2;
}

/* ── Greeting detection ──────────────────────────────────────────────── */

const GREETING_WORDS = ['hi', 'hello', 'hey', "g'day", 'gday', 'welcome', 'crikey'];

function containsGreeting(text: string): boolean {
  const lower = text.toLowerCase();
  return GREETING_WORDS.some((w) => {
    const regex = new RegExp(`\\b${w}\\b`, 'i');
    return regex.test(lower);
  });
}

/* ── Props ────────────────────────────────────────────────────────────── */

interface KoalaMascotProps {
  /** Whether the mascot should be animating its mouth right now */
  isSpeaking?: boolean;
  /** The text to lip-sync to (character-by-character mouth shapes) */
  speakingText?: string;
  className?: string;
  style?: React.CSSProperties;
}

/* ── Component ────────────────────────────────────────────────────────── */

export default function KoalaMascot({
  isSpeaking = false,
  speakingText = '',
  className = '',
  style,
}: KoalaMascotProps) {
  const { rive, RiveComponent } = useRive({
    src: '/koala_mascot.riv',
    stateMachines: STATE_MACHINE_NAME,
    autoplay: true,
    autoBind: false,
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center,
    }),
  });

  /* ── View Model binding ──────────────────────────────────────────── */

  const viewModel = useViewModel(rive);
  const viewModelInstance = useViewModelInstance(viewModel, { rive });

  // IMPORTANT: is_speaking must stay FALSE when using mouth_index control.
  // is_speaking enables the talk_loop which supersedes mouth_index.
  // We bind it only to force it false and keep it that way.
  const { setValue: setIsSpeaking } = useViewModelInstanceBoolean(
    'is_speaking',
    viewModelInstance
  );

  const { setValue: setMouthIndex } = useViewModelInstanceNumber(
    'mouth_index',
    viewModelInstance
  );

  const { trigger: fireBlink } = useViewModelInstanceTrigger(
    'blink_trigger',
    viewModelInstance
  );

  const { trigger: fireWave } = useViewModelInstanceTrigger(
    'wave_trigger',
    viewModelInstance
  );

  /* ── Refs ────────────────────────────────────────────────────────── */

  const mouthTimeoutRef = useRef<number | null>(null);
  const blinkTimeoutRef = useRef<number | null>(null);
  const hasWavedRef = useRef(false);
  const prevSpeakingRef = useRef(false);

  /* ── Cleanup helper ──────────────────────────────────────────────── */

  const clearMouthTimeout = useCallback(() => {
    if (mouthTimeoutRef.current !== null) {
      window.clearTimeout(mouthTimeoutRef.current);
      mouthTimeoutRef.current = null;
    }
  }, []);

  /* ── Force is_speaking = false always ────────────────────────────── */

  useEffect(() => {
    if (setIsSpeaking) {
      setIsSpeaking(false);
    }
  }, [setIsSpeaking]);

  /* ── Random blinks — natural 2-6s interval ───────────────────────── */

  useEffect(() => {
    if (!fireBlink) return;

    const scheduleBlink = () => {
      // Vary timing: faster blinks when speaking for liveliness
      const minDelay = isSpeaking ? 1800 : 2500;
      const maxDelay = isSpeaking ? 4000 : 6000;
      const delay = minDelay + Math.random() * (maxDelay - minDelay);

      blinkTimeoutRef.current = window.setTimeout(() => {
        fireBlink();
        // Occasionally double-blink (20% chance) for natural feel
        if (Math.random() < 0.2) {
          setTimeout(() => fireBlink(), 180);
        }
        scheduleBlink();
      }, delay);
    };

    // First blink shortly after mount
    const initTimeout = window.setTimeout(() => {
      fireBlink();
      scheduleBlink();
    }, 1200);

    return () => {
      window.clearTimeout(initTimeout);
      if (blinkTimeoutRef.current !== null) {
        window.clearTimeout(blinkTimeoutRef.current);
        blinkTimeoutRef.current = null;
      }
    };
  }, [fireBlink, isSpeaking]);

  /* ── Wave on initial load ────────────────────────────────────────── */

  useEffect(() => {
    if (fireWave && !hasWavedRef.current) {
      hasWavedRef.current = true;
      setTimeout(() => fireWave(), 1000);
    }
  }, [fireWave]);

  /* ── Idle engagement: random waves to attract kids ───────────────── */

  const idleWaveRef = useRef<number | null>(null);

  useEffect(() => {
    if (!fireWave) return;

    // Only run idle engagement when NOT speaking
    if (isSpeaking) {
      if (idleWaveRef.current !== null) {
        window.clearTimeout(idleWaveRef.current);
        idleWaveRef.current = null;
      }
      return;
    }

    const scheduleIdleWave = () => {
      // Wave every 10-18 seconds while idle
      const delay = 10000 + Math.random() * 8000;
      idleWaveRef.current = window.setTimeout(() => {
        fireWave();
        scheduleIdleWave();
      }, delay);
    };

    scheduleIdleWave();

    return () => {
      if (idleWaveRef.current !== null) {
        window.clearTimeout(idleWaveRef.current);
        idleWaveRef.current = null;
      }
    };
  }, [fireWave, isSpeaking]);

  /* ── Idle engagement: playful mouth wiggles ──────────────────────── */

  const idleMouthRef = useRef<number | null>(null);

  useEffect(() => {
    if (!setMouthIndex) return;

    if (isSpeaking) {
      if (idleMouthRef.current !== null) {
        window.clearTimeout(idleMouthRef.current);
        idleMouthRef.current = null;
      }
      return;
    }

    const mouthWiggle = () => {
      // Quick mouth movement sequence: rest → smile/open → rest
      const sequences = [
        [3, 0],           // quick "ah!" open then close
        [4, 2, 0],        // wide → small → rest (like a little giggle)
        [5, 0],           // round "ooh" → rest
        [2, 4, 0],        // small → wide → rest (curious look)
        [1, 3, 0],        // closed → open → rest (little yawn)
      ];
      const seq = sequences[Math.floor(Math.random() * sequences.length)];
      let step = 0;

      const playStep = () => {
        if (step >= seq.length) return;
        setMouthIndex(seq[step]);
        step++;
        setTimeout(playStep, 120 + Math.random() * 80);
      };

      playStep();
    };

    const scheduleWiggle = () => {
      // Wiggle every 6-12 seconds while idle
      const delay = 6000 + Math.random() * 6000;
      idleMouthRef.current = window.setTimeout(() => {
        mouthWiggle();
        scheduleWiggle();
      }, delay);
    };

    // Start after a short delay
    const initDelay = window.setTimeout(() => scheduleWiggle(), 3000);

    return () => {
      window.clearTimeout(initDelay);
      if (idleMouthRef.current !== null) {
        window.clearTimeout(idleMouthRef.current);
        idleMouthRef.current = null;
      }
    };
  }, [setMouthIndex, isSpeaking]);

  /* ── Wave when greeting words detected in speech ─────────────────── */

  useEffect(() => {
    if (!fireWave) return;

    // Only trigger wave on transition to speaking (not on every render)
    if (isSpeaking && !prevSpeakingRef.current && speakingText) {
      if (containsGreeting(speakingText)) {
        setTimeout(() => fireWave(), 400);
      }
    }
    prevSpeakingRef.current = isSpeaking;
  }, [isSpeaking, speakingText, fireWave]);

  /* ── Mouth animation — mouth_index ONLY (no talk_loop) ──────────── */

  useEffect(() => {
    if (!setMouthIndex) return;

    // Not speaking → rest position
    if (!isSpeaking || !speakingText) {
      clearMouthTimeout();
      setMouthIndex(0);
      return;
    }

    // Drive mouth shapes character by character
    let index = 0;
    const chars = speakingText.split('');
    const baseSpeed = 85; // ms per char

    const animateNextChar = () => {
      if (index >= chars.length) {
        clearMouthTimeout();
        setMouthIndex(0); // return to rest
        return;
      }

      const char = chars[index];
      const mouthIdx = charToMouthIndex(char);
      setMouthIndex(mouthIdx);
      index += 1;

      // Natural variation: longer pauses on punctuation
      let nextDelay = baseSpeed;
      if (char === '.' || char === '!' || char === '?') {
        nextDelay = 280 + Math.random() * 120; // sentence end pause
      } else if (char === ',') {
        nextDelay = 160 + Math.random() * 60;  // comma pause
      } else if (char === ' ') {
        nextDelay = 60 + Math.random() * 40;   // quick on spaces
      } else {
        nextDelay = baseSpeed + (Math.random() * 30 - 15); // slight jitter
      }

      mouthTimeoutRef.current = window.setTimeout(animateNextChar, nextDelay);
    };

    animateNextChar();

    return () => {
      clearMouthTimeout();
      setMouthIndex(0);
    };
  }, [isSpeaking, speakingText, setMouthIndex, clearMouthTimeout]);

  /* ── Render ──────────────────────────────────────────────────────── */

  return (
    <div className={className} style={style}>
      <RiveComponent />
    </div>
  );
}
