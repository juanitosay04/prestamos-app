"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X, FileEdit } from "lucide-react"
import { updateClient } from "@/app/actions/client"

export function EditClientModal({ client }: { client: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    setError(null)
    
    try {
      const result = await updateClient(client.id, formData)
      
      if (result.error) {
        setError(result.error)
      } else {
        setIsOpen(false)
        router.refresh()
      }
    } catch (e) {
      setError("Error inesperado al actualizar el cliente")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 text-muted-foreground hover:text-white hover:bg-white/10 rounded-lg transition-colors" 
        title="Editar Cliente"
      >
        <FileEdit className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-background border border-white/10 rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-white rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">Editar Cliente</h2>
              <p className="text-sm text-muted-foreground">Actualiza la información de {client.firstName}</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
                {error}
              </div>
            )}

            <form action={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm font-medium text-white">Nombres *</label>
                  <input 
                    type="text" 
                    id="firstName" 
                    name="firstName" 
                    defaultValue={client.firstName}
                    required 
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm font-medium text-white">Apellidos *</label>
                  <input 
                    type="text" 
                    id="lastName" 
                    name="lastName" 
                    defaultValue={client.lastName}
                    required 
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="idDocument" className="text-sm font-medium text-white">Documento de Identidad *</label>
                  <input 
                    type="text" 
                    id="idDocument" 
                    name="idDocument" 
                    defaultValue={client.idDocument}
                    required 
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium text-white">Teléfono *</label>
                  <input 
                    type="tel" 
                    id="phone" 
                    name="phone" 
                    defaultValue={client.phone}
                    required 
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-white">Email (Opcional)</label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    defaultValue={client.email || ""}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="city" className="text-sm font-medium text-white">Ciudad</label>
                  <input 
                    type="text" 
                    id="city" 
                    name="city" 
                    defaultValue={client.city || ""}
                    placeholder="Ej. Bogotá"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="neighborhood" className="text-sm font-medium text-white">Barrio</label>
                  <input 
                    type="text" 
                    id="neighborhood" 
                    name="neighborhood" 
                    defaultValue={client.neighborhood || ""}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <label htmlFor="address" className="text-sm font-medium text-white">Dirección principal</label>
                  <input 
                    type="text" 
                    id="address" 
                    name="address" 
                    defaultValue={client.address || ""}
                    placeholder="Calle, Carrera, Avenida..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <label htmlFor="addressOptions" className="text-sm font-medium text-white">Detalles adicionales (Torre, Apto, Local, etc.)</label>
                  <input 
                    type="text" 
                    id="addressOptions" 
                    name="addressOptions" 
                    defaultValue={client.addressOptions || ""}
                    placeholder="Ej. Torre 2, Apto 504"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button 
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
