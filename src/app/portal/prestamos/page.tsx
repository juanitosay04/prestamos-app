import { getMyPortfolio } from "@/app/actions/investorPortal"
import { ArrowRight, CheckCircle, Briefcase } from "lucide-react"
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

export default async function PortalLoansPage() {
  const { loans, totals } = await getMyPortfolio()

  const active = loans.filter(l => l.status === "ACTIVE" || l.status === "OVERDUE")
  const completed = loans.filter(l => l.status === "PAID" || l.status === "DEFAULTED" || l.status === "REFINANCED")

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-amber-400" />
          Mis Préstamos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {loans.length} préstamo(s) en total · {totals.activeLoans} activos · {totals.completedLoans} completados
        </p>
      </div>

      {/* Activos */}
      {active.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Activos e Histórico</h2>
          <div className="space-y-3">
            {active.map(l => <LoanCard key={l.loanId} l={l} />)}
          </div>
        </section>
      )}

      {/* Completados */}
      {completed.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
            Completados / Histórico
          </h2>
          <div className="space-y-3">
            {completed.map(l => <LoanCard key={l.loanId} l={l} />)}
          </div>
        </section>
      )}

      {loans.length === 0 && (
        <div className="bg-[#0D1424] border border-white/[0.07] rounded-2xl p-12 text-center">
          <p className="text-muted-foreground text-sm">Aún no tienes préstamos asignados.</p>
        </div>
      )}
    </div>
  )
}

function LoanCard({ l }: { l: any }) {
  return (
    <Link href={`/portal/prestamos/${l.loanId}`}>
      <div className="bg-[#0D1424] border border-white/[0.07] hover:border-amber-500/30 rounded-xl p-5 transition-all cursor-pointer">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-bold text-white">{l.clientFirstName}</p>
              <span className={`text-[9px] px-2 py-0.5 rounded-full border font-semibold ${statusLabel[l.status]?.color}`}>
                {statusLabel[l.status]?.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {l.participationPct}% participación · {fmt(l.investedAmount)} invertidos
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-500 mt-1" />
        </div>

        {/* Barra de progreso */}
        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
            <span>{l.paidInstallments} de {l.totalInstallments} cuotas pagadas</span>
            <span>{l.progressPct}%</span>
          </div>
          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${l.status === "PAID" ? "bg-emerald-500" : "bg-gradient-to-r from-amber-500 to-yellow-400"}`}
              style={{ width: `${l.progressPct}%` }}
            />
          </div>
        </div>

        {/* Métricas financieras */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/[0.04]">
          <div>
            <p className="text-[9px] text-muted-foreground uppercase">Capital Recuperado</p>
            <p className="text-xs font-bold text-white font-mono mt-0.5">{fmt(l.capitalReturned)}</p>
          </div>
          <div>
            <p className="text-[9px] text-emerald-500 uppercase">Rentabilidad Ganada</p>
            <p className="text-xs font-bold text-emerald-400 font-mono mt-0.5">{fmt(l.interestEarned)}</p>
          </div>
          <div>
            <p className="text-[9px] text-blue-500 uppercase">Por Ganar</p>
            <p className="text-xs font-bold text-blue-400 font-mono mt-0.5">{fmt(l.interestPending)}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}
