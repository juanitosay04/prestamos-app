import { SidebarServer as Sidebar } from "@/components/layout/SidebarServer"
import { Header } from "@/components/layout/Header"
import { DashboardCharts } from "@/components/dashboard/DashboardCharts"
import { Users, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight, Download, Calendar, DollarSign, Wallet, ShieldAlert, ArrowRight } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { runMonthlyCloseCheck } from "@/app/actions/financialClose"
import Link from "next/link"

export default async function Dashboard() {
  // Disparador de cierre mensual automático
  await runMonthlyCloseCheck()
  
  const activeLoans = await prisma.loan.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    include: { client: true, installments: true }
  })

  const overdueLoans = await prisma.loan.count({
    where: { status: "OVERDUE", deletedAt: null }
  })

  // Calculate metrics
  let totalCapital = 0
  activeLoans.forEach(loan => {
    totalCapital += loan.principalAmount
  })

  // Dinero Perdido (Capital pendiente de préstamos en DEFAULTED)
  const defaultedLoans = await prisma.loan.findMany({
    where: { status: "DEFAULTED", deletedAt: null },
    include: { installments: { where: { status: "PENDING" } } }
  })
  
  let totalLostCapital = 0
  defaultedLoans.forEach(loan => {
    loan.installments.forEach(inst => totalLostCapital += inst.principalPart)
  })

  // Métricas del Mes Actual
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)

  // Gastos del Mes
  const currentMonthExpenses = await prisma.expense.findMany({
    where: { 
      deletedAt: null,
      date: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    }
  })
  const monthlyExpenses = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  
  // Ingresos del Mes (Intereses de cuotas de este mes)
  const currentMonthInstallments = await prisma.installment.findMany({
    where: {
      loan: { deletedAt: null, status: { not: "REFINANCED" } },
      dueDate: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    }
  })

  let monthlyExpectedIncome = 0
  currentMonthInstallments.forEach(inst => {
    monthlyExpectedIncome += inst.interestPart
    if (inst.status === "PAID" && inst.lateFee) {
      monthlyExpectedIncome += inst.lateFee
    }
  })

  // Utilidad Neta del Mes
  const monthlyNetProfit = monthlyExpectedIncome - monthlyExpenses

  const upcomingInstallments = await prisma.installment.findMany({
    where: { 
      status: "PENDING",
      loan: { status: { not: "REFINANCED" }, deletedAt: null }
    },
    orderBy: { dueDate: "asc" },
    take: 6,
    include: { loan: { include: { client: true } } }
  })

  // Prepare Chart Data: Portfolio
  const paidLoans = await prisma.loan.count({
    where: { status: "PAID", deletedAt: null }
  })
  
  const portfolioData = [
    { name: "Activos", value: activeLoans.length, color: "#3b82f6" },
    { name: "En Mora", value: overdueLoans, color: "#f59e0b" },
    { name: "Pagados", value: paidLoans, color: "#10b981" },
    { name: "Perdidos", value: defaultedLoans.length, color: "#ef4444" },
  ]

  // Prepare Chart Data: Monthly Projection (Next 6 months including current)
  const sixMonthsFromNow = new Date()
  sixMonthsFromNow.setMonth(today.getMonth() + 6)
  
  const installments = await prisma.installment.findMany({
    where: {
      loan: { deletedAt: null, status: { not: "REFINANCED" } },
      dueDate: {
        gte: new Date(today.getFullYear(), today.getMonth(), 1),
        lte: sixMonthsFromNow
      }
    }
  })

  // Group by month
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
  const monthlyMap = new Map<string, { Capital: number, Ganancia: number }>()

  for (let i = 0; i < 6; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`
    monthlyMap.set(key, { Capital: 0, Ganancia: 0 })
  }

  installments.forEach(inst => {
    const d = new Date(inst.dueDate)
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`
    if (monthlyMap.has(key)) {
      const current = monthlyMap.get(key)!
      current.Capital += inst.principalPart
      current.Ganancia += inst.interestPart
      if (inst.status === "PAID" && inst.lateFee) {
        current.Ganancia += inst.lateFee
      }
    }
  })

  const monthlyData = Array.from(monthlyMap.entries()).map(([name, data]) => ({
    name,
    Capital: Math.round(data.Capital),
    Ganancia: Math.round(data.Ganancia)
  }))

  return (
    <div className="flex h-screen overflow-hidden bg-[#07090E]">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Subtle executive ambient background glows */}
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/5 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[45%] rounded-full bg-indigo-600/5 blur-[140px] pointer-events-none" />
        
        <Header />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 relative z-0">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Header del Dashboard */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  Visión General
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Resumen financiero, cartera activa y proyecciones de cobro en tiempo real.
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <a 
                  href="/api/export" 
                  className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.08] px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm hover:border-white/20 active:scale-95"
                >
                  <Download className="h-4 w-4 text-blue-400" />
                  Exportar a Excel
                </a>
                
                <Link
                  href="/prestamos/nuevo"
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                  + Nuevo Préstamo
                </Link>
              </div>
            </div>
            
            {/* Tarjetas de métricas principales (KPIs de Alta Gama) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              
              {/* Capital Prestado */}
              <div className="glass-panel glass-card-hover rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Capital Prestado
                  </span>
                  <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/10">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                    ${(totalCapital / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                    <span className="text-blue-400 font-semibold">{activeLoans.length}</span> préstamos activos
                  </div>
                </div>
              </div>

              {/* Ingresos Proyectados Mes */}
              <div className="glass-panel glass-card-hover rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Ingresos Proyectados
                  </span>
                  <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/10">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
                    ${(monthlyExpectedIncome / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400/90 font-medium">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Intereses y moras del mes
                  </div>
                </div>
              </div>

              {/* Rentabilidad Neta */}
              <div className="glass-panel glass-card-hover rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Utilidad Neta (Mes)
                  </span>
                  <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/10">
                    <Wallet className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <h3 className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${monthlyNetProfit >= 0 ? 'text-white' : 'text-rose-400'}`}>
                    ${(monthlyNetProfit / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                    Menos ${(monthlyExpenses / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })} en gastos
                  </div>
                </div>
              </div>

              {/* Clientes en Mora */}
              <div className="glass-panel glass-card-hover rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Créditos en Mora
                  </span>
                  <div className={`p-2.5 rounded-xl border ${overdueLoans > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-white/5 text-muted-foreground border-white/5'}`}>
                    <AlertCircle className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <h3 className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${overdueLoans > 0 ? 'text-amber-400' : 'text-white'}`}>
                    {overdueLoans}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                    {overdueLoans > 0 ? (
                      <span className="text-amber-400/90 font-medium">Requieren gestión de cobro</span>
                    ) : (
                      <span className="text-emerald-400 font-medium">Al día</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Capital Perdido (Castigado) - Si existe */}
              {defaultedLoans.length > 0 && (
                <div className="glass-panel glass-card-hover rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between border-rose-500/20 bg-rose-950/10">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-semibold text-rose-300 uppercase tracking-wider">
                      Cartera Castigada
                    </span>
                    <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/20">
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-mono tracking-tight">
                      ${(totalLostCapital / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                    </h3>
                    <p className="text-xs text-rose-400/80 mt-2 font-medium">
                      {defaultedLoans.length} créditos en pérdida
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Gráficos de Proyección y Distribución */}
            <DashboardCharts monthlyData={monthlyData} portfolioData={portfolioData} />

            {/* Próximos Vencimientos */}
            <div className="glass-panel rounded-2xl p-6 border border-white/[0.08]">
              <div className="flex items-center justify-between pb-5 border-b border-white/[0.06] mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Próximos Vencimientos de Cuotas</h3>
                    <p className="text-xs text-muted-foreground">Cobros más cercanos programados en el calendario.</p>
                  </div>
                </div>
                
                <Link
                  href="/prestamos"
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  Ver todos los préstamos <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {upcomingInstallments.length === 0 ? (
                  <p className="text-xs text-muted-foreground col-span-full py-4 text-center">
                    No hay cobros pendientes registrados.
                  </p>
                ) : (
                  upcomingInstallments.map((inst) => {
                    const isOverdue = new Date(inst.dueDate) < new Date()
                    const clientName = `${inst.loan.client.firstName} ${inst.loan.client.lastName}`
                    const amount = (inst.expectedAmount / 100).toLocaleString('es-CO', { minimumFractionDigits: 0 })
                    
                    return (
                      <Link
                        key={inst.id}
                        href={`/prestamos/${inst.loanId}`}
                        className="group p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] hover:border-white/[0.1] transition-all flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xs font-extrabold border ${
                            isOverdue 
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {inst.loan.client.firstName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-1">
                              {clientName}
                            </p>
                            <p className={`text-[11px] mt-0.5 ${isOverdue ? 'text-rose-400 font-semibold' : 'text-muted-foreground'}`}>
                              {new Date(inst.dueDate).toLocaleDateString('es-CO')} • Cuota {inst.installmentNumber}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-extrabold text-white font-mono block">
                            ${amount}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                            isOverdue 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            {isOverdue ? 'Vencida' : 'Pendiente'}
                          </span>
                        </div>
                      </Link>
                    )
                  })
                )}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
