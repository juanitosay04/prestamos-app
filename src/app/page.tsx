import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { DashboardCharts } from "@/components/dashboard/DashboardCharts"
import { Users, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight, Download } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { runMonthlyCloseCheck } from "@/app/actions/financialClose"

export default async function Dashboard() {
  // Disparador de cierre mensual automático (no bloqueante / se corre en cada load del dashboard)
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

  // Calcular Dinero Perdido (Capital pendiente de préstamos en DEFAULTED)
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
      loan: { deletedAt: null },
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
    where: { status: "PENDING" },
    orderBy: { dueDate: "asc" },
    take: 5,
    include: { loan: { include: { client: true } } }
  })

  // Prepare Chart Data: Portfolio
  const paidLoans = await prisma.loan.count({
    where: { status: "PAID", deletedAt: null }
  })
  
  const portfolioData = [
    { name: "Activos", value: activeLoans.length, color: "#3b82f6" },
    { name: "En Mora", value: overdueLoans, color: "#f97316" },
    { name: "Pagados", value: paidLoans, color: "#10b981" },
    { name: "Perdidos", value: defaultedLoans.length, color: "#ef4444" },
  ]

  // Prepare Chart Data: Monthly Projection (Next 6 months including current)
  const sixMonthsFromNow = new Date()
  sixMonthsFromNow.setMonth(today.getMonth() + 6)
  
  const installments = await prisma.installment.findMany({
    where: {
      loan: { deletedAt: null },
      dueDate: {
        gte: new Date(today.getFullYear(), today.getMonth(), 1), // Start of current month
        lte: sixMonthsFromNow
      }
    }
  })

  // Group by month
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
  const monthlyMap = new Map<string, { Capital: number, Ganancia: number }>()

  // Initialize next 6 months
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
      // Capital goes to Capital, interest goes to Ganancia
      current.Capital += inst.principalPart
      current.Ganancia += inst.interestPart
      // Add late fee if paid
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
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />
        
        <Header />
        
        <main className="flex-1 overflow-y-auto p-8 relative z-0">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Visión General</h1>
                <p className="text-muted-foreground">Bienvenido de nuevo, aquí tienes el resumen financiero de hoy.</p>
              </div>
              <a 
                href="/api/export" 
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Download className="h-4 w-4" />
                Exportar Excel
              </a>
            </div>
            
            {/* Tarjetas de métricas principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-1">${(totalCapital / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</h3>
                  <p className="text-sm text-muted-foreground font-medium">Capital Prestado</p>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>

              <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                    <ArrowDownRight className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">Este Mes</span>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-1">${(monthlyExpectedIncome / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</h3>
                  <p className="text-sm text-muted-foreground font-medium">Ingresos Proyectados</p>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>

              <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-destructive/10 rounded-xl text-destructive">
                    <ArrowDownRight className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-1 rounded-full">Este Mes</span>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-1">${(monthlyExpenses / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</h3>
                  <p className="text-sm text-muted-foreground font-medium">Gastos Operativos</p>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-destructive to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>

              <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full">Este Mes</span>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-1">${(monthlyNetProfit / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</h3>
                  <p className="text-sm text-muted-foreground font-medium">Rentabilidad Neta</p>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>

              <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-1">{activeLoans.length}</h3>
                  <p className="text-sm text-muted-foreground font-medium">Préstamos Activos</p>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>

              <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-orange-500/10 rounded-xl text-orange-400">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-1">{overdueLoans}</h3>
                  <p className="text-sm text-muted-foreground font-medium">Clientes en Mora</p>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>

              <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group border border-destructive/20 bg-destructive/5">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-destructive/20 rounded-xl text-destructive">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-destructive mb-1">${(totalLostCapital / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</h3>
                  <p className="text-sm text-destructive/80 font-medium">Capital Perdido (Histórico)</p>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-destructive to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            </div>

            {/* Secciones Inferiores con Gráficas Reales */}
            <DashboardCharts monthlyData={monthlyData} portfolioData={portfolioData} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              
              <div className="glass-panel rounded-2xl p-6 lg:col-span-3">
                <h3 className="text-lg font-semibold text-white mb-6">Próximos Vencimientos</h3>
                <div className="space-y-4">
                  {upcomingInstallments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay cobros pendientes.</p>
                  ) : (
                    upcomingInstallments.map((inst) => {
                      const isOverdue = new Date(inst.dueDate) < new Date()
                      return (
                        <div key={inst.id} className="flex justify-between items-center p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold border ${isOverdue ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-white/5 text-muted-foreground border-white/5'}`}>
                              {inst.loan.client.firstName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{inst.loan.client.firstName} {inst.loan.client.lastName}</p>
                              <p className={`text-xs ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                                {new Date(inst.dueDate).toLocaleDateString()} (Cuota {inst.installmentNumber})
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-primary">${(inst.expectedAmount / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )
                    })
                  )}
                </div>
                <button className="w-full mt-6 py-2.5 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg transition-colors border border-white/5">
                  Ver todos los vencimientos
                </button>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
