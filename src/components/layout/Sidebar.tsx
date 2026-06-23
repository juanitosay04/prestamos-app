"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Wallet, 
  Settings,
  LogOut,
  Bell,
  Receipt
} from "lucide-react"
import { logout } from "@/app/actions/auth"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Clientes", href: "/clientes", icon: Users },
  { name: "Préstamos", href: "/prestamos", icon: Briefcase },
  { name: "Inversionistas", href: "/inversionistas", icon: Wallet },
  { name: "Gastos", href: "/gastos", icon: Receipt },
]

export function Sidebar({ role }: { role?: string }) {
  const pathname = usePathname()

  const filteredNavigation = navigation.filter(item => {
    if (role !== "ADMIN" && (item.name === "Gastos" || item.name === "Configuración")) {
      return false
    }
    return true
  })

  return (
    <div className="flex h-full w-64 flex-col border-r border-white/5 bg-black/40 backdrop-blur-xl">
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-lg">J</span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">JyJ Préstamos</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4">
        <nav className="flex flex-col gap-1">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="border-t border-white/5 p-4">
        <div className="flex flex-col gap-1">
          {role === "ADMIN" && (
            <Link
              href="/configuracion"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-white transition-all"
            >
              <Settings className="h-5 w-5" />
              Configuración
            </Link>
          )}
          <button onClick={() => logout()} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-all text-left">
            <LogOut className="h-5 w-5" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  )
}
