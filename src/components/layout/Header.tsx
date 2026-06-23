import { NotificationBell } from "./NotificationBell"
import { GlobalSearch } from "./GlobalSearch"
import { getSession } from "@/lib/session"

export async function Header() {
  const session = await getSession()

  return (
    <header className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-4 pl-14 md:px-8 sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <GlobalSearch />
      </div>
      
      <div className="flex items-center gap-4">
        <NotificationBell />
        
        <div className="flex items-center gap-3 pl-4 border-l border-white/10">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-sm font-medium text-white">{session?.email?.split('@')[0] || "Usuario"}</span>
            <span className="text-xs text-muted-foreground">{session?.role === "ADMIN" ? "Administrador" : "Secretaria(o)"}</span>
          </div>
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center border border-white/10">
            <span className="text-sm font-bold text-white">{session?.email?.charAt(0).toUpperCase() || "U"}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
