import Link from "next/link"

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: "🧬",
    title: "Motor metabólico adaptativo",
    desc: "Calcula tu TMB con Mifflin-St Jeor y ajusta el factor metabólico automáticamente cada vez que registras tu peso real. El sistema aprende de ti.",
  },
  {
    icon: "🍳",
    title: "Recetas con nutrición dinámica",
    desc: "Crea recetas desde ingredientes reales. Los macros se calculan al instante sin almacenar valores derivados. Escala cualquier receta a tu objetivo calórico.",
  },
  {
    icon: "📅",
    title: "Planes nutricionales inteligentes",
    desc: "El sistema distribuye tus recetas en un plan semanal escalado a tu TDEE. Tú ajustas, el motor calcula.",
  },
  {
    icon: "⚽",
    title: "13 deportes con cálculo MET",
    desc: "Desde fútbol hasta construcción física. Cada deporte tiene su rango MET científico escalado por intensidad.",
  },
  {
    icon: "🎓",
    title: "Seguimiento por coach",
    desc: "Vincula a tus clientes con un código de invitación. Ve su dashboard energético, adherencia al plan y evolución de peso.",
  },
  {
    icon: "💬",
    title: "Progress Journal",
    desc: "Check-ins diarios con métricas automáticas adjuntas. Retos semanales del coach. Chat directo con foto.",
  },
]

const PLANS = [
  {
    name:     "Atleta",
    price:    "$3000",
    period:   "",
    desc:     "Para usuarios individuales que quieren tomar control de su fisiología.",
    features: [
      "Motor energético completo",
      "Recetas y planes nutricionales",
      "13 deportes con MET",
      "Registro diario de macros",
      "Evolución de peso adaptativa",
    ],
    cta:      "Comenzar gratis",
    href:     "/auth/register",
    featured: false,""
  },
  {
    name:     "Coach",
    price:    "$29000",
    period:   "/ mes",
    desc:     "Para entrenadores y nutricionistas que gestionan múltiples clientes.",
    features: [
      "Todo lo del plan Atleta",
      "Hasta 20 clientes vinculados",
      "Dashboard energético de cada cliente",
      "Asignación de planes nutricionales",
      "Retos semanales y seguimiento",
      "Chat directo coach ↔ cliente",
      "Códigos de invitación ilimitados",
    ],
    cta:      "Iniciar prueba de 30 días",
    href:     "/auth/register",
    featured: true,
  },
]

const STATS = [
  { value: "7700",  unit: "kcal/kg",  label: "Constante de delta de peso"       },
  { value: "13",    unit: "deportes", label: "Con tablas MET científicas"         },
  { value: "54+",   unit: "alimentos", label: "En la base de ingredientes"        },
  { value: "100%",  unit: "dinámico", label: "Nutrición calculada, nunca almacenada" },
]

// ─── Components ───────────────────────────────────────────────────────────────

function GridBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(251,191,36,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(251,191,36,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
      {/* Radial glow center */}
      <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-amber-500/5 blur-3xl" />
    </div>
  )
}

