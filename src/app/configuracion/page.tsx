import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { getUsers, deleteUser } from "@/app/actions/user"
import { MoreVertical, Trash2, Shield, User as UserIcon } from "lucide-react"
import { NewUserButton } from "./NewUserButton"
import { EditUserButton } from "./EditUserButton"

export default async function ConfiguracionPage() {
  const users = await getUsers()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        
        <Header />
        
        <main className="flex-1 overflow-y-auto p-8 relative z-0">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Gestión de Usuarios</h1>
                <p className="text-muted-foreground">Administra los accesos y roles del sistema.</p>
              </div>
              <NewUserButton />
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white/5 text-muted-foreground border-b border-white/5 uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-6 py-4">Usuario</th>
                      <th className="px-6 py-4">Rol</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4">Fecha Creación</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                          No hay usuarios registrados.
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-white">{user.name}</p>
                              <p className="text-xs text-muted-foreground font-normal">{user.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                              user.role === "ADMIN" 
                                ? "bg-primary/10 text-primary border-primary/20" 
                                : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            }`}>
                              {user.role === "ADMIN" ? <Shield className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                              {user.role === "ADMIN" ? "Administrador" : "Secretaria"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Activo
                            </span>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <EditUserButton user={user} />
                              <form action={deleteUser.bind(null, user.id)}>
                                <button type="submit" className="p-2 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors" title="Eliminar">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
