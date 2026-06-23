import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { getInvestorById } from "@/app/actions/investor"
import { ArrowLeft, Wallet, Briefcase, Calendar, CheckCircle2, AlertCircle } from "lucide-react"
import Link from "next/link"

export default async function InvestorDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const investor = await getInvestorById(id)

  if (!investor) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Inversionista no encontrado</h1>
          <Link href="/inversionistas" className="text-primary hover:underline">Volver a la lista</Link>
        </div>
      </div>
    )
  }

  const activeInvestments = investor.investments.filter(i => i.loan.status === "ACTIVE" || i.loan.status === "OVERDUE")
  const paidInvestments = investor.investments.filter(i => i.loan.status === "PAID")
  
  const totalCapitalInvested = investor.investments.reduce((sum, i) => sum + i.investedAmount, 0)
  const activeCapital = activeInvestments.reduce((sum, i) => sum + i.investedAmount, 0)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
        
        <Header />
        
        <main className="flex-1 overflow-y-auto p-8 relative z-0">
          <div className="max-w-5xl mx-auto space-y-6">
            <Link href="/inversionistas" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-white transition-colors">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Inversionistas
            </Link>

            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">{investor.name}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{investor.email || "Sin correo"}</span>
                  <span>•</span>
                  <span>{investor.phone || "Sin teléfono"}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="glass-panel rounded-2xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                    <Wallet className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-1">
                    ${(totalCapitalInvested / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium">Capital Total Fondeado Histórico</p>
                </div>
              </div>

              <div className="glass-panel rounded-2xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                    <Briefcase className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-1">
                    ${(activeCapital / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium">Capital en Préstamos Activos</p>
                </div>
              </div>

              <div className="glass-panel rounded-2xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                    <Calendar className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-1">
                    {activeInvestments.length}
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium">Préstamos en curso</p>
                </div>
              </div>
            </div>

            <h2 className="text-xl font-bold text-white mt-10 mb-4">Desglose de Préstamos</h2>
            <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white/5 text-muted-foreground border-b border-white/5 uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-6 py-4">Cliente (Préstamo)</th>
                      <th className="px-6 py-4">Monto Total del Préstamo</th>
                      <th className="px-6 py-4">Participación</th>
                      <th className="px-6 py-4">Capital Invertido</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4 text-right">Ver Préstamo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {investor.investments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                          Este inversionista aún no ha participado en ningún préstamo.
                        </td>
                      </tr>
                    ) : (
                      investor.investments.map((inv) => (
                        <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-medium text-white">
                            {inv.loan.client.firstName} {inv.loan.client.lastName}
                            <div className="text-xs text-muted-foreground font-mono font-normal mt-0.5">
                              {inv.loan.id.slice(0, 8)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-white">
                            ${(inv.loan.principalAmount / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-white/10 text-white">
                              {inv.participationPercentage}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-emerald-400 font-bold">
                            ${(inv.investedAmount / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4">
                            {inv.loan.status === "ACTIVE" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="h-3 w-3" /> Activo
                              </span>
                            )}
                            {inv.loan.status === "OVERDUE" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
                                <AlertCircle className="h-3 w-3" /> En Mora
                              </span>
                            )}
                            {inv.loan.status === "PAID" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                <CheckCircle2 className="h-3 w-3" /> Finalizado
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link href={`/prestamos/${inv.loanId}`} className="text-primary hover:text-primary/80 hover:underline text-xs font-medium inline-flex items-center gap-1">
                              Ver Detalle
                            </Link>
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
