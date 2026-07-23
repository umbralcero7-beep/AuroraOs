import React, { useState, useEffect } from 'react';
import { 
  Truck, MapPin, Phone, User as UserIcon, Play, Navigation, Bell, 
  Clock, CheckCircle, AlertCircle, Plus, Search, Check, ChevronRight, 
  Layers, Map, Sun, CloudRain, Activity, Compass, Send, ShieldAlert, CheckSquare, RefreshCw
} from 'lucide-react';
import { Domicilio, MenuItem, User } from '../types';

interface SavedClient {
  phone: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

const SEED_CLIENTS: SavedClient[] = [
  { phone: '3124567890', name: 'Juan Carlos Gómez', address: 'Calle 10 # 43A - 15, El Poblado', lat: 150, lng: 220 },
  { phone: '3209876543', name: 'María Camila Restrepo', address: 'Circular 4 # 73 - 22, Laureles', lat: 280, lng: 110 },
  { phone: '3152223344', name: 'Carlos Mario Restrepo', address: 'Avenida El Poblado # 5 sur - 12', lat: 190, lng: 380 },
  { phone: '3115556677', name: 'Estefanía Londoño', address: 'Carrera 48 # 26 - 85, Industriales', lat: 80, lng: 150 },
  { phone: '3001234567', name: 'Felipe Cardona', address: 'Calle 50 # 80 - 45, Calasanz', lat: 340, lng: 290 }
];

interface DeliveryDriver {
  id: string;
  name: string;
  vehicle: string;
  phone: string;
  lat: number;
  lng: number;
  color: string;
  status: 'DISPONIBLE' | 'ENTREGANDO' | 'FUERA_SERVICIO';
  speed: number;
  heading: string;
}

const SEED_DRIVERS: DeliveryDriver[] = [
  { id: 'drv-1', name: 'Mateo Pérez', vehicle: 'Yamaha FZ16 (XYZ-12C)', phone: '+57 320 987 6543', lat: 100, lng: 100, color: '#075D42', status: 'DISPONIBLE', speed: 0, heading: 'Norte' },
  { id: 'drv-2', name: 'Sofia Castro', vehicle: 'Honda CB125 (ABC-34E)', phone: '+57 312 456 7890', lat: 240, lng: 180, color: '#FAA713', status: 'ENTREGANDO', speed: 45, heading: 'Sur-Este' },
  { id: 'drv-3', name: 'Carlos Mendoza', vehicle: 'Bicicleta Eléctrica Fly', phone: '+57 315 222 3344', lat: 120, lng: 320, color: '#6366f1', status: 'DISPONIBLE', speed: 0, heading: 'Detenido' }
];

interface AuroraLogisticsModuleProps {
  sedeId: string;
  domicilios: Domicilio[];
  menuItems: MenuItem[];
  currentUser: User;
  onTriggerAction: (action: string, payload: any) => Promise<any>;
  refreshData: () => void;
}

export default function AuroraLogisticsModule({
  sedeId,
  domicilios = [],
  menuItems = [],
  currentUser,
  onTriggerAction,
  refreshData
}: AuroraLogisticsModuleProps) {
  
  const currentDeliveries = domicilios.filter(d => d.sedeId === sedeId);
  const availableMenu = menuItems.filter(i => i.sedeId === sedeId && i.available);

  // Receptionist States
  const [phoneSearch, setPhoneSearch] = useState('');
  const [matchedClient, setMatchedClient] = useState<SavedClient | null>(null);
  const [custPhone, setCustPhone] = useState('');
  const [custName, setCustName] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ menuItemId: string; qty: number }[]>([]);

