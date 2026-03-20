// ─────────────────────────────────────────────────────────────────────────────
// src/app/(coach)/layout.tsx
// Guard de rol — solo COACH y ADMIN acceden a estas rutas
// ─────────────────────────────────────────────────────────────────────────────

import { auth } from "@/server/auth"
import { db }   from "@/server/db"
import { redirect } from "next/navigation"

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/api/auth/signin")

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true },
  })

  if (!user || (user.role !== "COACH" && user.role !== "ADMIN")) {
    redirect("/dashboard")
  }

  return <>{children}</>
}

