// ─────────────────────────────────────────────────────────────────────────────
// src/app/(onboarding)/setup/page.tsx
// Página de onboarding — solo accesible si el usuario NO tiene perfil
// ─────────────────────────────────────────────────────────────────────────────
import OnboardingForm from "@/app/_components/domain/OnboardingForm"

export const metadata = { title: "Configura tu perfil" }

export default function SetupPage() {
  return <OnboardingForm />
}
