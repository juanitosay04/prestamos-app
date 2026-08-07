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
  Receipt, 
  Menu, 
  X,
  FileBarChart,
  ShieldCheck,
  ChevronRight
} from "lucide-react"
import { logout } from "@/app/actions/auth"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Clientes", href: "/clientes", icon: Users },
  { name: "Préstamos", href: "/prestamos", icon: Briefcase },
  { name: "Inversionistas", href: "/inversionistas", icon: Wallet },
  { name: "Gastos", href: "/gastos", icon: Receipt },
  { name: "Informes", href: "/informes", icon: FileBarChart },
]

export function Sidebar({ role }: { role?: string }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  const filteredNavigation = navigation.filter(item => {
    if (role !== "ADMIN" && (item.name === "Gastos" || item.name === "Configuración" || item.name === "Inversionistas" || item.name === "Informes")) {
      return false
    }
    return true
  })

  return (
    <>
      {/* Botón flotante móvil */}
      <button 
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-3.5 left-3.5 z-50 p-2.5 bg-black/60 backdrop-blur-xl rounded-xl border border-white/10 text-white shadow-xl flex items-center justify-center transition-transform active:scale-95"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay móvil */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Barra lateral */}
      <aside className={`fixed inset-y-0 left-0 z-50 md:relative flex h-full w-64 flex-col border-r border-white/[0.08] bg-[#0A0D14]/95 md:bg-[#0A0D14]/60 backdrop-blur-2xl transition-transform duration-300 ease-out shadow-2xl md:shadow-none ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        
        {/* Cabecera del Sidebar con Logo Corporativo de Lujo */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-300 overflow-hidden">
                <img 
                  src="/logo.png" 
                  alt="JyJ Logo" 
                  className="h-full w-full object-cover rounded-[10px]" 
                />
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5 font-sans">
                JyJ Préstamos
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-blue-400/90 font-mono">
                Fintech Platform
              </span>
            </div>
          </Link>

          <button 
            onClick={() => setIsOpen(false)} 
            className="md:hidden p-2 text-muted-foreground hover:text-white rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Enlaces de Navegación */}
        <div className="flex-1 overflow-y-auto py-6 px-3.5 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Módulos Principales
          </div>
          
          <nav className="flex flex-col gap-1">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
              const Icon = item.icon
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-white/[0.08] text-white shadow-sm border border-white/[0.08] backdrop-blur-md"
                      : "text-muted-foreground hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg transition-colors ${
                      isActive 
                        ? "bg-blue-500/20 text-blue-400" 
                        : "text-muted-foreground group-hover:text-white"
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span>{item.name}</span>
                  </div>

                  {isActive && (
                    <ChevronRight className="h-3.5 w-3.5 text-blue-400 opacity-80" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Footer del Sidebar: Configuración y Salir */}
        <div className="border-t border-white/[0.06] p-3.5 space-y-1 bg-black/20">
          {role === "ADMIN" && (
            <Link
              href="/configuracion"
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                pathname === "/configuracion"
                  ? "bg-white/[0.08] text-white border border-white/[0.08]"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <div className="p-1.5 rounded-lg text-muted-foreground">
                <Settings className="h-4 w-4" />
              </div>
              <span>Configuración</span>
            </Link>
          )}

          <button 
            onClick={() => logout()} 
            className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-semibold text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 transition-all text-left"
          >
            <div className="p-1.5 rounded-lg">
              <LogOut className="h-4 w-4" />
            </div>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
