"use client"

import { useState, useEffect } from "react"
import { signIn }   from "next-auth/react"
import { useRouter } from "next/navigation"
import Link          from "next/link"
import { api }       from "@/trpc/react"

// ─────────────────────────────────────────────────────────────────────────────
// src/components/auth/RegisterPage.tsx
// ─────────────────────────────────────────────────────────────────────────────

type CodePreview = {
  valid:     boolean
  type?:     "COACH" | "CLIENT"
  coachName?: string | null
  expiresAt?: Date
  reason?:   string
}

export default function RegisterPage() {
  const router = useRouter()

  const [name,     setName]     = useState("")
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [confirm,  setConfirm]  = useState("")
  const [code,     setCode]     = useState("")
  const [preview,  setPreview]  = useState<CodePreview | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState(false)

  // Preview del código en tiempo real
  const previewQuery = api.auth.previewCode.useQuery(
    { code: code.replace(/[-\s]/g, "") },
    {
      enabled:   code.replace(/[-\s]/g, "").length >= 6,
      staleTime: 5000,
    }
  )

  useEffect(() => {
    if (previewQuery.data) setPreview(previewQuery.data as CodePreview)
    else if (code.replace(/[-\s]/g, "").length < 6) setPreview(null)
  }, [previewQuery.data, code])

  const register = api.auth.register.useMutation({
    onSuccess: async (data) => {
      // Auto sign-in después del registro
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (res?.ok) {
        if (data.requiresPayment) {
          router.push("/auth/subscribe")  // → checkout PayPal (Fase 2)
        } else {
          router.push("/setup")           // → onboarding de perfil
        }
      }
    },
    onError: (e) => setError(e.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      return setError("Las contraseñas no coinciden.")
    }
    if (password.length < 8) {
      return setError("La contraseña debe tener al menos 8 caracteres.")
    }

    register.mutate({
      name,
      email,
      password,
      registrationCode: code.replace(/[-\s]/g, "") || undefined,
    })
  }

  const handleOAuth = (provider: "google" | "discord") => {
    void signIn(provider, { callbackUrl: "/setup" })
  }

  // Colores según tipo de código
  const codeColor = !preview ? null
    : !preview.valid ? "border-red-500/40 bg-red-500/10 text-red-400"
    : preview.type === "COACH" ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
    : "border-blue-500/40 bg-blue-500/10 text-blue-400"

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0c0c10] p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-3xl shadow-lg">
            ⚡
          </div>
          <h1 className="text-2xl font-black text-white">Crear cuenta</h1>
          <p className="text-sm text-gray-500">Únete a MyTemple</p>
        </div>

        {/* OAuth buttons */}
        <div className="mb-4 space-y-2">
          <button onClick={() => handleOAuth("google")}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white py-3 text-sm font-semibold text-gray-800 hover:bg-gray-100 transition-colors">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Registrarse con Google
          </button>

          <button onClick={() => handleOAuth("discord")}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#5865F2] py-3 text-sm font-semibold text-white hover:bg-[#4752C4] transition-colors">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.003.02.015.04.03.05a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
            Registrarse con Discord
          </button>
        </div>

        {/* Divider */}
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#0c0c10] px-3 text-xs text-gray-600">o con email</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name */}
          <input type="text" placeholder="Tu nombre" value={name}
            onChange={(e) => setName(e.target.value)} required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none" />

          {/* Email */}
          <input type="email" placeholder="tu@email.com" value={email}
            onChange={(e) => setEmail(e.target.value)} required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none" />

          {/* Password */}
          <input type="password" placeholder="Contraseña (mín. 8 caracteres)" value={password}
            onChange={(e) => setPassword(e.target.value)} required minLength={8}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none" />

          <input type="password" placeholder="Confirmar contraseña" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} required
            className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors ${
              confirm && confirm !== password
                ? "border-red-500/50 focus:border-red-500"
                : "border-white/10 focus:border-amber-500"
            }`} />

          {/* Registration code */}
          <div>
            <div className="relative">
              <input
                type="text"
                placeholder="Código de registro (opcional)"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={14}
                className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-sm font-mono tracking-widest text-white placeholder-gray-600 placeholder:font-sans placeholder:tracking-normal focus:outline-none transition-all ${
                  codeColor
                    ? `border-amber-500/40`
                    : "border-white/10 focus:border-amber-500"
                }`}
              />
              {previewQuery.isLoading && code.length >= 6 && (
                <div className="absolute right-3 top-3.5">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                </div>
              )}
            </div>

            {/* Code preview */}
            {preview && (
              <div className={`mt-2 rounded-xl border px-3 py-2 text-xs ${codeColor}`}>
                {!preview.valid ? (
                  <span>⚠️ {preview.reason}</span>
                ) : preview.type === "COACH" ? (
                  <span>🎓 Código de <strong>coach</strong> — acceso early access (30 días de prueba gratis)</span>
                ) : (
                  <span>
                    👤 Código de <strong>cliente</strong>
                    {preview.coachName ? ` — tu coach: ${preview.coachName}` : ""}
                  </span>
                )}
              </div>
            )}

            <p className="mt-1.5 text-[10px] text-gray-600">
              ¿No tienes código? Puedes registrarte sin uno y conectarte a un coach después.
            </p>
          </div>

          <button
            type="submit"
            disabled={register.isPending || (!!preview && !preview.valid)}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-sm font-bold text-white hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 transition-all active:scale-[0.98]">
            {register.isPending ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          ¿Ya tienes cuenta?{" "}
          <Link href="/auth/signin" className="text-amber-400 hover:text-amber-300 font-semibold">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
