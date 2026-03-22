import { use } from "react"
import CoachClientDashboard from "@/app/_components/domain/CoachClientDashboard"

export const metadata = { title: "Dashboard del cliente" }

export default function ClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params)
  return <CoachClientDashboard clientId={clientId} />
}