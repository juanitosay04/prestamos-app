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
  const inputRef = useRef<HTMLInputElement>(null)

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
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
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [query])

  const hasResults = results && (results.clients.length > 0 || results.loans.length > 0 || results.investors.length > 0)

  return (
    <div className="relative w-full max-w-md hidden md:block" ref={dropdownRef}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70" />
      <input 
        ref={inputRef}
        type="text" 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => { if (hasResults) setIsOpen(true) }}
        placeholder="Buscar clientes, préstamos o inversionistas..." 
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-14 py-2 text-xs focus:outline-none focus:border-blue-500/60 focus:bg-black/30 transition-all text-white placeholder:text-muted-foreground/60"
      />
      
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
        ) : (
          <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground bg-white/[0.06] border border-white/10 rounded">
            ⌘K
          </kbd>
        )}
      </div>

      {isOpen && results && (
        <div className="absolute top-full mt-2 w-full glass-panel-elevated border border-white/[0.1] shadow-2xl rounded-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="max-h-[380px] overflow-y-auto p-2 flex flex-col gap-1">
            
            {!hasResults && !loading && (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No se encontraron resultados para &quot;{query}&quot;
              </div>
            )}

            {results.clients.length > 0 && (
              <div className="mb-2">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2.5 py-1">
                  Clientes
                </h4>
                {results.clients.map(client => (
                  <Link 
                    key={client.id}
                    href={`/clientes/${client.id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.06] transition-colors group"
                  >
                    <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs">
                      {client.firstName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                        {client.firstName} {client.lastName}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">CC: {client.idDocument}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            )}

            {results.loans.length > 0 && (
              <div className="mb-2">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2.5 py-1">
                  Préstamos
                </h4>
                {results.loans.map(loan => (
                  <Link 
                    key={loan.id}
                    href={`/prestamos/${loan.id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.06] transition-colors group"
                  >
                    <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                      <Briefcase className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                        {loan.client.firstName} {loan.client.lastName}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        ${(loan.principalAmount / 100).toLocaleString('es-CO')} • ID: {loan.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            )}

            {results.investors.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2.5 py-1">
                  Inversionistas
                </h4>
                {results.investors.map(investor => (
                  <Link 
                    key={investor.id}
                    href={`/inversionistas/${investor.id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.06] transition-colors group"
                  >
                    <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                      <Wallet className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                        {investor.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">{investor.email || investor.phone || "Sin contacto"}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
