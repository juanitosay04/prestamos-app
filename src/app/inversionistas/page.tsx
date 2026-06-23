import { SidebarServer as Sidebar } from "@/components/layout/SidebarServer"
import { Header } from "@/components/layout/Header"
import { getSession } from "@/lib/session"
import { getInvestors } from "@/app/actions/investor"
import { Wallet, MoreVertical, FileEdit, Trash2, PieChart } from "lucide-react"
import { NewInvestorButton } from "./NewInvestorButton"
import { EditInvestorModal } from "./EditInvestorModal"
import { DeleteInvestorButton } from "./DeleteInvestorButton"
import Link from "next/link"

export default async function InversionistasPage() {
  const session = await getSession()
  const investors = await getInvestors()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
        
        <Header />
        
        <main className="flex-1 overflow-y-auto p-8 relative z-0">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Inversionistas</h1>
                <p className="text-muted-foreground">Gestiona tu red de inversionistas y su capital.</p>
              </div>
              {session?.role === "ADMIN" && <NewInvestorButton />}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                    <Wallet className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-1">{investors.length}</h3>
                  <p className="text-sm text-muted-foreground font-medium">Inversionistas Activos</p>
                </div>
              </div>
              <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                    <PieChart className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-1">
                    ${(investors.reduce((acc, inv) => acc + inv.investments.reduce((sum, i) => sum + i.investedAmount, 0), 0) / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium">Capital Total Fondeado</p>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white/5 text-muted-foreground border-b border-white/5 uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-6 py-4">Inversionista</th>
                      <th className="px-6 py-4">Teléfono</th>
                      <th className="px-6 py-4">Préstamos Activos</th>
                      <th className="px-6 py-4">Capital Invertido</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {investors.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                          No hay inversionistas registrados aún.
                        </td>
                      </tr>
                    ) : (
                      investors.map((investor) => {
                        const totalInvested = investor.investments.reduce((acc, curr) => acc + curr.investedAmount, 0)
                        return (
                          <tr key={investor.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                                {investor.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-white">{investor.name}</p>
                                <p className="text-xs text-muted-foreground font-normal">{investor.email}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">{investor.phone || "N/A"}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {investor.investments.length} Préstamos
                              </span>
                            </td>
                            <td className="px-6 py-4 text-emerald-400 font-medium">
                              ${(totalInvested / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <Link href={`/inversionistas/${investor.id}`} className="p-2 text-primary hover:text-white hover:bg-primary/20 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium" title="Ver Detalles">
                                  Ver Detalles
                                </Link>
                                {session?.role === "ADMIN" && (
                                  <>
                                    <EditInvestorModal investor={{ id: investor.id, name: investor.name, phone: investor.phone, email: investor.email }} />
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
