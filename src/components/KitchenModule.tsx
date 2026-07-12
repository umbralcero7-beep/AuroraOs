import React, { useState, useEffect } from 'react';
import { 
  ChefHat, 
  Flame, 
  Check, 
  Clock, 
  AlertCircle, 
  RotateCcw, 
  Printer, 
  Scissors, 
  TrendingUp, 
  Coffee,
  HelpCircle
} from 'lucide-react';
import { Comanda, MenuItem, User } from '../types';

interface KitchenModuleProps {
  sedeId: string;
  comandas: Comanda[];
  menuItems: MenuItem[];
  currentUser: User;
  onTriggerAction: (action: string, payload: any) => Promise<any>;
  refreshData: () => void;
}

interface SimulatedTicket {
  id: string;
  comandaId: string;
  sedeId: string;
  content: string;
  timestamp: string;
}

// Live ticking stopwatch component for En Proceso status
function CookingStopwatch({ timestamp }: { timestamp: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [timestamp]);

  const formatElapsed = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const isOverdue = elapsed > 300; // Over 5 minutes is considered slow

  return (
    <span className={`font-mono font-bold px-2 py-1 rounded-lg border text-xs flex items-center gap-1.5 ${
      isOverdue 
        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse' 
        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
    }`}>
      <Clock className={`h-3.5 w-3.5 ${isOverdue ? 'animate-bounce' : 'animate-spin'}`} />
      <span>{formatElapsed(elapsed)}</span>
    </span>
  );
}

