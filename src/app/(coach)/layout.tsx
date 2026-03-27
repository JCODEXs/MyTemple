

// src/app/(dashboard)/layout.tsx
import { AuthProvider } from "@/components/provider/SessionProvider"
import { auth } from "@/server/auth"          
import { db } from "@/server/db"
import { redirect } from "next/navigation"
import AppNav from "../_components/domain/navigation/AppNav"


export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session   = await auth()       
  if (!session) redirect("/auth/signin")


  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true, name: true, email: true },
  })
  const role     = user?.role ?? "USER"
  const userName = user?.name ?? user?.email ?? "Usuario"

  if (!user || (role !== "COACH" && role !== "ADMIN")) {
    redirect("/dashboard")
  }

  return (
    <AuthProvider>

      {/* Sidebar — visible en desktop, oculto en mobile */}
      <AppNav role={role} userName={userName} />

       {/* Main content — margen izquierdo para el sidebar en desktop */}
      <main className="md:ml-16 pt-20 md:pt-0 transition-all duration-200 ">
        {children}
      </main>
    </AuthProvider>
  )
}