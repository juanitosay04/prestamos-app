import { SidebarServer as Sidebar } from "@/components/layout/SidebarServer"
import { Header } from "@/components/layout/Header"
import { prisma } from "@/lib/prisma"
import { Receipt, DollarSign, Calendar } from "lucide-react"
import { NewExpenseButton } from "./NewExpenseButton"
import { DeleteExpenseButton } from "./DeleteExpenseButton"
import { MonthFilter } from "@/app/prestamos/MonthFilter"

export const dynamic = "force-dynamic"

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ month?: string, year?: string }> }) {
  const { month, year } = await searchParams
  
  const filterMonth = month ? parseInt(month) : undefined
  const filterYear = year ? parseInt(year) : undefined

  let dateFilter = {}
  if (filterMonth && filterYear) {
    const startDate = new Date(filterYear, filterMonth - 1, 1)
    const endDate = new Date(filterYear, filterMonth, 0, 23, 59, 59, 999)
    dateFilter = {
      date: {
        gte: startDate,
        lte: endDate
      }
    }
  }

  const expenses = await prisma.expense.findMany({
    where: { 
      deletedAt: null,
      ...dateFilter
    },
    orderBy: { date: "desc" }
  })

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)

  return (
    <div className="flex h-screen overflow-hidden bg-[#07090E]">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-rose-600/5 blur-[120px] pointer-events-none" />
        
        <Header />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 relative z-0">
          <div className="max-w-7xl mx-auto space-y-6">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  Gastos Administrativos
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Control y deducción de egresos operativos (caja menor, salarios, servicios).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <MonthFilter basePath="/gastos" />
                <NewExpenseButton />
              </div>
            </div>
            
            {/* KPI Card de Gastos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="glass-panel glass-card-hover rounded-2xl p-5 relative overflow-hidden border-rose-500/20 bg-rose-950/10">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold text-rose-300 uppercase tracking-wider">
                    {filterMonth && filterYear ? `Gastos del Mes Seleccionado` : `Total de Gastos Históricos`}
                  </span>
                  <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/20">
                    <Receipt className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                    ${(totalExpenses / 100).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                  </h3>
                  <p className="text-xs text-rose-400/80 mt-1 font-medium">
                    {expenses.length} comprobantes registrados
                  </p>
                </div>
              </div>
            </div>

            {/* Tabla de Gastos */}
            <div className="glass-panel rounded-2xl overflow-hidden border border-white/[0.08]">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-white/[0.02] text-muted-foreground border-b border-white/[0.06] uppercase text-[10px] font-bold tracking-wider font-mono">
                    <tr>
                      <th className="px-6 py-4">Fecha</th>
                      <th className="px-6 py-4">Concepto / Descripción</th>
                      <th className="px-6 py-4">Categoría</th>
                      <th className="px-6 py-4">Monto Egresado</th>
                      <th className="px-6 py-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-xs">
                          No hay gastos registrados en este período.
                        </td>
                      </tr>
                    ) : (
                      expenses.map((expense) => (
                        <tr key={expense.id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="px-6 py-4 text-muted-foreground font-mono text-xs">
                            {new Date(expense.date).toLocaleDateString('es-CO')}
                          </td>
                          <td className="px-6 py-4 font-bold text-white text-xs">
                            {expense.description}
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-white/[0.06] text-muted-foreground border border-white/[0.08] px-2.5 py-0.5 rounded-full text-[10px] font-medium">
                              {expense.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-extrabold text-rose-400 font-mono text-xs">
                            ${(expense.amount / 100).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <DeleteExpenseButton expenseId={expense.id} />
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
