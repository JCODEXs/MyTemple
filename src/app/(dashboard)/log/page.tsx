
// ─────────────────────────────────────────────────────────────────────────────
// src/app/(dashboard)/log/page.tsx
// Registro diario de alimentación + entrenamiento
// ─────────────────────────────────────────────────────────────────────────────
import DailyLogForm from "@/app/_components/domain/DailyLogForm"

export const metadata = { title: "Registro del día" }

export default function LogPage() {
  return <DailyLogForm />
}

