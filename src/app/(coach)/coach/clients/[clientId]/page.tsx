import CoachClientDashboard from "@/app/_components/domain/CoachClientDashboard"
export const metadata = { title: "Dashboard del cliente" }
export default function ClientPage({ params }: { params: { clientId: string } }) {
  return <CoachClientDashboard clientId={params.clientId} />
}