  // Interactive Maps & Route States
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedClientPin, setSelectedClientPin] = useState<SavedClient | null>(null);
  const [routeWaypoints, setRouteWaypoints] = useState<SavedClient[]>([]);
  const [weatherCondition, setWeatherCondition] = useState<'CLEAR' | 'HEAVY_RAIN'>('CLEAR');
  const [trafficLevel, setTrafficLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [mapZoom, setMapZoom] = useState(1.1);
  const [dispatchDriverId, setDispatchDriverId] = useState('drv-1');

  // Live Simulated Driver Tracker Positions
  const [drivers, setDrivers] = useState<DeliveryDriver[]>(SEED_DRIVERS);

  // Handle periodic driver movement animation on the SVG map to make it feel ALIVE
  useEffect(() => {
    const interval = setInterval(() => {
      setDrivers(prev => 
        prev.map(d => {
          if (d.status === 'ENTREGANDO') {
            // Simulate subtle movement on the grid map
            const deltaX = (Math.random() - 0.5) * 8;
            const deltaY = (Math.random() - 0.5) * 8;
            let nextX = Math.max(20, Math.min(380, d.lat + deltaX));
            let nextY = Math.max(20, Math.min(380, d.lng + deltaY));
            const headings = ['Norte', 'Sur', 'Este', 'Oeste', 'Nor-Este', 'Sur-Este'];
            return {
              ...d,
              lat: +nextX.toFixed(1),
              lng: +nextY.toFixed(1),
              speed: Math.floor(Math.random() * 20 + 35),
              heading: headings[Math.floor(Math.random() * headings.length)]
            };
          }
          return d;
        })
      );
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handlePhoneSearch = (val: string) => {
    setPhoneSearch(val);
    const found = SEED_CLIENTS.find(c => c.phone.includes(val) || val.includes(c.phone));
    if (found) {
      setMatchedClient(found);
      setCustPhone(found.phone);
      setCustName(found.name);
      setCustAddress(found.address);
    } else {
      setMatchedClient(null);
    }
  };

  const handleAddMenuItemToOrder = (itemId: string) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.menuItemId === itemId);
      if (exists) {
        return prev.map(i => i.menuItemId === itemId ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { menuItemId: itemId, qty: 1 }];
    });
  };

  const handleRemoveMenuItemFromOrder = (itemId: string) => {
    setSelectedItems(prev => prev.filter(i => i.menuItemId !== itemId));
  };

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custAddress.trim() || selectedItems.length === 0) {
      alert("Por favor complete los campos y añada al menos un producto.");
      return;
    }

    const itemsPayload = selectedItems.map(si => {
      const menu = availableMenu.find(m => m.id === si.menuItemId);
      return {
        menuItemId: si.menuItemId,
        name: menu?.name || "Plato Desconocido",
        price: menu?.price || 0,
        qty: si.qty
      };
    });

    const subtotal = itemsPayload.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const deliveryCost = 4500;
    const total = subtotal + deliveryCost;

    const matchedPos = matchedClient || { lat: Math.floor(Math.random() * 200 + 100), lng: Math.floor(Math.random() * 200 + 100) };

    const newDomicilio: any = {
      id: `dom-${Date.now()}`,
      sedeId,
      customerName: custName,
      customerPhone: custPhone || '3000000000',
      customerAddress: custAddress,
      items: itemsPayload,
      deliveryCost,
      total,
      status: 'PENDIENTE',
      repartidorId: dispatchDriverId,
      gpsCoordinates: { lat: matchedPos.lat, lng: matchedPos.lng },
      routeProgress: 0,
      timestamp: new Date().toISOString(),
      notes: orderNotes
    };

    try {
      await onTriggerAction("ADD_DOMICILIO", newDomicilio);
      // Reset Form
      setCustName('');
      setCustPhone('');
      setCustAddress('');
      setOrderNotes('');
      setSelectedItems([]);
      setMatchedClient(null);
      setPhoneSearch('');
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  // Map route calculations
  const toggleWaypoint = (client: SavedClient) => {
    if (routeWaypoints.find(w => w.phone === client.phone)) {
      setRouteWaypoints(prev => prev.filter(w => w.phone !== client.phone));
    } else {
      setRouteWaypoints(prev => [...prev, client]);
    }
  };

  // Calculate simulated Waze ETA & Distance
  const calculateRouteMetrics = () => {
    if (routeWaypoints.length === 0) return { distance: '0.0 km', eta: '0 min', delay: 0 };
    const baseDistance = routeWaypoints.length * 2.3;
    const weatherFactor = weatherCondition === 'HEAVY_RAIN' ? 1.35 : 1.0;
    const trafficDelay = trafficLevel === 'HIGH' ? 15 : trafficLevel === 'MEDIUM' ? 5 : 1;
    const baseEta = routeWaypoints.length * 7;
    const finalEta = Math.round((baseEta * weatherFactor) + trafficDelay);
    return {
      distance: `${baseDistance.toFixed(1)} km`,
      eta: `${finalEta} mins`,
      delay: trafficDelay
    };
  };

  const routeMetrics = calculateRouteMetrics();

  return (
    <div className="flex-1 flex flex-col lg:flex-row bg-[#EEE8DF] min-h-0 text-slate-900 font-sans">
      
      {/* LEFT COLUMN: CALL CENTER & ORDER ENTRY */}
      <div className="w-full lg:w-[420px] bg-white border-r border-[#d8d3c9] flex flex-col shrink-0 min-h-0 shadow-sm">
        
        {/* Module Header */}
        <div className="p-4 bg-[#075D42] text-[#EEE8DF] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-[#FAA713] p-1.5 rounded-lg text-slate-950">
              <Truck className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-xs font-bold font-mono tracking-wider">AURORA LOGISTICS</h2>
              <p className="text-[10px] text-[#EEE8DF]/80 font-mono mt-0.5">Módulo de Despacho & Clientes</p>
            </div>
          </div>
          <span className="text-[9px] bg-slate-950/40 border border-emerald-500/20 px-2 py-0.5 rounded font-mono text-[#FAA713] font-bold">
            CONSOLA
          </span>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Caller ID / Phone Search Simulator */}
          <div className="bg-[#075D42]/5 border border-[#075D42]/10 rounded-xl p-3.5 space-y-3">
            <span className="text-[9px] font-mono text-[#075D42] font-bold tracking-wider block uppercase">
              📞 Central Telefónica / Buscador Inteligente
            </span>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Buscar celular (ej. 3124567890)..."
                value={phoneSearch}
                onChange={(e) => handlePhoneSearch(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-[#075D42] font-mono"
              />
            </div>
            {matchedClient ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-[11px] space-y-1">
                <p className="font-bold text-[#075D42] flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-[#075D42]" /> 
                  Cliente Identificado: {matchedClient.name}
                </p>
                <p className="text-slate-600 font-mono">Dir: {matchedClient.address}</p>
                <button 
                  onClick={() => {
                    setCustPhone(matchedClient.phone);
                    setCustName(matchedClient.name);
                    setCustAddress(matchedClient.address);
                  }}
                  className="text-[10px] text-[#075D42] font-bold hover:underline mt-1"
                >
                  Usar estos datos en el formulario ↓
                </button>
              </div>
            ) : phoneSearch.length > 3 ? (
              <p className="text-[10px] text-amber-600 font-mono">Nuevo número telefónico detectado.</p>
            ) : null}
          </div>

          {/* New Delivery Order Form */}
          <form onSubmit={handleCreateDelivery} className="space-y-3.5 text-xs text-slate-700">
            <span className="text-[9px] font-mono text-[#075D42] font-bold tracking-wider block uppercase border-b border-slate-200 pb-1">
              Información de Entrega
            </span>
            
            <div className="space-y-1">
              <label className="font-semibold text-slate-600">Celular del Cliente:</label>
              <input 
                type="text" 
                required
                placeholder="3124567890"
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 text-slate-800 font-mono focus:outline-none focus:border-[#075D42]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-600">Nombre del Cliente:</label>
              <input 
                type="text" 
                required
                placeholder="Nombre completo"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:border-[#075D42]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-600">Dirección de Envío:</label>
              <input 
                type="text" 
                required
                placeholder="ej. Calle 10 # 43A-15, Medellín"
                value={custAddress}
                onChange={(e) => setCustAddress(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:border-[#075D42]"
              />
            </div>

            {/* Menu Items Selector */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-600">Añadir Platos al Pedido:</label>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-[140px] overflow-y-auto bg-slate-50">
                {availableMenu.map((m) => {
                  const selected = selectedItems.find(si => si.menuItemId === m.id);
                  return (
                    <div key={m.id} className="p-2 flex items-center justify-between text-[11px] hover:bg-slate-100/60">
                      <div>
                        <p className="font-semibold text-slate-800">{m.name}</p>
                        <p className="text-[#075D42] font-mono font-bold">${m.price.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {selected && (
                          <div className="flex items-center gap-1 bg-[#075D42]/10 border border-[#075D42]/20 px-1.5 py-0.5 rounded font-bold font-mono text-[#075D42]">
                            x{selected.qty}
                            <button 
                              type="button" 
                              onClick={() => handleRemoveMenuItemFromOrder(m.id)}
                              className="text-red-500 hover:text-red-700 ml-1 font-bold"
                            >
                              x
                            </button>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleAddMenuItemToOrder(m.id)}
                          className="bg-[#075D42] hover:bg-[#075D42]/90 text-white font-bold p-1 rounded-md transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes & Extra */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-600">Instrucciones de Reparto:</label>
              <textarea 
                placeholder="ej. Tocar timbre azul, dejar con portería."
                rows={2}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-3 text-slate-800 focus:outline-none focus:border-[#075D42]"
              />
            </div>

            {/* Repartidor Directo Selector */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-600 flex items-center gap-1">
                <Truck className="h-3.5 w-3.5 text-[#075D42]" /> Repartidor de Despacho:
              </label>
              <select
                value={dispatchDriverId}
                onChange={(e) => setDispatchDriverId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 text-slate-800 font-mono focus:outline-none focus:border-[#075D42]"
              >
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} - {d.vehicle} ({d.status})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={selectedItems.length === 0}
              className="w-full bg-[#075D42] text-white hover:bg-[#075D42]/95 font-bold py-3 rounded-xl transition-colors shadow-md mt-4 uppercase font-mono text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-3.5 w-3.5" />
              Ingresar & Despachar Domicilio
            </button>
          </form>

        </div>
      </div>

      {/* RIGHT COLUMN: INTERACTIVE MAP & ROUTE BUILDER */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#f4f1ea] p-4 lg:p-6 space-y-4">
        
        {/* Map Header Controls */}
        <div className="bg-white border border-[#d8d3c9] rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xs shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-800 font-mono flex items-center gap-1.5">
              <Compass className="h-4.5 w-4.5 text-[#075D42]" />
              RADAR GPS EN TIEMPO REAL & PLANIFICADOR DE RUTAS
            </h3>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">Sede Poblado - Visualización de Tráfico Medellín</p>
          </div>

          <div className="flex items-center gap-3.5 flex-wrap">
            {/* Weather Trigger */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button 
                onClick={() => setWeatherCondition('CLEAR')}
                className={`p-1.5 rounded-md transition-colors ${weatherCondition === 'CLEAR' ? 'bg-white text-amber-500 shadow-xs' : 'text-slate-400'}`}
                title="Clima Soleado"
              >
                <Sun className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setWeatherCondition('HEAVY_RAIN')}
                className={`p-1.5 rounded-md transition-colors ${weatherCondition === 'HEAVY_RAIN' ? 'bg-[#075D42] text-white shadow-xs' : 'text-slate-400'}`}
                title="Lluvia Fuerte"
              >
                <CloudRain className="h-4 w-4" />
              </button>
            </div>

            {/* Traffic Trigger */}
            <div className="flex items-center gap-1 text-[10px] font-mono">
              <span className="text-slate-500">Tráfico:</span>
              <button 
                onClick={() => setTrafficLevel('LOW')}
                className={`px-2 py-1 rounded border transition-colors ${trafficLevel === 'LOW' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold' : 'bg-white border-slate-200'}`}
              >
                BAJO
              </button>
              <button 
                onClick={() => setTrafficLevel('MEDIUM')}
                className={`px-2 py-1 rounded border transition-colors ${trafficLevel === 'MEDIUM' ? 'bg-[#FAA713]/10 text-amber-700 border-[#FAA713]/20 font-bold' : 'bg-white border-slate-200'}`}
              >
                MED
              </button>
              <button 
                onClick={() => setTrafficLevel('HIGH')}
                className={`px-2 py-1 rounded border transition-colors ${trafficLevel === 'HIGH' ? 'bg-red-50 text-red-700 border-red-200 font-bold' : 'bg-white border-slate-200'}`}
              >
                ALTO
              </button>
            </div>
          </div>
        </div>

        {/* The Map & Sidebar Grid */}
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-4 gap-4 min-h-0">
          
          {/* THE SVG INTERACTIVE MAP CONTAINER */}
          <div className="xl:col-span-3 bg-[#e2dec5] border border-[#d2cbab] rounded-3xl relative overflow-hidden flex items-center justify-center min-h-[400px] shadow-inner">
            
            {/* SVG MAP */}
            <svg 
              viewBox="0 0 400 400" 
              className="w-full h-full max-w-[550px] transition-transform duration-300" 
              style={{ transform: `scale(${mapZoom})` }}
            >
              {/* Green Parks/Areas */}
              <rect x="20" y="20" width="80" height="60" rx="4" fill="#cbd197" />
              <rect x="250" y="140" width="130" height="80" rx="4" fill="#b0b87d" />
              <rect x="30" y="310" width="90" height="70" rx="4" fill="#cbd197" />

              {/* Grid block outlines (Buildings) */}
              <rect x="120" y="30" width="100" height="70" fill="#dbd6b5" stroke="#ccc7a5" />
              <rect x="40" y="110" width="180" height="60" fill="#dbd6b5" stroke="#ccc7a5" />
              <rect x="150" y="240" width="80" height="50" fill="#dbd6b5" stroke="#ccc7a5" />
              <rect x="260" y="240" width="100" height="120" fill="#dbd6b5" stroke="#ccc7a5" />

              {/* Street Networks / Roads (Grey lines) */}
              {/* Avenida El Poblado */}
              <line x1="240" y1="0" x2="240" y2="400" stroke="#fbfbf9" strokeWidth="12" />
              {/* Calle 10 */}
              <line x1="0" y1="180" x2="400" y2="180" stroke="#fbfbf9" strokeWidth="10" />
              {/* Industriales Highway */}
              <line x1="110" y1="0" x2="110" y2="400" stroke="#fbfbf9" strokeWidth="14" />
              {/* Connecting streets */}
              <line x1="0" y1="90" x2="400" y2="90" stroke="#fbfbf9" strokeWidth="8" />
              <line x1="0" y1="300" x2="400" y2="300" stroke="#fbfbf9" strokeWidth="8" />

              {/* Inner yellow guidelines for primary streets */}
              <line x1="240" y1="0" x2="240" y2="400" stroke="#FAA713" strokeWidth="1" strokeDasharray="4,4" />
              <line x1="0" y1="180" x2="400" y2="180" stroke="#FAA713" strokeWidth="1" strokeDasharray="4,4" />
              <line x1="110" y1="0" x2="110" y2="400" stroke="#075D42" strokeWidth="1.5" strokeDasharray="6,4" />

              {/* Text Labels for Streets */}
              <text x="248" y="30" fill="#716b54" fontSize="6" fontFamily="monospace" fontWeight="bold">AV. EL POBLADO</text>
              <text x="12" y="176" fill="#716b54" fontSize="6" fontFamily="monospace" fontWeight="bold">CALLE 10</text>
              <text x="116" y="390" fill="#716b54" fontSize="6" fontFamily="monospace" fontWeight="bold" transform="rotate(-90 116 390)">AUTOP. SUR</text>

              {/* CENTRAL HQ SUCURSAL PIN (Sede Medellín) */}
              <circle cx="240" cy="180" r="12" fill="#075D42" opacity="0.2" className="animate-ping" />
              <circle cx="240" cy="180" r="6" fill="#075D42" stroke="#fafafa" strokeWidth="1.5" />
              <text x="240" y="171" fill="#075D42" fontSize="6" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">SEDE HQ</text>

              {/* PLOTTED ROUTE DOTTED LINE IF ROUTE WAYPOINTS ARE ACTIVE */}
              {routeWaypoints.length > 0 && (
                <>
                  {/* Draw line from HQ Sede (240, 180) to first waypoint, then to next waypoints */}
                  <line 
                    x1="240" y1="180" 
                    x2={routeWaypoints[0].lat} y2={routeWaypoints[0].lng} 
                    stroke="#075D42" strokeWidth="2.5" strokeDasharray="5,3" 
                  />
                  {routeWaypoints.map((w, index) => {
                    if (index === routeWaypoints.length - 1) return null;
                    const next = routeWaypoints[index + 1];
                    return (
                      <line 
                        key={index} 
                        x1={w.lat} y1={w.lng} 
                        x2={next.lat} y2={next.lng} 
                        stroke="#075D42" strokeWidth="2.5" strokeDasharray="5,3" 
                      />
                    );
                  })}
                </>
              )}

              {/* CLIENT PIN MARKERS */}
              {SEED_CLIENTS.map((client) => {
                const isSelected = selectedClientPin?.phone === client.phone;
                const isRouteWaypoint = routeWaypoints.some(w => w.phone === client.phone);
                return (
                  <g 
                    key={client.phone} 
                    className="cursor-pointer" 
                    onClick={() => {
                      setSelectedClientPin(client);
                      toggleWaypoint(client);
                    }}
                  >
                    <circle 
                      cx={client.lat} 
                      cy={client.lng} 
                      r={isSelected ? 9 : 6} 
                      fill={isRouteWaypoint ? '#075D42' : '#7c765d'} 
                      stroke="#ffffff" 
                      strokeWidth="1.2" 
                    />
                    <text 
                      x={client.lat} 
                      y={client.lng + 2} 
                      fill="#fafafa" 
                      fontSize="6" 
                      fontWeight="bold" 
                      textAnchor="middle"
                    >
                      {SEED_CLIENTS.indexOf(client) + 1}
                    </text>
                    {/* Hover tooltip hint */}
                    <title>{`${client.name} - ${client.address}`}</title>
                  </g>
                );
              })}

              {/* SIMULATED DRIVER MARKERS */}
              {drivers.map((drv) => {
                const isSelected = selectedDriverId === drv.id;
                return (
                  <g 
                    key={drv.id} 
                    className="cursor-pointer animate-fade-in"
                    onClick={() => setSelectedDriverId(drv.id)}
                  >
                    {/* Pulsing ring if moving */}
                    {drv.status === 'ENTREGANDO' && (
                      <circle cx={drv.lat} cy={drv.lng} r="14" fill={drv.color} opacity="0.1" className="status-pulse" />
                    )}
                    <circle 
                      cx={drv.lat} 
                      cy={drv.lng} 
                      r="7" 
                      fill={drv.id === 'drv-1' ? '#075D42' : drv.id === 'drv-2' ? '#FAA713' : '#312e81'} 
                      stroke="#fafafa" 
                      strokeWidth="1.5" 
                    />
                    <path 
                      d="M -3 1 L 0 -4 L 3 1 Z" 
                      fill="#ffffff" 
                      transform={`translate(${drv.lat}, ${drv.lng - 0.5}) rotate(${drv.id === 'drv-1' ? 45 : drv.id === 'drv-2' ? 135 : 270})`} 
                    />
                    {/* Driver label tag */}
                    <rect x={drv.lat - 16} y={drv.lng + 8} width="32" height="6" rx="1" fill="#1e293b" opacity="0.8" />
                    <text x={drv.lat} y={drv.lng + 13} fill="#ffffff" fontSize="4.5" textAnchor="middle" fontWeight="bold">
                      {drv.name.split(' ')[0].toUpperCase()}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Map Zoom Controls */}
            <div className="absolute bottom-3 left-3 bg-white border border-[#d8d3c9] rounded-lg p-1 flex gap-1 shadow-md">
              <button onClick={() => setMapZoom(prev => Math.max(0.8, prev - 0.1))} className="w-6 h-6 rounded hover:bg-slate-100 font-bold text-xs">-</button>
              <button onClick={() => setMapZoom(1.1)} className="w-6 h-6 rounded hover:bg-slate-100 font-bold text-[10px] font-mono">1.1x</button>
              <button onClick={() => setMapZoom(prev => Math.min(2.0, prev + 0.1))} className="w-6 h-6 rounded hover:bg-slate-100 font-bold text-xs">+</button>
            </div>

            {/* Map Overlay Indicator */}
            <div className="absolute top-3 left-3 bg-slate-900/90 text-white border border-slate-750 px-3 py-1.5 rounded-xl text-[10px] font-mono space-y-1 shadow-md">
              <p className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#075D42]"></span> Sede Principal (El Poblado)</p>
              <p className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#FAA713]"></span> Moto En Ruta (Activo)</p>
              <p className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#7c765d]"></span> Clientes Pendientes</p>
            </div>

            {/* Weather Overlay Banner if Stormy */}
            {weatherCondition === 'HEAVY_RAIN' && (
              <div className="absolute top-3 right-3 bg-amber-500 text-slate-950 px-3 py-1.5 rounded-xl text-[10px] font-bold font-mono flex items-center gap-1 shadow-md animate-bounce">
                <CloudRain className="h-4 w-4 animate-pulse" />
                <span>ALERTA CLIMA: Retrasos estimados del +35%</span>
              </div>
            )}
          </div>

          {/* SIDEBAR DETAILED DRILL-DOWN PANEL */}
          <div className="xl:col-span-1 flex flex-col gap-4">
            
            {/* 1. Selected Driver Status Card */}
            <div className="bg-white border border-[#d8d3c9] rounded-2xl p-4 shadow-xs space-y-3.5">
              <span className="text-[9px] font-mono text-[#075D42] font-bold tracking-wider block uppercase border-b border-slate-100 pb-1">
                🔍 Estado del Conductor
              </span>
              
              {selectedDriverId ? (() => {
                const driver = drivers.find(d => d.id === selectedDriverId);
                if (!driver) return null;
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#075D42]/10 border border-[#075D42]/20 flex items-center justify-center text-[#075D42]">
                        <UserIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{driver.name}</h4>
                        <p className="text-[10px] text-slate-500 font-mono">{driver.vehicle}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 text-[11px] font-mono space-y-1.5">
                      <p className="flex justify-between">
                        <span className="text-slate-400">Estado:</span>
                        <span className={`font-bold ${driver.status === 'DISPONIBLE' ? 'text-emerald-600' : 'text-amber-500'}`}>{driver.status}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-400">Velocidad:</span>
                        <span className="text-slate-700 font-bold">{driver.speed} km/h</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-400">Rumbo:</span>
                        <span className="text-slate-700">{driver.heading}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-400">Ubicación GPS:</span>
                        <span className="text-slate-600 text-[9px]">{driver.lat}° N, {driver.lng}° O</span>
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <a 
                        href={`tel:${driver.phone}`} 
                        className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 py-2 rounded-lg text-center text-[10px] font-bold text-slate-700 transition-colors"
                      >
                        Llamar Repartidor
                      </a>
                    </div>
                  </div>
                );
              })() : (
                <div className="text-center py-6 text-slate-400 font-mono text-[10px]">
                  <p>Seleccione un repartidor en el mapa para ver su telemetría GPS.</p>
                </div>
              )}
            </div>

            {/* 2. Route Planner & Dispatching Controller */}
            <div className="bg-white border border-[#d8d3c9] rounded-2xl p-4 shadow-xs space-y-3">
              <span className="text-[9px] font-mono text-[#075D42] font-bold tracking-wider block uppercase border-b border-slate-100 pb-1">
                🗺️ Optimizador de Ruta Waze-style
              </span>

              {routeWaypoints.length > 0 ? (
                <div className="space-y-3.5 text-xs">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Secuencia de Entrega:</p>
                    <div className="space-y-1">
                      {routeWaypoints.map((w, index) => (
                        <div key={w.phone} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-2 rounded-lg">
                          <span className="bg-[#075D42] text-white w-4 h-4 rounded-full flex items-center justify-center font-bold font-mono text-[9px]">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate">{w.name}</p>
                            <p className="text-[9px] text-slate-500 font-mono truncate">{w.address}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#075D42]/5 border border-[#075D42]/10 rounded-xl p-3 text-[11px] font-mono space-y-1.5 text-[#075D42]">
                    <div className="flex justify-between">
                      <span>Distancia Total:</span>
                      <span className="font-bold">{routeMetrics.distance}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ETA Estimado:</span>
                      <span className="font-bold text-[#FAA713]">{routeMetrics.eta}</span>
                    </div>
                    {routeMetrics.delay > 0 && (
                      <div className="text-[10px] text-red-600 flex items-center gap-1 mt-1 border-t border-[#075D42]/10 pt-1.5">
                        <AlertCircle className="h-3 w-3" />
                        <span>Tránsito demora +{routeMetrics.delay} min</span>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => setRouteWaypoints([])}
                    className="w-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 py-1.5 rounded-lg text-center font-mono text-[10px] transition-all"
                  >
                    Borrar Ruta
                  </button>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 font-mono text-[10px]">
                  <p>Haga clic en los pines numéricos del mapa para construir y secuenciar su ruta de despacho óptima.</p>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* BOTTOM ACTIVE QUEUE */}
        <div className="bg-white border border-[#d8d3c9] rounded-2xl overflow-hidden shadow-xs shrink-0">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-800 font-mono flex items-center gap-1.5">
              <Activity className="h-4.5 w-4.5 text-[#075D42]" />
              COLA DE ENTREGAS ACTIVAS ({currentDeliveries.length})
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Monitoreo GPS en Vivo</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 text-[10px] font-mono text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Pedido ID</th>
                  <th className="py-2.5 px-4">Cliente</th>
                  <th className="py-2.5 px-4">Dirección de Destino</th>
                  <th className="py-2.5 px-4">Repartidor Asignado</th>
                  <th className="py-2.5 px-4">Progreso GPS</th>
                  <th className="py-2.5 px-4 text-center">Estado</th>
                  <th className="py-2.5 px-4 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center font-mono text-slate-400 text-[11px]">
                      No hay domicilios activos despachados en este momento.
                    </td>
                  </tr>
                ) : (
                  currentDeliveries.map((dom) => (
                    <tr key={dom.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold font-mono text-[#075D42]">{dom.id}</td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800">{dom.customerName}</p>
                        <p className="text-[10px] font-mono text-slate-500">{dom.customerPhone}</p>
                      </td>
                      <td className="py-3 px-4 truncate max-w-[180px]">{dom.customerAddress}</td>
                      <td className="py-3 px-4 font-medium font-mono text-slate-700">
                        {drivers.find(d => d.id === dom.repartidorId)?.name || "Sin Asignar"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                            <div 
                              className="bg-[#075D42] h-full" 
                              style={{ width: `${dom.routeProgress || (dom.status === 'ENTREGADO' ? 100 : dom.status === 'DESPACHADO' ? 65 : 0)}%` }}
                            ></div>
                          </div>
                          <span className="text-[9px] font-mono font-bold text-slate-500">
                            {dom.routeProgress || (dom.status === 'ENTREGADO' ? 100 : dom.status === 'DESPACHADO' ? 65 : 0)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                          dom.status === 'ENTREGADO' ? 'bg-emerald-100 text-emerald-800' :
                          dom.status === 'DESPACHADO' ? 'bg-[#FAA713]/10 text-[#FAA713] border border-[#FAA713]/20' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {dom.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold font-mono text-slate-800">
                        ${dom.total.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
