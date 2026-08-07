import { SidebarServer as Sidebar } from "@/components/layout/SidebarServer"
import { Header } from "@/components/layout/Header"
import { prisma } from "@/lib/prisma"
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldAlert, 
  CheckCircle2, 
  Briefcase, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  ArrowRight,
  ExternalLink,
  MessageCircle,
  FileText,
  AlertTriangle,
  History,
  Award
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { EditClientModal } from "../EditClientModal"
import { BlacklistToggleButton } from "../BlacklistToggleButton"

export default async function ClientDossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const client = await prisma.client.findUnique({
    where: { id, deletedAt: null },
    include: {
      loans: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: {
          installments: {
            orderBy: { installmentNumber: "asc" }
          },
          payments: {
            where: { deletedAt: null },
            orderBy: { paymentDate: "desc" }
          },
          investors: {
            include: { investor: true }
          }
        }
      }
    }
  })

  if (!client) {
    notFound()
  }

  // Métricas acumuladas del cliente
  const totalLoansCount = client.loans.length
  const activeLoans = client.loans.filter(l => l.status === "ACTIVE" || l.status === "OVERDUE")
  const paidLoans = client.loans.filter(l => l.status === "PAID")
  const defaultedLoans = client.loans.filter(l => l.status === "DEFAULTED")

  let totalBorrowedAllTime = 0
  let totalPaidAllTime = 0
  let currentActiveDebt = 0
  let totalInstallmentsCount = 0
  let lateInstallmentsCount = 0

  client.loans.forEach(loan => {
    totalBorrowedAllTime += loan.principalAmount
    
    loan.installments.forEach(inst => {
      totalInstallmentsCount++
      if (inst.status === "PAID") {
        totalPaidAllTime += inst.expectedAmount
      } else {
        if (loan.status === "ACTIVE" || loan.status === "OVERDUE") {
          currentActiveDebt += (inst.expectedAmount - inst.amountPaid)
        }
        if (new Date(inst.dueDate) < new Date()) {
          lateInstallmentsCount++
        }
      }
    })
  })

  // Calificación de Riesgo del Cliente
  let riskScore = "A (Excelente)"
  let riskColor = "text-emerald-400 border-emerald-500/20 bg-emerald-500/10"

  if (client.isBlacklisted || defaultedLoans.length > 0) {
    riskScore = "D (Lista Negra / Pérdida)"
    riskColor = "text-rose-400 border-rose-500/20 bg-rose-500/10"
  } else if (lateInstallmentsCount > 2) {
    riskScore = "C (Riesgo Moderado - Moras)"
    riskColor = "text-amber-400 border-amber-500/20 bg-amber-500/10"
  } else if (lateInstallmentsCount > 0) {
    riskScore = "B (Bueno - Moras Leves)"
    riskColor = "text-blue-400 border-blue-500/20 bg-blue-500/10"
  }

  // Limpiar teléfono para enlace directo de WhatsApp
  const cleanPhone = client.phone.replace(/\D/g, "")
  const whatsappUrl = `https://wa.me/${cleanPhone.startsWith('57') ? cleanPhone : '57' + cleanPhone}`

  return (
    <div className="flex h-screen overflow-hidden bg-[#090D16]">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Luces de ambiente */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[140px] pointer-events-none" />
        
        <Header />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 relative z-0">
          <div className="max-w-[1300px] mx-auto space-y-7">
            
            {/* Cabecera de Navegación y Perfil del Cliente */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-4">
                <Link 
                  href="/clientes" 
                  className="h-10 w-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider font-mono">
                      Expediente Crediticio
                    </span>
                    <span className="text-white/20">•</span>
                    <span className="text-xs text-muted-foreground font-mono">ID: {client.id.slice(0, 10).toUpperCase()}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                    {client.firstName} {client.lastName}
                    {client.isBlacklisted ? (
                      <span className="text-xs px-3 py-1 rounded-full font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 inline-flex items-center gap-1">
                        <ShieldAlert className="h-3.5 w-3.5" /> Lista Negra
                      </span>
                    ) : (
                      <span className="text-xs px-3 py-1 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Cliente Activo
                      </span>
                    )}
                  </h1>
                </div>
              </div>

              {/* Botones de Acción Rápida */}
              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 active:scale-95 shadow-sm"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp</span>
                </a>

                <BlacklistToggleButton clientId={client.id} isBlacklisted={client.isBlacklisted} />
                <EditClientModal client={client} />
                
                <Link
                  href="/prestamos/nuevo"
                  className="h-10 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.35)] border border-blue-400/30 inline-flex items-center gap-2 active:scale-95"
                >
                  <DollarSign className="h-4 w-4" />
                  <span>Nuevo Préstamo</span>
                </Link>
              </div>
            </div>

            {/* Ficha de Datos del Cliente & Métricas Financieras */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Información Personal y Contacto (4 Columnas) */}
              <div className="lg:col-span-4 space-y-6">
                <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-5">
                  <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600/30 to-indigo-500/30 text-blue-400 border border-blue-500/30 flex items-center justify-center text-lg font-extrabold flex-shrink-0">
                      {client.firstName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Datos de Identificación</h3>
                      <p className="text-xs text-muted-foreground font-mono">CC: {client.idDocument}</p>
                    </div>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-blue-400" /> Teléfono
                      </span>
                      <span className="text-white font-mono font-bold">{client.phone}</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-indigo-400" /> Correo
                      </span>
                      <span className="text-white truncate max-w-[170px]">{client.email || "No registrado"}</span>
                    </div>

                    <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-emerald-400" /> Dirección de Residencia
                      </span>
                      <span className="text-white font-medium pl-5">
                        {client.address || "Sin dirección"}
                        {client.addressOptions ? ` (${client.addressOptions})` : ""}
                      </span>
                      <span className="text-[11px] text-muted-foreground pl-5 font-mono">
                        {client.city ? `${client.city}` : ""}{client.neighborhood ? ` • ${client.neighborhood}` : ""}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-amber-400" /> Cliente Desde
                      </span>
                      <span className="text-white font-mono">
                        {new Date(client.createdAt).toLocaleDateString('es-CO')}
                      </span>
                    </div>
                  </div>

                  {/* Calificación Crediticia */}
                  <div className="pt-2">
                    <div className={`p-4 rounded-2xl border flex items-center gap-3 ${riskColor}`}>
                      <Award className="h-5 w-5 flex-shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider block">Perfil de Comportamiento</span>
                        <span className="text-xs font-extrabold">{riskScore}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Métricas y Resumen de Cartera del Cliente (8 Columnas) */}
              <div className="lg:col-span-8 space-y-6">
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Total Prestado Histórico */}
                  <div className="glass-panel glass-card-hover rounded-2xl p-5 border-l-4 border-l-blue-500 flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase font-mono tracking-wider">
                      Capital Histórico
                    </span>
                    <div className="mt-2">
                      <h4 className="text-2xl font-extrabold text-white font-mono tracking-tight">
                        ${(totalBorrowedAllTime / 100).toLocaleString('es-CO')}
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {totalLoansCount} {totalLoansCount === 1 ? 'préstamo emitido' : 'préstamos emitidos'}
                      </p>
                    </div>
                  </div>

                  {/* Deuda Activa */}
                  <div className="glass-panel glass-card-hover rounded-2xl p-5 border-l-4 border-l-amber-500 flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase font-mono tracking-wider">
                      Deuda Viva Actual
                    </span>
                    <div className="mt-2">
                      <h4 className="text-2xl font-extrabold text-amber-400 font-mono tracking-tight">
                        ${(currentActiveDebt / 100).toLocaleString('es-CO')}
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {activeLoans.length} {activeLoans.length === 1 ? 'crédito en curso' : 'créditos en curso'}
                      </p>
                    </div>
                  </div>

                  {/* Total Recaudado / Pagado */}
                  <div className="glass-panel glass-card-hover rounded-2xl p-5 border-l-4 border-l-emerald-500 flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase font-mono tracking-wider">
                      Total Abonado
                    </span>
                    <div className="mt-2">
                      <h4 className="text-2xl font-extrabold text-emerald-400 font-mono tracking-tight">
                        ${(totalPaidAllTime / 100).toLocaleString('es-CO')}
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {paidLoans.length} {paidLoans.length === 1 ? 'liquidado' : 'liquidados'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Historial Detallado de Préstamos */}
                <div className="glass-panel rounded-2xl p-6 border border-white/[0.08]">
                  <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Historial de Obligaciones Financieras</h3>
                        <p className="text-xs text-muted-foreground">Listado de todos los préstamos contraídos por el titular.</p>
                      </div>
                    </div>
                    
                    <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                      {totalLoansCount} Obligaciones
                    </span>
                  </div>

                  {client.loans.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-xs">
                      Este cliente aún no cuenta con préstamos asociados.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {client.loans.map((loan) => {
                        const paidInst = loan.installments.filter(i => i.status === "PAID").length
                        const totalInst = loan.installments.length
                        const progress = totalInst > 0 ? Math.round((paidInst / totalInst) * 100) : 0
                        const totalEarned = loan.installments.reduce((sum, curr) => sum + curr.interestPart, 0)
                        
                        return (
                          <div 
                            key={loan.id}
                            className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] transition-all space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl border flex items-center justify-center font-bold text-xs font-mono ${
                                  loan.status === 'ACTIVE' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                  loan.status === 'OVERDUE' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                  loan.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                  loan.status === 'REFINANCED' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                  'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                }`}>
                                  ${(loan.principalAmount / 100).toLocaleString('es-CO')}
                                </div>

                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-white font-mono">
                                      Crédito #{loan.id.slice(0, 8).toUpperCase()}
                                    </span>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                      loan.status === 'ACTIVE' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                      loan.status === 'OVERDUE' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                      loan.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                      loan.status === 'REFINANCED' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                      'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                    }`}>
                                      {loan.status}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    Iniciado el {new Date(loan.startDate).toLocaleDateString('es-CO')} • Frecuencia {loan.interestType}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/prestamos/${loan.id}`}
                                  className="h-8 px-3 bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/[0.08] rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-sm"
                                >
                                  <span>Ver Detalle y Pagos</span>
                                  <ArrowRight className="h-3.5 w-3.5 text-blue-400" />
                                </Link>
                              </div>
                            </div>

                            {/* Barra de Progreso de Cuotas */}
                            <div className="space-y-1.5 pt-1">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-muted-foreground">
                                  Progreso: <strong className="text-white font-mono">{paidInst} de {totalInst} cuotas pagadas</strong> ({progress}%)
                                </span>
                                <span className="text-muted-foreground font-mono">
                                  Cuota: ${(loan.installmentAmount / 100).toLocaleString('es-CO')}
                                </span>
                              </div>
                              <div className="w-full bg-white/[0.04] rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-500 ${
                                    loan.status === 'PAID' ? 'bg-emerald-500' :
                                    loan.status === 'OVERDUE' ? 'bg-amber-500' :
                                    loan.status === 'DEFAULTED' ? 'bg-rose-500' : 'bg-blue-500'
                                  }`} 
                                  style={{ width: `${progress}%` }} 
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