function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#070709]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-black text-white shadow-lg shadow-amber-500/20">
            ⚡
          </div>
          <span className="font-black text-white tracking-tight">MyTemple</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-500">
          <a href="#features" className="hover:text-white transition-colors">Funciones</a>
          <a href="#how"      className="hover:text-white transition-colors">Cómo funciona</a>
          <a href="#pricing"  className="hover:text-white transition-colors">Precios</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/auth/signin"
            className="hidden sm:block text-sm text-gray-400 hover:text-white transition-colors">
            Iniciar sesión
          </Link>
          <Link href="/auth/register"
            className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20">
            Comenzar gratis
          </Link>
        </div>
      </div>
    </header>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#070709] text-white overflow-x-hidden">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-20 text-center">
        <GridBackground />

        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-400">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          Motor fisiológico adaptativo · Early Access
        </div>

        {/* Headline */}
        <h1 className="relative max-w-4xl text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
          Tu cuerpo es un{" "}
          <span className="relative inline-block">
            <span className="relative z-10 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">
              sistema dinámico
            </span>
            <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-amber-500/0 via-amber-500/60 to-amber-500/0" />
          </span>
          <br />
          trátalo como uno.
        </h1>

        <p className="mt-6 max-w-xl text-base text-gray-400 leading-relaxed md:text-lg">
          MyTemple modela tu metabolismo en tiempo real. Cada comida, cada entrenamiento,
          cada peso registrado alimenta un motor que aprende y se adapta a ti.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/auth/register"
            className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-4 text-base font-bold text-white shadow-xl shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all active:scale-[0.98]">
            Comenzar gratis →
          </Link>
          <a href="#how"
            className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-base font-bold text-gray-300 hover:bg-white/10 hover:text-white transition-all">
            Ver cómo funciona
          </a>
        </div>

        {/* Stats row */}
        <div className="mt-20 grid grid-cols-2 gap-px rounded-2xl border border-white/10 overflow-hidden sm:grid-cols-4 w-full max-w-3xl">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white/5 px-6 py-5 text-center hover:bg-white/8 transition-colors">
              <p className="text-2xl font-black text-white">
                {s.value}
                <span className="ml-1 text-sm font-normal text-amber-400">{s.unit}</span>
              </p>
              <p className="mt-1 text-[11px] text-gray-500 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="relative px-6 py-32">
        <div className="mx-auto max-w-4xl">
          <div className="mb-16 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3">El motor</p>
            <h2 className="text-4xl font-black tracking-tight md:text-5xl">
              Ciencia detrás de cada cálculo
            </h2>
          </div>

          {/* Flow */}
          <div className="relative space-y-0">
            {[
              {
                step: "01",
                title: "Registras lo que comes",
                desc: "Manual con macros o detallado desde tus recetas por slot de comida. Los macros se calculan dinámicamente desde ingredientes reales, nunca de valores almacenados.",
                code: "E_in = Σ(kcal × ingredientes)",
                color: "from-blue-500 to-blue-700",
              },
              {
                step: "02",
                title: "El motor calcula tu gasto",
                desc: "TMB con Mifflin-St Jeor, NEAT por factor de actividad, efecto térmico de los alimentos (25% proteína, 7% carbos, 2% grasa) y kcal de entrenamiento por MET.",
                code: "E_out = TMB + NEAT + Training + TEF",
                color: "from-amber-500 to-orange-600",
              },
              {
                step: "03",
                title: "Calcula tu balance real",
                desc: "La diferencia determina el delta de peso estimado. Cada 7700 kcal de déficit acumulado equivale aproximadamente a 1kg de pérdida.",
                code: "ΔPeso ≈ (E_in − E_out) / 7700",
                color: "from-emerald-500 to-emerald-700",
              },
              {
                step: "04",
                title: "El metabolismo se adapta",
                desc: "Cuando registras tu peso real, el sistema compara con su estimación y ajusta tu factor metabólico. Con cada semana, las predicciones son más precisas.",
                code: "TMB_real = TMB × metabolicAdjustment",
                color: "from-purple-500 to-purple-700",
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-8 pb-12 last:pb-0">
                {/* Line */}
                <div className="flex flex-col items-center">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} text-sm font-black text-white shadow-lg`}>
                    {item.step}
                  </div>
                  {i < 3 && <div className="mt-2 w-px flex-1 bg-white/10" />}
                </div>
                {/* Content */}
                <div className="flex-1 pb-8">
                  <h3 className="text-xl font-black text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-3">{item.desc}</p>
                  <code className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-xs font-mono text-amber-300 block">
                    {item.code}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="relative px-6 py-24 border-t border-white/5">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3">Funciones</p>
            <h2 className="text-4xl font-black tracking-tight md:text-5xl">
              Todo lo que necesitas.<br />
              <span className="text-gray-500">Nada que no necesitas.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-px md:grid-cols-2 lg:grid-cols-3 rounded-2xl border border-white/10 overflow-hidden">
            {FEATURES.map((f, i) => (
              <div key={i}
                className="group bg-white/[0.02] p-7 hover:bg-white/[0.05] transition-colors">
                <div className="mb-4 text-3xl">{f.icon}</div>
                <h3 className="mb-2 text-base font-black text-white">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="relative px-6 py-24 border-t border-white/5">
        <div className="mx-auto max-w-4xl">
          <div className="mb-16 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3">Precios</p>
            <h2 className="text-4xl font-black tracking-tight md:text-5xl">Simple y transparente</h2>
            <p className="mt-4 text-gray-500 text-sm">Sin costos ocultos. Sin límites de funciones para usuarios.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {PLANS.map((plan) => (
              <div key={plan.name}
                className={`relative rounded-3xl p-8 transition-all ${
                  plan.featured
                    ? "bg-gradient-to-b from-amber-500/15 to-orange-500/5 ring-2 ring-amber-500/50 shadow-2xl shadow-amber-500/10"
                    : "bg-white/5 ring-1 ring-white/10"
                }`}>
                {plan.featured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1 text-xs font-black text-white shadow-lg">
                      ⭐ Más popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">{plan.name}</p>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-5xl font-black text-white">{plan.price}</span>
                    {plan.period && <span className="text-gray-500 mb-2">{plan.period}</span>}
                  </div>
                  <p className="text-sm text-gray-500">{plan.desc}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <span className="mt-0.5 text-amber-400 flex-shrink-0">✓</span>
                      <span className="text-gray-300">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href={plan.href}
                  className={`block w-full rounded-2xl py-3.5 text-center text-sm font-bold transition-all active:scale-[0.98] ${
                    plan.featured
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400"
                      : "border border-white/15 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-gray-600">
            El plan Coach incluye 30 días de prueba gratuita. Sin tarjeta de crédito requerida para empezar.
          </p>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="relative px-6 py-32 border-t border-white/5">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-6 mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 text-4xl shadow-2xl shadow-amber-500/30">
            ⚡
          </div>
          <h2 className="text-4xl font-black tracking-tight md:text-5xl mb-4">
            Empieza a entender tu cuerpo hoy
          </h2>
          <p className="text-gray-400 text-base leading-relaxed mb-10">
            No más apps que guardan calorías. Un motor que modela tu fisiología,
            aprende de tus datos y se adapta contigo semana a semana.
          </p>
          <Link href="/auth/register"
            className="inline-block rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-10 py-4 text-base font-bold text-white shadow-xl shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all active:scale-[0.98]">
            Crear cuenta gratis →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 px-6 py-10">
        <div className="mx-auto max-w-6xl flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-black text-white">⚡</div>
            <span className="text-sm font-black text-white">MyTemple</span>
          </div>
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} MyTemple · Motor fisiológico adaptativo
          </p>
          <div className="flex gap-4 text-xs text-gray-600">
            <Link href="/auth/signin"   className="hover:text-white transition-colors">Iniciar sesión</Link>
            <Link href="/auth/register" className="hover:text-white transition-colors">Registrarse</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
