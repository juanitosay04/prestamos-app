import { SidebarServer as Sidebar } from "@/components/layout/SidebarServer"
import { Header } from "@/components/layout/Header"
import { getLoans } from "@/app/actions/loan"
import { getClients } from "@/app/actions/client"
import { getInvestors } from "@/app/actions/investor"
import { getSession } from "@/lib/session"
import { Briefcase, Calendar, CheckCircle2, AlertCircle, FileText } from "lucide-react"
import { NewLoanButton } from "./NewLoanButton"
import { MonthFilter } from "./MonthFilter"
import { StatusFilter } from "./StatusFilter"
import { PrestamosTableClient } from "./PrestamosTableClient"
import Link from "next/link"

export default async function PrestamosPage({ searchParams }: { searchParams: Promise<{ month?: string, year?: string, status?: string }> }) {
  const { month, year, status } = await searchParams
  const filterMonth = month ? parseInt(month) : undefined
  const filterYear = year ? parseInt(year) : undefined
  
  const session = await getSession()
  const role = session?.role || "SECRETARY"

  const allLoans = await getLoans(filterMonth, filterYear)
  const clients = await getClients()
  const investors = await getInvestors()

  // Format mapping for dropdowns
  const mappedClients = clients.map(c => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    idDocument: c.idDocument,
    isBlacklisted: c.isBlacklisted
  }))
  
  const mappedInvestors = investors.map(i => ({
    id: i.id,
    name: i.name
  }))

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Compute derived status for each loan
  const enrichedLoans = allLoans.map(loan => {
    let derivedStatus = "Al día"
    let statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    let statusIcon = <CheckCircle2 className="h-3 w-3" />

    if (loan.status === "DEFAULTED") {
      derivedStatus = "Cancelado por pérdida"
      statusColor = "bg-red-500/10 text-red-400 border-red-500/20"
      statusIcon = <AlertCircle className="h-3 w-3" />
    } else if (loan.status === "REFINANCED") {
      derivedStatus = "Refinanciado"
      statusColor = "bg-blue-500/10 text-blue-400 border-blue-500/20"
      statusIcon = <CheckCircle2 className="h-3 w-3" />
    } else if (loan.status === "PAID") {
      derivedStatus = "Finalizado"
      statusColor = "bg-slate-500/10 text-slate-400 border-slate-500/20"
      statusIcon = <CheckCircle2 className="h-3 w-3" />
    } else {
      // ACTIVE or OVERDUE
      const pendingInst = loan.installments.find(i => i.status === "PENDING")
      if (pendingInst) {
        const dueDate = new Date(pendingInst.dueDate)
        dueDate.setHours(0, 0, 0, 0)
        const diffTime = dueDate.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays < 0) {
          if (diffDays <= -30) {
            derivedStatus = "Mora excesiva"
            statusColor = "bg-red-600/20 text-red-500 border-red-600/30"
            statusIcon = <AlertCircle className="h-3 w-3" />
          } else {
            derivedStatus = "En mora"
            statusColor = "bg-orange-500/10 text-orange-400 border-orange-500/20"
            statusIcon = <AlertCircle className="h-3 w-3" />
          }
        } else if (diffDays === 0) {
          derivedStatus = "Día de pago"
          statusColor = "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
          statusIcon = <AlertCircle className="h-3 w-3" />
        } else if (diffDays > 0 && diffDays <= 3) {
          derivedStatus = "Próximo a pagar"
          statusColor = "bg-emerald-400/10 text-emerald-300 border-emerald-400/20"
          statusIcon = <Calendar className="h-3 w-3" />
        }
      }
    }

    return { ...loan, derivedStatus, statusColor, statusIcon }
  })

  // Filter based on status
  const filteredLoans = status 
    ? enrichedLoans.filter(l => l.derivedStatus === status)
    : enrichedLoans

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        
        <Header />
        
        <main className="flex-1 overflow-y-auto p-8 relative z-0">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Préstamos Activos</h1>
                <p className="text-muted-foreground">Administra el dinero en circulación y cronogramas de pago.</p>
              </div>
              <div className="flex items-center gap-4">
                <StatusFilter currentStatus={status} />
                <MonthFilter />
                <NewLoanButton clients={mappedClients} investors={mappedInvestors} userRole={role} />
              </div>
            </div>

            <PrestamosTableClient loans={filteredLoans} userRole={role} />
          </div>
        </main>
      </div>
    </div>
  )
}
