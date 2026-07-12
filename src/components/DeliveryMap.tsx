import React, { useState } from 'react';
import { Map, MapPin, Truck, AlertTriangle, ShieldAlert, RefreshCw, UserCheck } from 'lucide-react';
import { Domicilio } from '../types';

interface DeliveryMapProps {
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

export default function DeliveryMap({ domicilios, onTriggerAction, refreshData }: DeliveryMapProps) {
  const activeOrdersOnRoad = domicilios.filter(d => d.status === 'DESPACHADO' && d.repartidorId);
  
  // Emergency Reassignment State
  const [emergencyTargetOrderId, setEmergencyTargetOrderId] = useState<string | null>(null);
  const [reassigning, setReassigning] = useState(false);

  // Fallback coords generator if none exists
  const getCoordsForAddress = (address: string) => {
    let hash = 0;
    for (let i = 0; i < address.length; i++) {
      hash = address.charCodeAt(i) + ((hash << 5) - hash);
    }
    const latOffset = (Math.abs(hash % 100) / 100) * 0.04 - 0.02; // -0.02 to +0.02
    const lngOffset = (Math.abs((hash >> 8) % 100) / 100) * 0.04 - 0.02; // -0.02 to +0.02
    return {
      lat: 6.2085 + latOffset,
      lng: -75.5670 + lngOffset
    };
  };

  const handleTriggerEmergencyReassignment = async (orderId: string, newDriverId: string) => {
    setReassigning(true);
    const oldOrder = domicilios.find(d => d.id === orderId);
    const oldDriver = DELIVERY_DRIVERS.find(d => d.id === oldOrder?.repartidorId)?.name || 'Anterior';
    const newDriver = DELIVERY_DRIVERS.find(d => d.id === newDriverId)?.name || 'Nuevo';

    try {
      await onTriggerAction("UPDATE_DOMICILIO_STATUS", {
        id: orderId,
        repartidorId: newDriverId,
        status: 'DESPACHADO', // keep on road
        routePriority: 1, // Move to urgent priority 1
        routeProgress: 0, // reset progress so new driver departs from kitchen/position
        gpsCoordinates: { lat: 6.2085, lng: -75.5670 } // reset position to branch
      });
      
      alert(`⚠️ PROTOCOLO DE EMERGENCIA ACTIVADO!\nEl pedido #${orderId.substring(4).toUpperCase()} asignado a ${oldDriver} ha sido reasignado de urgencia a ${newDriver}.\nSe ha reiniciado el progreso de entrega a la par del nuevo repartidor.`);
      setEmergencyTargetOrderId(null);
      refreshData();
    } catch (err: any) {
      alert(`⚠️ Error en protocolo de emergencia: ${err.message}`);
    } finally {
      setReassigning(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      
      {/* MAP GRID SCREEN (Col-span 8) */}
      <div className="lg:col-span-8 flex flex-col space-y-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 flex flex-col h-[500px] overflow-hidden relative shadow-inner">
          
          {/* Header Map */}
          <div className="absolute top-4 left-4 z-10 bg-slate-950/80 backdrop-blur-md border border-slate-800 p-2.5 rounded-xl flex items-center gap-2">
            <Map className="h-4 w-4 text-cyan-400" />
            <div className="font-mono text-[9px] text-slate-300">
              <span className="font-extrabold text-cyan-300">CENTRAL RADAR: EL POBLADO</span> | {activeOrdersOnRoad.length} Unidades en Ruta
            </div>
          </div>

          {/* Interactive SVG Radar Grid representing Medellín */}
          <div className="flex-1 w-full bg-[#070B14] relative rounded-2xl overflow-hidden border border-slate-950 flex items-center justify-center">
            
            {/* Custom Grid lines */}
            <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="cyan" strokeWidth="1" />
                </pattern>
                <radialGradient id="radar" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#070b14" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              <rect width="100%" height="100%" fill="url(#radar)" />
            </svg>

            {/* Simulated Road Lines */}
            <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" viewBox="0 0 800 500">
              {/* Avenida El Poblado */}
              <line x1="100" y1="0" x2="600" y2="500" stroke="#334155" strokeWidth="6" strokeDasharray="10,5" />
              {/* Avenida Las Vegas */}
              <line x1="50" y1="0" x2="550" y2="500" stroke="#334155" strokeWidth="4" />
              {/* Calle 10 */}
              <line x1="0" y1="200" x2="800" y2="350" stroke="#334155" strokeWidth="6" strokeDasharray="10,5" />
              {/* Avenida Las Palmas */}
              <path d="M 400,0 Q 550,150 800,200" fill="none" stroke="#334155" strokeWidth="8" />
            </svg>

            {/* Glowing Sede Central (Origin) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-10">
              <div className="relative flex h-5 w-5 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600 border border-white"></span>
              </div>
              <span className="bg-slate-950/90 border border-slate-800 px-2 py-0.5 rounded text-[8px] font-bold font-mono text-rose-400 mt-1 shadow-lg">
                AURORA SEDE 1
              </span>
            </div>

            {/* Live moving delivery markers */}
            {activeOrdersOnRoad.map(order => {
              const coords = order.gpsCoordinates || getCoordsForAddress(order.customerAddress);
              const driver = DELIVERY_DRIVERS.find(d => d.id === order.repartidorId);
              
              // Map lat/long to relative percentages (Medellin center lat ~ 6.2085, lng ~ -75.5670)
              // Bounds: lat (6.185 to 6.23), long (-75.545 to -75.585)
              const scaleLat = (coords.lat - 6.185) / 0.045; // 0 to 1
              const scaleLng = (coords.lng + 75.585) / 0.04; // 0 to 1
              
              // Invert lat because top is 0 in CSS percentages
              const topPct = Math.min(95, Math.max(5, (1 - scaleLat) * 100));
              const leftPct = Math.min(95, Math.max(5, scaleLng * 100));

              return (
                <div 
                  key={order.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group transition-all duration-300"
                  style={{ top: `${topPct}%`, left: `${leftPct}%` }}
                >
                  {/* Bike pulse */}
                  <div className="relative flex h-8 w-8 items-center justify-center cursor-pointer">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-20"></span>
                    <div className="relative h-6 w-6 rounded-full bg-[#0D1425] border-2 border-cyan-400 flex items-center justify-center shadow-lg group-hover:scale-125 transition-transform">
                      <Truck className="h-3.5 w-3.5 text-cyan-300" />
                    </div>
                  </div>

                  {/* Tooltip on Hover */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-9 bg-slate-950/95 border border-slate-800 text-[9px] font-mono p-2.5 rounded-xl text-slate-300 w-44 shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-30">
                    <div className="border-b border-slate-800 pb-1 mb-1 font-bold text-cyan-300 flex justify-between items-center">
                      <span>Ref: #{order.id.substring(4).toUpperCase()}</span>
                      <span className="bg-cyan-500/10 text-cyan-400 px-1 rounded text-[8px]">{order.routeProgress || 0}%</span>
                    </div>
                    <p className="text-slate-400 truncate"><span className="text-slate-500">Dir:</span> {order.customerAddress}</p>
                    <p className="mt-0.5"><span className="text-slate-500">Repartidor:</span> {driver?.name}</p>
                    <p className="mt-0.5"><span className="text-slate-500">Est. prioridad:</span> {order.routePriority}° parada</p>
                  </div>
                </div>
              );
            })}

            {activeOrdersOnRoad.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/30 text-slate-500 font-mono text-xs text-center p-6">
                No hay repartidores en ruta activa en este momento.<br />
                (Asigne una ruta y simule el GPS para verlos moverse en el radar).
              </div>
            )}

          </div>
        </div>
      </div>

      {/* DRIVERS LIST & PROTOCOLO DE EMERGENCIA (Col-span 4) */}
      <div className="lg:col-span-4 flex flex-col space-y-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 flex-1 flex flex-col space-y-4">
          <div>
            <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-red-400" /> Protocolo de Emergencia
            </h4>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Control de Accidentes o Retrasos Críticos</p>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
            {activeOrdersOnRoad.map(order => {
              const driver = DELIVERY_DRIVERS.find(d => d.id === order.repartidorId);
              const progress = order.routeProgress || 0;
              const isDelayed = progress < 50; // Demo trigger: treat as delayed if progress is low
              
              return (
                <div key={order.id} className="bg-slate-950/40 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Pedido #{order.id.substring(4).toUpperCase()}</span>
                      <p className="text-xs font-bold text-slate-300 truncate max-w-[150px]">{order.customerName}</p>
                    </div>
                    {isDelayed ? (
                      <span className="text-[8px] font-mono bg-red-500/10 border border-red-500/20 text-red-400 px-1.5 py-0.5 rounded animate-pulse">
                        ⚠️ Alerta Retraso
                      </span>
                    ) : (
                      <span className="text-[8px] font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">
                        ✓ En ruta
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] font-mono text-slate-400 truncate">
                    🛵 Repartidor: <span className="text-slate-200 font-bold">{driver?.name}</span>
                  </p>

                  <div className="bg-slate-900/60 border border-slate-850 p-2 rounded-xl text-[9px] font-mono text-slate-500 space-y-1">
                    <p className="truncate text-slate-400">Dir: {order.customerAddress}</p>
                    <p>Orden de parada: {order.routePriority}° stop</p>
                  </div>

                  {emergencyTargetOrderId === order.id ? (
                    <div className="bg-[#1c1214] border border-red-900/30 p-2.5 rounded-xl space-y-2 text-center animate-in zoom-in-95 duration-100">
                      <p className="text-[9px] font-mono text-red-400 font-bold">¿A quién desea reasignar el pedido de emergencia?</p>
                      <div className="grid grid-cols-1 gap-1">
                        {DELIVERY_DRIVERS.filter(d => d.id !== order.repartidorId).map(candidate => (
                          <button
                            key={candidate.id}
                            disabled={reassigning}
                            onClick={() => handleTriggerEmergencyReassignment(order.id, candidate.id)}
                            className="bg-red-500 hover:bg-red-600 disabled:opacity-30 text-slate-950 font-bold text-[9px] font-mono py-1 rounded cursor-pointer"
                          >
                            Reasignar a {candidate.name}
                          </button>
                        ))}
                      </div>
                      <button 
                        onClick={() => setEmergencyTargetOrderId(null)}
                        className="text-[8px] text-slate-400 hover:text-white underline font-mono block mx-auto"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEmergencyTargetOrderId(order.id)}
                      className="w-full bg-red-550/10 hover:bg-red-500/20 border border-red-900/30 hover:border-red-500/30 text-red-400 font-mono text-[10px] py-2 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="h-3 w-3" /> Reasignar Pedido de Emergencia
                    </button>
                  )}
                </div>
              );
            })}

            {activeOrdersOnRoad.length === 0 && (
              <div className="text-center py-10 text-slate-500 text-xs font-mono">
                No hay despachos activos para monitorear incidentes.
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
