// src/app/(onboarding)/layout.tsx
import { auth }     from "@/server/auth"
import { db }       from "@/server/db"
import { redirect } from "next/navigation"

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  // Sin sesión → login
  if (!session) redirect("/auth/signin")

  // Ya completó el perfil → no necesita onboarding
  const profile = await db.userProfile.findUnique({
    where:  { userId: session.user.id },
    select: { id: true },
  })
  if (profile) redirect("/dashboard")

  return <>{children}</>
}