/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/app/not-found.tsx
// Next.js App Router — este archivo se renderiza automáticamente en cualquier 404

import Link from "next/link"

export default function NotFound() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070709] flex items-center justify-center p-6">

      {/* ── Animated grid background ── */}
      <div className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(245,158,11,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245,158,11,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
          animation: "gridPulse 8s ease-in-out infinite",
        }} />

      {/* ── Radial glow ── */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
        h-[600px] w-[600px] rounded-full opacity-20"
        style={{
          background: "radial-gradient(circle, #f59e0b 0%, transparent 70%)",
          animation: "breathe 4s ease-in-out infinite",
        }} />

      {/* ── Floating particles ── */}
      {[...Array(12)].map((_, i) => (
        <div key={i}
          className="pointer-events-none absolute rounded-full"
          style={{
            width:  `${2 + (i % 3)}px`,
            height: `${2 + (i % 3)}px`,
            background: i % 3 === 0 ? "#f59e0b" : i % 3 === 1 ? "#f97316" : "#fbbf24",
            left:   `${10 + (i * 7.3) % 80}%`,
            top:    `${5  + (i * 11.7) % 90}%`,
            opacity: 0.3 + (i % 4) * 0.1,
            animation: `float ${3 + (i % 4)}s ease-in-out ${i * 0.4}s infinite alternate`,
          }} />
      ))}

      {/* ── Main content ── */}
      <div className="relative z-10 text-center max-w-lg mx-auto"
        style={{ animation: "fadeUp 0.6s ease-out forwards" }}>

        {/* Logo */}
        <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl shadow-2xl"
          style={{
            background: "linear-gradient(135deg, #f59e0b, #f97316)",
            boxShadow: "0 0 40px rgba(245,158,11,0.4)",
            animation: "logoPulse 3s ease-in-out infinite",
          }}>
          <span className="text-3xl">⚡</span>
        </div>

        {/* 404 display — styled as a "reading" */}
        <div className="mb-2 flex items-center justify-center gap-3">
          <div className="h-px flex-1 max-w-16"
            style={{ background: "linear-gradient(to right, transparent, rgba(245,158,11,0.4))" }} />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500/60">
            error de señal
          </span>
          <div className="h-px flex-1 max-w-16"
            style={{ background: "linear-gradient(to left, transparent, rgba(245,158,11,0.4))" }} />
        </div>

        {/* Big 404 */}
        <div className="relative mb-6">
          <p className="font-black leading-none select-none"
            style={{
              fontSize: "clamp(96px, 20vw, 160px)",
              background: "linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #fbbf24 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 30px rgba(245,158,11,0.3))",
              letterSpacing: "-0.04em",
            }}>
            404
          </p>
          {/* Glitch line */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ animation: "glitch 6s steps(1) infinite" }}>
            <p className="font-black leading-none opacity-0 select-none"
              style={{
                fontSize: "clamp(96px, 20vw, 160px)",
                color: "#f97316",
                letterSpacing: "-0.04em",
                mixBlendMode: "difference",
              }}>
              404
            </p>
          </div>
        </div>

        {/* Metabolic "reading" card */}
        <div className="mx-auto mb-8 max-w-xs rounded-2xl border p-4"
          style={{
            borderColor: "rgba(245,158,11,0.2)",
            background: "rgba(245,158,11,0.05)",
            backdropFilter: "blur(8px)",
          }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/60">
              Lectura metabólica
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500"
                style={{ animation: "blink 1s step-end infinite" }} />
              <span className="text-[10px] text-red-400">sin señal</span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Balance",   value: "—",    unit: "kcal",  color: "#f87171" },
              { label: "Señal",     value: "0.0",  unit: "dB",    color: "#f87171" },
              { label: "Δ Ruta",    value: "404",  unit: "err",   color: "#fbbf24" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl py-2"
                style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-base font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[9px] text-gray-600">{s.unit}</p>
                <p className="text-[9px] text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Flatline */}
          <div className="mt-3 h-8 w-full overflow-hidden rounded-lg"
            style={{ background: "rgba(0,0,0,0.3)" }}>
            <svg viewBox="0 0 200 30" className="w-full h-full" preserveAspectRatio="none">
              <polyline
                points="0,15 40,15 50,5 60,25 70,15 200,15"
                fill="none"
                stroke="#f87171"
                strokeWidth="1.5"
                strokeLinejoin="round"
                style={{ animation: "flatline 2s linear infinite" }}
              />
            </svg>
          </div>
        </div>

        {/* Message */}
        <h1 className="mb-2 text-xl font-black text-white">
          Página no encontrada
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-gray-500">
          Esta ruta no existe en el sistema. El motor no pudo
          calcular un balance para esta URL.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/dashboard"
            className="group relative overflow-hidden rounded-2xl px-8 py-3.5 text-sm font-bold text-white transition-all active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #f59e0b, #f97316)",
              boxShadow: "0 4px 24px rgba(245,158,11,0.3)",
            }}>
            <span className="relative z-10">⚡ Volver al dashboard</span>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "linear-gradient(135deg, #fbbf24, #fb923c)" }} />
          </Link>

          <Link href="/"
            className="rounded-2xl border px-8 py-3.5 text-sm font-bold text-gray-400 transition-all hover:text-white active:scale-[0.97]"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
            }}>
            Inicio
          </Link>
        </div>

        {/* Footer note */}
        <p className="mt-10 text-[10px] text-gray-700 font-mono">
          MyTemple · código de error 404 · ruta no registrada en el motor
        </p>
      </div>

      {/* ── CSS Animations ── */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0);    }
        }

        @keyframes breathe {
          0%, 100% { transform: translate(-50%,-50%) scale(0.9); opacity: 0.15; }
          50%       { transform: translate(-50%,-50%) scale(1.1); opacity: 0.25; }
        }

        @keyframes float {
          from { transform: translateY(0px)   rotate(0deg);   }
          to   { transform: translateY(-20px) rotate(180deg); }
        }

        @keyframes gridPulse {
          0%, 100% { opacity: 1;   }
          50%       { opacity: 0.5; }
        }

        @keyframes logoPulse {
          0%, 100% { box-shadow: 0 0 40px rgba(245,158,11,0.4); }
          50%       { box-shadow: 0 0 60px rgba(245,158,11,0.7), 0 0 80px rgba(249,115,22,0.3); }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }

        @keyframes flatline {
          from { stroke-dashoffset: 0;   }
          to   { stroke-dashoffset: -200; }
        }

        @keyframes glitch {
          0%  { opacity: 0; transform: translate(0, 0);    }
          92% { opacity: 0; transform: translate(0, 0);    }
          93% { opacity: 0.6; transform: translate(-3px, 1px); }
          94% { opacity: 0; transform: translate(0, 0);    }
          96% { opacity: 0.4; transform: translate(3px, -1px); }
          97% { opacity: 0; transform: translate(0, 0);    }
        }
      `}</style>
    </div>
  )
}
