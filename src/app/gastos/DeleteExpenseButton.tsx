"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { deleteExpense } from "@/app/actions/expense"
import toast from "react-hot-toast"

export function DeleteExpenseButton({ expenseId }: { expenseId: string }) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este gasto?")) return
    
    setLoading(true)
    const result = await deleteExpense(expenseId)
    
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Gasto eliminado")
    }
    setLoading(false)
  }

  return (
    <button 
      onClick={handleDelete}
      disabled={loading}
      className="p-2 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50" 
      title="Eliminar"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}
