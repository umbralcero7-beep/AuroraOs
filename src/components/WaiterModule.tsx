import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Minus, 
  Check, 
  Clock, 
  Coffee, 
  X, 
  Send, 
  AlertCircle, 
  Bell, 
  Sparkles,
  ShoppingBag,
  RotateCcw
} from 'lucide-react';
import { Comanda, MenuItem, User } from '../types';

interface WaiterModuleProps {
  sedeId: string;
  comandas: Comanda[];
  menuItems: MenuItem[];
  currentUser: User;
  onTriggerAction: (action: string, payload: any) => Promise<any>;
  refreshData: () => void;
}

// Fixed tables map configured for the restaurant
const TABLES_MAP = [
  { id: 'T1', name: 'Mesa 1', capacity: 4, section: 'Salón Principal' },
  { id: 'T2', name: 'Mesa 2', capacity: 2, section: 'Salón Principal' },
  { id: 'T3', name: 'Mesa 3', capacity: 4, section: 'Salón Principal' },
  { id: 'T4', name: 'Mesa 4', capacity: 6, section: 'Terraza' },
  { id: 'T5', name: 'Mesa 5', capacity: 4, section: 'Terraza' },
  { id: 'T6', name: 'Mesa 6', capacity: 2, section: 'Terraza' },
  { id: 'T10', name: 'Mesa 10', capacity: 8, section: 'VIP' },
  { id: 'T12', name: 'Mesa 12', capacity: 4, section: 'VIP' },
  { id: 'BAR1', name: 'Bar Barra', capacity: 2, section: 'Bar' },
  { id: 'LLEVAR', name: 'Para Llevar', capacity: 1, section: 'Express' },
];

// Helper to extract the product code from menu item ID (e.g. "m-01" or "m-s2-01" -> "01")
const getItemCode = (id: string): string => {
  const parts = id.split('-');
  return parts[parts.length - 1] || 'N/A';
};

