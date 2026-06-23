"use client"

import React, { forwardRef } from "react"

export type ReceiptData = {
  loanId: string
  clientName: string
  idDocument: string
  installmentNumber: number
  amountPaid: number
  paymentDate: Date
  moraPaid: number
}

export const ReceiptTemplate = forwardRef<HTMLDivElement, { data: ReceiptData }>(({ data }, ref) => {
  return (
    <div className="hidden">
      <div ref={ref} className="p-8 max-w-[80mm] mx-auto bg-white text-black font-sans text-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold uppercase mb-1">JyJ Préstamos</h1>
          <p className="text-xs">Inversiones & Créditos</p>
          <p className="text-xs mt-2 border-b border-black pb-2 border-dashed">Comprobante de Pago</p>
        </div>

        <div className="space-y-2 mb-6">
          <div className="flex justify-between">
            <span className="font-bold">Fecha:</span>
            <span>{new Date(data.paymentDate).toLocaleDateString("es-CO")} {new Date(data.paymentDate).toLocaleTimeString("es-CO")}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Cliente:</span>
            <span className="text-right">{data.clientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Documento:</span>
            <span>{data.idDocument}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Ref. Préstamo:</span>
            <span className="text-xs">{data.loanId.slice(-6).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Cuota Pagada:</span>
            <span>#{data.installmentNumber}</span>
          </div>
        </div>

        <div className="border-t border-black border-dashed pt-2 mb-6 space-y-2">
          <div className="flex justify-between">
            <span>Valor Cuota</span>
            <span>${((data.amountPaid - data.moraPaid) / 100).toLocaleString("es-CO")}</span>
          </div>
          {data.moraPaid > 0 && (
            <div className="flex justify-between">
              <span>Mora por atraso</span>
              <span>${(data.moraPaid / 100).toLocaleString("es-CO")}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg mt-2 border-t border-black pt-2">
            <span>TOTAL PAGADO</span>
            <span>${(data.amountPaid / 100).toLocaleString("es-CO")}</span>
          </div>
        </div>

        <div className="text-center text-xs mt-8 pt-4 border-t border-black border-dashed">
          <p className="font-bold mb-1">¡Gracias por su pago!</p>
          <p>Conserve este recibo para</p>
          <p>cualquier reclamación.</p>
        </div>
      </div>
    </div>
  )
})
ReceiptTemplate.displayName = "ReceiptTemplate"
