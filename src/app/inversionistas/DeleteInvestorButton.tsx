"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Trash2, AlertTriangle, Loader2 } from "lucide-react"
import { deleteInvestor } from "@/app/actions/investor"

export function DeleteInvestorButton({ id }: { id: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleDelete = async () => {
    setLoading(true)
    setError("")
    
    const result = await deleteInvestor(id)
    
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setIsOpen(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors" 
        title="Eliminar Inversionista"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {isOpen && mounted && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 flex flex-col items-center text-center gap-4">
              <div className="h-16 w-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-2">
                <AlertTriangle className="h-8 w-8" />
              </div>
              
              <h2 className="text-xl font-bold text-white">¿Eliminar Inversionista?</h2>
              
              <p className="text-sm text-muted-foreground">
                Esta acción lo ocultará de la lista de inversionistas. No podrás eliminarlo si tiene préstamos activos.
              </p>

              {error && (
                <div className="w-full bg-destructive/20 text-destructive text-xs p-3 rounded-lg border border-destructive/20 mt-2">
                  {error}
                </div>
              )}

              <div className="w-full grid grid-cols-2 gap-3 mt-4">
                <button 
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={loading}
                  className="bg-destructive hover:bg-destructive/90 text-white px-4 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {loading ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
