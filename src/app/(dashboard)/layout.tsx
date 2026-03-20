// src/app/(dashboard)/layout.tsx
import { auth } from "@/server/auth"          
import { db } from "@/server/db"
import { redirect } from "next/navigation"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()                
  if (!session) redirect("/api/auth/signin")

  const profile = await db.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  if (!profile) redirect("/setup")

  return <>{children}</>
}