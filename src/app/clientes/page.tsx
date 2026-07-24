import { SidebarServer as Sidebar } from "@/components/layout/SidebarServer"
import { Header } from "@/components/layout/Header"
import { getClients } from "@/app/actions/client"
import { MoreVertical, FileEdit, Trash2, FileText, ShieldAlert } from "lucide-react"
import { NewClientButton } from "./NewClientButton"
import { EditClientModal } from "./EditClientModal"
import { BlacklistToggleButton } from "./BlacklistToggleButton"
import { ClientStatusFilter } from "./ClientStatusFilter"

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams
  const todosClientes = await getClients()

  const clientes = todosClientes.filter(c => {
    if (status === "Activos") return !c.isBlacklisted
    if (status === "ListaNegra") return c.isBlacklisted
    return true
  })

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
                <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Clientes</h1>
                <p className="text-muted-foreground">Administra la base de datos de tus clientes.</p>
              </div>
              <div className="flex items-center gap-4">
                <ClientStatusFilter currentStatus={status} />
                <NewClientButton />
              </div>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
              {/* Mobile View: Cards */}
              <div className="md:hidden flex flex-col divide-y divide-white/5">
                {clientes.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No hay clientes registrados aún.
                  </div>
                ) : (
                  clientes.map((cliente) => (
                    <div key={cliente.id} className="p-4 space-y-4 hover:bg-white/5 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0">
                            {cliente.firstName.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-medium text-white">{cliente.firstName} {cliente.lastName}</h3>
                            <p className="text-xs text-muted-foreground">{cliente.idDocument}</p>
                          </div>
                        </div>
                        {cliente.isBlacklisted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-destructive/10 text-destructive border border-destructive/20">
                            <ShieldAlert className="h-3 w-3" /> L. Negra
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Activo
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground mb-0.5">Teléfono</p>
                          <p className="text-white">{cliente.phone}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-0.5">Dirección</p>
                          <p className="text-white truncate">
                            {cliente.city ? `${cliente.city}, ` : ''}
                            {cliente.neighborhood ? `${cliente.neighborhood}, ` : ''}
                            {cliente.address || ''} {cliente.addressOptions || ''}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                        <BlacklistToggleButton clientId={cliente.id} isBlacklisted={cliente.isBlacklisted} />
                        <button className="p-2 text-muted-foreground hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Ver Préstamos">
                          <FileText className="h-4 w-4" />
                        </button>
                        <EditClientModal client={cliente} />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white/5 text-muted-foreground border-b border-white/5 uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-6 py-4">Nombre Completo</th>
                      <th className="px-6 py-4">Documento</th>
                      <th className="px-6 py-4">Teléfono</th>
                      <th className="px-6 py-4">Dirección</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {clientes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                          No hay clientes registrados aún.
                        </td>
                      </tr>
                    ) : (
                      clientes.map((cliente) => (
                        <tr key={cliente.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                              {cliente.firstName.charAt(0)}
                            </div>
                            {cliente.firstName} {cliente.lastName}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">{cliente.idDocument}</td>
                          <td className="px-6 py-4 text-muted-foreground">{cliente.phone}</td>
                          <td className="px-6 py-4 text-muted-foreground text-xs">
                            {cliente.city ? `${cliente.city}, ` : ''}
                            {cliente.neighborhood ? `${cliente.neighborhood}, ` : ''}
                            {cliente.address || ''} {cliente.addressOptions || ''}
                          </td>
                          <td className="px-6 py-4">
                            {cliente.isBlacklisted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
                                <ShieldAlert className="h-3 w-3" /> Lista Negra
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Activo
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <BlacklistToggleButton clientId={cliente.id} isBlacklisted={cliente.isBlacklisted} />
                              <button className="p-2 text-muted-foreground hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Ver Préstamos">
                                <FileText className="h-4 w-4" />
                              </button>
                              <EditClientModal client={cliente} />
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
