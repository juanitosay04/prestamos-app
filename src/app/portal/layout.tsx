import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { logout } from "@/app/actions/auth"
import { TrendingUp, LayoutDashboard, LogOut, Briefcase } from "lucide-react"
import Link from "next/link"

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || session.role !== "INVESTOR") redirect("/login")

  return (
    <div className="min-h-screen bg-[#07090E] flex">
      {/* Sidebar del portal */}
      <aside className="w-60 flex-shrink-0 border-r border-white/[0.06] bg-[#0A0D15] flex flex-col">
        {/* Logo / Brand */}
        <div className="p-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <TrendingUp className="h-5 w-5 text-black" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-white tracking-tight">Portal</p>
              <p className="text-[10px] text-amber-400 font-semibold">Inversionista</p>
            </div>
          </div>
        </div>

        {/* Info del usuario */}
        <div className="px-4 py-4 border-b border-white/[0.04]">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <p className="text-xs font-bold text-amber-300 truncate">{session.name}</p>
            <p className="text-[10px] text-amber-500/70 truncate mt-0.5">{session.email}</p>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-3 space-y-1">
          <Link
            href="/portal"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all group"
          >
            <LayoutDashboard className="h-4 w-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
            Mi Cartera
          </Link>
          <Link
            href="/portal/prestamos"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all group"
          >
            <Briefcase className="h-4 w-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
            Mis Préstamos
          </Link>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/[0.06]">
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
