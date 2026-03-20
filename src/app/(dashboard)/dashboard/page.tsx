// ─────────────────────────────────────────────────────────────────────────────
// src/app/(dashboard)/dashboard/page.tsx
// ─────────────────────────────────────────────────────────────────────────────

import Dashboard from "@/app/_components/domain/Dashboard"

export const metadata = { title: "Dashboard" }

export default function DashboardPage() {
  return <Dashboard />
}



// ─────────────────────────────────────────────────────────────────────────────
// ADDITION to src/server/api/routers/user-profile.ts
// El getSummary ya devuelve estimatedCurrentWeight y latestLoggedWeight
// pero necesitamos también el objeto user para el nombre en el saludo.
// Asegúrate que el service incluye la relación user:
// ─────────────────────────────────────────────────────────────────────────────

