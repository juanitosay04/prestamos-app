/**
 * Utilidades centralizadas de fechas para zona horaria de Colombia (America/Bogota, UTC-5).
 * Evita desfases cuando el servidor (Vercel) corre en UTC y evita que fechas guardadas
 * a las 00:00:00.000Z se corran al día anterior al restar 5 horas.
 */

/**
 * Devuelve la fecha calendario actual en Colombia en formato "YYYY-MM-DD"
 */
export function getColombiaTodayStr(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

/**
 * Devuelve la hora actual del día en Colombia (0 a 23)
 */
export function getColombiaCurrentHour(now: Date = new Date()): number {
  const hourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    hour: "numeric",
    hour12: false,
  }).format(now)
  const parsed = parseInt(hourStr, 10)
  return isNaN(parsed) ? 0 : parsed % 24
}

/**
 * Extrae el día calendario "YYYY-MM-DD" de una fecha de cuota o préstamo.
 * Si la fecha fue guardada como medianoche UTC (00:00:00.000Z desde un input type="date"),
 * conserva su año-mes-día UTC original para que no se reste 1 día en UTC-5.
 */
export function getInstallmentDateStr(dateInput: Date | string): string {
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return getColombiaTodayStr()

  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
    return d.toISOString().slice(0, 10)
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

/**
 * Convierte "YYYY-MM-DD" a milisegundos UTC a medianoche para restar días calendario exactos.
 */
function ymdToUtcMs(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number)
  return Date.UTC(y, (m || 1) - 1, d || 1)
}

/**
 * Calcula cuántos días calendario faltan (o han pasado) entre HOY en Colombia y la fecha de vencimiento.
 * - diffDays < 0  => Ya venció (el día de pago ya cerró sin pago). Ej: -1 = 1 día de mora.
 * - diffDays === 0 => Vence HOY (es su día de pago; aún no está vencida hasta que cierre el día).
 * - diffDays > 0  => Vence en el futuro (próxima a pagar en diffDays días).
 */
export function getDaysDiffFromColombiaToday(dueDate: Date | string, now: Date = new Date()): number {
  const todayStr = getColombiaTodayStr(now)
  const dueStr = getInstallmentDateStr(dueDate)
  const diffMs = ymdToUtcMs(dueStr) - ymdToUtcMs(todayStr)
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Formatea una fecha de cuota para mostrar en pantalla en formato colombiano (DD/MM/YYYY)
 * sin que medianoche UTC se corra al día anterior.
 */
export function formatInstallmentDate(dateInput: Date | string): string {
  const ymd = getInstallmentDateStr(dateInput)
  const [y, m, d] = ymd.split("-")
  if (!y || !m || !d) return ""
  return `${d}/${m}/${y}`
}
