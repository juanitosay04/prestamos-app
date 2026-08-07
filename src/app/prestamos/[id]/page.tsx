import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { prisma } from "@/lib/prisma"
import { ArrowLeft, User, DollarSign, Calendar, TrendingUp } from "lucide-react"
import Link from "next/link"
import { PayInstallmentButton } from "./PayInstallmentButton"
import { InstallmentBreakdown } from "./InstallmentBreakdown"
import { WhatsAppReminderButton } from "./WhatsAppReminderButton"
import { RefinanceLoanButton } from "./RefinanceLoanButton"
import { EditLoanButton } from "./EditLoanButton"
import { PrintClearanceButton } from "./PrintClearanceButton"
import { PrincipalPaymentButton } from "./PrincipalPaymentButton"
import { MarkDefaultedButton, ReviveLoanButton } from "./DefaultLoanButtons"
import { PromissoryNoteCard } from "./PromissoryNoteCard"
import { getSession } from "@/lib/session"

export default async function LoanDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      client: true,
      installments: {
        orderBy: { installmentNumber: 'asc' }
      },
      investors: {
        include: { investor: true }
      }
    }
  })

  const session = await getSession()
  const role = session?.role || "SECRETARY"

  if (!loan) {
    return <div className="text-white p-8">Préstamo no encontrado</div>
  }

  const allInvestors = await prisma.investor.findMany({ where: { deletedAt: null } })

  const totalPaid = loan.installments.filter(i => i.status === "PAID").reduce((sum, curr) => sum + curr.expectedAmount, 0)
  const totalExpected = loan.installments.reduce((sum, curr) => sum + curr.expectedAmount, 0)
  const totalInterestEarned = loan.installments.reduce((sum, curr) => sum + curr.interestPart, 0)
  const totalLateFees = loan.installments.reduce((sum, curr) => sum + (curr.lateFee || 0), 0)
  const progress = Math.round((totalPaid / totalExpected) * 100) || 0

  const outstandingPrincipal = loan.installments.filter(i => i.status === "PENDING").reduce((sum, curr) => sum + curr.principalPart, 0)
  const outstandingLateFee = loan.installments.filter(i => i.status === "PENDING").reduce((sum, curr) => sum + (curr.lateFee || 0), 0)

  const refinancedFromLoan = loan.refinancedFromId ? await prisma.loan.findUnique({
    where: { id: loan.refinancedFromId },
    select: { id: true, principalAmount: true, createdAt: true }
  }) : null

  const refinancedToLoan = await prisma.loan.findFirst({
    where: { refinancedFromId: loan.id },
    select: { id: true, principalAmount: true, createdAt: true, status: true }
  })

  const hasPayments = (await prisma.payment.count({
    where: { loanId: loan.id, deletedAt: null }
  })) > 0

  const principalPaymentsLog = await prisma.auditLog.findMany({
    where: {
      entityType: 'Loan',
      entityId: loan.id,
      action: 'PRINCIPAL_PAYMENT'
    },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
        
        <Header />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-0">
          <div className="max-w-4xl mx-auto space-y-6">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                <Link href="/prestamos" className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    Detalle del Préstamo 
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${loan.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' : loan.status === 'REFINANCED' ? 'bg-blue-500/20 text-blue-400' : 'bg-primary/20 text-primary'}`}>
                      {loan.status}
                    </span>
                  </h1>
                  <p className="text-xs md:text-sm text-muted-foreground font-mono mt-0.5">ID: {loan.id}</p>
                </div>
              </div>
              <div className="w-full md:w-auto flex flex-wrap items-center gap-2">
                {loan.status === "ACTIVE" || loan.status === "OVERDUE" ? (
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {role === "ADMIN" && !hasPayments && (
                      <EditLoanButton 
                        loan={{
                          id: loan.id,
                          principalAmount: loan.principalAmount,
                          interestRate: loan.interestRate,
                          interestAmount: loan.interestAmount,
                          interestType: loan.interestType,
                          upfrontFee: loan.upfrontFee,
                          secretaryCommission: loan.secretaryCommission,
                          secretaryCommissionType: loan.secretaryCommissionType,
                          companyCommission: loan.companyCommission,
                          companyCommissionType: loan.companyCommissionType,
                          startDate: loan.startDate,
                          numberOfInstallments: loan.numberOfInstallments,
                          investors: loan.investors,
                          referredByInvestorId: loan.referredByInvestorId
                        }}
                        availableInvestors={allInvestors}
                      />
                    )}
                    <PrincipalPaymentButton loanId={loan.id} outstandingPrincipal={outstandingPrincipal} />
                    <RefinanceLoanButton 
                      oldLoanId={loan.id}
                      clientId={loan.clientId}
                      availableInvestors={allInvestors}
                      currentInvestors={loan.investors}
                      currentPrincipal={loan.principalAmount}
                      totalExpected={totalExpected}
                      outstandingPrincipal={outstandingPrincipal}
                      outstandingLateFee={outstandingLateFee}
                    />
                    {role === "ADMIN" && <MarkDefaultedButton loanId={loan.id} />}
                  </div>
                ) : loan.status === "DEFAULTED" && role === "ADMIN" ? (
                  <ReviveLoanButton loanId={loan.id} />
                ) : null}
                {loan.status === "PAID" && (
                  <PrintClearanceButton 
                    data={{
                      loanId: loan.id,
                      clientName: `${loan.client.firstName} ${loan.client.lastName}`,
                      idDocument: loan.client.idDocument,
                      clientPhone: loan.client.phone || undefined,
                      clientAddress: loan.client.address || undefined,
                      principalAmount: loan.principalAmount,
                      totalPaid: totalPaid,
                      startDate: loan.startDate,
                      clearanceDate: new Date(),
                      installmentsCount: loan.numberOfInstallments
                    }}
                  />
                )}
              </div>
            </div>

            {/* Banners de Trazabilidad de Refinanciación */}
            {refinancedFromLoan && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                    🔄
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-300">Préstamo originado por refinanciación</p>
                    <p className="text-xs text-muted-foreground">
                      Refinanciado desde la obligación #{refinancedFromLoan.id.slice(-6).toUpperCase()} (${(refinancedFromLoan.principalAmount / 100).toLocaleString('es-CO')}) el {new Date(loan.startDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Link 
                  href={`/prestamos/${refinancedFromLoan.id}`}
                  className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  Ver Préstamo Anterior →
                </Link>
              </div>
            )}

            {refinancedToLoan && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    ⚠️
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-300">Obligación cerrada por refinanciación</p>
                    <p className="text-xs text-muted-foreground">
                      Esta deuda fue unificada y refinanciada en el nuevo préstamo #{refinancedToLoan.id.slice(-6).toUpperCase()} (${(refinancedToLoan.principalAmount / 100).toLocaleString('es-CO')})
                    </p>
                  </div>
                </div>
                <Link 
                  href={`/prestamos/${refinancedToLoan.id}`}
                  className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  Ir al Nuevo Préstamo →
                </Link>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Información del Cliente y Préstamo */}
              <div className="glass-panel rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" /> Cliente
                  </h3>
                  <p className="text-lg font-bold text-white">{loan.client.firstName} {loan.client.lastName}</p>
                  <p className="text-sm text-muted-foreground">Documento: {loan.client.idDocument}</p>
                  <p className="text-sm text-muted-foreground">Teléfono: {loan.client.phone}</p>
                </div>
                
                <div className="border-t border-white/5 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4" /> Resumen Financiero
                    </h3>
                    {totalLateFees > 0 && (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                        +${(totalLateFees / 100).toLocaleString('es-CO')} en moras
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Capital Original</p>
                      <p className="text-lg font-bold text-white">${(loan.principalAmount / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Interés a Ganar</p>
                      <p className="text-lg font-bold text-emerald-400">
                        ${(totalInterestEarned / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Moras Cobradas</p>
                      <p className="text-lg font-bold text-rose-400 font-mono">
                        ${(totalLateFees / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Frecuencia</p>
                      <p className="text-white font-medium">{loan.interestType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cuotas (Fijas)</p>
                      <p className="text-white font-medium">{loan.numberOfInstallments} de ${(loan.installmentAmount / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total con Moras</p>
                      <p className="text-white font-bold font-mono">
                        ${((totalExpected + totalLateFees) / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* Resumen de Comisiones */}
                  <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                      <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Comisión JyJ</p>
                      <p className="text-white font-bold font-mono mt-0.5">
                        {loan.companyCommissionType === "FIXED_AMOUNT" 
                          ? `$${((loan.companyCommission || 0) / 100).toLocaleString('es-CO')}` 
                          : loan.companyCommissionType === "PERCENTAGE_PRINCIPAL"
                          ? `${loan.companyCommission || 0}% Capital`
                          : `${loan.companyCommission || 0}% Interés`}
                      </p>
                    </div>
                    <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20">
                      <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">Comisión Secretaría</p>
                      <p className="text-white font-bold font-mono mt-0.5">
                        {loan.secretaryCommissionType === "FIXED_AMOUNT" 
                          ? `$${((loan.secretaryCommission || 0) / 100).toLocaleString('es-CO')}` 
                          : loan.secretaryCommissionType === "PERCENTAGE_PRINCIPAL"
                          ? `${loan.secretaryCommission || 0}% Capital`
                          : `${loan.secretaryCommission || 0}% Interés`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progreso y Fondeo */}
              <div className="space-y-6">
                <div className="glass-panel rounded-2xl p-6">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4 w-4" /> Progreso del Pago
                  </h3>
                  <div className="mb-2 flex justify-between items-end">
                    <span className="text-3xl font-bold text-white">{progress}%</span>
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground block">
                        ${(totalPaid / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${(totalExpected / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {totalLateFees > 0 && (
                        <span className="text-[10px] text-rose-400 font-mono">
                          +${(totalLateFees / 100).toLocaleString('es-CO')} en moras cobradas
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                    <div className="bg-primary h-3 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>

                <div className="glass-panel rounded-2xl p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Fondeo / Inversionistas</h3>
                  {loan.investors.length === 0 ? (
                    <p className="text-sm text-white bg-white/5 p-3 rounded-lg border border-white/5">Fondeo Propio (100%)</p>
                  ) : (
                    <div className="space-y-3">
                      {loan.investors.map(inv => (
                        <div key={inv.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                          <p className="text-sm font-medium text-white">{inv.investor.name}</p>
                          <div className="text-right">
                            <p className="text-sm text-primary font-bold">{inv.participationPercentage}%</p>
                            <p className="text-xs text-muted-foreground">${(inv.investedAmount / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Historial de Abonos a Capital */}
                {principalPaymentsLog.length > 0 && (
                  <div className="glass-panel rounded-2xl p-6 border border-emerald-500/20">
                    <h3 className="text-sm font-medium text-emerald-400 flex items-center gap-2 mb-4">
                      <TrendingUp className="h-4 w-4" /> Abonos Extraordinarios a Capital
                    </h3>
                    <div className="space-y-3">
                      {principalPaymentsLog.map(log => {
                        let details = { amount: 0, type: "" }
                        try { details = JSON.parse(log.details) } catch (e) {}
                        
                        return (
                          <div key={log.id} className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-bold text-emerald-400">
                                ${(details.amount / 100).toLocaleString('es-CO')}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <span className="text-xs text-emerald-400/80 font-medium">
                              {details.type === 'REDUCE_TERM' ? "Recortó plazo del préstamo" : 
                               details.type === 'REDUCE_AMOUNT' ? "Redujo valor de cuotas" : "Abono a capital"}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Custodia y Gestión del Pagaré Firmado */}
            <PromissoryNoteCard
              loanId={loan.id}
              promissoryNoteUrl={loan.promissoryNoteUrl}
              promissoryNoteName={loan.promissoryNoteName}
              promissoryNoteUploadedAt={loan.promissoryNoteUploadedAt}
              clientName={`${loan.client.firstName} ${loan.client.lastName}`}
              idDocument={loan.client.idDocument}
            />

            {/* Cronograma de Cuotas */}
            <div className="glass-panel rounded-2xl overflow-hidden mt-8">
              <div className="p-6 border-b border-white/5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5" /> Cronograma de Pagos
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white/5 text-muted-foreground border-b border-white/5 uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-6 py-4"># Cuota</th>
                      <th className="px-6 py-4">Fecha de Pago</th>
                      <th className="px-6 py-4">Monto</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loan.installments.map((inst) => {
                      const isOverdue = inst.status === "PENDING" && new Date(inst.dueDate) < new Date()
                      return (
                        <tr key={inst.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-medium text-white">
                            Cuota {inst.installmentNumber}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`${isOverdue ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                              {new Date(inst.dueDate).toLocaleDateString()}
                            </span>
                            {isOverdue && <span className="ml-2 text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded font-bold uppercase">Vencida</span>}
                          </td>
                          <td className="px-6 py-4 text-white font-bold">
                            ${(inst.expectedAmount / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            {inst.lateFee > 0 && (
                              <div className="text-xs text-rose-400 font-semibold mt-0.5 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-400 inline-block" />
                                Mora: +${(inst.lateFee / 100).toLocaleString('es-CO')}
                              </div>
                            )}
                            {inst.status === "PARTIAL" && (
                              <div className="text-xs text-blue-400 font-normal mt-1">
                                Resta: ${((inst.expectedAmount - inst.amountPaid) / 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                              inst.status === "PAID" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                              inst.status === "PARTIAL" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                              isOverdue ? "bg-destructive/10 text-destructive border-destructive/20" :
                              "bg-orange-500/10 text-orange-400 border-orange-500/20"
                            }`}>
                              {inst.status === "PAID" ? "Pagada" : inst.status === "PARTIAL" ? "Abono Parcial" : "Pendiente"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <InstallmentBreakdown 
                                installmentNumber={inst.installmentNumber}
                                expectedAmount={inst.expectedAmount}
                                principalPart={inst.principalPart}
                                interestPart={inst.interestPart}
                                lateFee={inst.lateFee || 0}
                                secretaryCommissionType={loan.secretaryCommissionType}
                                secretaryCommission={loan.secretaryCommission}
                                principalAmount={loan.principalAmount}
                                numberOfInstallments={loan.numberOfInstallments}
                                investors={loan.investors}
                                referredByInvestor={loan.referredByInvestorId ? allInvestors.find(i => i.id === loan.referredByInvestorId) : null}
                              />
                              <WhatsAppReminderButton 
                                clientName={`${loan.client.firstName} ${loan.client.lastName}`}
                                clientPhone={loan.client.phone}
                                installmentNumber={inst.installmentNumber}
                                amount={inst.expectedAmount}
                                dueDate={inst.dueDate}
                                status={inst.status}
                              />
                              {loan.status !== "DEFAULTED" && (
                                <PayInstallmentButton 
                                  installmentId={inst.id} 
                                  status={inst.status} 
                                  dueDate={inst.dueDate}
                                  expectedAmount={inst.expectedAmount}
                                  amountPaid={inst.amountPaid}
                                  principalPart={inst.principalPart}
                                  interestPart={inst.interestPart}
                                  loanId={loan.id}
                                  clientName={`${loan.client.firstName} ${loan.client.lastName}`}
                                  idDocument={loan.client.idDocument}
                                  clientPhone={loan.client.phone}
                                  installmentNumber={inst.installmentNumber}
                                  totalInstallments={loan.numberOfInstallments}
                                  defaultedAt={loan.defaultedAt}
                                  totalOutstanding={loan.installments.filter(i => i.status !== "PAID").reduce((sum, curr) => sum + (curr.expectedAmount - curr.amountPaid), 0)}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
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
