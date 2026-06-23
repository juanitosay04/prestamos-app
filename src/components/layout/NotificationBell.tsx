"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, AlertCircle, CalendarClock, CalendarX, ArrowRight } from "lucide-react"
import { getNotifications } from "@/app/actions/notification"
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
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchNotifs() {
      const data = await getNotifications()
      setNotifications(data)
    }
    fetchNotifs()
    // Poll every 5 minutes
    const interval = setInterval(fetchNotifs, 1000 * 60 * 5)
    return () => clearInterval(interval)
  }, [])

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const overdueCount = notifications.filter(n => n.type === "OVERDUE").length

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
      >
        <Bell className="h-5 w-5" />
        {notifications.length > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-background animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-card border border-white/10 shadow-2xl rounded-2xl overflow-hidden z-50">
          <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
            <h3 className="font-bold text-white text-sm">Notificaciones</h3>
            <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
              {notifications.length} Alertas
            </span>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                <Bell className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">Todo al día</p>
                <p className="text-xs">No tienes cuotas pendientes ni vencidas.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map(n => (
                  <Link 
                    key={n.id} 
                    href={`/prestamos/${n.loanId}`}
                    onClick={() => setIsOpen(false)}
                    className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors flex gap-3 group"
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
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity self-center" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
