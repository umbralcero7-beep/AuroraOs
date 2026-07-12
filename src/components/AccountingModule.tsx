import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileText, 
  Percent,
  CheckCircle
} from 'lucide-react';
import { Gasto, Invoice, AccountingCushion } from '../types';

interface AccountingModuleProps {
  sedeId: string;
  gastos: Gasto[];
  invoices: Invoice[];
  cushion: AccountingCushion;
  onTriggerAction: (action: string, payload: any) => Promise<any>;
  refreshData: () => void;
}

export default function AccountingModule({
  sedeId,
  gastos,
  invoices,
  cushion,
  onTriggerAction,
  refreshData
}: AccountingModuleProps) {
  const currentGastos = gastos.filter(g => g.sedeId === sedeId);
  const currentInvoices = invoices.filter(i => i.sedeId === sedeId);

  // States
  const [showAddGasto, setShowAddGasto] = useState(false);
  const [gDescription, setGDescription] = useState('');
  const [gCategory, setGCategory] = useState<'SERVICIOS' | 'NOMINA' | 'MATERIA_PRIMA' | 'ALQUILER' | 'PUBLICIDAD' | 'OTROS'>('MATERIA_PRIMA');
  const [gAmount, setGAmount] = useState(0);
  const [gReceipt, setGReceipt] = useState('');

  // Cushion injection / withdrawal state
  const [showCushionModal, setShowCushionModal] = useState(false);
  const [cushionAction, setCushionAction] = useState<'INYECCION_RESERVA' | 'CUBRIR_PERDIDA'>('INYECCION_RESERVA');
  const [cushionAmount, setCushionAmount] = useState(0);
  const [cushionDescription, setCushionDescription] = useState('');

  // Calculations
  const totalSales = currentInvoices.reduce((acc, curr) => acc + curr.total, 0);
  const totalExpenses = currentGastos.reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalSales - totalExpenses;

  const handleAddGasto = async () => {
    if (!gDescription || gAmount <= 0) return;

    const newGasto: Gasto = {
      id: `gas-${Date.now()}`,
      sedeId,
      description: gDescription,
      category: gCategory,
      amount: gAmount,
      timestamp: new Date().toISOString(),
      receiptNumber: gReceipt
    };

    await onTriggerAction("ADD_GASTO", newGasto);
    
    // Reset states
    setGDescription('');
    setGAmount(0);
    setGReceipt('');
    setShowAddGasto(false);
    refreshData();
  };

  const handleCushionOperation = async () => {
    if (cushionAmount <= 0) return;

    const currentBalance = cushion.retainedEarnings;
    let nextBalance = currentBalance;

    if (cushionAction === 'INYECCION_RESERVA') {
      nextBalance += cushionAmount;
    } else {
      if (cushionAmount > currentBalance) {
        alert("⚠️ Fondos Insuficientes: El retiro de emergencia no puede superar el saldo actual del colchón.");
        return;
      }
      nextBalance -= cushionAmount;
    }

    const historyItem = {
      id: `ch-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: cushionAction,
      amount: cushionAmount,
      description: cushionDescription || (cushionAction === 'INYECCION_RESERVA' ? 'Inyección de capital libre' : 'Retiro para cubrir pasivos'),
      balanceAfter: nextBalance
    };

    await onTriggerAction("UPDATE_CUSHION", {
      retainedEarnings: nextBalance,
      historyItem
    });

    // Reset states
    setCushionAmount(0);
    setCushionDescription('');
    setShowCushionModal(false);
    refreshData();
  };

  // Cushion progress percent
  const cushionPct = Math.min(100, (cushion.retainedEarnings / cushion.cushionTarget) * 100);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900 text-slate-100 font-sans">
      {/* Accounting Header */}
      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
            <DollarSign className="text-cyan-400 h-5 w-5" />
            CONTABILIDAD & FINANZAS
          </h2>
          <p className="text-[11px] text-slate-400 font-mono">Módulo de Conciliación y Fondo de Estabilización Fiscal</p>
        </div>

        <button
          onClick={() => setShowAddGasto(true)}
          className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-1.5 px-3.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Registrar Egreso / Gasto
        </button>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Ingresos de Hoy (POS + Domicilios)</span>
              <p className="text-xl font-bold font-mono text-emerald-400">${totalSales.toLocaleString()} COP</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Egresos / Gastos Registrados</span>
              <p className="text-xl font-bold font-mono text-red-400">${totalExpenses.toLocaleString()} COP</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Resultado de Utilidad Neta</span>
              <p className={`text-xl font-bold font-mono ${netProfit >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                ${netProfit.toLocaleString()} COP
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* COLCHÓN CONTABLE SECTION */}
        <div className="bg-gradient-to-tr from-slate-950 to-slate-900 border border-cyan-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          {/* Futuristic ambient lines */}
          <div className="absolute top-0 right-0 h-48 w-48 bg-cyan-500/5 rounded-full filter blur-3xl"></div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 relative z-10">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-bold uppercase tracking-widest">
                Fondo de Reserva de Emergencia
              </span>
              <h3 className="text-lg font-bold text-white mt-1.5 font-sans">COLCHÓN CONTABLE "AURORA OS"</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-lg">
                Fondo amortiguador de liquidez para mitigar picos de inflación en insumos, gastos imprevistos de nómina o meses de baja facturación.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setCushionAction('INYECCION_RESERVA');
                  setShowCushionModal(true);
                }}
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)]"
              >
                <ArrowUpRight className="h-4 w-4" />
                Inyectar Capital
              </button>
              <button
                onClick={() => {
                  setCushionAction('CUBRIR_PERDIDA');
                  setShowCushionModal(true);
                }}
                className="bg-slate-950 hover:bg-slate-800 text-red-400 border border-red-500/30 font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <ArrowDownLeft className="h-4 w-4" />
                Retiro de Emergencia
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center relative z-10">
            {/* Cushion metrics block */}
            <div className="bg-slate-900/60 p-4.5 rounded-2xl border border-slate-800 space-y-4 font-mono">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500 uppercase">Reserva Acumulada:</span>
                <span className="text-xs text-cyan-400 font-semibold flex items-center gap-0.5">
                  <Percent className="h-3 w-3" />
                  {cushionPct.toFixed(1)}% de Meta
                </span>
              </div>
              <p className="text-2xl font-bold text-white">${cushion.retainedEarnings.toLocaleString()} COP</p>
              
              {/* Progress bar */}
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-full transition-all duration-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                  style={{ width: `${cushionPct}%` }}
                ></div>
              </div>

              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Base: $0</span>
                <span>Meta Fiscal: ${cushion.cushionTarget.toLocaleString()} COP</span>
              </div>
            </div>

            {/* Safety Indicator Description */}
            <div className="bg-slate-900/60 p-4.5 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                ESTADO DE AMORTIGUACIÓN FISCAL
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {cushionPct < 30 ? (
                  <span className="text-amber-400">🚨 Nivel de alerta bajo. Se recomienda destinar el 15% de las utilidades libres de este fin de semana para fortalecer el colchón contable.</span>
                ) : cushionPct < 70 ? (
                  <span className="text-cyan-400">⚠️ Nivel moderado de amortiguación. Suficiente para sostener 15 días de pasivos totales fijos en caso de cierre forzado.</span>
                ) : (
                  <span className="text-emerald-400">🛡️ Escudo financiero robusto. El restaurante está blindado para aguantar hasta 45 días de inactividad comercial sin liquidar personal.</span>
                )}
              </p>
            </div>

            {/* Cushion operation list histories */}
            <div className="bg-slate-900/60 p-4.5 rounded-2xl border border-slate-800 h-36 flex flex-col overflow-hidden">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-2 shrink-0">Ledger Historial de Reserva</span>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {cushion.cushionHistory.map((hist) => (
                  <div key={hist.id} className="text-[10px] font-mono flex justify-between items-center py-1 border-b border-slate-800/40 last:border-0 text-slate-400">
                    <span className="truncate max-w-[120px]" title={hist.description}>{hist.description}</span>
                    <span className={hist.action === 'INYECCION_RESERVA' ? 'text-emerald-400' : 'text-red-400'}>
                      {hist.action === 'INYECCION_RESERVA' ? '+' : '-'}${hist.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* EXPENSES LEDGER AND EGRESOS LIST */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Expenses Table */}
          <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-cyan-400" />
              LIBRO AUXILIAR DE EGRESOS
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono bg-slate-900/30">
                    <th className="p-3">Detalle</th>
                    <th className="p-3">Categoría</th>
                    <th className="p-3">Recibo Nº</th>
                    <th className="p-3 text-right">Monto</th>
                    <th className="p-3 text-center">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {currentGastos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-600 font-mono italic">No hay egresos cargados</td>
                    </tr>
                  ) : (
                    currentGastos.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-900/20 transition-colors">
                        <td className="p-3 text-white font-semibold">{g.description}</td>
                        <td className="p-3 font-mono text-slate-400 text-[10px]">{g.category}</td>
                        <td className="p-3 font-mono text-slate-400">{g.receiptNumber || 'N/A'}</td>
                        <td className="p-3 text-right font-mono text-red-400 font-bold">-${g.amount.toLocaleString()}</td>
                        <td className="p-3 text-center text-slate-500 font-mono text-[10px]">{new Date(g.timestamp).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Expense Breakdown visualizer */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white font-mono">CONSOLIDADO POR CATEGORÍA</h3>
            <div className="space-y-3.5 pt-2">
              {['MATERIA_PRIMA', 'SERVICIOS', 'NOMINA', 'ALQUILER', 'PUBLICIDAD', 'OTROS'].map((cat) => {
                const sum = currentGastos.filter(g => g.category === cat).reduce((s, g) => s + g.amount, 0);
                const pct = totalExpenses > 0 ? (sum / totalExpenses) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400 font-mono">
                      <span>{cat.replace('_', ' ')}</span>
                      <span className="text-slate-200 font-bold">${sum.toLocaleString()} COP</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-red-400 h-full" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* EXPENSE REGISTRATION MODAL */}
      {showAddGasto && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Plus className="text-cyan-400 h-5 w-5" />
              REGISTRAR GASTO EN LIBRO DIARIO
            </h3>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400">Descripción del Gasto:</label>
                <input 
                  type="text" 
                  value={gDescription}
                  onChange={(e) => setGDescription(e.target.value)}
                  placeholder="Ej. Compra de verduras de reposición rápida"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">Categoría:</label>
                  <select 
                    value={gCategory}
                    onChange={(e: any) => setGCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none cursor-pointer"
                  >
                    <option value="MATERIA_PRIMA">Materia Prima</option>
                    <option value="SERVICIOS">Servicios Públicos</option>
                    <option value="NOMINA">Nómina / Salario</option>
                    <option value="ALQUILER">Arrendamiento</option>
                    <option value="PUBLICIDAD">Publicidad</option>
                    <option value="OTROS">Otros</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Recibo / Factura Nº:</label>
                  <input 
                    type="text" 
                    value={gReceipt}
                    onChange={(e) => setGReceipt(e.target.value)}
                    placeholder="Ej. FAC-481"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Monto del Egreso (COP):</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-red-400 font-mono">$</span>
                  <input 
                    type="number" 
                    value={gAmount || ''}
                    onChange={(e) => setGAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 pl-7 text-white focus:outline-none font-mono text-red-400"
                    placeholder="COP 0"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button onClick={() => setShowAddGasto(false)} className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleAddGasto} className="bg-cyan-500 text-slate-950 hover:bg-cyan-600 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer">
                Registrar Egreso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSHION RESERVE OPERATIONS MODAL */}
      {showCushionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans text-slate-100">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <Wallet className="text-cyan-400 h-5 w-5" />
              {cushionAction === 'INYECCION_RESERVA' ? 'INYECTAR CAPITAL AL COLCHÓN' : 'RETIRAR FONDO DE EMERGENCIA'}
            </h3>

            <div className="space-y-3 text-xs">
              <p className="text-slate-400 leading-normal">
                {cushionAction === 'INYECCION_RESERVA' 
                  ? 'Transfiera utilidades libres del restaurante al fondo de reserva para acumular amortiguación fiscal.'
                  : 'Extraiga capital del colchón contable para cubrir pérdidas operativas imprevistas en la sucursal.'}
              </p>

              <div className="space-y-1">
                <label className="text-slate-400">Monto de Operación (COP):</label>
                <input 
                  type="number" 
                  value={cushionAmount || ''}
                  onChange={(e) => setCushionAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-white focus:outline-none font-mono text-cyan-400"
                  placeholder="COP 0"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Concepto / Motivo de Ajuste:</label>
                <input 
                  type="text" 
                  value={cushionDescription}
                  onChange={(e) => setCushionDescription(e.target.value)}
                  placeholder={cushionAction === 'INYECCION_RESERVA' ? 'Ej. Depósito 15% utilidad neta de Junio' : 'Ej. Cubrir inflación desmesurada carne de res'}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button onClick={() => setShowCushionModal(false)} className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleCushionOperation} className="bg-cyan-500 text-slate-950 hover:bg-cyan-600 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer">
                Ejecutar Operación
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