export default function KitchenModule({
  sedeId,
  comandas,
  menuItems,
  currentUser,
  onTriggerAction,
  refreshData
}: KitchenModuleProps) {
  const currentComandas = comandas.filter(c => c.sedeId === sedeId);

  // Simulated printing tickets state
  const [printedTickets, setPrintedTickets] = useState<SimulatedTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SimulatedTicket | null>(null);

  // Fetch simulated printed thermal tickets from backend
  const fetchTickets = async () => {
    try {
      const res = await fetch(`/api/printed-tickets?sedeId=${sedeId}`);
      if (res.ok) {
        const data = await res.json();
        setPrintedTickets(data);
        if (data.length > 0 && !selectedTicket) {
          setSelectedTicket(data[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching printed tickets:", err);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [comandas, sedeId]);

  const handleClearTickets = async () => {
    try {
      const res = await fetch('/api/printed-tickets/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sedeId })
      });
      if (res.ok) {
        setPrintedTickets([]);
        setSelectedTicket(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const advanceComandaStatus = async (comandaId: string, currentStatus: Comanda['status']) => {
    let nextStatus: Comanda['status'] = 'PENDIENTE';
    if (currentStatus === 'PENDIENTE') {
      nextStatus = 'COCINANDO';
    } else if (currentStatus === 'COCINANDO') {
      nextStatus = 'LISTO';
    } else if (currentStatus === 'LISTO') {
      nextStatus = 'ENTREGADO';
    }

    try {
      await onTriggerAction("UPDATE_COMANDA_STATUS", { id: comandaId, status: nextStatus });
      refreshData();
      fetchTickets();
    } catch (err) {
      console.error(err);
    }
  };

  // Grouping Comandas strictly by state columns
  const pendingComandas = currentComandas.filter(c => c.status === 'PENDIENTE');
  const cookingComandas = currentComandas.filter(c => c.status === 'COCINANDO');
  const readyComandas = currentComandas.filter(c => c.status === 'LISTO');

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#090d16] text-slate-100 font-sans">
      
      {/* Kitchen header */}
      <header className="bg-[#05080e] px-6 py-4.5 border-b border-[#1e293b]/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-cyan-500/10 rounded-xl border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-black tracking-wider text-white uppercase">MÓDULO DE COCINA DIGITAL (KDS)</h2>
            <p className="text-[10px] font-mono text-cyan-500/60 uppercase">Pantalla Táctil Fija de Producción</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-[10px] font-mono bg-cyan-505/10 border border-cyan-500/20 text-cyan-400 px-3 py-1 rounded-md">
            Cocina Sede Medellín | Canal Seguro
          </div>
        </div>
      </header>

      {/* Main Touch Screen Grid Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT COLUMN: ACTIVE PANELS GRID */}
        <div className="flex-1 p-5 grid grid-cols-1 lg:grid-cols-3 gap-5 overflow-y-auto">
          
          {/* COLUMN 1: PENDIENTE */}
          <div className="bg-[#0b101c]/80 border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col h-[calc(100vh-170px)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3 mb-4 shrink-0">
              <span className="text-xs font-black font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-slate-500 animate-pulse"></span>
                Pendientes ({pendingComandas.length})
              </span>
              <span className="text-[10px] font-mono text-slate-500">Toca para preparar</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin">
              {pendingComandas.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[#1e293b] font-mono text-xs text-center py-24">
                  <ChefHat className="h-10 w-10 mb-2 opacity-15" />
                  <span>Sin comandas pendientes</span>
                </div>
              ) : (
                pendingComandas.map(order => (
                  <div 
                    key={order.id} 
                    onClick={() => advanceComandaStatus(order.id, order.status)}
                    className="bg-[#101726] border border-[#1e293b] rounded-xl p-4 space-y-3 shadow-md hover:border-cyan-500/40 transition-all cursor-pointer active:scale-98 select-none"
                  >
                    <div className="flex justify-between items-start">
                      <div className="text-sm font-black text-cyan-400 font-mono bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                        {order.tableNumber}
                      </div>
                      <div className="text-right leading-tight">
                        <span className="text-[9px] font-mono text-slate-500 block">Mesero: {order.waiterName || 'Sofia'}</span>
                        <span className="text-[10px] font-mono text-slate-400">{new Date(order.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>

                    <div className="divide-y divide-[#1e293b]/60 text-xs">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="py-2.5 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-200 font-bold text-sm">{item.qty}x {item.name}</span>
                          </div>
                          
                          {/* DESTAQUE DE COMENTARIOS DE PREPARACION */}
                          {item.notes && (
                            <div className="bg-amber-500/5 border-l-2 border-amber-500 py-1.5 px-2.5 rounded-r-lg mt-1 text-[10px] font-mono text-amber-400 font-semibold leading-relaxed uppercase">
                              ⚠️ NOTA: {item.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        advanceComandaStatus(order.id, order.status);
                      }}
                      className="w-full bg-[#1e293b] hover:bg-cyan-500 hover:text-[#090d16] py-3 rounded-lg text-xs font-black font-mono transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#334155]"
                    >
                      <Flame className="h-4 w-4" />
                      INICIAR COCINA
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 2: EN PROCESO */}
          <div className="bg-[#0b101c]/80 border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col h-[calc(100vh-170px)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3 mb-4 shrink-0">
              <span className="text-xs font-black font-mono text-amber-400 uppercase tracking-widest flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
                En Preparación ({cookingComandas.length})
              </span>
              <span className="text-[10px] font-mono text-slate-500">Cronómetro activo</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin">
              {cookingComandas.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[#1e293b] font-mono text-xs text-center py-24">
                  <Flame className="h-10 w-10 mb-2 opacity-15" />
                  <span>Sin órdenes cocinándose</span>
                </div>
              ) : (
                cookingComandas.map(order => (
                  <div 
                    key={order.id} 
                    className="bg-[#101726] border border-amber-500/20 rounded-xl p-4 space-y-3.5 shadow-md relative overflow-hidden"
                  >
                    {/* Stopwatch on top right */}
                    <div className="flex justify-between items-start">
                      <div className="text-sm font-black text-amber-400 font-mono bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                        {order.tableNumber}
                      </div>
                      <CookingStopwatch timestamp={order.timestamp} />
                    </div>

                    <div className="divide-y divide-[#1e293b]/60 text-xs">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="py-2.5 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-100 font-bold text-sm">{item.qty}x {item.name}</span>
                          </div>
                          
                          {/* HIGHLIGHTED INSTRUCTION BOX */}
                          {item.notes && (
                            <div className="bg-amber-500/10 border border-amber-500/30 py-1.5 px-2.5 rounded-lg mt-1 text-[10px] font-mono text-amber-400 font-bold uppercase leading-normal">
                              🎯 PREPARACIÓN: {item.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => advanceComandaStatus(order.id, order.status)}
                      className="w-full bg-emerald-500 text-[#090d16] hover:bg-emerald-600 py-3 rounded-lg text-xs font-black font-mono transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-900/10"
                    >
                      <Check className="h-4.5 w-4.5 stroke-[2.5]" />
                      MARCAR LISTO (MESA LISTA)
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 3: LISTOS PARA RECOGER */}
          <div className="bg-[#0b101c]/80 border border-[#1e293b]/50 rounded-2xl p-4 flex flex-col h-[calc(100vh-170px)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3 mb-4 shrink-0">
              <span className="text-xs font-black font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Listos en Barra ({readyComandas.length})
              </span>
              <span className="text-[10px] font-mono text-slate-500 font-bold">Espera de Retiro</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin">
              {readyComandas.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[#1e293b] font-mono text-xs text-center py-24">
                  <Check className="h-10 w-10 mb-2 opacity-15" />
                  <span>Sin órdenes listas para servir</span>
                </div>
              ) : (
                readyComandas.map(order => (
                  <div 
                    key={order.id} 
                    className="bg-[#101726]/80 border border-emerald-500/30 rounded-xl p-4 space-y-3 shadow-md"
                  >
                    <div className="flex justify-between items-start">
                      <div className="text-sm font-black text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                        {order.tableNumber}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(order.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>

                    <div className="divide-y divide-[#1e293b]/60 text-xs text-slate-400">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="py-2">
                          <span className="font-semibold text-slate-300">{item.qty}x {item.name}</span>
                          {item.notes && <p className="text-[9px] text-stone-500 uppercase font-mono mt-0.5">Nota: {item.notes}</p>}
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => advanceComandaStatus(order.id, order.status)}
                      className="w-full bg-[#1e293b]/80 hover:bg-stone-800 text-slate-300 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-stone-800"
                    >
                      Despachar de Barra
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: SIMULATED THERMAL PRINTER DRUM */}
        <div className="w-80 bg-[#06090e] border-l border-[#1e293b]/50 flex flex-col shrink-0 overflow-hidden">
          <div className="p-4 border-b border-[#1e293b]/60 bg-[#080d15] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Printer className="h-4.5 w-4.5 text-cyan-400" />
              <h3 className="text-xs font-black font-mono tracking-wider text-slate-200 uppercase">TICKETERA TÉRMICA</h3>
            </div>
            {printedTickets.length > 0 && (
              <button
                onClick={handleClearTickets}
                className="p-1 rounded bg-[#1e293b] hover:bg-rose-950 hover:text-rose-400 text-slate-400 transition-colors cursor-pointer"
                title="Limpiar tiques cortados"
              >
                <Scissors className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Printed receipt drawer visual panel */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 flex flex-col bg-[#0b0f19]/30 relative">
              <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-b from-[#06090e] to-transparent pointer-events-none z-10" />

              {printedTickets.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-center text-xs p-6">
                  <Printer className="h-10 w-10 mb-2 opacity-30 animate-pulse stroke-[1.5]" />
                  <span className="font-mono">Impresora Vacía</span>
                  <p className="text-[10px] text-slate-700 mt-1 uppercase">Cuando un mesero envíe una orden, se imprimirá automáticamente el tique aquí.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-[9px] uppercase font-mono text-cyan-500/80 font-bold tracking-wider mb-2">
                    Tiques Recientes de Cocina ({printedTickets.length}):
                  </div>

                  <div className="space-y-3">
                    {printedTickets.map((t, idx) => (
                      <div 
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                          selectedTicket?.id === t.id 
                            ? 'bg-[#1e293b]/50 border-cyan-500/50 text-cyan-200' 
                            : 'bg-[#101726]/55 border-[#1e293b] text-slate-400 hover:border-slate-750'
                        }`}
                      >
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="font-bold">TIQUE #{t.id.substring(t.id.length - 4)}</span>
                          <span>{new Date(t.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'})}</span>
                        </div>
                        <p className="text-[11px] truncate mt-1 text-slate-300">
                          {t.content.includes("MESA:") ? t.content.split("MESA:")[1]?.split("\n")[0]?.trim() : "Comanda"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Simulated Printed Paper Mockup Frame */}
            {selectedTicket && (
              <div className="p-4 bg-[#0a0e17] border-t border-[#1e293b]/60 shrink-0 h-72 flex flex-col">
                <div className="text-[10px] font-mono text-slate-500 mb-2 uppercase font-extrabold flex items-center justify-between">
                  <span>Vista Tique Físico:</span>
                  <span className="text-cyan-400 bg-cyan-500/10 px-2 rounded">Papel Térmico</span>
                </div>
                
                {/* Physical receipt styling box */}
                <div className="flex-1 bg-white text-stone-900 p-4.5 rounded-lg font-mono text-[9px] overflow-y-auto leading-relaxed shadow-inner border border-stone-300 select-all whitespace-pre">
                  {selectedTicket.content}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
