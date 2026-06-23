import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { prisma } from "@/lib/prisma"
import { Receipt, Plus, Trash2 } from "lucide-react"
import { NewExpenseButton } from "./NewExpenseButton"
import { deleteExpense } from "@/app/actions/expense"

export default async function ExpensesPage() {
  const expenses = await prisma.expense.findMany({
    where: { deletedAt: null },
    orderBy: { date: "desc" }
  })

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-8 relative z-0">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Gastos Administrativos</h1>
                <p className="text-muted-foreground">Controla los egresos operativos (caja menor, salarios, papelería).</p>
              </div>
              <NewExpenseButton />
            </div>
            
            <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group mb-8 border-destructive/20 bg-destructive/5">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-destructive/10 rounded-xl text-destructive">
                  <Receipt className="h-5 w-5" />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-white mb-1">${(totalExpenses / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                <p className="text-sm text-muted-foreground font-medium">Total de Gastos Históricos</p>
              </div>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-destructive to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4 font-medium">Fecha</th>
                      <th className="px-6 py-4 font-medium">Descripción</th>
                      <th className="px-6 py-4 font-medium">Categoría</th>
                      <th className="px-6 py-4 font-medium">Monto</th>
                      <th className="px-6 py-4 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                          No hay gastos registrados aún.
                        </td>
                      </tr>
                    ) : (
                      expenses.map((expense) => (
                        <tr key={expense.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4 text-white">
                            {new Date(expense.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 font-medium text-white">
                            {expense.description}
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-white/10 text-muted-foreground px-2 py-1 rounded text-xs">
                              {expense.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-destructive">
                            ${(expense.amount / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <form action={deleteExpense.bind(null, expense.id)}>
                              <button type="submit" className="p-2 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors" title="Eliminar">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </form>
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
