"use client"

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts"

type DashboardChartsProps = {
  monthlyData: { name: string, Capital: number, Ganancia: number }[]
  portfolioData: { name: string, value: number, color: string }[]
}

export function DashboardCharts({ monthlyData, portfolioData }: DashboardChartsProps) {
  const totalLoans = portfolioData.reduce((a, b) => a + b.value, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Gráfica de Barras (Flujo de Caja Proyectado) */}
      <div className="glass-panel rounded-2xl p-6 lg:col-span-2 border border-white/[0.08] flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Flujo de Caja Proyectado</h3>
            <p className="text-xs text-muted-foreground">Distribución de capital e intereses en los próximos 6 meses.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white/[0.03] px-2.5 py-1 rounded-lg border border-white/[0.06]">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="text-[11px] text-muted-foreground font-medium">Capital</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/[0.03] px-2.5 py-1 rounded-lg border border-white/[0.06]">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-[11px] text-muted-foreground font-medium">Ganancia</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#94a3b8" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => `$${Math.round(val / 1000)}k`} 
              />
              <Tooltip 
                cursor={{ fill: '#ffffff05' }}
                contentStyle={{ 
                  backgroundColor: '#0E131F', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  borderRadius: '16px', 
                  color: '#fff', 
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
                  padding: '12px 16px'
                }}
                itemStyle={{ fontSize: '12px', fontWeight: '600' }}
                formatter={(value: any, name: any) => [`$${Number(value).toLocaleString("es-CO", { maximumFractionDigits: 0 })}`, name]}
                labelStyle={{ color: '#94a3b8', marginBottom: '6px', fontSize: '11px', fontWeight: 'bold' }}
              />
              <Bar dataKey="Capital" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} barSize={36} />
              <Bar dataKey="Ganancia" stackId="a" fill="#10b981" radius={[6, 6, 0, 0]} barSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfica Circular (Estado de la Cartera) */}
      <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">Estado de Cartera</h3>
          <p className="text-xs text-muted-foreground">Distribución porcentual por situación del crédito.</p>
        </div>

        <div className="h-56 w-full relative my-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={portfolioData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={75}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {portfolioData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0E131F', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  borderRadius: '16px', 
                  color: '#fff', 
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                  padding: '10px 14px'
                }}
                formatter={(value: any) => [`${value} Préstamos`, "Total"]}
                itemStyle={{ fontSize: '12px', fontWeight: '600' }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Centro del Donut con métrica clave */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-extrabold text-white font-mono">
              {totalLoans}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Créditos</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.04]">
          {portfolioData.map((entry, index) => (
            <div key={index} className="flex items-center justify-between text-xs bg-white/[0.02] p-2 rounded-xl border border-white/[0.03]">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }}></div>
                <span className="text-[11px] text-muted-foreground truncate">{entry.name}</span>
              </div>
              <span className="text-[11px] font-bold text-white font-mono ml-1">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
