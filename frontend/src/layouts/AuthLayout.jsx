import React, { useMemo } from "react";

export default function AuthLayout({ title = "", children }) {
  // stars
  const stars = useMemo(
    () =>
      Array.from({ length: 100 }, () => ({
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: 1 + Math.random() * 2,
        dur: 2 + Math.random() * 4,
      })),
    []
  );

  // snowflakes
  const flakes = useMemo(
    () =>
      Array.from({ length: 120 }, () => ({
        left: Math.random() * 100,
        size: 1 + Math.random() * 3,
        dur: 6 + Math.random() * 10,
        delay: Math.random() * 8,
        drift: Math.random() * 40 - 20,
      })),
    []
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f2d] via-[#111c3d] to-[#030712]" />

      {/* Stars */}
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

      {/* Moon */}
      <div className="absolute top-10 right-14">
        <div className="h-24 w-24 rounded-full bg-yellow-200 shadow-[0_0_70px_20px_rgba(255,255,200,0.35)]" />
      </div>

      {/* Clouds */}
      <div className="absolute top-24 left-[-20%] h-14 w-[40%] rounded-full bg-white/20 blur-lg animate-cloud-slow" />
      <div className="absolute top-40 left-[30%] h-10 w-[28%] rounded-full bg-white/15 blur-md animate-cloud-mid" />
      <div className="absolute top-28 left-[65%] h-12 w-[26%] rounded-full bg-white/10 blur-lg animate-cloud-fast" />

      {/* Mountains */}
      <svg
        className="absolute bottom-0 left-0 right-0 w-full animate-sway-slow"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          fill="url(#backMountain)"
          d="M0,256 L120,192 L260,256 L420,160 L560,240 L700,160 L840,240 L1000,180 L1140,240 L1280,192 L1440,240 L1440,320 L0,320 Z"
        />
        <path d="M420,160 l40,40 -80,0 z M700,160 l40,40 -80,0 z M1000,180 l30,30 -60,0 z" fill="white" />
        <defs>
          <linearGradient id="backMountain" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="100%" stopColor="#022c22" />
          </linearGradient>
        </defs>
      </svg>

      <svg
        className="absolute bottom-0 left-0 right-0 w-full animate-sway-mid"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          fill="url(#midMountain)"
          d="M0,288 L180,200 L300,260 L460,180 L640,240 L820,160 L1000,240 L1180,200 L1360,240 L1440,220 L1440,320 L0,320 Z"
        />
        <path d="M180,200 l40,40 -80,0 z M460,180 l44,36 -88,0 z M820,160 l50,40 -100,0 z" fill="white" />
        <defs>
          <linearGradient id="midMountain" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>
        </defs>
      </svg>

      <svg
        className="absolute bottom-0 left-0 right-0 w-full animate-sway-fast"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          fill="url(#frontMountain)"
          d="M0,320 L200,220 L320,280 L500,200 L720,260 L940,180 L1160,260 L1320,220 L1440,240 L1440,320 L0,320 Z"
        />
        <path d="M200,220 l44,36 -88,0 z M500,200 l50,40 -100,0 z M940,180 l50,40 -100,0 z" fill="white" />
        <defs>
          <linearGradient id="frontMountain" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0f766e" />
          </linearGradient>
        </defs>
      </svg>

      {/* Snowfall */}
      {flakes.map((f, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            top: `-5%`,
            left: `${f.left}%`,
            width: `${f.size}px`,
            height: `${f.size}px`,
            opacity: 0.9,
            animation: `snowfall ${f.dur}s linear ${f.delay}s infinite`,
            "--drift": `${f.drift}px`,
          }}
        />
      ))}

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_70%,rgba(0,0,0,0.6)_100%)]" />

      {/* Content */}
      <div className="relative z-10 grid min-h-screen place-items-center px-4">
        {title ? <h1 className="sr-only">{title}</h1> : null}
        {children}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.9; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        @keyframes swaySlow {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(6px); }
        }
        @keyframes swayMid {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(10px); }
        }
        @keyframes swayFast {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(14px); }
        }
        @keyframes snowfall {
          0%   { transform: translate3d(0, -5%, 0); }
          100% { transform: translate3d(var(--drift, 0), 110vh, 0); }
        }
        @keyframes cloudMove {
          0%   { transform: translateX(-40%); }
          100% { transform: translateX(140%); }
        }
        .animate-sway-slow { animation: swaySlow 12s ease-in-out infinite; }
        .animate-sway-mid  { animation: swayMid 10s ease-in-out infinite; }
        .animate-sway-fast { animation: swayFast 8s  ease-in-out infinite; }
        .animate-cloud-slow { animation: cloudMove 120s linear infinite; }
        .animate-cloud-mid  { animation: cloudMove 90s linear infinite; }
        .animate-cloud-fast { animation: cloudMove 70s linear infinite; }
      `}</style>
    </div>
  );
}
