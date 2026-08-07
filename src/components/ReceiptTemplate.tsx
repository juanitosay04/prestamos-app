"use client"

import React, { forwardRef } from "react"

export type ReceiptData = {
  loanId: string
  clientName: string
  idDocument: string
  clientPhone?: string
  installmentNumber: number
  totalInstallments?: number
  amountPaid: number
  paymentDate: Date
  moraPaid: number
  principalPaid?: number
  interestPaid?: number
  remainingBalance?: number
}

// ─── Versión Digital Premium (pantalla) ────────────────────────────
export function ReceiptPreview({ data }: { data: ReceiptData }) {
  const paymentDate = new Date(data.paymentDate)
  const baseInstallmentPaid = Math.max(0, data.amountPaid - data.moraPaid)
  const receiptCode = `REC-${data.loanId.slice(-6).toUpperCase()}-${data.installmentNumber}-${Date.now().toString().slice(-4)}`

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Card principal */}
      <div
        style={{
          background: "linear-gradient(145deg, #0a0f1e 0%, #0d1424 60%, #0a1628 100%)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 25px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(16,185,129,0.08)",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {/* Header verde esmeralda */}
        <div
          style={{
            background: "linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%)",
            padding: "20px 24px 18px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Círculo decorativo */}
          <div style={{
            position: "absolute", top: "-20px", right: "-20px",
            width: "120px", height: "120px", borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }} />
          <div style={{
            position: "absolute", top: "10px", right: "40px",
            width: "60px", height: "60px", borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
          }} />

          <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative" }}>
            <div style={{
              background: "rgba(255,255,255,0.15)",
              borderRadius: "12px", padding: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.70)", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", margin: 0 }}>
                Comprobante de Pago
              </p>
              <p style={{ fontSize: "18px", fontWeight: 800, color: "white", margin: "1px 0 0", letterSpacing: "-0.3px" }}>
                ¡Pago Registrado!
              </p>
            </div>
          </div>

          <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.65)", margin: 0, letterSpacing: "0.5px" }}>TOTAL RECIBIDO</p>
              <p style={{ fontSize: "26px", fontWeight: 900, color: "white", margin: "2px 0 0", fontFamily: "monospace", letterSpacing: "-0.5px" }}>
                ${(data.amountPaid / 100).toLocaleString("es-CO")}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.65)", margin: 0 }}>CUOTA</p>
              <p style={{ fontSize: "22px", fontWeight: 900, color: "rgba(255,255,255,0.9)", margin: "2px 0 0", fontFamily: "monospace" }}>
                #{data.installmentNumber}{data.totalInstallments ? `/${data.totalInstallments}` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Cuerpo del recibo */}
        <div style={{ padding: "20px 24px" }}>

          {/* Número de recibo */}
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "10px", padding: "8px 12px",
            marginBottom: "16px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.40)", letterSpacing: "0.8px", textTransform: "uppercase" }}>No. Recibo</span>
            <span style={{ fontSize: "10px", fontFamily: "monospace", color: "rgba(16,185,129,0.9)", fontWeight: 700, letterSpacing: "0.5px" }}>{receiptCode}</span>
          </div>

          {/* Datos del cliente */}
          <div style={{ marginBottom: "16px" }}>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.40)", letterSpacing: "1px", textTransform: "uppercase", fontWeight: 600, marginBottom: "8px" }}>
              Titular del Crédito
            </p>
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "12px", padding: "12px 14px",
            }}>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "white", margin: "0 0 4px" }}>{data.clientName}</p>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.50)", fontFamily: "monospace" }}>CC: {data.idDocument}</span>
                {data.clientPhone && (
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.50)", fontFamily: "monospace" }}>📱 {data.clientPhone}</span>
                )}
              </div>
            </div>
          </div>

          {/* Desglose del pago */}
          <div style={{ marginBottom: "16px" }}>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.40)", letterSpacing: "1px", textTransform: "uppercase", fontWeight: 600, marginBottom: "8px" }}>
              Desglose del Pago
            </p>
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "12px", overflow: "hidden",
            }}>
              {/* Fila: Abono cuota */}
              <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.60)" }}>Abono a Cuota</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "white", fontFamily: "monospace" }}>
                  ${(baseInstallmentPaid / 100).toLocaleString("es-CO")}
                </span>
              </div>

              {/* Sub-fila capital */}
              {data.principalPaid !== undefined && data.principalPaid > 0 && (
                <div style={{ padding: "7px 14px 7px 24px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.01)" }}>
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.40)" }}>↳ Abono a Capital</span>
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.55)", fontFamily: "monospace" }}>
                    ${(data.principalPaid / 100).toLocaleString("es-CO")}
                  </span>
                </div>
              )}

              {/* Sub-fila interés */}
              {data.interestPaid !== undefined && data.interestPaid > 0 && (
                <div style={{ padding: "7px 14px 7px 24px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.01)" }}>
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.40)" }}>↳ Interés Corriente</span>
                  <span style={{ fontSize: "11px", color: "rgba(52,211,153,0.75)", fontFamily: "monospace" }}>
                    ${(data.interestPaid / 100).toLocaleString("es-CO")}
                  </span>
                </div>
              )}

              {/* Mora */}
              {data.moraPaid > 0 && (
                <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", background: "rgba(239,68,68,0.06)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontSize: "12px", color: "#f87171", fontWeight: 600 }}>⚠ Recargo por Mora</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#f87171", fontFamily: "monospace" }}>
                    +${(data.moraPaid / 100).toLocaleString("es-CO")}
                  </span>
                </div>
              )}

              {/* Total */}
              <div style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(16,185,129,0.07)" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>TOTAL RECIBIDO</span>
                <span style={{ fontSize: "16px", fontWeight: 900, color: "#34d399", fontFamily: "monospace" }}>
                  ${(data.amountPaid / 100).toLocaleString("es-CO")}
                </span>
              </div>
            </div>
          </div>

          {/* Saldo restante */}
          {data.remainingBalance !== undefined && (
            <div style={{
              background: data.remainingBalance === 0 ? "rgba(16,185,129,0.10)" : "rgba(59,130,246,0.08)",
              border: `1px solid ${data.remainingBalance === 0 ? "rgba(16,185,129,0.25)" : "rgba(59,130,246,0.20)"}`,
              borderRadius: "10px", padding: "10px 14px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: "16px",
            }}>
              <span style={{ fontSize: "11px", color: data.remainingBalance === 0 ? "#34d399" : "#93c5fd", fontWeight: 600 }}>
                {data.remainingBalance === 0 ? "🎉 ¡Préstamo Saldado!" : "Saldo Deuda Restante"}
              </span>
              <span style={{ fontSize: "13px", fontWeight: 800, color: data.remainingBalance === 0 ? "#34d399" : "#93c5fd", fontFamily: "monospace" }}>
                ${(data.remainingBalance / 100).toLocaleString("es-CO")}
              </span>
            </div>
          )}

          {/* Fecha y hora */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.5px" }}>
              📅 {paymentDate.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
            </span>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>
              {paymentDate.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "10px 24px 16px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          textAlign: "center",
        }}>
          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", margin: 0, letterSpacing: "0.3px" }}>
            PRÉSTAMOS JYJ · SISTEMA FINANCIERO INTERNO · NIT 901.458.239-1
          </p>
          <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.15)", margin: "3px 0 0", fontFamily: "monospace" }}>
            Ref: #{data.loanId.slice(-8).toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Versión POS Térmica (impresión física) ─────────────────────────
