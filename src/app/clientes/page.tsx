import { SidebarServer as Sidebar } from "@/components/layout/SidebarServer"
import { Header } from "@/components/layout/Header"
import { getClients } from "@/app/actions/client"
import { FileText, ShieldAlert, Phone, MapPin, User, CheckCircle2, ArrowRight } from "lucide-react"
import { NewClientButton } from "./NewClientButton"
import { EditClientModal } from "./EditClientModal"
import { BlacklistToggleButton } from "./BlacklistToggleButton"
import { ClientStatusFilter } from "./ClientStatusFilter"
import Link from "next/link"

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams
  const todosClientes = await getClients()

  const clientes = todosClientes.filter(c => {
    if (status === "Activos") return !c.isBlacklisted
    if (status === "ListaNegra") return c.isBlacklisted
    return true
  })

  return (
    <div className="flex h-screen overflow-hidden bg-[#090D16]">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Glow lights */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[140px] pointer-events-none" />
        
        <Header />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-7 relative z-0">
          <div className="max-w-[1400px] mx-auto space-y-7">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-white/[0.04]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    Gestión de Titulares
                  </span>
                  <span className="text-white/20">•</span>
                  <span className="text-xs text-muted-foreground">{clientes.length} registrados</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Directorio de Clientes
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <ClientStatusFilter currentStatus={status} />
                <NewClientButton />
              </div>
            </div>

            {/* Panel de Clientes */}
            <div className="glass-panel rounded-2xl overflow-hidden border border-white/[0.08]">
              
              {/* Mobile View: Cards */}
              <div className="md:hidden flex flex-col divide-y divide-white/[0.04]">
                {clientes.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-xs">
                    No hay clientes registrados o que coincidan con el filtro.
                  </div>
                ) : (
                  clientes.map((cliente) => (
                    <div key={cliente.id} className="p-4 space-y-3.5 hover:bg-white/[0.02] transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600/20 to-indigo-500/20 text-blue-400 border border-blue-500/20 flex items-center justify-center font-extrabold text-sm flex-shrink-0">
                            {cliente.firstName.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-white">{cliente.firstName} {cliente.lastName}</h3>
                            <p className="text-[11px] text-muted-foreground font-mono">CC: {cliente.idDocument}</p>
                          </div>
                        </div>
                        {cliente.isBlacklisted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <ShieldAlert className="h-3 w-3" /> Lista Negra
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> Activo
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04]">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-blue-400" />
                          <span className="text-white text-[11px] font-mono">{cliente.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="text-white text-[11px] truncate">
                            {cliente.city ? `${cliente.city}` : 'Sin ciudad'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center gap-2 pt-2 border-t border-white/[0.04]">
                        <Link 
                          href={`/clientes/${cliente.id}`} 
                          className="h-8 px-3 text-xs font-semibold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl transition-all inline-flex items-center gap-1.5"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Ver Expediente</span>
                        </Link>
                        
                        <div className="flex items-center gap-1.5">
                          <BlacklistToggleButton clientId={cliente.id} isBlacklisted={cliente.isBlacklisted} />
                          <EditClientModal client={cliente} />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-white/[0.02] text-muted-foreground border-b border-white/[0.06] uppercase text-[10px] font-bold tracking-wider font-mono">
                    <tr>
                      <th className="px-6 py-4">Titular</th>
                      <th className="px-6 py-4">Documento Identidad</th>
                      <th className="px-6 py-4">Contacto Directo</th>
                      <th className="px-6 py-4">Ubicación</th>
                      <th className="px-6 py-4">Estado Crediticio</th>
                      <th className="px-6 py-4 text-right">Acciones & Expediente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {clientes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground text-xs">
                          No hay clientes registrados aún.
                        </td>
                      </tr>
                    ) : (
                      clientes.map((cliente) => (
                        <tr key={cliente.id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600/20 to-indigo-500/20 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {cliente.firstName.charAt(0)}
                            </div>
                            <span className="font-semibold">{cliente.firstName} {cliente.lastName}</span>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{cliente.idDocument}</td>
                          <td className="px-6 py-4 text-white font-mono text-xs">{cliente.phone}</td>
                          <td className="px-6 py-4 text-muted-foreground text-xs">
                            {cliente.city ? `${cliente.city}, ` : ''}
                            {cliente.neighborhood ? `${cliente.neighborhood}, ` : ''}
                            {cliente.address || 'Sin dirección'}
                          </td>
                          <td className="px-6 py-4">
                            {cliente.isBlacklisted ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                <ShieldAlert className="h-3 w-3" /> Lista Negra
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="h-3 w-3" /> Al Día / Activo
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end items-center gap-2">
                              <Link 
                                href={`/clientes/${cliente.id}`} 
                                className="h-8 px-3 text-xs font-semibold text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-sm"
                                title="Ver Expediente de Préstamos"
                              >
                                <FileText className="h-3.5 w-3.5 text-blue-400" />
                                <span>Ver Expediente</span>
                              </Link>
                              
                              <BlacklistToggleButton clientId={cliente.id} isBlacklisted={cliente.isBlacklisted} />
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
