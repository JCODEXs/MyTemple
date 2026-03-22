"use client"

// ─────────────────────────────────────────────────────────────────────────────
// src/components/auth/SignInPage.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react"
import { signIn }   from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

export function SignInPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const errorParam   = searchParams.get("error")
  const callbackUrl  = searchParams.get("callbackUrl") ?? "/dashboard"

  const [tab,       setTab]       = useState<"credentials" | "magic">("credentials")
  const [email,     setEmail]     = useState("")
  const [password,  setPassword]  = useState("")
  const [loading,   setLoading]   = useState(false)
  const [magicSent, setMagicSent] = useState(false)
  const [error,     setError]     = useState(
    errorParam === "SubscriptionExpired"
      ? "Tu suscripción ha vencido. Renuévala para acceder."
      : errorParam === "TrialExpired"
      ? "Tu período de prueba ha expirado. Suscríbete para continuar."
      : errorParam === "OAuthAccountNotLinked"
      ? "Ya existe una cuenta con ese email. Inicia sesión con tu método original."
      : null
  )

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await signIn("credentials", {
      email, password,
      // redirect:    false,
      callbackUrl,
    })

    setLoading(false)
    if (res?.error) {
      setError("Email o contraseña incorrectos.")
    } else {
      router.push(callbackUrl)
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    await signIn("resend", { email, redirect: false })
    setLoading(false)
    setMagicSent(true)
  }

  const handleOAuth = (provider: "google" | "discord") => {
    void signIn(provider, { callbackUrl })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0c0c10] p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-3xl shadow-lg">
            ⚡
          </div>
          <h1 className="text-2xl font-black text-white">MyTemple</h1>
          <p className="text-sm text-gray-500">Tu motor fisiológico inteligente</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* OAuth buttons */}
        <div className="mb-4 space-y-2">
          <button onClick={() => handleOAuth("google")}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white py-3 text-sm font-semibold text-gray-800 shadow hover:bg-gray-100 transition-colors">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>

          <button onClick={() => handleOAuth("discord")}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#5865F2] py-3 text-sm font-semibold text-white hover:bg-[#4752C4] transition-colors">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.003.02.015.04.03.05a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
            Continuar con Discord
          </button>
        </div>

        {/* Divider */}
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#0c0c10] px-3 text-xs text-gray-600">o</span>
          </div>
        </div>

        {/* Tab toggle */}
        <div className="flex rounded-xl bg-white/5 p-1 mb-4">
          {(["credentials", "magic"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                tab === t ? "bg-amber-500 text-white" : "text-gray-500 hover:text-gray-300"
              }`}>
              {t === "credentials" ? "🔐 Contraseña" : "✉️ Magic link"}
            </button>
          ))}
        </div>

        {/* Form */}
        {tab === "credentials" ? (
          <form onSubmit={handleCredentials} className="space-y-3">
            <input type="email" placeholder="tu@email.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none" />
            <input type="password" placeholder="Contraseña" value={password}
              onChange={(e) => setPassword(e.target.value)} required minLength={8}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none" />
            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-bold text-white hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition-all">
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </form>
        ) : magicSent ? (
          <div className="rounded-2xl bg-green-500/10 border border-green-500/20 p-6 text-center">
            <div className="text-4xl mb-2">✉️</div>
            <p className="font-bold text-white">Revisa tu email</p>
            <p className="text-sm text-gray-400 mt-1">
              Enviamos un enlace de acceso a <span className="text-amber-400">{email}</span>
            </p>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-3">
            <input type="email" placeholder="tu@email.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none" />
            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-bold text-white hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition-all">
              {loading ? "Enviando..." : "Enviar magic link"}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-gray-600">
          ¿Sin cuenta?{" "}
          <Link href="/auth/register" className="text-amber-400 hover:text-amber-300 font-semibold">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}
