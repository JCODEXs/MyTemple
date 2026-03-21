import { auth }     from "@/server/auth"
import { db }       from "@/server/db"
import { redirect } from "next/navigation"
import AppNav       from "@/app/_components/domain/navigation/AppNav"

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/auth/signin")

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true, name: true },
  })

  if (!user || user.role !== "ADMIN") redirect("/dashboard")

  return (
    <div className="min-h-screen bg-[#0c0c10]">
      <AppNav role="ADMIN" userName={user.name ?? ""} />
      <main className="md:ml-16 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  )