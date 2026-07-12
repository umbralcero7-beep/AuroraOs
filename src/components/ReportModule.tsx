import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  FileSpreadsheet, 
  AlertTriangle, 
  DollarSign, 
  CheckCircle, 
  Award, 
  RefreshCw 
} from 'lucide-react';
import { Invoice, Gasto, CierreCaja, MenuItem } from '../types';

interface ReportModuleProps {
  sedeId: string;
  invoices: Invoice[];
  gastos: Gasto[];
  cierres: CierreCaja[];
  menuItems: MenuItem[];
  refreshData: () => void;
}

export default function ReportModule({
  sedeId,
  invoices,
  gastos,
  cierres,
  menuItems,
  refreshData
}: ReportModuleProps) {
  const currentInvoices = invoices.filter(i => i.sedeId === sedeId);
  const currentGastos = gastos.filter(g => g.sedeId === sedeId);
  const currentCierres = cierres.filter(c => c.sedeId === sedeId);

  const [activeTab, setActiveTab] = useState<'METRICS' | 'CIERRES_Z'>('METRICS');

  // Calculations
  const totalSales = currentInvoices.reduce((acc, curr) => acc + curr.total, 0);
  const totalExpenses = currentGastos.reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalSales - totalExpenses;
  const avgTicket = currentInvoices.length > 0 ? totalSales / currentInvoices.length : 0;

  // Best seller logic
  const itemCounts: { [name: string]: number } = {};
  currentInvoices.forEach(inv => {
    inv.items.forEach(itm => {
      itemCounts[itm.name] = (itemCounts[itm.name] || 0) + itm.qty;
    });
  });

  const sortedBestSellers = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900 text-slate-100 font-sans">
      
      {/* Report Header */}
      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
            <BarChart3 className="text-cyan-400 h-5 w-5" />
            REPORTE DE VENTAS & CONTROL AUDITORÍA Z
          </h2>
          <div className="h-4 w-px bg-slate-800"></div>
          <div className="flex gap-1 p-0.5 bg-slate-900 rounded-lg border border-slate-800">
            <button 
              onClick={() => setActiveTab('METRICS')}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all cursor-pointer ${activeTab === 'METRICS' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Métricas y Analíticas
            </button>
            <button 
              onClick={() => setActiveTab('CIERRES_Z')}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all cursor-pointer ${activeTab === 'CIERRES_Z' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Historial Cierres de Caja (Reporte Z)
            </button>
          </div>
        </div>

        <button 
          onClick={refreshData}
          className="p-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {activeTab === 'METRICS' && (
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          
          {/* Top KPI row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Facturación Total:</span>
                <p className="text-lg font-bold font-mono text-emerald-400">${totalSales.toLocaleString()} COP</p>
              </div>
              <div className="h-9 w-9 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-4.5 w-4.5" />
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Gastos Registrados:</span>
                <p className="text-lg font-bold font-mono text-red-400">${totalExpenses.toLocaleString()} COP</p>
              </div>
              <div className="h-9 w-9 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center justify-center">
                <TrendingDown className="h-4.5 w-4.5" />
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Margen Neto Operacional:</span>
                <p className={`text-lg font-bold font-mono ${netProfit >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                  ${netProfit.toLocaleString()} COP
                </p>
              </div>
              <div className="h-9 w-9 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl flex items-center justify-center">
                <DollarSign className="h-4.5 w-4.5" />
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Ticket Promedio por Mesa:</span>
                <p className="text-lg font-bold font-mono text-slate-200">${Math.round(avgTicket).toLocaleString()} COP</p>
              </div>
              <div className="h-9 w-9 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl flex items-center justify-center">
                <Award className="h-4.5 w-4.5" />
              </div>
            </div>

          </div>

          {/* Visual SVG Charting Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Sales Chart SVG */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Flujo de Facturación de Turno (Por Hora)</h3>
              
              <div className="h-48 relative flex items-end justify-between border-b border-l border-slate-800 pb-2 pl-2">
                
                {/* SVG Visual Bar Graph */}
                <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
                  {/* Grid lines */}
                  <line x1="0" y1="30" x2="100%" y2="30" stroke="#1e293b" strokeWidth="1" strokeDasharray="3" />
                  <line x1="0" y1="80" x2="100%" y2="80" stroke="#1e293b" strokeWidth="1" strokeDasharray="3" />
                  <line x1="0" y1="130" x2="100%" y2="130" stroke="#1e293b" strokeWidth="1" strokeDasharray="3" />
                </svg>

                {/* Bars for simulated hours */}
                {[
                  { hour: '11:00', val: 120000 },
                  { hour: '13:00', val: 540000 },
                  { hour: '15:00', val: 210000 },
                  { hour: '17:00', val: 180000 },
                  { hour: '19:00', val: 890000 },
                  { hour: '21:00', val: 680000 },
                ].map((pt, idx) => {
                  const maxVal = 900000;
                  const heightPct = (pt.val / maxVal) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 z-10">
                      <span className="text-[9px] font-mono text-cyan-400">${Math.round(pt.val/1000)}k</span>
                      <div 
                        className="w-10 bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-md hover:opacity-80 transition-all shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                        style={{ height: `${heightPct * 0.8}px` }}
                      ></div>
                      <span className="text-[9px] font-mono text-slate-500">{pt.hour}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Best Sellers and Category breakdown */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Top 5 Platillos Más Vendidos</h3>
              <div className="space-y-3 pt-2">
                {sortedBestSellers.length === 0 ? (
                  <div className="text-slate-600 font-mono italic text-xs py-10 text-center">
                    Esperando ventas para ponderar catálogo
                  </div>
                ) : (
                  sortedBestSellers.map(([name, count], idx) => (
                    <div key={idx} className="space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between text-slate-300">
                        <span>{name}</span>
                        <span className="text-emerald-400 font-bold">{count} porciones</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-850">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full"
                          style={{ width: `${Math.min(100, (count / 10) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {activeTab === 'CIERRES_Z' && (
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-300 font-mono">HISTORIAL DE REPORTES Z (CIERRES DE CAJA FISCAL)</h3>
              <p className="text-xs text-slate-400 font-mono mt-1">Archivo de conciliación obligatoria para control contable</p>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-xl font-mono font-bold flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" />
              AUDITORÍA INTEGRADA DIAN
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono bg-slate-900/40">
                    <th className="p-4">Código Cierre Z</th>
                    <th className="p-4">Fecha / Turno</th>
                    <th className="p-4">Cajero / Operador</th>
                    <th className="p-4 text-right">Ventas Brutas</th>
                    <th className="p-4 text-right">Impuesto Consumo</th>
                    <th className="p-4 text-right">Efectivo Físico</th>
                    <th className="p-4 text-right">Diferencia / Cuadre</th>
                    <th className="p-4 text-center">Estado Auditoría</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 font-mono text-slate-300">
                  {currentCierres.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-600 italic">No se han realizado cierres de caja en esta sede hoy</td>
                    </tr>
                  ) : (
                    currentCierres.map((cc) => {
                      const isPerfect = cc.difference === 0;
                      return (
                        <tr key={cc.id} className={`hover:bg-slate-900/30 transition-colors ${!isPerfect ? 'bg-amber-500/[0.01]' : ''}`}>
                          <td className="p-4 font-bold text-cyan-400">{cc.id.toUpperCase()}</td>
                          <td className="p-4 text-slate-400 text-[11px]">{new Date(cc.timestamp).toLocaleString()}</td>
                          <td className="p-4 text-slate-200">{cc.closedBy}</td>
                          <td className="p-4 text-right text-slate-300">${cc.totalSales.toLocaleString()}</td>
                          <td className="p-4 text-right text-slate-400">${(cc.totalSales * 0.08).toLocaleString()}</td>
                          <td className="p-4 text-right text-emerald-400">${cc.actualCash.toLocaleString()}</td>
                          <td className={`p-4 text-right font-bold ${isPerfect ? 'text-emerald-400' : 'text-red-400'}`}>
                            ${cc.difference.toLocaleString()} COP
                          </td>
                          <td className="p-4 text-center">
                            {isPerfect ? (
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                                ✓ CUADRE EXACTO
                              </span>
                            ) : (
                              <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 justify-center">
                                <AlertTriangle className="h-3 w-3" />
                                DESCUADRE
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
