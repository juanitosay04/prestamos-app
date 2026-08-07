import { SidebarServer as Sidebar } from "@/components/layout/SidebarServer"
import { Header } from "@/components/layout/Header"
import { DashboardCharts } from "@/components/dashboard/DashboardCharts"
import { 
  Users, 
  TrendingUp, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download, 
  Calendar, 
  DollarSign, 
  Wallet, 
  ShieldAlert, 
  ArrowRight,
  Plus,
  Clock,
  Sparkles,
  CheckCircle2
} from "lucide-react"
import { prisma } from "@/lib/prisma"
import { runMonthlyCloseCheck } from "@/app/actions/financialClose"
import Link from "next/link"

export default async function Dashboard() {
  // Disparador de cierre mensual automático
  await runMonthlyCloseCheck()
  
  // 1. Cartera Activa y Saldo Vivo en Calle
  const activeLoans = await prisma.loan.findMany({
    where: { status: { in: ["ACTIVE", "OVERDUE"] }, deletedAt: null },
    include: { client: true, installments: true }
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let totalDisbursedCapital = 0
  let totalOutstandingCapital = 0 // Saldo real de capital pendiente por recuperar
  let overdueLoansCount = 0
  let totalOverdueDebt = 0

  activeLoans.forEach(loan => {
    totalDisbursedCapital += loan.principalAmount
    let loanHasOverdue = false

    loan.installments.forEach(inst => {
      if (inst.status === "PAID") {
        // Ya pagado, saldo 0
      } else if (inst.status === "PARTIAL") {
        const remainingPrincipal = Math.max(0, inst.principalPart - inst.amountPaid)
        totalOutstandingCapital += remainingPrincipal
      } else {
        // PENDING / LATE
        totalOutstandingCapital += inst.principalPart
      }

      // Comprobar moras
      if (inst.status !== "PAID") {
        const dueDate = new Date(inst.dueDate)
        dueDate.setHours(0, 0, 0, 0)
        if (dueDate.getTime() < today.getTime()) {
          loanHasOverdue = true
          totalOverdueDebt += (inst.expectedAmount - inst.amountPaid)
        }
      }
    })

    if (loanHasOverdue || loan.status === "OVERDUE") {
      overdueLoansCount++
    }
  })

  // 2. Dinero Perdido (Capital pendiente de préstamos en DEFAULTED)
  const defaultedLoans = await prisma.loan.findMany({
    where: { status: "DEFAULTED", deletedAt: null },
    include: { installments: { where: { status: { not: "PAID" } } } }
  })
  
  let totalLostCapital = 0
  defaultedLoans.forEach(loan => {
    loan.installments.forEach(inst => {
      totalLostCapital += Math.max(0, inst.principalPart - inst.amountPaid)
    })
  })

  // 3. Métricas del Mes Actual (Recaudado Real vs Proyectado & Gastos)
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

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
  
  // Cuotas del Mes
  const currentMonthInstallments = await prisma.installment.findMany({
    where: {
      loan: { deletedAt: null, status: { not: "REFINANCED" } },
      dueDate: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    }
  })

  let monthlyProjectedInterest = 0
  let monthlyCollectedInterest = 0

  currentMonthInstallments.forEach(inst => {
    monthlyProjectedInterest += inst.interestPart
    if (inst.status === "PAID") {
      monthlyCollectedInterest += inst.interestPart + (inst.lateFee || 0)
    } else if (inst.status === "PARTIAL" && inst.amountPaid > 0) {
      const ratio = inst.expectedAmount > 0 ? (inst.amountPaid / inst.expectedAmount) : 0
      monthlyCollectedInterest += Math.round(inst.interestPart * ratio) + (inst.lateFee || 0)
    }
  })

  const collectionProgressPercent = monthlyProjectedInterest > 0 
    ? Math.min(100, Math.round((monthlyCollectedInterest / monthlyProjectedInterest) * 100))
    : (monthlyCollectedInterest > 0 ? 100 : 0)

  // Utilidad Neta Real en Caja (Recaudado - Gastos) y Proyectada a Cierre
  const monthlyRealizedNetProfit = monthlyCollectedInterest - monthlyExpenses
  const monthlyProjectedNetProfit = monthlyProjectedInterest - monthlyExpenses

  // Próximos Vencimientos
  const upcomingInstallments = await prisma.installment.findMany({
    where: { 
      status: "PENDING",
      loan: { status: { not: "REFINANCED" }, deletedAt: null }
    },
    orderBy: { dueDate: "asc" },
    take: 5,
    include: { loan: { include: { client: true } } }
  })

  // Préstamos Recientes
  const recentLoans = await prisma.loan.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { client: true, installments: true }
  })

  // Prepare Chart Data: Portfolio
  const paidLoans = await prisma.loan.count({
    where: { status: "PAID", deletedAt: null }
  })
  
  const upToDateLoansCount = Math.max(0, activeLoans.length - overdueLoansCount)
  const portfolioData = [
    { name: "Al Día", value: upToDateLoansCount, color: "#3b82f6" },
    { name: "En Mora", value: overdueLoansCount, color: "#f59e0b" },
    { name: "Liquidados", value: paidLoans, color: "#10b981" },
    { name: "Pérdida", value: defaultedLoans.length, color: "#ef4444" },
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

  const currentDateFormatted = new Intl.DateTimeFormat('es-CO', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  }).format(today)

  return (
    <div className="flex h-screen overflow-hidden bg-[#090D16]">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Glow ambient background lights */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[450px] h-[450px] rounded-full bg-indigo-600/10 blur-[140px] pointer-events-none" />
        
        <Header />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-7 relative z-0">
          <div className="max-w-[1400px] mx-auto space-y-7">
            
            {/* Header del Dashboard con Jerarquía Ejecutiva */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-white/[0.04]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                    Panel Financiero
                  </span>
                  <span className="text-white/20">•</span>
                  <span className="text-xs text-muted-foreground capitalize">{currentDateFormatted}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Centro de Rendimiento y Cartera
                </h1>
              </div>
              
              <div className="flex items-center gap-3">
                <a 
                  href="/api/export" 
                  className="h-10 px-4 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.08] hover:border-white/20 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-2 shadow-sm active:scale-95"
                >
                  <Download className="h-3.5 w-3.5 text-blue-400" />
                  <span>Exportar Excel</span>
                </a>
                
                <Link
                  href="/prestamos/nuevo"
                  className="h-10 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_25px_rgba(37,99,235,0.35)] border border-blue-400/30 inline-flex items-center gap-2 active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nuevo Préstamo</span>
                </Link>
              </div>
            </div>
            
            {/* Cinta de KPIs Principales (4 Tarjetas Ejecutivas) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              
              {/* 1. Saldo de Capital en Calle */}
              <div className="glass-panel glass-card-hover rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between border-l-4 border-l-blue-500">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block font-mono">
                      Cartera Activa
                    </span>
                    <span className="text-xs text-muted-foreground">Capital vivo en calle</span>
                  </div>
                  <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                    ${(totalOutstandingCapital / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                  </h3>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04] text-[11px]">
                    <span className="text-muted-foreground">{activeLoans.length} {activeLoans.length === 1 ? 'crédito activo' : 'créditos activos'}</span>
                    <span className="text-blue-400 font-mono font-medium" title="Capital inicial total desembolsado">
                      ${(totalDisbursedCapital / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })} col.
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Intereses Recaudados en el Mes */}
              <div className="glass-panel glass-card-hover rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between border-l-4 border-l-emerald-500">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block font-mono">
                      Intereses Recaudados
                    </span>
                    <span className="text-xs text-muted-foreground">Ganancia en caja (Mes)</span>
                  </div>
                  <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
                    ${(monthlyCollectedInterest / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                  </h3>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04] text-[11px]">
                    <span className="text-muted-foreground">
                      Meta: ${(monthlyProjectedInterest / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-emerald-400 font-bold font-mono">
                      {collectionProgressPercent}% cobrado
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Utilidad Neta Real en Caja (Mes) */}
              <div className="glass-panel glass-card-hover rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between border-l-4 border-l-indigo-500">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block font-mono">
                      Utilidad Neta (Mes)
                    </span>
                    <span className="text-xs text-muted-foreground">Caja neta realizada</span>
                  </div>
                  <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                    <Wallet className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${monthlyRealizedNetProfit >= 0 ? 'text-white' : 'text-rose-400'}`}>
                    ${(monthlyRealizedNetProfit / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                  </h3>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04] text-[11px]">
                    <span className="text-rose-400 font-mono">
                      Gastos: -${(monthlyExpenses / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-muted-foreground font-mono" title="Utilidad proyectada al cierre de mes">
                      Proy: ${(monthlyProjectedNetProfit / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Créditos en Mora */}
              <div className={`glass-panel glass-card-hover rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between border-l-4 ${overdueLoansCount > 0 ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block font-mono">
                      Créditos en Mora
                    </span>
                    <span className="text-xs text-muted-foreground">Estado de cobro</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${overdueLoansCount > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                    <AlertCircle className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${overdueLoansCount > 0 ? 'text-amber-400' : 'text-white'}`}>
                    {overdueLoansCount} <span className="text-sm font-normal text-muted-foreground font-sans">{overdueLoansCount === 1 ? 'crédito' : 'créditos'}</span>
                  </h3>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04] text-[11px]">
                    <span className="text-muted-foreground">Estado cartera</span>
                    <span className={`font-bold ${overdueLoansCount > 0 ? 'text-amber-400 font-mono text-[10px]' : 'text-emerald-400'}`}>
                      {overdueLoansCount > 0 
                        ? `Vencido: $${(totalOverdueDebt / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })}` 
                        : 'Cartera 100% al día'}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Espacio Asimétrico (65% Gráficos & Actividad / 35% Salud de Cartera & Vencimientos) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Columna Izquierda Principal (8 de 12 columnas) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Gráficos de Proyección */}
                <DashboardCharts monthlyData={monthlyData} portfolioData={portfolioData} />

                {/* Préstamos Recientes Emitidos */}
                <div className="glass-panel rounded-2xl p-6 border border-white/[0.08]">
                  <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Últimas Colocaciones Registradas</h3>
                        <p className="text-xs text-muted-foreground">Préstamos emitidos recientemente en la plataforma.</p>
                      </div>
                    </div>
                    
                    <Link
                      href="/prestamos"
                      className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                    >
                      Ver todos <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-white/[0.02] text-muted-foreground border-b border-white/[0.04] uppercase text-[10px] font-bold tracking-wider font-mono">
                        <tr>
                          <th className="px-4 py-3">Cliente</th>
                          <th className="px-4 py-3">Monto Capital</th>
                          <th className="px-4 py-3">Cuota Plan</th>
                          <th className="px-4 py-3">Estado</th>
                          <th className="px-4 py-3 text-right">Ver</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {recentLoans.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-muted-foreground text-xs">
                              No hay préstamos emitidos aún.
                            </td>
                          </tr>
                        ) : (
                          recentLoans.map((loan) => (
                            <tr key={loan.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3 font-semibold text-white">
                                {loan.client.firstName} {loan.client.lastName}
                                <span className="block text-[10px] text-muted-foreground font-mono font-normal">
                                  ID: {loan.id.slice(0, 8).toUpperCase()}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-white font-mono font-bold">
                                ${(loan.principalAmount / 100).toLocaleString('es-CO')}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground font-mono">
                                {loan.numberOfInstallments} × ${(loan.installmentAmount / 100).toLocaleString('es-CO')}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  loan.status === 'ACTIVE' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                  loan.status === 'OVERDUE' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                  loan.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                  'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                }`}>
                                  {loan.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Link 
                                  href={`/prestamos/${loan.id}`}
                                  className="p-1.5 hover:bg-white/[0.08] text-muted-foreground hover:text-white rounded-lg transition-colors inline-flex"
                                >
                                  <ArrowRight className="h-3.5 w-3.5" />
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

              {/* Columna Derecha Lateral (4 de 12 columnas: Agenda de Cobranza Inmediata) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Próximos Vencimientos Inmediatos */}
                <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">Agenda de Cobranza</h3>
                          <p className="text-[11px] text-muted-foreground">Próximas cuotas a recaudar.</p>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                        {upcomingInstallments.length} pendientes
                      </span>
                    </div>

                    <div className="space-y-3">
                      {upcomingInstallments.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-6 text-center">
                          No hay vencimientos pendientes.
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
                              className="group p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.1] transition-all flex items-center justify-between block"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-extrabold flex-shrink-0 border ${
                                  isOverdue 
                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                }`}>
                                  {inst.loan.client.firstName.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                                    {clientName}
                                  </p>
                                  <p className={`text-[10px] font-mono mt-0.5 ${isOverdue ? 'text-rose-400 font-semibold' : 'text-muted-foreground'}`}>
                                    {new Date(inst.dueDate).toLocaleDateString('es-CO')} • Cuota #{inst.installmentNumber}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right flex-shrink-0 pl-2">
                                <span className="text-xs font-extrabold text-white font-mono block">
                                  ${amount}
                                </span>
                                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                                  isOverdue 
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                }`}>
                                  {isOverdue ? 'Vencida' : 'Por cobrar'}
                                </span>
                              </div>
                            </Link>
                          )
                        })
                      )}
                    </div>
                  </div>

                  <Link
                    href="/prestamos"
                    className="mt-4 w-full py-2.5 bg-white/[0.03] hover:bg-white/[0.06] text-white border border-white/[0.06] rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                  >
                    Ver Todos los Préstamos <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Acceso Rápido a Cobro Múltiple */}
                <div className="glass-panel rounded-2xl p-5 border border-blue-500/20 bg-gradient-to-b from-blue-950/20 to-transparent">
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Cobro Rápido en Lote</h4>
                      <p className="text-[10px] text-muted-foreground">Genera comprobantes y recibos agrupados.</p>
                    </div>
                  </div>
                  <Link
                    href="/prestamos"
                    className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    Ir a Selección de Cuotas
                  </Link>
                </div>

              </div>

            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
