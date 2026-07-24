"use client"

import { useState, useEffect } from "react"
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
  Receipt,
  Menu,
  X
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
  const [isOpen, setIsOpen] = useState(false)

  // Close sidebar on route change on mobile
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  const filteredNavigation = navigation.filter(item => {
    if (role !== "ADMIN" && (item.name === "Gastos" || item.name === "Configuración" || item.name === "Inversionistas")) {
      return false
    }
    return true
  })

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-black/50 backdrop-blur-md rounded-lg border border-white/10 text-white flex items-center justify-center"
      >
        <Menu className="h-5 w-5" />
      </button>

      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 md:relative flex h-full w-64 flex-col border-r border-white/5 bg-black/90 md:bg-black/40 backdrop-blur-xl transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-lg">J</span>
            </div>
            <span className="text-lg font-semibold tracking-tight text-white">JyJ Préstamos</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="md:hidden text-muted-foreground hover:text-white">
            <X className="h-5 w-5" />
          </button>
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
    </>
  )
}
