

// ─────────────────────────────────────────────────────────────────────────────
// src/app/(dashboard)/weight/page.tsx
// Registro de peso + adaptación metabólica
// ─────────────────────────────────────────────────────────────────────────────
import WeightLogForm from "@/app/_components/domain/WeightLogForm"

export const metadata = { title: "Registrar peso" }

export default function WeightPage() {
  return <WeightLogForm />
}

