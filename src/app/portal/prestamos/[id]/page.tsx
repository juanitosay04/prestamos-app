import { getMyLoanDetail } from "@/app/actions/investorPortal"
import { notFound } from "next/navigation"
import { ArrowLeft, CheckCircle, Clock, AlertTriangle, TrendingUp, DollarSign } from "lucide-react"
import Link from "next/link"

const fmt = (cents: number) =>
  "$" + (cents / 100).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const statusIcon: Record<string, React.ReactNode> = {
  PAID:    <CheckCircle className="h-4 w-4 text-emerald-400" />,
  PENDING: <Clock className="h-4 w-4 text-slate-400" />,
  OVERDUE: <AlertTriangle className="h-4 w-4 text-red-400" />,
  PARTIAL: <Clock className="h-4 w-4 text-amber-400" />,
}

const statusColor: Record<string, string> = {
  PAID:    "border-l-emerald-500 bg-emerald-500/[0.03]",
  PENDING: "border-l-slate-600",
  OVERDUE: "border-l-red-500 bg-red-500/[0.03]",
  PARTIAL: "border-l-amber-500 bg-amber-500/[0.03]",
}

export default async function PortalLoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const loan = await getMyLoanDetail(id)
  if (!loan) notFound()

  const paidInst = loan.installments.filter(i => i.status === "PAID")
  const progressPct = Math.round((paidInst.length / loan.numberOfInstallments) * 100)
  const totalMyCapital = loan.installments.reduce((s, i) => s + i.myCapital, 0)
  const totalMyInterest = loan.installments.reduce((s, i) => s + i.myInterest, 0)
  const earnedCapital = paidInst.reduce((s, i) => s + i.myCapital, 0)
  const earnedInterest = paidInst.reduce((s, i) => s + i.myInterest, 0)
  const pendingCapital = totalMyCapital - earnedCapital
  const pendingInterest = totalMyInterest - earnedInterest

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/portal/prestamos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Volver a Mis Préstamos
      </Link>

      {/* Header */}
      <div className="bg-[#0D1424] border border-white/[0.07] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Crédito otorgado a</p>
            <h1 className="text-xl font-extrabold text-white">{loan.clientFirstName}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Tu participación: <span className="text-amber-400 font-bold">{loan.participationPct}%</span>
              {" · "}Capital invertido: <span className="text-amber-400 font-bold">{fmt(loan.investedAmount)}</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {new Date(loan.startDate).toLocaleDateString("es-CO")} → {new Date(loan.endDate).toLocaleDateString("es-CO")}
            </p>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <p className="text-[10px] text-emerald-500 uppercase font-bold">Ya Ganado</p>
              <p className="text-lg font-extrabold text-emerald-400 font-mono">{fmt(earnedInterest)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-blue-500 uppercase font-bold">Por Ganar</p>
              <p className="text-lg font-extrabold text-blue-400 font-mono">{fmt(pendingInterest)}</p>
            </div>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="mt-5">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-2">
            <span>{paidInst.length} de {loan.numberOfInstallments} cuotas pagadas</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Resumen de totales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Capital Invertido", value: fmt(loan.investedAmount), color: "text-amber-400", icon: <DollarSign className="h-3.5 w-3.5" /> },
          { label: "Capital Recuperado", value: fmt(earnedCapital), color: "text-white", icon: <DollarSign className="h-3.5 w-3.5" /> },
          { label: "Rentabilidad Ganada", value: fmt(earnedInterest), color: "text-emerald-400", icon: <TrendingUp className="h-3.5 w-3.5" /> },
          { label: "Rentabilidad Pendiente", value: fmt(pendingInterest), color: "text-blue-400", icon: <TrendingUp className="h-3.5 w-3.5" /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="bg-[#0D1424] border border-white/[0.07] rounded-xl p-4">
            <p className="text-[9px] text-muted-foreground uppercase font-bold mb-2">{label}</p>
            <p className={`text-sm font-extrabold font-mono ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabla de cuotas */}
      <div>
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Detalle Cuota a Cuota</h2>
        <div className="space-y-2">
          {loan.installments.map((inst) => {
            const dueDate = new Date(inst.dueDate)
            const today = new Date()
            const isOverdue = inst.status !== "PAID" && dueDate < today

            return (
              <div
                key={inst.id}
                className={`border-l-2 bg-[#0D1424] border border-white/[0.05] rounded-r-xl p-4 ${statusColor[inst.status] ?? statusColor["PENDING"]}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {statusIcon[inst.status] ?? statusIcon["PENDING"]}
                    <div>
                      <p className="text-sm font-bold text-white">Cuota #{inst.number}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {dueDate.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}
                        {isOverdue && inst.status !== "PAID" && (
                          <span className="ml-2 text-red-400 font-semibold">· Vencida</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-[9px] text-muted-foreground">Tu Capital</p>
                      <p className="text-xs font-bold text-white font-mono">{fmt(inst.myCapital)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-emerald-500">Tu Rentabilidad</p>
                      <p className="text-xs font-bold text-emerald-400 font-mono">{fmt(inst.myInterest)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-amber-500">Total a Recibir</p>
                      <p className="text-sm font-extrabold text-amber-400 font-mono">{fmt(inst.myTotal)}</p>
                    </div>
                    <div className="w-20 text-right">
                      {inst.status === "PAID" ? (
                        <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 px-2 py-1 rounded-full font-bold">✓ Pagado</span>
                      ) : inst.status === "PARTIAL" ? (
                        <span className="text-[9px] bg-amber-500/15 border border-amber-500/25 text-amber-400 px-2 py-1 rounded-full font-bold">Parcial</span>
                      ) : isOverdue ? (
                        <span className="text-[9px] bg-red-500/15 border border-red-500/25 text-red-400 px-2 py-1 rounded-full font-bold">En mora</span>
                      ) : (
                        <span className="text-[9px] bg-slate-700/50 border border-slate-600/30 text-slate-400 px-2 py-1 rounded-full font-bold">Pendiente</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Totales finales */}
      <div className="bg-[#0D1424] border border-amber-500/20 rounded-xl p-5">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-white">Total a Recibir (Préstamo Completo)</p>
            <p className="text-xs text-muted-foreground mt-0.5">Capital + Rentabilidad de todas las cuotas</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-extrabold text-amber-400 font-mono">{fmt(totalMyCapital + totalMyInterest)}</p>
            <p className="text-[10px] text-muted-foreground">{fmt(totalMyCapital)} capital + {fmt(totalMyInterest)} rentabilidad</p>
          </div>
        </div>
      </div>
    </div>
  )
}
