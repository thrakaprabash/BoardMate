import React, { useMemo } from "react";

export default function NightBackdrop() {
  const stars = useMemo(
    () =>
      Array.from({ length: 80 }, () => ({
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: 1 + Math.random() * 2,
        dur: 2 + Math.random() * 4,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#070b20] via-[#0e1636] to-[#06101a]" />

      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: 0.9,
            animation: `twinkle ${s.dur}s ease-in-out infinite`,
          }}
        />
      ))}

      <svg
        className="absolute bottom-0 left-0 right-0 w-full"
        viewBox="0 0 1440 300"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="mBack" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="100%" stopColor="#022c22" />
          </linearGradient>
          <linearGradient id="mMid" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>
          <linearGradient id="mFront" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0f766e" />
          </linearGradient>
        </defs>
        <path
          fill="url(#mBack)"
          d="M0,210 L120,170 L260,220 L420,160 L560,210 L700,150 L840,210 L1000,170 L1140,210 L1280,180 L1440,210 L1440,300 L0,300 Z"
        />
        <path
          fill="url(#mMid)"
          d="M0,230 L160,180 L300,220 L460,170 L640,220 L820,160 L1000,220 L1180,180 L1360,220 L1440,200 L1440,300 L0,300 Z"
        />
        <path
          fill="url(#mFront)"
          d="M0,260 L180,190 L320,240 L520,180 L740,230 L960,170 L1160,230 L1320,190 L1440,210 L1440,300 L0,300 Z"
        />
        <path d="M180,190 l36,30 -72,0 z M520,180 l44,36 -88,0 z M960,170 l44,36 -88,0 z" fill="#fff" />
      </svg>

      <div className="absolute top-20 left-[-30%] h-12 w-[45%] rounded-full bg-white/15 blur-lg animate-[cloud_110s_linear_infinite]" />
      <div className="absolute top-36 left-[35%] h-9 w-[28%]  rounded-full bg-white/10 blur-md  animate-[cloud_85s_linear_infinite]" />

      <style>{`
        @keyframes twinkle { 0%,100%{opacity:.9;transform:scale(1)} 50%{opacity:.4;transform:scale(.85)} }
        @keyframes cloud { 0%{transform:translateX(-40%)} 100%{transform:translateX(140%)} }
      `}</style>
    </div>
  );
}
