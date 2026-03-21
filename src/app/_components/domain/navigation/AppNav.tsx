"use client"

import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect }    from "react"
import { signOut }                from "next-auth/react"

// ─── Nav config ───────────────────────────────────────────────────────────────

type NavItem = {
  href:    string
  label:   string
  icon:    string
  roles:   string[]  // [] = todos
  bottom?: boolean   // mostrar en bottom tabs mobile
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",    label: "Dashboard",     icon: "⚡", roles: [],                        bottom: true  },
  { href: "/log",          label: "Registrar día", icon: "📋", roles: ["USER","COACH","ADMIN"],   bottom: true  },
  { href: "/weight",       label: "Peso",          icon: "⚖️", roles: ["USER","COACH","ADMIN"],   bottom: false },
  { href: "/library",      label: "recetas",       icon: "🍳", roles: ["USER","COACH","ADMIN"],   bottom: true  },
  { href: "/plans",        label: "Planes",        icon: "📅", roles: ["USER","COACH","ADMIN"],   bottom: false },
  { href: "/ingredients",  label: "Ingredientes",  icon: "🧺", roles: ["USER","COACH","ADMIN"],   bottom: false },
  { href: "/messages",     label: "Mensajes",      icon: "💬", roles: [],                        bottom: true  },
  { href: "/coach/clients",label: "Clientes",      icon: "🎓", roles: ["COACH","ADMIN"],          bottom: false },
  { href: "/superadmin",   label: "Admin",         icon: "🛡️", roles: ["ADMIN"],                 bottom: false },
  { href: "/profile",      label: "Perfil",        icon: "👤", roles: [],                        bottom: true  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isActive(href: string, pathname: string) {
  if (href === "/dashboard") return pathname === "/dashboard"
  return pathname.startsWith(href)
}

function filterByRole(items: NavItem[], role: string) {
  return items.filter((item) => item.roles.length === 0 || item.roles.includes(role))
}

// ─── Bottom tab bar (mobile) ──────────────────────────────────────────────────

function BottomTabs({ role, pathname }: { role: string; pathname: string }) {
  const router  = useRouter()
  const visible = filterByRole(NAV_ITEMS.filter((i) => i.bottom), role)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      <div className="bg-[#0c0c10]/95 backdrop-blur-xl border-t border-white/10 px-2 pb-safe">
        <div className="flex items-center justify-around py-2">
          {visible.map((item) => {
            const active = isActive(item.href, pathname)
            return (
              <button key={item.href} onClick={() => router.push(item.href)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                  active ? "text-amber-400" : "text-gray-600 hover:text-gray-400"
                }`}>
                <span className={`text-xl transition-transform ${active ? "scale-110" : ""}`}>
                  {item.icon}
                </span>
                <span className={`text-[9px] font-semibold transition-all ${
                  active ? "text-amber-400" : "text-gray-600"
                }`}>
                  {item.label}
                </span>
                {active && (
                  <div className="h-0.5 w-4 rounded-full bg-amber-400 mt-0.5" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

// ─── Sidebar (desktop) ────────────────────────────────────────────────────────

function Sidebar({ role, pathname, userName }: {
  role: string; pathname: string; userName?: string
}) {
  const router   = useRouter()
  const [expanded, setExpanded] = useState(false)
  const visible  = filterByRole(NAV_ITEMS, role)

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={`fixed left-0 top-0 bottom-0 z-40 hidden md:flex flex-col
        bg-[#0c0c10]/95 backdrop-blur-xl border-r border-white/10
        transition-all duration-200 ease-in-out
        ${expanded ? "w-56" : "w-16"}`}>

      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/5 ${
        expanded ? "justify-start" : "justify-center"
      }`}>
        <div className="flex-shrink-0 h-8 w-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-black text-white shadow">
          ⚡
        </div>
        {expanded && (
          <span className="font-black text-white text-sm whitespace-nowrap overflow-hidden">
            MyTemple
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-0.5 px-2">
        {visible.map((item) => {
          const active = isActive(item.href, pathname)
          return (
            <button key={item.href} onClick={() => router.push(item.href)}
              title={!expanded ? item.label : undefined}
              className={`w-full flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-left
                transition-all duration-150 group relative
                ${active
                  ? "bg-amber-500/20 text-amber-400"
                  : "text-gray-500 hover:bg-white/5 hover:text-gray-200"
                }`}>
              <span className={`flex-shrink-0 text-xl transition-transform ${
                active ? "scale-110" : "group-hover:scale-105"
              }`}>
                {item.icon}
              </span>
              {expanded && (
                <span className="text-sm font-semibold whitespace-nowrap overflow-hidden">
                  {item.label}
                </span>
              )}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-amber-400" />
              )}
            </button>
          )
        })}
      </nav>

      {/* User + signout */}
      <div className={`border-t border-white/5 p-2 ${expanded ? "" : "flex justify-center"}`}>
        {expanded ? (
          <div className="rounded-xl bg-white/5 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-400/30 to-orange-500/30 flex items-center justify-center text-xs font-black text-amber-400 flex-shrink-0">
                {userName?.[0]?.toUpperCase() ?? "?"}
              </div>
              <span className="text-xs text-gray-300 truncate">{userName}</span>
            </div>
            <button onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              className="w-full rounded-lg bg-white/5 py-1.5 text-xs text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors">
              Cerrar sesión
            </button>
          </div>
        ) : (
          <button onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            title="Cerrar sesión"
            className="p-2.5 rounded-xl text-gray-600 hover:bg-red-500/10 hover:text-red-400 transition-colors">
            <span className="text-xl">🚪</span>
          </button>
        )}
      </div>
    </aside>
  )
}

// ─── Main exported component ──────────────────────────────────────────────────

export default function AppNav({ role, userName }: { role: string; userName?: string }) {
  const pathname = usePathname()

  return (
    <>
      <Sidebar role={role} pathname={pathname} userName={userName} />
      <BottomTabs role={role} pathname={pathname} />
    </>
  )
}
