import { NotificationBell } from "./NotificationBell"
import { GlobalSearch } from "./GlobalSearch"
import { getSession } from "@/lib/session"
import { Shield } from "lucide-react"

export async function Header() {
  const session = await getSession()
  const userName = session?.email?.split('@')[0] || "Usuario"
  const userInitial = userName.charAt(0).toUpperCase()
  const isAdmin = session?.role === "ADMIN"

  return (
    <header className="h-16 border-b border-white/[0.06] bg-[#0A0D14]/80 backdrop-blur-xl flex items-center justify-between px-4 pl-14 md:px-8 sticky top-0 z-20">
      <div className="flex items-center gap-4 flex-1 max-w-lg">
        <GlobalSearch />
      </div>
      
      <div className="flex items-center gap-4">
        <NotificationBell />
        
        <div className="flex items-center gap-3 pl-4 border-l border-white/[0.08]">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-xs font-bold text-white capitalize">{userName}</span>
            <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
              {isAdmin ? (
                <span className="text-blue-400 font-semibold flex items-center gap-0.5">
                  <Shield className="h-3 w-3 inline" /> Administrador
                </span>
              ) : (
                "Secretaría"
              )}
            </span>
          </div>

          <div className="relative">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center border border-white/10 shadow-md shadow-blue-500/10">
              <span className="text-xs font-extrabold text-white">{userInitial}</span>
            </div>
            {/* Status dot (online) */}
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0A0D14]" />
          </div>
        </div>
      </div>
    </header>
  )
}
