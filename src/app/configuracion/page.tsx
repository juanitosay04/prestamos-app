import { SidebarServer as Sidebar } from "@/components/layout/SidebarServer"
import { Header } from "@/components/layout/Header"
import { getUsers, deleteUser } from "@/app/actions/user"
import { getTelegramSettings, getSecretaryCommissionSettings, getCompanyCommissionSettings } from "@/app/actions/settings"
import { Trash2, Shield, User as UserIcon, CheckCircle2 } from "lucide-react"
import { NewUserButton } from "./NewUserButton"
import { EditUserButton } from "./EditUserButton"
import { TelegramSettings } from "./TelegramSettings"
import { CommissionSettings } from "./CommissionSettings"

export default async function ConfiguracionPage() {
  const users = await getUsers()
  const telegramSettings = await getTelegramSettings()
  const secretaryCommissionSettings = await getSecretaryCommissionSettings()
  const companyCommissionSettings = await getCompanyCommissionSettings()

  return (
    <div className="flex h-screen overflow-hidden bg-[#090D16]">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Glow ambient background lights */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[140px] pointer-events-none" />
        
        <Header />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-7 relative z-0">
          <div className="max-w-[1300px] mx-auto space-y-8">
            
            {/* Cabecera */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  Panel de Administración
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Configuración y Accesos del Sistema
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Administración de credenciales de colaboradores, reglas de comisión de JyJ y secretaría e integraciones.
              </p>
            </div>

            {/* Reglas de Comisión por Defecto (Empresa JyJ y Secretaría) */}
            <CommissionSettings 
              secretarySettings={secretaryCommissionSettings} 
              companySettings={companyCommissionSettings} 
            />

            {/* Gestión de Usuarios y Roles */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-white">
                    Colaboradores y Permisos
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Cuentas activas con acceso a la plataforma.
                  </p>
                </div>
                <NewUserButton />
              </div>

              <div className="glass-panel rounded-2xl overflow-hidden border border-white/[0.08]">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-white/[0.02] text-muted-foreground border-b border-white/[0.06] uppercase text-[10px] font-bold tracking-wider font-mono">
                      <tr>
                        <th className="px-6 py-4">Colaborador</th>
                        <th className="px-6 py-4">Nivel de Acceso</th>
                        <th className="px-6 py-4">Estado</th>
                        <th className="px-6 py-4">Fecha Alta</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-xs">
                            No hay usuarios registrados.
                          </td>
                        </tr>
                      ) : (
                        users.map((user) => (
                          <tr key={user.id} className="hover:bg-white/[0.03] transition-colors">
                            <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
                              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600/20 to-indigo-500/20 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs">
                                {user.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-white text-xs">{user.name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">{user.email}</p>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                user.role === "ADMIN" 
                                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20" 
                                  : "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
                              }`}>
                                {user.role === "ADMIN" ? <Shield className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                                {user.role === "ADMIN" ? "Administrador" : "Secretaría"}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="h-3 w-3" /> Activo
                              </span>
                            </td>

                            <td className="px-6 py-4 text-muted-foreground text-xs font-mono">
                              {new Date(user.createdAt).toLocaleDateString('es-CO')}
                            </td>

                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end items-center gap-2">
                                <EditUserButton user={user} />
                                <form action={deleteUser.bind(null, user.id)}>
                                  <button 
                                    type="submit" 
                                    className="p-2 text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors border border-white/[0.04]" 
                                    title="Eliminar usuario"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </form>
                              </div>
                            </td>
                          </tr>
                        )
                      ))
                    }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Configuración de Notificaciones en Telegram */}
            <TelegramSettings initialSettings={telegramSettings} />

          </div>
        </main>
      </div>
    </div>
  )
}