export default function WaiterModule({
  sedeId,
  comandas,
  menuItems,
  currentUser,
  onTriggerAction,
  refreshData
}: WaiterModuleProps) {
  const currentComandas = comandas.filter(c => c.sedeId === sedeId);
  const items = menuItems.filter(i => i.sedeId === sedeId && i.available);

  // UI States
  const [selectedTable, setSelectedTable] = useState<typeof TABLES_MAP[0] | null>(null);
  const [peopleCount, setPeopleCount] = useState<number>(2);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<{ item: MenuItem; qty: number; notes: string }[]>([]);
  const [sendingOrder, setSendingOrder] = useState(false);

  // Filter Active / Prepared comandas for the current waiter to show notifications
  const waiterReadyComandas = currentComandas.filter(
    c => c.waiterId === currentUser.id && c.status === 'LISTO'
  );

  // Hybrid search logic (code or name)
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return items;
    return items.filter(item => {
      const code = getItemCode(item.id);
      const cleanCode = code.replace(/^0+/, ''); // "01" -> "1"
      const cleanQuery = q.replace(/^0+/, '');
      
      const matchesCode = code.toLowerCase() === q || (cleanCode && cleanCode === cleanQuery);
      return item.name.toLowerCase().includes(q) || matchesCode;
    });
  }, [items, searchQuery]);

  const addToCart = (item: MenuItem) => {
    const existing = cart.find(c => c.item.id === item.id);
    if (existing) {
      setCart(cart.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { item, qty: 1, notes: '' }]);
    }
  };

  const updateCartQty = (itemId: string, diff: number) => {
    setCart(cart.map(c => {
      if (c.item.id === itemId) {
        const newQty = c.qty + diff;
        return newQty > 0 ? { ...c, qty: newQty } : c;
      }
      return c;
    }).filter(c => c.qty > 0));
  };

  const updateNotes = (itemId: string, notes: string) => {
    setCart(cart.map(c => c.item.id === itemId ? { ...c, notes } : c));
  };

  // Submit order to Kitchen
  const handleSendToKitchen = async () => {
    if (!selectedTable || cart.length === 0) return;
    setSendingOrder(true);

    try {
      const subtotal = cart.reduce((acc, curr) => acc + (curr.item.price * curr.qty), 0);
      const tax = subtotal * 0.08;
      const total = subtotal + tax;

      const newComanda: Comanda = {
        id: `com-${Date.now()}`,
        sedeId,
        tableNumber: selectedTable.name,
        items: cart.map(c => ({
          menuItemId: c.item.id,
          name: c.item.name,
          price: c.item.price,
          qty: c.qty,
          notes: c.notes
        })),
        status: 'PENDIENTE',
        timestamp: new Date().toISOString(),
        waiterId: currentUser.id,
        waiterName: currentUser.name,
        guestsCount: peopleCount,
        subtotal,
        tax,
        total
      };

      await onTriggerAction("CREATE_COMANDA", newComanda);
      
      // Clear Cart and table focus
      setCart([]);
      setSelectedTable(null);
      setPeopleCount(2);
      setSearchQuery('');
      refreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setSendingOrder(false);
    }
  };

  // Check if a table already has an active comanda (PENDIENTE, COCINANDO, LISTO)
  const getActiveComandaForTable = (tableName: string) => {
    return currentComandas.find(
      c => c.tableNumber === tableName && ['PENDIENTE', 'COCINANDO', 'LISTO'].includes(c.status)
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0c0a09] text-stone-100 font-sans">
      
      {/* Waiter Header */}
      <header className="bg-stone-950 px-6 py-4 border-b border-stone-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Coffee className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight uppercase">MÓDULO DE COMANDAS</h2>
            <p className="text-[10px] font-mono text-stone-400">Terminal Móvil de Mesero: <span className="text-amber-500 font-bold">{currentUser.name}</span></p>
          </div>
        </div>

        {waiterReadyComandas.length > 0 && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-mono animate-pulse">
            <Bell className="h-3.5 w-3.5" />
            <span>{waiterReadyComandas.length} pedido(s) listos para servir</span>
          </div>
        )}
      </header>

      {/* Main Content split view */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left pane: Tables Map or Product catalog */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          
          {/* Active Servings Alertas */}
          {waiterReadyComandas.length > 0 && (
            <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                <h3 className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">🔔 ALERTAS DE DESPACHO INMEDIATO</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {waiterReadyComandas.map(com => (
                  <div key={com.id} className="bg-stone-900 border border-emerald-500/30 p-3 rounded-xl flex items-center justify-between shadow-sm">
                    <div>
                      <div className="text-xs font-bold text-white">{com.tableNumber}</div>
                      <p className="text-[10px] text-stone-400 font-mono">Listo hace unos momentos</p>
                    </div>
                    <button 
                      onClick={async () => {
                        await onTriggerAction("UPDATE_COMANDA_STATUS", { id: com.id, status: 'ENTREGADO' });
                        refreshData();
                      }}
                      className="bg-emerald-500 hover:bg-emerald-600 text-stone-950 font-bold px-3 py-1 rounded-lg text-[10px] font-mono transition-colors cursor-pointer"
                    >
                      ✓ Entregado
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!selectedTable ? (
            // TABLE MAP VIEW
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-stone-850">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-stone-400">Mapa de Mesas / Zonas</h3>
                <span className="text-[10px] text-stone-500 font-mono">Selecciona una mesa para tomar comandas</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {TABLES_MAP.map(table => {
                  const activeComanda = getActiveComandaForTable(table.name);
                  const isOccupied = !!activeComanda;
                  let statusBg = 'bg-stone-900 border-stone-800 text-stone-300 hover:border-amber-500/40';
                  
                  if (isOccupied) {
                    if (activeComanda.status === 'LISTO') {
                      statusBg = 'bg-emerald-950/30 border-emerald-500 text-emerald-400 hover:bg-emerald-950/50';
                    } else if (activeComanda.status === 'COCINANDO') {
                      statusBg = 'bg-amber-950/20 border-amber-500/40 text-amber-400 hover:bg-amber-950/30';
                    } else {
                      statusBg = 'bg-stone-900/40 border-stone-800 text-stone-400';
                    }
                  }

                  return (
                    <div
                      key={table.id}
                      onClick={() => {
                        setSelectedTable(table);
                        // Prepopulate default details if occupied
                        if (isOccupied) {
                          setPeopleCount(activeComanda.guestsCount || 2);
                        }
                      }}
                      className={`h-28 rounded-2xl border p-4.5 flex flex-col justify-between transition-all cursor-pointer shadow-md select-none group ${statusBg}`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-mono text-stone-500 group-hover:text-stone-300 transition-colors">{table.section}</span>
                        {isOccupied && (
                          <span className={`text-[8px] font-extrabold font-mono px-2 py-0.5 rounded ${
                            activeComanda.status === 'LISTO' ? 'bg-emerald-500 text-stone-950' : 'bg-stone-800 text-stone-300'
                          }`}>
                            {activeComanda.status}
                          </span>
                        )}
                      </div>

                      <div className="text-base font-bold text-white tracking-tight">{table.name}</div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-stone-400">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Cap: {table.capacity}
                        </span>
                        {isOccupied && (
                          <span className="text-amber-500 font-bold">
                            {activeComanda.guestsCount || 1}p
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            // DRAFT ORDER SCREEN FOR THE SELECTED TABLE
            <div className="space-y-6">
              
              {/* Back to map & table state header */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-stone-900 p-4 rounded-2xl border border-stone-800 gap-4">
                <div>
                  <button 
                    onClick={() => setSelectedTable(null)}
                    className="text-[10px] font-mono text-stone-400 hover:text-white mb-1 block cursor-pointer"
                  >
                    ← Volver al Mapa de Mesas
                  </button>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-amber-400" />
                    Tomando pedido para: {selectedTable.name}
                  </h3>
                  <p className="text-[10px] text-stone-400 font-mono">Ubicación: {selectedTable.section} | Capacidad Máx: {selectedTable.capacity}</p>
                </div>

                {/* MANDATORY PEOPLE COUNTER */}
                <div className="flex items-center gap-3 bg-stone-950 px-4 py-2 rounded-xl border border-stone-850">
                  <div className="text-center">
                    <span className="text-[9px] font-mono text-stone-500 uppercase block tracking-wider">Cantidad de Personas</span>
                    <span className="text-xs font-bold text-amber-500 font-mono">{peopleCount} clientes</span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2">
                    <button 
                      onClick={() => setPeopleCount(prev => Math.max(1, prev - 1))}
                      className="h-7 w-7 rounded-lg bg-stone-900 border border-stone-800 hover:bg-stone-850 flex items-center justify-center cursor-pointer text-stone-300"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <button 
                      onClick={() => setPeopleCount(prev => Math.min(20, prev + 1))}
                      className="h-7 w-7 rounded-lg bg-stone-900 border border-stone-800 hover:bg-stone-850 flex items-center justify-center cursor-pointer text-stone-300"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Hybrid Search Bar */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-500" />
                  <input
                    type="text"
                    placeholder="Buscador Híbrido: Escribe código numérico rápido (ej: 101, 104) o nombre del plato..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl py-3.5 pl-10 pr-4 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500 transition-colors font-mono"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 top-3.5 text-stone-500 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Grid list of filtered menu items */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredProducts.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-stone-600 font-mono text-xs">
                      No se encontraron platos que coincidan con la búsqueda.
                    </div>
                  ) : (
                    filteredProducts.map((item) => {
                      const code = getItemCode(item.id);
                      return (
                        <div 
                          key={item.id} 
                          onClick={() => addToCart(item)}
                          className="bg-stone-950 border border-stone-850 p-3.5 rounded-xl flex items-center justify-between cursor-pointer hover:border-amber-500/40 hover:bg-stone-900/10 transition-all group"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-bold">
                                {code}
                              </span>
                              <h4 className="text-xs font-bold text-stone-200 truncate leading-tight">{item.name}</h4>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-400 block mt-1">${item.price.toLocaleString()} COP</span>
                          </div>
                          <button className="h-7 w-7 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-stone-950 transition-colors font-bold text-sm">
                            +
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Right pane: Waite Cart Side panel */}
        {selectedTable && (
          <div className="w-80 bg-stone-950 border-l border-stone-850 flex flex-col shrink-0">
            <div className="p-4 border-b border-stone-850 bg-stone-900/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-amber-500" />
                <h3 className="text-xs font-extrabold font-mono tracking-wider text-stone-200 uppercase">COMANDA: {selectedTable.name}</h3>
              </div>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded border border-amber-500/20 font-mono">
                {peopleCount}p
              </span>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-stone-600 text-center text-xs p-4">
                  <Clock className="h-8 w-8 mb-2 stroke-[1.5]" />
                  <span>No hay productos agregados</span>
                  <p className="text-[10px] text-stone-700 mt-1">Usa la grilla del catálogo o escribe códigos numéricos rápidos.</p>
                </div>
              ) : (
                cart.map((c) => (
                  <div key={c.item.id} className="bg-stone-900 p-3 rounded-xl border border-stone-850 space-y-3.5 text-xs">
                    <div className="flex justify-between items-start gap-1">
                      <span className="font-bold text-stone-200 leading-tight">{c.item.name}</span>
                      <span className="text-[9px] font-mono text-stone-500 shrink-0">#{getItemCode(c.item.id)}</span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] pt-2 border-t border-stone-800/40 font-mono">
                      <span className="text-emerald-400">${(c.item.price * c.qty).toLocaleString()} COP</span>
                      <div className="flex items-center gap-1.5 bg-stone-950 rounded px-1 border border-stone-850">
                        <button onClick={() => updateCartQty(c.item.id, -1)} className="text-stone-400 hover:text-white p-0.5">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="font-bold text-white w-4 text-center">{c.qty}</span>
                        <button onClick={() => updateCartQty(c.item.id, 1)} className="text-stone-400 hover:text-white p-0.5">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* FREE PREPARATION COMMENTS */}
                    <div className="space-y-1">
                      <label className="text-[9px] text-stone-500 uppercase tracking-wider block">Comentarios de preparación:</label>
                      <input 
                        type="text" 
                        placeholder="Ej. Término 3/4, sin cebolla, aderezo aparte..." 
                        value={c.notes}
                        onChange={(e) => updateNotes(c.item.id, e.target.value)}
                        className="w-full bg-stone-950 border border-stone-800/80 rounded px-2.5 py-1.5 text-[10px] text-stone-300 font-mono focus:outline-none focus:border-amber-600 focus:text-amber-400"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart summary & send button */}
            <div className="p-4 bg-stone-900/60 border-t border-stone-850 space-y-3 shrink-0">
              <div className="flex justify-between text-[11px] font-mono text-stone-500">
                <span>Vajilla / Impuesto INC (8%):</span>
                <span>Incluido</span>
              </div>
              <div className="flex justify-between text-xs font-mono text-stone-300">
                <span>Subtotal:</span>
                <span>
                  ${cart.reduce((acc, curr) => acc + (curr.item.price * curr.qty), 0).toLocaleString()} COP
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold font-mono text-white pt-2 border-t border-stone-800">
                <span>TOTAL ESTIMADO:</span>
                <span className="text-emerald-400">
                  ${cart.reduce((acc, curr) => acc + (curr.item.price * curr.qty), 0).toLocaleString()} COP
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  onClick={() => {
                    setCart([]);
                    setSelectedTable(null);
                    setPeopleCount(2);
                  }}
                  className="bg-stone-950 hover:bg-stone-900 border border-stone-800 text-stone-400 font-mono py-2.5 rounded-xl text-[10px] transition-colors cursor-pointer text-center font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendToKitchen}
                  disabled={cart.length === 0 || sendingOrder}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-45 disabled:cursor-not-allowed text-stone-950 font-extrabold py-2.5 rounded-xl text-[10px] font-mono transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/20"
                >
                  {sendingOrder ? (
                    'Enviando...'
                  ) : (
                    <>
                      <Send className="h-3 w-3" />
                      Enviar a Cocina
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
