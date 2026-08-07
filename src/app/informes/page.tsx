import { SidebarServer as Sidebar } from "@/components/layout/SidebarServer"
import { Header } from "@/components/layout/Header"
import { prisma } from "@/lib/prisma"
import { 
  FileBarChart, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  Download, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Receipt, 
  PieChart as PieIcon,
  ShieldCheck,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Users
} from "lucide-react"
import { MonthFilter } from "@/app/prestamos/MonthFilter"
import { PrintReportButton } from "./PrintReportButton"

export default async function InformesPage({ searchParams }: { searchParams: Promise<{ month?: string, year?: string }> }) {
  const { month, year } = await searchParams

  const isFiltered = month && year && month !== "ALL"

  // Date range definitions
  let startDate: Date | undefined
  let endDate: Date | undefined

  if (isFiltered) {
    const m = parseInt(month) - 1
    const y = parseInt(year)
    startDate = new Date(y, m, 1, 0, 0, 0, 0)
    endDate = new Date(y, m + 1, 0, 23, 59, 59, 999)
  }

  // 1. Préstamos en el período (o todos)
  const loans = await prisma.loan.findMany({
    where: {
      deletedAt: null,
      ...(startDate && endDate ? {
        createdAt: { gte: startDate, lte: endDate }
      } : {})
    },
    include: {
      client: true,
      installments: true,
      investors: { include: { investor: true } }
    }
  })

  // 2. Pagos recibidos en el período
  const payments = await prisma.payment.findMany({
    where: {
      deletedAt: null,
      ...(startDate && endDate ? {
        paymentDate: { gte: startDate, lte: endDate }
      } : {})
    },
    include: {
      installment: true,
      loan: true
    }
  })

  // 3. Gastos registrados en el período
  const expenses = await prisma.expense.findMany({
    where: {
      deletedAt: null,
      ...(startDate && endDate ? {
        date: { gte: startDate, lte: endDate }
      } : {})
    }
  })

  // 4. Todos los Préstamos Activos y en Mora para la Salud de Cartera Global
  const allActiveLoans = await prisma.loan.findMany({
    where: { deletedAt: null },
    include: { installments: true }
  })

  // Cálculo de Métricas P&L
  let totalInterestCollected = 0
  let totalLateFeesCollected = 0
  let totalPrincipalCollected = 0

  payments.forEach(p => {
    if (p.installment) {
      totalPrincipalCollected += p.installment.principalPart
      totalInterestCollected += p.installment.interestPart
      totalLateFeesCollected += (p.lateFeeApplied || 0)
    } else {
      totalPrincipalCollected += p.amountPaid
    }
  })

  let totalUpfrontFees = 0
  let totalCapitalPlaced = 0
  loans.forEach(l => {
    totalCapitalPlaced += l.principalAmount
    totalUpfrontFees += (l.upfrontFee || 0)
  })

  const totalGrossIncome = totalInterestCollected + totalLateFeesCollected + totalUpfrontFees
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const netProfit = totalGrossIncome - totalExpenses

  // Desglose de Gastos por Categoría
  const expensesByCategory = {
    SALARY: 0,
    OFFICE: 0,
    UTILITIES: 0,
    OTHER: 0
  }

  expenses.forEach(e => {
    const cat = (e.category as keyof typeof expensesByCategory) || "OTHER"
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + e.amount
  })

  // Métricas de Salud de Cartera
  let globalPortfolioCapital = 0
  let globalActiveCapital = 0
  let globalOverdueCapital = 0
  let globalDefaultedCapital = 0

  allActiveLoans.forEach(l => {
    globalPortfolioCapital += l.principalAmount
    
    if (l.status === "ACTIVE") {
      const pendingPrinc = l.installments.filter(i => i.status !== "PAID").reduce((sum, i) => sum + i.principalPart, 0)
      globalActiveCapital += pendingPrinc
    } else if (l.status === "OVERDUE") {
      const pendingPrinc = l.installments.filter(i => i.status !== "PAID").reduce((sum, i) => sum + i.principalPart, 0)
      globalOverdueCapital += pendingPrinc
    } else if (l.status === "DEFAULTED") {
      const pendingPrinc = l.installments.filter(i => i.status !== "PAID").reduce((sum, i) => sum + i.principalPart, 0)
      globalDefaultedCapital += pendingPrinc
    }
  })

  const totalOutstanding = globalActiveCapital + globalOverdueCapital
  const delinquencyRate = totalOutstanding > 0 ? ((globalOverdueCapital / totalOutstanding) * 100).toFixed(1) : "0.0"

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ]
  const currentPeriodLabel = isFiltered ? `${monthNames[parseInt(month) - 1]} ${year}` : "Histórico Consolidado"

  return (
    <div className="flex h-screen overflow-hidden bg-[#090D16]">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Glow ambient background lights */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[140px] pointer-events-none" />
        
        <Header />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-7 relative z-0">
          <div className="max-w-[1400px] mx-auto space-y-7">
            
            {/* Header de Informes con Filtros y Descargas */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-white/[0.04]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                    Analítica y Estados Financieros
                  </span>
                  <span className="text-white/20">•</span>
                  <span className="text-xs text-muted-foreground font-semibold">{currentPeriodLabel}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Informes Contables y Balance Ejecutivo
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <MonthFilter basePath="/informes" />
                <PrintReportButton />
                <a
                  href="/api/export"
                  className="h-10 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] border border-blue-400/30 inline-flex items-center gap-2 active:scale-95"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Exportar Excel Completo</span>
                </a>
              </div>
            </div>

            {/* Cinta de KPIs: Resumen de Resultados (P&L Strip) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              
              {/* Ingresos Operativos Brutos */}
              <div className="glass-panel glass-card-hover rounded-2xl p-5 border-l-4 border-l-emerald-500 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase font-mono tracking-wider">
                      Ingresos Totales (Brutos)
                    </span>
                    <span className="text-xs text-muted-foreground">Intereses, moras y aperturas</span>
                  </div>
                  <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
                    ${(totalGrossIncome / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                  </h3>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04] text-[11px]">
                    <span className="text-muted-foreground">Recaudo de intereses</span>
                    <span className="text-emerald-400 font-mono font-bold">${(totalInterestCollected / 100).toLocaleString("es-CO")}</span>
                  </div>
                </div>
              </div>

              {/* Total Egresos y Gastos */}
              <div className="glass-panel glass-card-hover rounded-2xl p-5 border-l-4 border-l-rose-500 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase font-mono tracking-wider">
                      Egresos Totales
                    </span>
                    <span className="text-xs text-muted-foreground">Gastos de nómina y operación</span>
                  </div>
                  <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/20">
                    <ArrowDownRight className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-mono tracking-tight">
                    ${(totalExpenses / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                  </h3>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04] text-[11px]">
                    <span className="text-muted-foreground">Registros contables</span>
                    <span className="text-rose-400 font-mono font-bold">{expenses.length} egresos</span>
                  </div>
                </div>
              </div>

              {/* Utilidad Neta Real */}
              <div className="glass-panel glass-card-hover rounded-2xl p-5 border-l-4 border-l-blue-500 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase font-mono tracking-wider">
                      Utilidad Neta del Período
                    </span>
                    <span className="text-xs text-muted-foreground">Ganancia libre de gastos</span>
                  </div>
                  <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
                    <Wallet className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${netProfit >= 0 ? 'text-white' : 'text-rose-400'}`}>
                    ${(netProfit / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                  </h3>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04] text-[11px]">
                    <span className="text-muted-foreground">Margen Neto</span>
                    <span className="text-blue-400 font-mono font-bold">
                      {totalGrossIncome > 0 ? `${((netProfit / totalGrossIncome) * 100).toFixed(1)}%` : '0.0%'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tasa de Morosidad */}
              <div className="glass-panel glass-card-hover rounded-2xl p-5 border-l-4 border-l-amber-500 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase font-mono tracking-wider">
                      Índice de Cartera Vencida
                    </span>
                    <span className="text-xs text-muted-foreground">NPL / Exposición a riesgo</span>
                  </div>
                  <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
                    <Percent className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono tracking-tight">
                    {delinquencyRate}%
                  </h3>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04] text-[11px]">
                    <span className="text-muted-foreground">Capital en mora</span>
                    <span className="text-amber-400 font-mono font-bold">${(globalOverdueCapital / 100).toLocaleString("es-CO")}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Desglose Contable: Estado de Resultados Detallado & Categorías de Gasto */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Estado de Resultados P&L (7 Columnas) */}
              <div className="lg:col-span-7 glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Estado de Pérdidas y Ganancias (P&L)</h3>
                      <p className="text-xs text-muted-foreground">Discriminación detallada de ingresos y egresos contables.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  
                  {/* Bloque Ingresos */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
                      1. Ingresos Operacionales
                    </span>
                    
                    <div className="space-y-1.5 pl-2">
                      <div className="flex justify-between py-1.5 px-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                        <span className="text-muted-foreground">Intereses Corrientes Recaudados</span>
                        <span className="text-white font-mono font-semibold">${(totalInterestCollected / 100).toLocaleString("es-CO")}</span>
                      </div>
                      
                      <div className="flex justify-between py-1.5 px-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                        <span className="text-muted-foreground">Recargos e Intereses de Mora</span>
                        <span className="text-white font-mono font-semibold">${(totalLateFeesCollected / 100).toLocaleString("es-CO")}</span>
                      </div>

                      <div className="flex justify-between py-1.5 px-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                        <span className="text-muted-foreground">Comisiones de Apertura / Seguro (Cobro Inicial)</span>
                        <span className="text-white font-mono font-semibold">${(totalUpfrontFees / 100).toLocaleString("es-CO")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bloque Egresos */}
                  <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 font-mono">
                      2. Egresos y Gastos Operativos
                    </span>
                    
                    <div className="space-y-1.5 pl-2">
                      <div className="flex justify-between py-1.5 px-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                        <span className="text-muted-foreground">Nóminas y Cierres Mensuales (SALARY)</span>
                        <span className="text-rose-400 font-mono font-semibold">-${(expensesByCategory.SALARY / 100).toLocaleString("es-CO")}</span>
                      </div>
                      
                      <div className="flex justify-between py-1.5 px-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                        <span className="text-muted-foreground">Gastos de Oficina y Administración (OFFICE)</span>
                        <span className="text-rose-400 font-mono font-semibold">-${(expensesByCategory.OFFICE / 100).toLocaleString("es-CO")}</span>
                      </div>

                      <div className="flex justify-between py-1.5 px-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                        <span className="text-muted-foreground">Servicios Públicos y Conectividad (UTILITIES)</span>
                        <span className="text-rose-400 font-mono font-semibold">-${(expensesByCategory.UTILITIES / 100).toLocaleString("es-CO")}</span>
                      </div>

                      <div className="flex justify-between py-1.5 px-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                        <span className="text-muted-foreground">Otros Gastos Varios (OTHER)</span>
                        <span className="text-rose-400 font-mono font-semibold">-${(expensesByCategory.OTHER / 100).toLocaleString("es-CO")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Resumen Total */}
                  <div className="pt-3 border-t border-white/[0.08] flex justify-between items-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <span className="text-sm font-bold text-white">UTILIDAD NETA TOTAL</span>
                    <span className="text-lg font-extrabold text-blue-400 font-mono">
                      ${(netProfit / 100).toLocaleString("es-CO")}
                    </span>
                  </div>

                </div>
              </div>

              {/* Salud de Cartera & Balances de Riesgo (5 Columnas) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Desglose de Cartera */}
                <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.06]">
                    <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Estructura de Cartera</h3>
                      <p className="text-[11px] text-muted-foreground">Distribución del capital vivo colocado.</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 flex justify-between items-center">
                      <div>
                        <span className="text-blue-400 font-bold block">Cartera Vigente (Al Día)</span>
                        <span className="text-[10px] text-muted-foreground">Créditos cumpliendo cronograma</span>
                      </div>
                      <span className="text-white font-mono font-bold">${(globalActiveCapital / 100).toLocaleString("es-CO")}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 flex justify-between items-center">
                      <div>
                        <span className="text-amber-400 font-bold block">Cartera Vencida (En Mora)</span>
                        <span className="text-[10px] text-muted-foreground">Créditos con cuotas atrasadas</span>
                      </div>
                      <span className="text-amber-400 font-mono font-bold">${(globalOverdueCapital / 100).toLocaleString("es-CO")}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/15 flex justify-between items-center">
                      <div>
                        <span className="text-rose-400 font-bold block">Cartera Castigada (Pérdida)</span>
                        <span className="text-[10px] text-muted-foreground">Créditos declarados incobrables</span>
                      </div>
                      <span className="text-rose-400 font-mono font-bold">${(globalDefaultedCapital / 100).toLocaleString("es-CO")}</span>
                    </div>
                  </div>
                </div>

                {/* Capital Colocado en el Período */}
                <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Colocación y Recuperación en el Período
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-[10px] text-muted-foreground block">Capital Colocado</span>
                      <span className="text-sm font-bold text-white font-mono mt-1 block">
                        ${(totalCapitalPlaced / 100).toLocaleString("es-CO")}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-[10px] text-muted-foreground block">Capital Amortizado</span>
                      <span className="text-sm font-bold text-emerald-400 font-mono mt-1 block">
                        ${(totalPrincipalCollected / 100).toLocaleString("es-CO")}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
