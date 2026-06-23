"use client"

import { useState, useEffect, useRef } from "react"
import { Search, User, Briefcase, Wallet, Loader2, ArrowRight } from "lucide-react"
import { searchGlobal } from "@/app/actions/search"
import Link from "next/link"

type SearchResult = {
  clients: any[]
  loans: any[]
  investors: any[]
}

export function GlobalSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setLoading(true)
        const res = await searchGlobal(query.trim())
        setResults(res)
        setLoading(false)
        setIsOpen(true)
      } else {
        setResults(null)
        setIsOpen(false)
      }
    }, 400) // 400ms debounce

    return () => clearTimeout(delayDebounceFn)
  }, [query])

  const hasResults = results && (results.clients.length > 0 || results.loans.length > 0 || results.investors.length > 0)

  return (
    <div className="relative w-96 hidden md:block" ref={dropdownRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input 
        type="text" 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => { if (hasResults) setIsOpen(true) }}
        placeholder="Buscar clientes, préstamos..." 
        className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all text-white placeholder:text-muted-foreground"
      />
      
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
      )}

      {isOpen && results && (
        <div className="absolute top-full mt-2 w-full bg-card border border-white/10 shadow-2xl rounded-2xl overflow-hidden z-50">
          <div className="max-h-[400px] overflow-y-auto p-2 flex flex-col gap-1">
            
            {!hasResults && !loading && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No se encontraron resultados para "{query}"
              </div>
            )}

            {results.clients.length > 0 && (
              <div className="mb-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase px-2 mb-1">Clientes</h4>
                {results.clients.map(client => (
                  <Link 
                    key={client.id}
                    href="/clientes" // Todo: If we add client detail page, link to it
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{client.firstName} {client.lastName}</p>
                      <p className="text-xs text-muted-foreground">ID: {client.idDocument}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            )}

            {results.loans.length > 0 && (
              <div className="mb-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase px-2 mb-1">Préstamos</h4>
                {results.loans.map(loan => (
                  <Link 
                    key={loan.id}
                    href={`/prestamos/${loan.id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
                  >
                    <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{loan.client.firstName} {loan.client.lastName}</p>
                      <p className="text-xs text-muted-foreground">Préstamo: {loan.id.slice(0, 8)}...</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            )}

            {results.investors.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase px-2 mb-1">Inversionistas</h4>
                {results.investors.map(investor => (
                  <Link 
                    key={investor.id}
                    href={`/inversionistas/${investor.id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
                  >
                    <div className="h-8 w-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{investor.name}</p>
                      <p className="text-xs text-muted-foreground">{investor.email || investor.phone || "Sin contacto"}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
