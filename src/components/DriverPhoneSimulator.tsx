import React, { useState, useEffect } from 'react';
import { Smartphone, MapPin, Phone, ExternalLink, ShieldCheck, Check, Clock, AlertTriangle, Navigation } from 'lucide-react';
import { Domicilio } from '../types';

interface DriverPhoneSimulatorProps {
  domicilios: Domicilio[];
  onTriggerAction: (action: string, payload: any) => Promise<any>;
  refreshData: () => void;
}

interface DeliveryDriver {
  id: string;
  name: string;
  vehicle: string;
  phone: string;
  color: string;
}

const DELIVERY_DRIVERS: DeliveryDriver[] = [
  { id: 'u4', name: 'Sofia Castro', vehicle: 'Moto Honda CB125 (Placa XYZ-12C)', phone: '+57 312 456 7890', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  { id: 'u-mateo', name: 'Mateo Pérez', vehicle: 'Moto Yamaha FZ16 (Placa ABC-34E)', phone: '+57 320 987 6543', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  { id: 'u-carlos', name: 'Carlos Mendoza', vehicle: 'Bicicleta Eléctrica Fly', phone: '+57 315 222 3344', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { id: 'u-laura', name: 'Laura Rojas', vehicle: 'Moto AKT Flex (Placa KLO-99F)', phone: '+57 311 555 6677', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' }
];

export default function DriverPhoneSimulator({ domicilios, onTriggerAction, refreshData }: DriverPhoneSimulatorProps) {
  const [activeDriverId, setActiveDriverId] = useState<string>('u4');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [cierrePaymentMethod, setCierrePaymentMethod] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'>('EFECTIVO');
  const [cierreCashReceived, setCierreCashReceived] = useState('');
  const [cierreNotes, setCierreNotes] = useState('');
  const [isAdvancingGps, setIsAdvancingGps] = useState(false);

  // Filter deliveries assigned to this driver that are active
  const activeDeliveries = domicilios.filter(d => d.repartidorId === activeDriverId && d.status !== 'ENTREGADO' && d.status !== 'ANULADO');
  const historyDeliveries = domicilios.filter(d => d.repartidorId === activeDriverId && d.status === 'ENTREGADO');

  // Sort by priority (1st stop, 2nd stop, 3rd stop)
  const sortedDeliveries = [...activeDeliveries].sort((a, b) => (a.routePriority || 0) - (b.routePriority || 0));

  // Determine active order
  const activeOrder = sortedDeliveries.find(d => d.id === selectedOrderId) || sortedDeliveries[0];

  useEffect(() => {
    if (activeOrder) {
      setSelectedOrderId(activeOrder.id);
    } else {
      setSelectedOrderId(null);
    }
  }, [activeDriverId, activeDeliveries.length]);

  const activeDriverObj = DELIVERY_DRIVERS.find(d => d.id === activeDriverId);

  // GPS Simulation Trigger
  const handleSimulateGpsProgress = async () => {
    if (!activeOrder) return;
    setIsAdvancingGps(true);
    
    const currentProgress = activeOrder.routeProgress || 0;
    const nextProgress = Math.min(100, currentProgress + 20);

    // Deterministic route movement toward El Poblado bounds
    const startLat = 6.2085;
    const startLng = -75.5670;
    
    // Convert text address to map offsets
    let hash = 0;
    for (let i = 0; i < activeOrder.customerAddress.length; i++) {
      hash = activeOrder.customerAddress.charCodeAt(i) + ((hash << 5) - hash);
    }
    const latOffset = (Math.abs(hash % 100) / 100) * 0.03 - 0.015;
    const lngOffset = (Math.abs((hash >> 8) % 100) / 100) * 0.03 - 0.015;
    const endLat = 6.2085 + latOffset;
    const endLng = -75.5670 + lngOffset;

    const currentLat = startLat + (endLat - startLat) * (nextProgress / 100);
    const currentLng = startLng + (endLng - startLng) * (nextProgress / 100);

    try {
      await onTriggerAction("UPDATE_DOMICILIO_STATUS", {
        id: activeOrder.id,
        status: 'DESPACHADO', // Changes state to dispatched (on road) if it wasn't already
        gpsCoordinates: { lat: currentLat, lng: currentLng },
        routeProgress: nextProgress
      });
      refreshData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsAdvancingGps(false);
    }
  };

  // Cierre de Caja en Calle (Complete order)
  const handleStreetCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;

    try {
      const notesWithCierre = [
        activeOrder.notes || '',
        `[Cobrado: ${cierrePaymentMethod}]`,
        cierreNotes.trim() ? `Nota Repartidor: ${cierreNotes.trim()}` : ''
      ].filter(Boolean).join(' | ');

      await onTriggerAction("UPDATE_DOMICILIO_STATUS", {
        id: activeOrder.id,
        status: 'ENTREGADO',
        routeProgress: 100,
        notes: notesWithCierre,
        paymentConfirmedMethod: cierrePaymentMethod
      });

      alert(`✅ Domicilio Entregado con Éxito!\nMétodo de Pago: ${cierrePaymentMethod}\nTotal Recaudado: $${activeOrder.total.toLocaleString('es-CO')}\n\nLos saldos ya ingresaron al cuadre de caja de la sede.`);
      setCierreNotes('');
      setCierreCashReceived('');
      refreshData();
    } catch (err: any) {
      alert(`⚠️ Error al confirmar entrega: ${err.message}`);
    }
  };

  // Build external map deep links
  const googleMapsUrl = activeOrder 
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeOrder.customerAddress)}`
    : '#';
  const wazeUrl = activeOrder 
    ? `https://waze.com/ul?q=${encodeURIComponent(activeOrder.customerAddress)}`
    : '#';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* DRIVER SELECTOR */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-4">
          <label className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider block">
            Seleccionar Repartidor Activo (Simulación)
          </label>
          <div className="space-y-2">
            {DELIVERY_DRIVERS.map(drv => {
              const count = domicilios.filter(d => d.repartidorId === drv.id && d.status !== 'ENTREGADO' && d.status !== 'ANULADO').length;
              const isSelected = activeDriverId === drv.id;
              
              return (
                <button
                  key={drv.id}
                  onClick={() => setActiveDriverId(drv.id)}
                  className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between font-mono ${
                    isSelected 
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 shadow-lg shadow-cyan-500/5' 
                      : 'bg-[#0A0F1D]/60 border-slate-800/80 text-slate-400 hover:border-slate-800 hover:text-slate-300'
                  }`}
                >
                  <div className="space-y-0.5 text-xs">
                    <p className="font-extrabold">{drv.name}</p>
                    <p className="text-[10px] text-slate-500 truncate max-w-[180px]">{drv.vehicle}</p>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full ${count > 0 ? 'bg-amber-500/10 text-amber-400 font-black border border-amber-500/20' : 'bg-slate-800 text-slate-500'}`}>
                    {count} activos
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* STATS */}
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-5 text-xs font-mono text-slate-400 space-y-2.5">
          <p className="font-bold text-slate-300">Resumen del Repartidor</p>
          <div className="flex justify-between border-b border-slate-800/40 pb-2">
            <span>Rutas completadas hoy:</span>
            <span className="text-emerald-400 font-bold">{historyDeliveries.length} entregas</span>
          </div>
          <div className="flex justify-between">
            <span>Vehículo:</span>
            <span className="text-slate-300">{activeDriverObj?.vehicle.split(' (')[0]}</span>
          </div>
        </div>
      </div>

      {/* SMARTPHONE FRAME CONTAINER (Col-span 8) */}
      <div className="lg:col-span-8 flex justify-center">
        <div className="relative w-full max-w-[360px] h-[720px] bg-slate-950 rounded-[48px] border-[8px] border-slate-800 shadow-2xl flex flex-col overflow-hidden">
          
          {/* Smartphone Speaker & Camera Notch */}
          <div className="absolute top-0 inset-x-0 h-6 bg-slate-950 flex justify-center items-center z-20">
            <div className="w-24 h-4 bg-slate-900 rounded-full border border-slate-800 flex justify-around items-center px-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
              <span className="w-8 h-1 bg-slate-800 rounded"></span>
            </div>
          </div>

          {/* Smartphone Screen Content */}
          <div className="flex-1 pt-8 px-4 pb-4 overflow-y-auto bg-[#0A0D16] text-white flex flex-col space-y-4 font-sans select-none">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mt-2">
              <div>
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest block">AURORA LOGÍSTICA</span>
                <h4 className="text-xs font-bold text-cyan-400 truncate max-w-[150px]">{activeDriverObj?.name}</h4>
              </div>
              <span className="text-[9px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800 font-mono">
                5G Live
              </span>
            </div>

            {sortedDeliveries.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 p-4">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h5 className="text-xs font-bold text-slate-300">¡Libre de Entregas!</h5>
                <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed">
                  No tienes domicilios asignados en este momento. Esperando que despacho configure una nueva ruta secuencial.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-4">
                
                {/* LIST OF STOPS CHIPS */}
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {sortedDeliveries.map((del, idx) => {
                    const isActive = del.id === selectedOrderId;
                    return (
                      <button
                        key={del.id}
                        onClick={() => setSelectedOrderId(del.id)}
                        className={`text-[10px] px-2.5 py-1.5 rounded-xl border font-mono font-bold shrink-0 transition-all ${
                          isActive 
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/10' 
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {idx + 1}° Stop
                      </button>
                    );
                  })}
                </div>

                {activeOrder && (
                  <div className="flex-1 flex flex-col justify-between space-y-4">
                    
                    {/* ACTIVE STOP CARD */}
                    <div className="bg-[#111625] border border-slate-800 rounded-2xl p-4 space-y-3">
                      
                      {/* STOP NUMBER BADGE */}
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono font-extrabold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          PARADA {activeOrder.routePriority || 1} DE {sortedDeliveries.length}
                        </span>
                        <span className={`text-[9px] font-mono flex items-center gap-1 ${activeOrder.status === 'DESPACHADO' ? 'text-amber-400' : 'text-slate-400'}`}>
                          <Clock className="h-3 w-3" /> {activeOrder.status === 'DESPACHADO' ? 'En ruta' : 'Pendiente salir'}
                        </span>
                      </div>

                      {/* CLIENT ADDRESS */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Dirección de Despacho</span>
                        <p className="text-xs font-bold text-slate-200 leading-snug flex items-start gap-1">
                          <MapPin className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                          <span>{activeOrder.customerAddress}</span>
                        </p>
                      </div>

                      {/* CLIENT DETAILS */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-slate-800/60 pt-2 font-mono">
                        <div>
                          <span className="text-slate-500 block">Cliente</span>
                          <span className="text-slate-300 font-bold truncate block">{activeOrder.customerName}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Teléfono</span>
                          <span className="text-slate-300 font-bold truncate block">{activeOrder.customerPhone}</span>
                        </div>
                      </div>

                      {/* ITEMS LIST */}
                      <div className="bg-slate-950/40 rounded-xl p-2.5 text-[10px] font-mono text-slate-400 border border-slate-800/40 space-y-1">
                        <p className="font-bold text-slate-500 uppercase text-[8px] tracking-wider mb-1">Ítems de Entrega</p>
                        {activeOrder.items.map((it, i) => (
                          <div key={i} className="flex justify-between">
                            <span>{it.qty}x {it.name}</span>
                            <span>${(it.price * it.qty).toLocaleString('es-CO')}</span>
                          </div>
                        ))}
                        <div className="border-t border-slate-800/60 pt-1 mt-1 flex justify-between font-bold text-slate-300">
                          <span>Total a Cobrar:</span>
                          <span className="text-cyan-400">${activeOrder.total.toLocaleString('es-CO')}</span>
                        </div>
                      </div>

                      {/* MAP ROUTE DEEP LINKS */}
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={googleMapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 rounded-xl py-2 px-3 text-[10px] font-bold font-mono text-center flex items-center justify-center gap-1"
                        >
                          Google Maps <ExternalLink className="h-3 w-3 text-cyan-400" />
                        </a>
                        <a
                          href={wazeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 rounded-xl py-2 px-3 text-[10px] font-bold font-mono text-center flex items-center justify-center gap-1"
                        >
                          Waze GPS <ExternalLink className="h-3 w-3 text-cyan-400" />
                        </a>
                      </div>

                      {/* GPS PROGRESS INDICATOR */}
                      <div className="space-y-1.5 border-t border-slate-800/60 pt-2.5">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>Progreso de Ruta (Simulado):</span>
                          <span className="font-bold text-cyan-400">{activeOrder.routeProgress || 0}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/60">
                          <div 
                            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-300"
                            style={{ width: `${activeOrder.routeProgress || 0}%` }}
                          />
                        </div>
                        
                        {/* Simulation increment button */}
                        <button
                          onClick={handleSimulateGpsProgress}
                          disabled={isAdvancingGps || activeOrder.status === 'ENTREGADO'}
                          className="w-full bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 rounded-xl py-1.5 text-[9px] font-bold font-mono transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Navigation className="h-3 w-3 text-cyan-400 animate-pulse" />
                          <span>Simular GPS (Avanzar Ruta +20%)</span>
                        </button>
                      </div>

                    </div>

                    {/* CIERRE DE CAJA EN CALLE - CHECKOUT FORM */}
                    <form onSubmit={handleStreetCheckout} className="bg-[#111625] border border-slate-800 rounded-2xl p-4 space-y-3.5 mt-auto">
                      <div className="border-b border-slate-800/60 pb-1.5">
                        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                          Cierre de Caja en Calle (Confirmar Cobro)
                        </span>
                      </div>

                      {/* Payment Method Selector */}
                      <div className="grid grid-cols-3 gap-1">
                        {(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'] as const).map(met => (
                          <button
                            key={met}
                            type="button"
                            onClick={() => setCierrePaymentMethod(met)}
                            className={`text-[9px] py-2 px-1 rounded-xl border text-center font-bold font-mono transition-all ${
                              cierrePaymentMethod === met 
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' 
                                : 'bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-400'
                            }`}
                          >
                            {met === 'TARJETA' ? 'DATAFONO' : met}
                          </button>
                        ))}
                      </div>

                      {cierrePaymentMethod === 'EFECTIVO' && (
                        <div className="space-y-1 animate-in slide-in-from-top-1 duration-100">
                          <label className="text-[8px] font-mono uppercase font-bold text-slate-500">Monto Recibido</label>
                          <input
                            type="number"
                            placeholder="Monto en efectivo..."
                            value={cierreCashReceived}
                            onChange={(e) => setCierreCashReceived(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-1.5 text-[10px] text-white focus:outline-none focus:border-emerald-500 font-mono"
                          />
                          {cierreCashReceived && Number(cierreCashReceived) >= activeOrder.total && (
                            <p className="text-[9px] text-emerald-400 font-mono">
                              Vueltas: ${(Number(cierreCashReceived) - activeOrder.total).toLocaleString('es-CO')} COP
                            </p>
                          )}
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[8px] font-mono uppercase font-bold text-slate-500">Comentarios de Entrega</label>
                        <input
                          type="text"
                          placeholder="Ej. Dejado bajo puerta, firma ok..."
                          value={cierreNotes}
                          onChange={(e) => setCierreNotes(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-1.5 text-[10px] text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-[11px] py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
                      >
                        ✓ Confirmar Entrega y Registrar Pago
                      </button>
                    </form>

                  </div>
                )}
              </div>
            )}

          </div>

          {/* Smartphone Navigation Bar */}
          <div className="h-10 bg-slate-950 flex justify-around items-center border-t border-slate-900 z-20">
            <span className="w-10 h-1 bg-slate-800 rounded-full"></span>
          </div>

        </div>
      </div>

    </div>
  );
}
