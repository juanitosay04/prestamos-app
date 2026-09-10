import { SidebarServer as Sidebar } from "@/components/layout/SidebarServer"
import { Header } from "@/components/layout/Header"
import { getSession } from "@/lib/session"
import { getInvestors } from "@/app/actions/investor"
import { Wallet, PieChart, ArrowUpRight, ChevronRight, UserCheck } from "lucide-react"
import { NewInvestorButton } from "./NewInvestorButton"
import { EditInvestorModal } from "./EditInvestorModal"
import { DeleteInvestorButton } from "./DeleteInvestorButton"
import Link from "next/link"

export default async function InversionistasPage() {
  const session = await getSession()
  const investors = await getInvestors()

  const totalFunded = investors.reduce(
    (acc, inv) => acc + inv.investments.reduce((sum, i) => sum + i.investedAmount, 0),
    0
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[#07090E]">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
        
        <Header />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 relative z-0">
          <div className="max-w-7xl mx-auto space-y-6">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  Inversionistas y Fondeo
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Control de capital externo, rendimientos y participación en cartera.
                </p>
              </div>
              {(session?.role === "ADMIN" || session?.role === "SECRETARY") && <NewInvestorButton />}
            </div>

            {/* KPI Cards de Inversionistas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              <div className="glass-panel glass-card-hover rounded-2xl p-5 relative overflow-hidden">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Inversionistas Activos
                  </span>
                  <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/10">
                    <UserCheck className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                    {investors.length}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Fondeadores registrados</p>
                </div>
              </div>

              <div className="glass-panel glass-card-hover rounded-2xl p-5 relative overflow-hidden">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Capital Total Fondeado
                  </span>
                  <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/10">
                    <PieChart className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
                    ${(totalFunded / 100).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                  </h3>
                  <p className="text-xs text-emerald-400/80 mt-1 font-medium">Capital colocado en préstamos</p>
                </div>
              </div>

            </div>

            {/* Tabla de Inversionistas */}
            <div className="glass-panel rounded-2xl overflow-hidden border border-white/[0.08]">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-white/[0.02] text-muted-foreground border-b border-white/[0.06] uppercase text-[10px] font-bold tracking-wider font-mono">
                    <tr>
                      <th className="px-6 py-4">Inversionista</th>
                      <th className="px-6 py-4">Contacto</th>
                      <th className="px-6 py-4">Participaciones</th>
                      <th className="px-6 py-4">Capital Invertido</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {investors.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-xs">
                          No hay inversionistas registrados aún en el sistema.
                        </td>
                      </tr>
                    ) : (
                      investors.map((investor) => {
                        const totalInvested = investor.investments.reduce((acc, curr) => acc + curr.investedAmount, 0)
                        return (
                          <tr key={investor.id} className="hover:bg-white/[0.03] transition-colors">
                            <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
                              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-600/20 to-teal-500/20 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-xs">
                                {investor.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-white text-xs">{investor.name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">{investor.email || "Sin email"}</p>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-white font-mono text-xs">
                              <div>{investor.phone || "Sin teléfono"}</div>
                              {(investor as any).transferKey && (
                                <div className="flex items-center gap-1 mt-1">
                                  <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                                    🔑 {(investor as any).transferKey}
                                  </span>
                                </div>
                              )}
                            </td>
                            
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                {investor.investments.length} Préstamos
                              </span>
                            </td>

                            <td className="px-6 py-4 text-emerald-400 font-mono font-bold text-xs">
                              ${(totalInvested / 100).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                            </td>

                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end items-center gap-2">
                                <Link 
                                  href={`/inversionistas/${investor.id}`} 
                                  className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.08] hover:border-white/20 rounded-lg transition-all inline-flex items-center gap-1 text-[11px] font-semibold active:scale-95" 
                                  title="Ver Liquidación y Rendimiento"
                                >
                                  Ver Detalles <ChevronRight className="h-3 w-3" />
                                </Link>
                                {session?.role === "ADMIN" && (
                                  <>
                                    <EditInvestorModal investor={{ id: investor.id, name: investor.name, phone: investor.phone, email: investor.email, transferKey: (investor as any).transferKey || null }} />
                                    <DeleteInvestorButton id={investor.id} />
                                  </>
                                )}
                              </div>
                            </td>

                          </tr>
                        )
                      })
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
