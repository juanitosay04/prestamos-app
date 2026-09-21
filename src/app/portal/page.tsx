import { getMyPortfolio } from "@/app/actions/investorPortal"
import { getSession } from "@/lib/session"
import { TrendingUp, DollarSign, Clock, CheckCircle, ArrowRight, AlertTriangle } from "lucide-react"
import Link from "next/link"

const fmt = (cents: number) =>
  "$" + (cents / 100).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const statusLabel: Record<string, { label: string; color: string }> = {
  ACTIVE:    { label: "Activo",       color: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
  OVERDUE:   { label: "En mora",      color: "bg-red-500/15 text-red-400 border-red-500/25" },
  PAID:      { label: "Pagado",       color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
  DEFAULTED: { label: "Incobrable",   color: "bg-slate-500/15 text-slate-400 border-slate-500/25" },
  REFINANCED:{ label: "Refinanciado", color: "bg-purple-500/15 text-purple-400 border-purple-500/25" },
}

export default async function PortalDashboard() {
  const session = await getSession()
  const { loans, totals } = await getMyPortfolio()

  const activeLoans = loans.filter(l => l.status === "ACTIVE" || l.status === "OVERDUE")
  const upcomingPayments = activeLoans
    .filter(l => l.nextDueDate)
    .sort((a, b) => new Date(a.nextDueDate!).getTime() - new Date(b.nextDueDate!).getTime())
    .slice(0, 3)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white">
          Bienvenido, {session?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Aquí está el resumen de tu cartera de inversión en JyJ Préstamos.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0D1424] border border-white/[0.07] rounded-2xl p-5">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Capital Activo</span>
            <DollarSign className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-xl font-extrabold text-amber-400 font-mono">{fmt(totals.totalCapitalPending)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Por recuperar</p>
        </div>

        <div className="bg-[#0D1424] border border-white/[0.07] rounded-2xl p-5">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Rentabilidad</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-xl font-extrabold text-emerald-400 font-mono">{fmt(totals.totalInterestEarned)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Ganado hasta hoy</p>
        </div>

        <div className="bg-[#0D1424] border border-white/[0.07] rounded-2xl p-5">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Por Ganar</span>
            <Clock className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-xl font-extrabold text-blue-400 font-mono">{fmt(totals.totalInterestPending)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Cuotas pendientes</p>
        </div>

        <div className="bg-[#0D1424] border border-white/[0.07] rounded-2xl p-5">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Préstamos</span>
            <CheckCircle className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-xl font-extrabold text-white font-mono">{totals.activeLoans}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{totals.completedLoans} completados</p>
        </div>
      </div>

      {/* Próximos pagos */}
      {upcomingPayments.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Próximos Pagos a Recibir</h2>
          <div className="grid gap-3">
            {upcomingPayments.map((l) => {
              const dueDate = new Date(l.nextDueDate!)
              const today = new Date()
              const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              const myNextPayment = Math.round((l.capitalPending + l.interestPending) / Math.max(1, l.totalInstallments - l.paidInstallments))
              return (
                <Link key={l.loanId} href={`/portal/prestamos/${l.loanId}`}>
                  <div className={`bg-[#0D1424] border rounded-xl p-4 flex items-center justify-between hover:border-amber-500/30 transition-all cursor-pointer ${l.status === "OVERDUE" ? "border-red-500/25" : "border-white/[0.07]"}`}>
                    <div className="flex items-center gap-3">
                      {l.status === "OVERDUE"
                        ? <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                        : <Clock className="h-4 w-4 text-amber-400 flex-shrink-0" />
                      }
                      <div>
                        <p className="text-sm font-bold text-white">Cuota {l.paidInstallments + 1} de {l.totalInstallments}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {daysLeft < 0 ? `Vencida hace ${Math.abs(daysLeft)} días` : daysLeft === 0 ? "Vence hoy" : `Vence en ${daysLeft} días • ${dueDate.toLocaleDateString("es-CO")}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-amber-400 font-mono">{fmt(myNextPayment)}</p>
                      <p className="text-[10px] text-muted-foreground">Tu parte</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Lista de préstamos activos */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Mis Préstamos Activos</h2>
          <Link href="/portal/prestamos" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid gap-3">
          {activeLoans.length === 0 && (
            <div className="bg-[#0D1424] border border-white/[0.07] rounded-xl p-8 text-center text-sm text-muted-foreground">
              No tienes préstamos activos en este momento.
            </div>
          )}
          {activeLoans.slice(0, 4).map((l) => (
            <Link key={l.loanId} href={`/portal/prestamos/${l.loanId}`}>
              <div className="bg-[#0D1424] border border-white/[0.07] hover:border-amber-500/30 rounded-xl p-4 transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">{l.clientFirstName}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold ${statusLabel[l.status]?.color}`}>
                        {statusLabel[l.status]?.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{l.participationPct}% de participación • {fmt(l.investedAmount)} invertidos</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
                </div>
                {/* Barra de progreso */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{l.paidInstallments} de {l.totalInstallments} cuotas</span>
                    <span>{l.progressPct}%</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all"
                      style={{ width: `${l.progressPct}%` }}
                    />
                  </div>
                </div>
                {/* Resumen financiero */}
                <div className="flex gap-4 mt-3 pt-3 border-t border-white/[0.04]">
                  <div>
                    <p className="text-[9px] text-muted-foreground">Ganado</p>
                    <p className="text-xs font-bold text-emerald-400 font-mono">{fmt(l.interestEarned)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">Por ganar</p>
                    <p className="text-xs font-bold text-blue-400 font-mono">{fmt(l.interestPending)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">Capital pendiente</p>
                    <p className="text-xs font-bold text-amber-400 font-mono">{fmt(l.capitalPending)}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
