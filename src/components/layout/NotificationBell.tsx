"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, AlertCircle, CalendarClock, CalendarX, ArrowRight, X } from "lucide-react"
import { getNotifications } from "@/app/actions/notification"
import { usePathname } from "next/navigation"
import Link from "next/link"

type NotificationType = {
  id: string
  loanId: string
  clientName: string
  installmentNumber: number
  expectedAmount: number
  dueDate: Date
  type: string // "OVERDUE", "TODAY", "UPCOMING", "SYSTEM_ALERT"
  daysLate: number
  daysUpcoming: number
  isSystem?: boolean
  message?: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationType[]>([])
  const [dismissedIds, setDismissedIds] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Cargar notificaciones y poll cada 30 segundos
  useEffect(() => {
    async function fetchNotifs() {
      const data = await getNotifications()
      setNotifications(data)
    }
    fetchNotifs()
    
    const interval = setInterval(fetchNotifs, 1000 * 30)
    return () => clearInterval(interval)
  }, [pathname])

  // Cargar notificaciones eliminadas/limpiadas desde localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dismissed_notifications")
      if (saved) {
        setDismissedIds(JSON.parse(saved))
      }
    } catch (e) {
      console.error("Error reading dismissed notifications:", e)
    }
  }, [])

  // Cerrar al hacer clic fuera del dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const updated = [...dismissedIds, id]
    setDismissedIds(updated)
    try {
      localStorage.setItem("dismissed_notifications", JSON.stringify(updated))
    } catch (err) {
      console.error("Error saving dismissed notifications:", err)
    }
  }

  const handleClearAll = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const allIds = notifications.map(n => n.id)
    const updated = Array.from(new Set([...dismissedIds, ...allIds]))
    setDismissedIds(updated)
    try {
      localStorage.setItem("dismissed_notifications", JSON.stringify(updated))
    } catch (err) {
      console.error("Error saving dismissed notifications:", err)
    }
  }

  // Filtrar las notificaciones eliminadas localmente
  const visibleNotifications = notifications.filter(n => !dismissedIds.includes(n.id))

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
      >
        <Bell className="h-5 w-5" />
        {visibleNotifications.length > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-background animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-card border border-white/10 shadow-2xl rounded-2xl overflow-hidden z-50">
          <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
            <h3 className="font-bold text-white text-sm">Notificaciones</h3>
            <div className="flex items-center gap-3">
              {visibleNotifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[10px] text-muted-foreground hover:text-white transition-colors underline"
                >
                  Limpiar todas
                </button>
              )}
              <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
                {visibleNotifications.length} Alertas
              </span>
            </div>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {visibleNotifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                <Bell className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">Todo al día</p>
                <p className="text-xs mt-1">No tienes notificaciones o alertas pendientes.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {visibleNotifications.map(n => (
                  <div 
                    key={n.id} 
                    className="border-b border-white/5 hover:bg-white/5 transition-colors flex gap-3 group relative pr-9"
                  >
                    <Link 
                      href={n.loanId ? `/prestamos/${n.loanId}` : "#"}
                      onClick={() => setIsOpen(false)}
                      className="p-4 flex-1 flex gap-3"
                    >
                      <div className="shrink-0 mt-0.5">
                        {n.type === "OVERDUE" && <AlertCircle className="h-5 w-5 text-destructive" />}
                        {n.type === "TODAY" && <CalendarX className="h-5 w-5 text-amber-400" />}
                        {n.type === "UPCOMING" && <CalendarClock className="h-5 w-5 text-primary" />}
                        {n.type === "SYSTEM_ALERT" && <Bell className="h-5 w-5 text-blue-400" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white group-hover:text-primary transition-colors">
                          {n.clientName}
                        </p>
                        {n.isSystem ? (
                          <>
                            <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                            <p className="text-xs font-semibold mt-1.5 text-blue-400">
                              Hace poco
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Cuota #{n.installmentNumber} • ${(n.expectedAmount / 100).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })}
                            </p>
                            <p className={`text-xs font-semibold mt-1.5 ${
                              n.type === "OVERDUE" ? "text-destructive" :
                              n.type === "TODAY" ? "text-amber-400" : "text-primary"
                            }`}>
                              {n.type === "OVERDUE" && `¡Vencida hace ${n.daysLate} día(s)!`}
                              {n.type === "TODAY" && `Vence el día de HOY`}
                              {n.type === "UPCOMING" && `Vence en ${n.daysUpcoming} día(s)`}
                            </p>
                          </>
                        )}
                      </div>
                    </Link>

                    <button
                      onClick={(e) => handleDismiss(n.id, e)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                      title="Eliminar notificación"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
