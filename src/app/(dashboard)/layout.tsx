// src/app/(dashboard)/layout.tsx
import { AuthProvider } from "@/components/provider/SessionProvider"
import { auth } from "@/server/auth"          
import { db } from "@/server/db"
import { redirect } from "next/navigation"
import AppNav from "../_components/domain/navigation/AppNav"


export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session   = await auth()       
  if (!session) redirect("/auth/signin")

  const profile = await db.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true  },
  })

  if (!profile) redirect("/setup")
  const role     = session?.user?.role ?? "USER"
  const userName = session?.user?.name ?? session.user.email ?? "Usuario"


  return (
    <AuthProvider>

      {/* Sidebar — visible en desktop, oculto en mobile */}
      <AppNav role={role} userName={userName} />

       {/* Main content — margen izquierdo para el sidebar en desktop */}
      <main className="md:ml-16 pt-20 md:pt-0 transition-all duration-200">
        {children}
      </main>
    </AuthProvider>
  )
}