export const ReceiptTemplate = forwardRef<HTMLDivElement, { data: ReceiptData }>(({ data }, ref) => {
  const paymentDate = new Date(data.paymentDate)
  const baseInstallmentPaid = Math.max(0, data.amountPaid - data.moraPaid)

  return (
    <div className="hidden">
      <div
        ref={ref}
        className="p-6 max-w-[80mm] mx-auto bg-white text-black font-mono text-[11px] leading-tight select-none"
      >
        {/* Encabezado */}
        <div className="text-center mb-4">
          <h1 className="text-base font-black uppercase tracking-wider mb-0.5">JYJ PRÉSTAMOS</h1>
          <p className="text-[10px] text-gray-700 font-semibold uppercase tracking-wide">Soluciones Financieras & Inversiones</p>
          <p className="text-[9px] text-gray-500 font-sans mt-0.5">NIT / ID: 901.458.239-1</p>
          <div className="my-2 border-y border-black py-1">
            <span className="text-[11px] font-black uppercase tracking-wider">COMPROBANTE OFICIAL DE PAGO</span>
          </div>
          <p className="text-[9px] text-gray-600 font-sans">
            Recibo No: <strong className="font-mono text-black">REC-{data.loanId.slice(-6).toUpperCase()}-{data.installmentNumber}</strong>
          </p>
        </div>

        {/* Datos del Cliente y Obligación */}
        <div className="space-y-1.5 mb-3 border-b border-black/80 pb-2">
          <div className="flex justify-between">
            <span className="text-gray-600">FECHA/HORA:</span>
            <span className="font-bold">{paymentDate.toLocaleDateString("es-CO")} {paymentDate.toLocaleTimeString("es-CO", { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">TITULAR:</span>
            <span className="font-black text-right max-w-[170px] truncate">{data.clientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">DOCUMENTO:</span>
            <span className="font-bold">{data.idDocument}</span>
          </div>
          {data.clientPhone && (
            <div className="flex justify-between">
              <span className="text-gray-600">TELÉFONO:</span>
              <span>{data.clientPhone}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">PRÉSTAMO REF:</span>
            <span className="font-bold font-mono">#{data.loanId.slice(-8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">CONCEPTO:</span>
            <span className="font-black text-black">
              CUOTA #{data.installmentNumber} {data.totalInstallments ? `DE ${data.totalInstallments}` : ''}
            </span>
          </div>
        </div>

        {/* Desglose del Pago */}
        <div className="space-y-1.5 mb-3">
          <div className="flex justify-between">
            <span className="text-gray-700">Abono Cuota:</span>
            <span className="font-bold">${(baseInstallmentPaid / 100).toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
          </div>

          {data.principalPaid !== undefined && data.principalPaid > 0 && (
            <div className="flex justify-between text-[10px] text-gray-600 pl-2">
              <span>• Abono a Capital:</span>
              <span>${(data.principalPaid / 100).toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
            </div>
          )}

          {data.interestPaid !== undefined && data.interestPaid > 0 && (
            <div className="flex justify-between text-[10px] text-gray-600 pl-2">
              <span>• Interés Corriente:</span>
              <span>${(data.interestPaid / 100).toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
            </div>
          )}

          {data.moraPaid > 0 && (
            <div className="flex justify-between text-black font-bold">
              <span>Recargo por Mora:</span>
              <span>+ ${(data.moraPaid / 100).toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
            </div>
          )}

          {/* Gran Total */}
          <div className="border-t-2 border-black pt-1.5 mt-2 flex justify-between text-xs font-black">
            <span>TOTAL RECIBIDO:</span>
            <span className="text-sm">${(data.amountPaid / 100).toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
          </div>

          {data.remainingBalance !== undefined && (
            <div className="flex justify-between text-[10px] text-gray-700 pt-1.5 mt-1 border-t border-dashed border-gray-400">
              <span className="font-bold">Saldo Deuda Restante:</span>
              <span className="font-bold">${(data.remainingBalance / 100).toLocaleString("es-CO", { minimumFractionDigits: 0 })}</span>
            </div>
          )}
        </div>

        {/* Pie de Página y Seguridad */}
        <div className="text-center text-[9px] mt-4 pt-3 border-t border-black border-dashed text-gray-600 font-sans space-y-1">
          <p className="font-bold text-black uppercase text-[10px]">¡Gracias por su puntualidad!</p>
          <p>Conserve este soporte oficial como comprobante de pago.</p>
          <p className="text-[8px] text-gray-400 mt-1 font-mono">
            SISTEMA JYJ FINTECH • VAL: {data.loanId.slice(0, 4)}-{Date.now().toString().slice(-4)}
          </p>
        </div>
      </div>
    </div>
  )
})
ReceiptTemplate.displayName = "ReceiptTemplate"
