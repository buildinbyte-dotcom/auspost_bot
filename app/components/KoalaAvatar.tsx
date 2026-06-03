'use client';

import { useState, useEffect } from 'react';

export type Emotion =
  | 'idle'
  | 'happy'
  | 'excited'
  | 'surprised'
  | 'thinking'
  | 'proud'
  | 'cheering'
  | 'sad';

interface KoalaAvatarProps {
  emotion: Emotion;
  isTalking: boolean;
  className?: string;
}

export function KoalaAvatar({ emotion, isTalking, className = '' }: KoalaAvatarProps) {
  const [talkPhase, setTalkPhase] = useState(0);
  const [blinkPhase, setBlinkPhase] = useState(false);

  useEffect(() => {
    if (!isTalking) { setTalkPhase(0); return; }
    const id = setInterval(() => setTalkPhase(p => 1 - p), 220);
    return () => clearInterval(id);
  }, [isTalking]);

  useEffect(() => {
    const schedule = () => {
      const delay = 3000 + Math.random() * 2000;
      return setTimeout(() => {
        setBlinkPhase(true);
        setTimeout(() => { setBlinkPhase(false); schedule(); }, 150);
      }, delay);
    };
    const t = schedule();
    return () => clearTimeout(t);
  }, []);

  const animClass = {
    idle:      'animate-float',
    happy:     'animate-float',
    excited:   'animate-bounce-gentle',
    surprised: 'animate-wiggle',
    thinking:  'animate-float',
    proud:     'animate-float',
    cheering:  'animate-celebrate',
    sad:       'animate-float',
  }[emotion];

  // ── Eyes ──────────────────────────────────────────────────────────────────
  const renderEyes = () => {
    if (blinkPhase) {
      return (
        <>
          <ellipse cx="118" cy="198" rx="22" ry="4" fill="#BBBBBB" />
          <ellipse cx="182" cy="198" rx="22" ry="4" fill="#BBBBBB" />
        </>
      );
    }
    if (emotion === 'cheering') {
      return (
        <>
          <ellipse cx="118" cy="198" rx="22" ry="12" fill="#CCCCCC" />
          <path d="M97 198 Q118 180 139 198" stroke="#1A1A1A" strokeWidth="5" fill="none" strokeLinecap="round" />
          <ellipse cx="182" cy="198" rx="22" ry="12" fill="#CCCCCC" />
          <path d="M161 198 Q182 180 203 198" stroke="#1A1A1A" strokeWidth="5" fill="none" strokeLinecap="round" />
        </>
      );
    }
    if (emotion === 'sad') {
      return (
        <>
          <ellipse cx="118" cy="202" rx="22" ry="19" fill="white" />
          <ellipse cx="182" cy="202" rx="22" ry="19" fill="white" />
          <circle cx="122" cy="206" r="14" fill="#1A1A1A" />
          <circle cx="186" cy="206" r="14" fill="#1A1A1A" />
          <circle cx="116" cy="200" r="5.5" fill="white" />
          <circle cx="180" cy="200" r="5.5" fill="white" />
          <path d="M98 184 Q118 192 138 184" stroke="#777" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M162 184 Q182 192 202 184" stroke="#777" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </>
      );
    }
    const ry = emotion === 'surprised' ? 24 : 19;
    return (
      <>
        {/* Eye whites */}
        <ellipse cx="118" cy="198" rx="22" ry={ry} fill="white" />
        <ellipse cx="182" cy="198" rx="22" ry={ry} fill="white" />
        {/* Iris */}
        <circle cx="122" cy="202" r="15" fill="#1A1A1A" />
        <circle cx="186" cy="202" r="15" fill="#1A1A1A" />
        {/* Main glint */}
        <circle cx="128" cy="193" r="6" fill="white" />
        <circle cx="192" cy="193" r="6" fill="white" />
        {/* Secondary glint */}
        <circle cx="115" cy="202" r="3" fill="white" />
        <circle cx="179" cy="202" r="3" fill="white" />
        {/* Eyebrows */}
        {(emotion === 'happy' || emotion === 'excited' || emotion === 'proud') && (
          <>
            <path d="M99 180 Q118 171 137 179" stroke="#888" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d="M163 179 Q182 171 201 180" stroke="#888" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          </>
        )}
        {emotion === 'thinking' && (
          <>
            <path d="M99 182 Q118 174 137 181" stroke="#777" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d="M163 177 Q182 169 201 176" stroke="#777" strokeWidth="4" fill="none" strokeLinecap="round" />
          </>
        )}
        {emotion === 'surprised' && (
          <>
            <path d="M97 180 Q118 168 139 179" stroke="#777" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M161 179 Q182 168 203 180" stroke="#777" strokeWidth="4" fill="none" strokeLinecap="round" />
          </>
        )}
      </>
    );
  };

  // ── Mouth ─────────────────────────────────────────────────────────────────
  const renderMouth = () => {
    if (isTalking && talkPhase === 1) {
      return (
        <>
          <ellipse cx="150" cy="252" rx="24" ry="18" fill="#CC2128" stroke="#1A1A1A" strokeWidth="2.5" />
          <rect x="135" y="242" width="16" height="9" rx="4" fill="white" />
          <rect x="153" y="242" width="16" height="9" rx="4" fill="white" />
        </>
      );
    }
    switch (emotion) {
      case 'cheering':
      case 'excited':
      case 'happy':
        return (
          <>
            <path d="M120 246 Q150 276 180 246" stroke="#1A1A1A" strokeWidth="4.5" fill="#CC2128" strokeLinecap="round" />
            <path d="M120 246 Q150 276 180 246" fill="#CC2128" />
          </>
        );
      case 'proud':
        return (
          <path d="M124 248 Q150 268 176 248" stroke="#1A1A1A" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        );
      case 'surprised':
        return <ellipse cx="150" cy="257" rx="20" ry="26" fill="#1A1A1A" />;
      case 'thinking':
        return (
          <path d="M132 252 Q150 248 168 255" stroke="#1A1A1A" strokeWidth="4" fill="none" strokeLinecap="round" />
        );
      case 'sad':
        return (
          <path d="M126 262 Q150 248 174 262" stroke="#1A1A1A" strokeWidth="4" fill="none" strokeLinecap="round" />
        );
      default:
        return (
          <path d="M127 248 Q150 268 173 248" stroke="#1A1A1A" strokeWidth="4" fill="none" strokeLinecap="round" />
        );
    }
  };

  // ── Arm angle pairs [left°, right°] around shoulder pivots ───────────────
  // Matching reference video: idle=right arm raised/waving, left on hip
  const armAngles: Record<Emotion, [number, number]> = {
    idle:      [-70,  15],   // left arm raised (waving like reference), right slight
    happy:     [-65,  25],
    excited:   [-80,  80],
    surprised: [-50,  50],
    thinking:  [-10, -55],   // right arm up toward chin
    proud:     [-40,  40],
    cheering:  [-85,  85],
    sad:       [ 35, -25],
  };
  const [lAngle, rAngle] = armAngles[emotion];

  return (
    <div className={`${animClass} ${className}`} style={{ filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.5))' }}>
      {/*
        viewBox 300 × 540
        Kody: very large head (~60% height), round humanoid body,
              white oval face, 3-layer ears, waving arm pose
      */}
      <svg viewBox="0 0 300 540" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          {/* 3D sphere shading for head */}
          <radialGradient id="gHead" cx="38%" cy="32%" r="65%">
            <stop offset="0%"   stopColor="#E0E0E0" />
            <stop offset="45%"  stopColor="#CCCCCC" />
            <stop offset="100%" stopColor="#9E9E9E" />
          </radialGradient>
          {/* Ear gradients */}
          <radialGradient id="gEarOuter" cx="35%" cy="30%" r="68%">
            <stop offset="0%"   stopColor="#D0D0D0" />
            <stop offset="100%" stopColor="#909090" />
          </radialGradient>
          <radialGradient id="gEarMid" cx="38%" cy="35%" r="65%">
            <stop offset="0%"   stopColor="#DCDCDC" />
            <stop offset="100%" stopColor="#BBBBBB" />
          </radialGradient>
          {/* Body gradient */}
          <radialGradient id="gBody" cx="40%" cy="30%" r="68%">
            <stop offset="0%"   stopColor="#D2D2D2" />
            <stop offset="100%" stopColor="#ABABAB" />
          </radialGradient>
          {/* White muzzle */}
          <radialGradient id="gMuzzle" cx="50%" cy="42%" r="60%">
            <stop offset="0%"   stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F0F0F0" />
          </radialGradient>
          {/* Crown */}
          <linearGradient id="gCrown" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#F04040" />
            <stop offset="100%" stopColor="#991820" />
          </linearGradient>
          {/* Gold gems */}
          <radialGradient id="gGem" cx="25%" cy="20%" r="75%">
            <stop offset="0%"   stopColor="#FFEF80" />
            <stop offset="55%"  stopColor="#FFD700" />
            <stop offset="100%" stopColor="#C09000" />
          </radialGradient>
          {/* AP badge */}
          <radialGradient id="gBadge" cx="30%" cy="25%" r="72%">
            <stop offset="0%"   stopColor="#E83530" />
            <stop offset="100%" stopColor="#981520" />
          </radialGradient>
          {/* Nose */}
          <radialGradient id="gNose" cx="25%" cy="20%" r="75%">
            <stop offset="0%"   stopColor="#3A3A3A" />
            <stop offset="100%" stopColor="#080808" />
          </radialGradient>
          {/* Arm */}
          <radialGradient id="gArm" cx="35%" cy="25%" r="72%">
            <stop offset="0%"   stopColor="#CECECE" />
            <stop offset="100%" stopColor="#ABABAB" />
          </radialGradient>
        </defs>

        {/* ═══════════════════════════════════
            BODY — gray torso, behind everything
        ═══════════════════════════════════ */}
        <ellipse cx="150" cy="410" rx="80" ry="88" fill="url(#gBody)" />

        {/* ═══════════════════════════════════
            LEGS + FEET
        ═══════════════════════════════════ */}
        <ellipse cx="118" cy="482" rx="32" ry="52" fill="#BEBEBE" />
        <ellipse cx="182" cy="482" rx="32" ry="52" fill="#BEBEBE" />
        {/* Feet */}
        <ellipse cx="112" cy="528" rx="38" ry="16" fill="#ADADAD" />
        <ellipse cx="188" cy="528" rx="38" ry="16" fill="#ADADAD" />

        {/* ═══════════════════════════════════
            APRON — white bib
        ═══════════════════════════════════ */}
        <path d="M82 340 Q150 320 218 340 L210 510 L90 510 Z" fill="white" />
        {/* Neck straps */}
        <path d="M100 340 L80 308 Q74 300 84 299 L98 316"
          stroke="#E0E0E0" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M200 340 L220 308 Q226 300 216 299 L202 316"
          stroke="#E0E0E0" strokeWidth="8" fill="none" strokeLinecap="round" />

        {/* AP Badge on apron */}
        <circle cx="150" cy="418" r="50" fill="url(#gBadge)" />
        <circle cx="150" cy="418" r="43" fill="none" stroke="white" strokeWidth="4" />
        <text x="150" y="436"
          textAnchor="middle" fill="white"
          fontSize="48" fontWeight="900"
          fontFamily="'Arial Black', Arial, sans-serif">P</text>

        {/* ═══════════════════════════════════
            EARS — drawn BEFORE head circle
        ═══════════════════════════════════ */}
        {/* Left ear */}
        <circle cx="46"  cy="165" r="68" fill="url(#gEarOuter)" />
        <circle cx="46"  cy="165" r="50" fill="url(#gEarMid)" />
        <circle cx="46"  cy="165" r="32" fill="#E2B0AE" />
        <circle cx="46"  cy="165" r="18" fill="#CE9090" />
        {/* Right ear */}
        <circle cx="254" cy="165" r="68" fill="url(#gEarOuter)" />
        <circle cx="254" cy="165" r="50" fill="url(#gEarMid)" />
        <circle cx="254" cy="165" r="32" fill="#E2B0AE" />
        <circle cx="254" cy="165" r="18" fill="#CE9090" />

        {/* ═══════════════════════════════════
            HEAD — large sphere, dominant element
        ═══════════════════════════════════ */}
        <circle cx="150" cy="210" r="118" fill="url(#gHead)" />
        {/* Head highlight for 3D feel */}
        <ellipse cx="118" cy="162" rx="48" ry="34" fill="rgba(255,255,255,0.13)" />

        {/* ═══════════════════════════════════
            CROWN
        ═══════════════════════════════════ */}
        {/* Band */}
        <rect x="94" y="110" width="112" height="24" rx="8" fill="#881820" />
        {/* Spikes */}
        <path d="M94 132 L94 76 L120 104 L150 62 L180 104 L206 76 L206 132 Z"
          fill="url(#gCrown)" />
        {/* Crown sheen */}
        <path d="M106 130 L106 90 L124 112 L150 76 L176 112 L194 90 L194 130"
          fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="3" />
        {/* Gems */}
        <circle cx="94"  cy="130" r="14" fill="url(#gGem)" stroke="#A88000" strokeWidth="1.5" />
        <circle cx="150" cy="62"  r="17" fill="url(#gGem)" stroke="#A88000" strokeWidth="1.5" />
        <circle cx="206" cy="130" r="14" fill="url(#gGem)" stroke="#A88000" strokeWidth="1.5" />
        <circle cx="87"  cy="122" r="5.5" fill="rgba(255,255,220,0.95)" />
        <circle cx="143" cy="54"  r="7"   fill="rgba(255,255,220,0.95)" />
        <circle cx="199" cy="122" r="5.5" fill="rgba(255,255,220,0.95)" />

        {/* ═══════════════════════════════════
            WHITE MUZZLE — Kody's signature
            Very large white oval, extends wide
        ═══════════════════════════════════ */}
        <ellipse cx="150" cy="244" rx="88" ry="92" fill="url(#gMuzzle)" />
        {/* Slight inner highlight */}
        <ellipse cx="145" cy="228" rx="55" ry="50" fill="rgba(255,255,255,0.5)" />

        {/* ═══════════════════════════════════
            FACE FEATURES
        ═══════════════════════════════════ */}
        {renderEyes()}

        {/* Nose — heart-like oval */}
        <ellipse cx="150" cy="228" rx="25" ry="19" fill="url(#gNose)" />
        {/* Nose divot */}
        <path d="M136 222 Q150 216 164 222" stroke="#2A2A2A" strokeWidth="2" fill="none" />
        {/* Nose highlight */}
        <ellipse cx="140" cy="220" rx="10" ry="6" fill="rgba(100,100,100,0.5)" />
        <ellipse cx="142" cy="218" rx="5"  ry="3" fill="rgba(160,160,160,0.5)" />

        {/* Cheeks */}
        <ellipse cx="100" cy="240" rx="26" ry="18" fill="#F0A0A0" opacity="0.45" />
        <ellipse cx="200" cy="240" rx="26" ry="18" fill="#F0A0A0" opacity="0.45" />

        {/* Mouth */}
        {renderMouth()}

        {/* Philtrum */}
        <line x1="150" y1="248" x2="150" y2="258" stroke="#E0E0E0" strokeWidth="2.5" />

        {/* Whisker dots */}
        <circle cx="106" cy="244" r="5" fill="#AAAAAA" opacity="0.6" />
        <circle cx="93"  cy="255" r="5" fill="#AAAAAA" opacity="0.6" />
        <circle cx="194" cy="244" r="5" fill="#AAAAAA" opacity="0.6" />
        <circle cx="207" cy="255" r="5" fill="#AAAAAA" opacity="0.6" />

        {/* ═══════════════════════════════════
            ARMS — pivot at shoulders
            Shoulder pivots: Left (72,330) Right (228,330)
            Each arm: ellipse + round hand with finger bumps
        ═══════════════════════════════════ */}

        {/* LEFT ARM */}
        <g transform={`rotate(${lAngle} 72 330)`}>
          <ellipse cx="72" cy="382" rx="24" ry="60" fill="url(#gArm)" />
          {/* White cartoon hand */}
          <circle cx="72" cy="440" r="28" fill="white" />
          <circle cx="50" cy="429" r="12" fill="white" />
          <circle cx="94" cy="429" r="12" fill="white" />
          <circle cx="72" cy="418" r="13" fill="white" />
        </g>

        {/* RIGHT ARM */}
        <g transform={`rotate(${rAngle} 228 330)`}>
          <ellipse cx="228" cy="382" rx="24" ry="60" fill="url(#gArm)" />
          {/* White cartoon hand */}
          <circle cx="228" cy="440" r="28" fill="white" />
          <circle cx="206" cy="429" r="12" fill="white" />
          <circle cx="250" cy="429" r="12" fill="white" />
          <circle cx="228" cy="418" r="13" fill="white" />
        </g>

        {/* ═══════════════════════════════════
            EMOTION SPARKLES
        ═══════════════════════════════════ */}
        {(emotion === 'excited' || emotion === 'cheering') && (
          <>
            <text x="4"   y="218" fontSize="34" fill="#FFD700" opacity="0.95">✦</text>
            <text x="258" y="196" fontSize="26" fill="#FFD700" opacity="0.9">★</text>
            <text x="242" y="108" fontSize="22" fill="#FFD700" opacity="0.85">✦</text>
            <text x="12"  y="124" fontSize="22" fill="#FFD700" opacity="0.8">★</text>
            <text x="270" y="280" fontSize="18" fill="#FF9999" opacity="0.8">♥</text>
            <text x="8"   y="290" fontSize="18" fill="#FF9999" opacity="0.75">♥</text>
          </>
        )}
        {emotion === 'thinking' && (
          <>
            <text x="228" y="158" fontSize="46" fill="#FFD700" opacity="0.9">?</text>
            <text x="232" y="202" fontSize="22" fill="#FFD700" opacity="0.5">?</text>
          </>
        )}
        {emotion === 'surprised' && (
          <>
            <text x="8"   y="194" fontSize="36" fill="white" opacity="0.85">!</text>
            <text x="268" y="194" fontSize="36" fill="white" opacity="0.85">!</text>
          </>
        )}
        {emotion === 'proud' && (
          <>
            <text x="4"   y="240" fontSize="24" fill="#FFD700" opacity="0.85">★</text>
            <text x="266" cy="240" fontSize="24" fill="#FFD700" opacity="0.85">★</text>
          </>
        )}
        {emotion === 'sad' && (
          <>
            <ellipse cx="103" cy="268" rx="6" ry="9" fill="#AADDF8" opacity="0.9" />
            <ellipse cx="197" cy="268" rx="6" ry="9" fill="#AADDF8" opacity="0.9" />
          </>
        )}
      </svg>
    </div>
  );
}
