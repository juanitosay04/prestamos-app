"use client"

import { useState, useRef, useEffect } from "react"
import { 
  FileText, 
  Upload, 
  Eye, 
  Download, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X, 
  FileCheck,
  ShieldCheck,
  RefreshCw
} from "lucide-react"
import { uploadPromissoryNote, deletePromissoryNote } from "@/app/actions/loan"
import toast from "react-hot-toast"

interface PromissoryNoteCardProps {
  loanId: string
  promissoryNoteUrl: string | null
  promissoryNoteName: string | null
  promissoryNoteUploadedAt: Date | string | null
  clientName: string
  idDocument: string
}

export function PromissoryNoteCard({
  loanId,
  promissoryNoteUrl,
  promissoryNoteName,
  promissoryNoteUploadedAt,
  clientName,
  idDocument
}: PromissoryNoteCardProps) {
  const [loading, setLoading] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Manejo de tecla Escape y bloqueo de scroll cuando los modales están abiertos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPreviewOpen(false)
        setIsDeleteOpen(false)
      }
    }
    if (isPreviewOpen || isDeleteOpen) {
      window.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "unset"
    }
  }, [isPreviewOpen, isDeleteOpen])

  const isPdf = promissoryNoteUrl?.startsWith("data:application/pdf") || promissoryNoteName?.toLowerCase().endsWith(".pdf")
  const formattedDate = promissoryNoteUploadedAt 
    ? new Date(promissoryNoteUploadedAt).toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : null

  const handleFileProcess = async (file: File) => {
    // Validar tipo de archivo
    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/jpg"]
    if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Formato no compatible. Suba un archivo PDF o una foto (JPG, PNG).")
      return
    }

    // Validar tamaño máximo (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("El archivo supera el límite de 10MB.")
      return
    }

    setLoading(true)
    const reader = new FileReader()

    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      if (!dataUrl) {
        toast.error("Error al procesar el archivo.")
        setLoading(false)
        return
      }

      try {
        const res = await uploadPromissoryNote(loanId, dataUrl, file.name)
        if (res.error) {
          toast.error(res.error)
        } else {
          toast.success("¡Pagaré firmado cargado y custodiado con éxito!")
        }
      } catch (err) {
        console.error("Upload error:", err)
        toast.error("Error al guardar el pagaré.")
      } finally {
        setLoading(false)
      }
    }

    reader.onerror = () => {
      toast.error("Error al leer el archivo.")
      setLoading(false)
    }

    reader.readAsDataURL(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileProcess(file)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileProcess(file)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      const res = await deletePromissoryNote(loanId)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Pagaré eliminado de la custodia.")
        setIsDeleteOpen(false)
      }
    } catch (err) {
      toast.error("Error al eliminar el pagaré.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] relative overflow-hidden">
        {/* Glow de acento */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

        {/* Encabezado */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border flex items-center justify-center ${
              promissoryNoteUrl 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Pagaré & Documento Legal
                {promissoryNoteUrl && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Firmado & Custodiado
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground">
                Soporte legal obligatorio y título valor de la obligación crediticia.
              </p>
            </div>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleInputChange} 
            accept=".pdf,image/png,image/jpeg,image/jpg,image/webp" 
            className="hidden" 
          />
        </div>

        {/* Contenido Condicional */}
        {promissoryNoteUrl ? (
          /* ESTADO: YA SUBIDO Y CUSTODIADO */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate font-mono">
                    {promissoryNoteName || "pagare_firmado.pdf"}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                    <span>Subido: {formattedDate}</span>
                    <span>•</span>
                    <span className="uppercase font-mono text-blue-400 font-bold">{isPdf ? "PDF" : "IMAGEN"}</span>
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setIsPreviewOpen(true)}
                  className="h-9 px-3.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 active:scale-95 shadow-sm"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Ver Pagaré</span>
                </button>

                <a
                  href={promissoryNoteUrl}
                  download={promissoryNoteName || `pagare_${idDocument}.pdf`}
                  className="h-9 px-3.5 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.08] rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 active:scale-95 shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Descargar</span>
                </a>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  title="Reemplazar archivo"
                  className="h-9 w-9 bg-white/[0.04] hover:bg-white/[0.08] text-muted-foreground hover:text-white border border-white/[0.08] rounded-xl flex items-center justify-center transition-all active:scale-95"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                </button>

                <button
                  onClick={() => setIsDeleteOpen(true)}
                  disabled={loading}
                  title="Eliminar pagaré"
                  className="h-9 w-9 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl flex items-center justify-center transition-all active:scale-95"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ESTADO: PENDIENTE POR SUBIR */
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
              isDragOver 
                ? 'border-blue-500 bg-blue-500/10 scale-[1.01]' 
                : 'border-white/[0.1] hover:border-blue-500/40 bg-white/[0.01] hover:bg-white/[0.03]'
            }`}
          >
            <div className="max-w-md mx-auto space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
              </div>

              <div>
                <p className="text-sm font-bold text-white">
                  {loading ? "Subiendo y custodiando pagaré..." : "Haz clic o arrastra aquí el Pagaré Firmado"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos admitidos: <strong>PDF, JPG, PNG o Foto Escaneada</strong> (Hasta 10MB)
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={loading}
                  className="h-9 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md inline-flex items-center gap-2"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Seleccionar Archivo</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Previsualización */}
      {isPreviewOpen && promissoryNoteUrl && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPreviewOpen(false)
          }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200"
        >
          <div className="bg-[#0A0F1D] w-full max-w-5xl h-[92vh] max-h-[92vh] sm:h-[90vh] sm:max-h-[90vh] rounded-2xl border border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header del Modal - Siempre Visible y Fijo Arriba */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-[#0D1424] flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex-shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 truncate">
                    Visor de Pagaré • {clientName}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-mono truncate">
                    CC: {idDocument} • {promissoryNoteName || "Pagaré Digital"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <a
                  href={promissoryNoteUrl}
                  download={promissoryNoteName || `pagare_${idDocument}.pdf`}
                  className="h-9 px-3.5 bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.08] rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Download className="h-3.5 w-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Descargar</span>
                </a>
                
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="h-9 px-3.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/30 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 active:scale-95 shadow-sm"
                  title="Cerrar visor (Esc)"
                >
                  <X className="h-4 w-4" />
                  <span>Cerrar</span>
                </button>
              </div>
            </div>

            {/* Cuerpo del Visor */}
            <div className="flex-1 min-h-0 bg-[#050811] p-2 sm:p-4 flex items-center justify-center overflow-hidden relative">
              {isPdf ? (
                <iframe
                  src={promissoryNoteUrl}
                  title="Visor Pagaré PDF"
                  className="w-full h-full rounded-xl border border-white/10 shadow-2xl bg-white"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
                  <img
                    src={promissoryNoteUrl}
                    alt="Pagaré Firmado"
                    className="max-h-full max-w-full object-contain rounded-xl shadow-2xl border border-white/10"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {isDeleteOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDeleteOpen(false)
          }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
        >
          <div className="bg-[#0D1424] w-full max-w-md rounded-2xl border border-rose-500/20 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">¿Eliminar Pagaré de Custodia?</h3>
                <p className="text-xs text-muted-foreground">Esta acción removerá el archivo digital del préstamo.</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground bg-white/[0.02] p-3 rounded-xl border border-white/[0.04]">
              Archivo actual: <strong className="text-white font-mono">{promissoryNoteName}</strong>. Podrás volver a subir un nuevo archivo en cualquier momento.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsDeleteOpen(false)}
                disabled={loading}
                className="h-9 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all inline-flex items-center gap-2 shadow-lg shadow-rose-600/20"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span>Confirmar Eliminación</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
