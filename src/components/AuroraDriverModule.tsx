import React, { useState, useEffect } from 'react';
import { 
  Navigation, CheckCircle, MapPin, Phone, AlertCircle, Play, 
  Map, CheckSquare, Smartphone, Send, DollarSign, Image, 
  Sparkles, Compass, Volume2, ShieldAlert, X, ChevronRight
} from 'lucide-react';
import { Domicilio, User } from '../types';

interface AuroraDriverModuleProps {
  sedeId: string;
  domicilios: Domicilio[];
  currentUser: User;
  onTriggerAction: (action: string, payload: any) => Promise<any>;
  refreshData: () => void;
}

export default function AuroraDriverModule({
  sedeId,
  domicilios = [],
  currentUser,
  onTriggerAction,
  refreshData
}: AuroraDriverModuleProps) {
  
  // Filter active dispatches for the current user (waiter/driver) or default Sofia
  const driverDeliveries = domicilios.filter(d => d.sedeId === sedeId && d.status !== 'ENTREGADO' && d.status !== 'ANULADO');

  // Selected Order for simulator focus
  const [activeOrder, setActiveOrder] = useState<Domicilio | null>(null);

  // Simulation State
  const [simulationStatus, setSimulationStatus] = useState<'IDLE' | 'ROUTE_STARTED' | 'COMPLETING'>('IDLE');
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const [simulatedSpeed, setSimulatedSpeed] = useState(0);
  const [currentStreet, setCurrentStreet] = useState('Sede Principal - Cargando Ruta');
  const [navigationInstruction, setNavigationInstruction] = useState('Presione INICIAR RUTA para arrancar el GPS');
  const [trafficAlert, setTrafficAlert] = useState<string | null>(null);

  // Digital Signature Canvas / Text
  const [signatureName, setSignatureName] = useState('');
  const [signatureCanvasLines, setSignatureCanvasLines] = useState<{ x: number; y: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [simulatedPhotoUrl, setSimulatedPhotoUrl] = useState<string | null>(null);
  const [cashCollected, setCashCollected] = useState('');

  // Vibration & sound effects
  const [phoneVibrating, setPhoneVibrating] = useState(false);

  // Automatically select the first order if available
  useEffect(() => {
    if (driverDeliveries.length > 0 && !activeOrder) {
      setActiveOrder(driverDeliveries[0]);
    }
  }, [driverDeliveries, activeOrder]);

  // Turn-by-turn simulation loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (simulationStatus === 'ROUTE_STARTED' && activeOrder) {
      setSimulatedSpeed(48);
      interval = setInterval(() => {
        setSimulatedProgress(prev => {
          const next = prev + 8;
          if (next >= 100) {
            setSimulationStatus('COMPLETING');
            setSimulatedSpeed(0);
            setCurrentStreet('Destino Llegado');
            setNavigationInstruction('Ha llegado al destino. Proceda a recolectar firma y pago.');
            triggerPhoneNotification('📍 ¡Llegaste a tu destino! El cliente te espera.');
            return 100;
          }

          // Dynamic street name & navigation instructions based on progress
          if (next < 25) {
            setCurrentStreet('Carrera 43A (Avenida El Poblado)');
            setNavigationInstruction('Continúe recto en Av. El Poblado por 600 metros');
            if (next === 16) setTrafficAlert('⚠️ Retraso por tráfico moderado (+2 min)');
          } else if (next < 60) {
            setCurrentStreet('Calle 10');
            setNavigationInstruction('Gire a la derecha en la Calle 10 en 150 metros');
            setTrafficAlert(null);
            setSimulatedSpeed(55);
          } else if (next < 85) {
            setCurrentStreet('Carrera 35');
            setNavigationInstruction('Gire a la izquierda en Carrera 35');
            if (next === 72) {
              setTrafficAlert('👮 Cámara de fotomulta adelante - Reduzca a 50 km/h');
              setSimulatedSpeed(42);
            }
          } else {
            setCurrentStreet('Calle 10A # 36 - 12 (Destino)');
            setNavigationInstruction('Destino a la derecha. Busque el número 36 - 12');
            setTrafficAlert(null);
            setSimulatedSpeed(25);
          }

          // update order route progress in the global state asynchronously
          onTriggerAction("UPDATE_DOMICILIO_PROGRESS", { id: activeOrder.id, routeProgress: next });

          return next;
        });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [simulationStatus, activeOrder]);

  const triggerPhoneNotification = (text: string) => {
    setPhoneVibrating(true);
    // Play notification buzz sound visually
    setTimeout(() => setPhoneVibrating(false), 800);
  };

  const handleStartRoute = async () => {
    if (!activeOrder) return;
    setSimulationStatus('ROUTE_STARTED');
    setSimulatedProgress(0);
    triggerPhoneNotification('🛵 ¡Ruta Iniciada! Navegando con precisión Waze.');
    try {
      await onTriggerAction("EDIT_DOMICILIO", { ...activeOrder, status: 'DESPACHADO', routeProgress: 10 });
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompleteDelivery = async () => {
    if (!activeOrder) return;
    try {
      await onTriggerAction("EDIT_DOMICILIO", { 
        ...activeOrder, 
        status: 'ENTREGADO', 
        routeProgress: 100,
        paymentConfirmedMethod: 'EFECTIVO',
        notes: `${activeOrder.notes || ''} [Firma: ${signatureName || 'Entregado a conformidad'}]`
      });
      triggerPhoneNotification('🎉 ¡Entrega registrada con éxito!');
      // Reset simulator states
      setSimulationStatus('IDLE');
      setSimulatedProgress(0);
      setActiveOrder(null);
      setSignatureName('');
      setSignatureCanvasLines([]);
      setSimulatedPhotoUrl(null);
      setCashCollected('');
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  // Simulated Draw Signature pad
  const handleSignatureMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDrawing(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSignatureCanvasLines(prev => [...prev, { x, y }]);
  };

  const handleSignatureMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSignatureCanvasLines(prev => [...prev, { x, y }]);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row bg-[#EEE8DF] p-4 lg:p-6 space-y-6 lg:space-y-0 lg:gap-8 justify-center items-center min-h-0 text-slate-900 font-sans overflow-y-auto">
      
      {/* PHONE SIMULATOR SHELL (Left side) */}
      <div className={`relative w-[340px] h-[670px] bg-slate-950 rounded-[48px] border-[10px] border-slate-900 shadow-2xl flex flex-col overflow-hidden shrink-0 transition-transform ${phoneVibrating ? 'animate-bounce' : ''}`}>
        
        {/* Notch camera head */}
        <div className="absolute top-0 inset-x-0 h-6 bg-slate-950 flex justify-center items-center z-50">
          <div className="w-24 h-4 bg-slate-900 rounded-b-xl flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-800"></span>
            <span className="w-12 h-1 bg-slate-950 rounded ml-2"></span>
          </div>
        </div>

        {/* Smartphone Screen Contents */}
        <div className="flex-1 bg-slate-950 flex flex-col pt-6 relative select-none">
          
          {/* Status Bar */}
          <div className="px-5 py-1.5 flex justify-between items-center text-[9px] font-mono font-bold text-slate-400 shrink-0">
            <span>5:18 PM</span>
            <div className="flex items-center gap-1">
              <span>LTE</span>
              <span className="w-2 h-2.5 bg-emerald-500 rounded-xs"></span>
              <span>94%</span>
            </div>
          </div>

          {/* SIMULATED APP CONTAINER */}
          <div className="flex-1 bg-[#f1efe6] rounded-t-3xl overflow-hidden flex flex-col min-h-0 text-slate-800 relative">
            
            {/* App Head */}
            <div className="bg-[#075D42] text-[#EEE8DF] px-4 py-3 shrink-0 flex justify-between items-center shadow-md">
              <div className="flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-[#FAA713]" />
                <h3 className="text-[11px] font-bold font-mono tracking-wider">AURORA DRIVER APP</h3>
              </div>
              <span className="text-[8px] bg-emerald-950 text-emerald-400 font-mono font-bold px-1.5 py-0.5 rounded">
                SIMULADOR
              </span>
            </div>

            {/* App Main Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3.5 flex flex-col">
              
              {activeOrder ? (
                <>
                  {/* Order Selector Header inside mobile app */}
                  <div className="bg-[#075D42] text-white rounded-xl p-3 shadow-sm relative overflow-hidden">
                    <span className="text-[8px] bg-[#FAA713] text-slate-950 font-bold px-1.5 py-0.2 rounded font-mono uppercase tracking-wider">
                      Entrega Asignada
                    </span>
                    <h4 className="text-sm font-bold mt-1 font-mono">{activeOrder.id}</h4>
                    <p className="text-[10px] text-slate-100 font-bold mt-1">Cliente: {activeOrder.customerName}</p>
                    <p className="text-[9px] text-slate-200 mt-0.5 truncate">Dir: {activeOrder.customerAddress}</p>
                  </div>

                  {/* TURN-BY-TURN WAZE NAVIGATION MAP BOX */}
                  <div className="bg-[#e0dbc0] rounded-xl h-36 relative overflow-hidden flex flex-col justify-end p-2.5 border border-[#ccc7a3] shadow-inner">
                    
                    {/* Simplified road grids in the app */}
                    <div className="absolute inset-0 opacity-20">
                      <line x1="100" y1="0" x2="100" y2="200" stroke="#000" strokeWidth="8" />
                      <line x1="0" y1="80" x2="300" y2="80" stroke="#000" strokeWidth="6" />
                    </div>

                    {/* Dotted path of route */}
                    {simulationStatus === 'ROUTE_STARTED' && (
                      <div className="absolute inset-x-0 bottom-10 h-1 bg-[#075D42] opacity-30 animate-pulse"></div>
                    )}

                    {/* Speedometer Overlay */}
                    <div className="absolute top-2 left-2 bg-slate-900/95 text-white px-2 py-1 rounded-lg text-[9px] font-mono space-y-0.5 shadow">
                      <p className="text-slate-400 uppercase text-[7px] font-bold">Velocidad</p>
                      <p className={`text-xs font-bold ${simulatedSpeed > 50 ? 'text-[#FAA713]' : 'text-emerald-400'}`}>
                        {simulatedSpeed} km/h
                      </p>
                    </div>

                    {/* Traffic warning banner if active */}
                    {trafficAlert && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-md text-[8px] font-mono max-w-[120px] shadow-sm animate-pulse">
                        {trafficAlert}
                      </div>
                    )}

                    {/* Screen Navigation Command Overlay */}
                    <div className="bg-slate-900/90 text-white rounded-lg p-2 text-[9px] font-mono space-y-1 relative z-10 shadow-md">
                      <p className="text-[#FAA713] font-bold flex items-center gap-1">
                        <Navigation className="h-3 w-3 animate-spin" /> {currentStreet}
                      </p>
                      <p className="text-slate-300 leading-normal">{navigationInstruction}</p>
                    </div>
                  </div>

                  {/* Dispatch Route Progression Indicator */}
                  {simulationStatus === 'ROUTE_STARTED' && (
                    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-2">
                      <div className="flex justify-between items-center text-[9px] font-mono font-bold text-slate-500">
                        <span>Progreso del viaje</span>
                        <span>{simulatedProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                        <div className="bg-[#075D42] h-full transition-all duration-1000" style={{ width: `${simulatedProgress}%` }}></div>
                      </div>
                    </div>
                  )}

                  {/* ACTIVE OPERATIONS TOUCH TARGET ACTIONS */}
                  <div className="space-y-2 pt-2">
                    {simulationStatus === 'IDLE' && (
                      <button 
                        onClick={handleStartRoute}
                        className="w-full bg-[#075D42] text-[#EEE8DF] hover:bg-[#075D42]/95 py-3 rounded-xl font-bold font-mono text-[11px] tracking-wider uppercase shadow flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Play className="h-4 w-4 fill-current text-[#FAA713]" />
                        Iniciar Ruta de Reparto
                      </button>
                    )}

                    {simulationStatus === 'COMPLETING' && (
                      <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-xs">
                        <p className="text-[10px] font-bold text-[#075D42] font-mono border-b border-slate-100 pb-1.5 uppercase tracking-wide">
                          📝 Formalizar Entrega
                        </p>

                        {/* Customer Payment calculator inside driver app */}
                        <div className="space-y-1 text-[10px]">
                          <p className="text-slate-500 font-bold">Total a cobrar: <span className="text-[#075D42] font-mono font-bold">${activeOrder.total.toLocaleString()}</span></p>
                          <div className="relative">
                            <span className="absolute left-2.5 top-2 text-slate-400 font-bold">$</span>
                            <input 
                              type="number"
                              placeholder="Monto recibido (ej. 50000)"
                              value={cashCollected}
                              onChange={(e) => setCashCollected(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg py-1.5 pl-6 pr-2 text-[10px] focus:outline-none"
                            />
                          </div>
                          {cashCollected && +cashCollected >= activeOrder.total && (
                            <p className="text-[9px] text-emerald-600 font-mono font-bold mt-1">
                              Devolver Cambio: ${(+cashCollected - activeOrder.total).toLocaleString()}
                            </p>
                          )}
                        </div>

                        {/* Mouse Signature Area inside driver app */}
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 font-bold block">Firma del Cliente:</label>
                          <div 
                            className="h-20 bg-slate-50 border border-slate-300 rounded-lg relative overflow-hidden cursor-crosshair"
                            onMouseDown={handleSignatureMouseDown}
                            onMouseMove={handleSignatureMouseMove}
                            onMouseUp={() => setIsDrawing(false)}
                            onMouseLeave={() => setIsDrawing(false)}
                          >
                            <svg className="w-full h-full absolute inset-0 pointer-events-none">
                              {signatureCanvasLines.map((line, i) => {
                                if (i === 0) return null;
                                const prev = signatureCanvasLines[i - 1];
                                return (
                                  <line 
                                    key={i} 
                                    x1={prev.x} y1={prev.y} 
                                    x2={line.x} y2={line.y} 
                                    stroke="#075D42" strokeWidth="2" strokeLinecap="round" 
                                  />
                                );
                              })}
                            </svg>
                            <span className="absolute bottom-1 right-2 text-[8px] text-slate-400 font-mono">Firme con Mouse/Touch</span>
                            <button 
                              type="button"
                              onClick={() => setSignatureCanvasLines([])}
                              className="absolute top-1 right-1 bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold text-[7px] px-1 rounded"
                            >
                              Limpiar
                            </button>
                          </div>
                        </div>

                        {/* Customer signature name input */}
                        <div className="space-y-1">
                          <input 
                            type="text" 
                            placeholder="Nombre quien recibe (ej. Juan)"
                            value={signatureName}
                            onChange={(e) => setSignatureName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-3.5 text-[10px] focus:outline-none"
                          />
                        </div>

                        <button 
                          onClick={handleCompleteDelivery}
                          disabled={!signatureName.trim()}
                          className="w-full bg-[#075D42] text-white hover:bg-[#075D42]/95 py-2.5 rounded-xl text-[10px] font-bold font-mono tracking-wider uppercase shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                          Entregar Pedido
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-3.5">
                  <CheckSquare className="h-10 w-10 text-[#075D42]/40" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-700">Sin Despachos Activos</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal font-mono">
                      No se han encontrado domicilios pendientes asignados a su ruta. Los despachos creados en Aurora Logistics aparecerán aquí.
                    </p>
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* Simulated Home button inside smartphone */}
          <div className="h-6 bg-slate-950 flex items-center justify-center shrink-0">
            <div className="w-28 h-1 bg-slate-700 rounded-full"></div>
          </div>

        </div>

      </div>

      {/* DISPATCH HISTORY & INSTRUCTIONS BOARD (Right side) */}
      <div className="flex-1 bg-white border border-[#d8d3c9] rounded-3xl p-5 lg:p-6 shadow-sm space-y-6 max-w-xl w-full">
        <div>
          <span className="text-[10px] bg-[#FAA713]/10 text-amber-700 border border-[#FAA713]/20 px-2.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
            Consola del Repartidor
          </span>
          <h2 className="text-xl font-bold text-slate-800 mt-2 font-mono flex items-center gap-2">
            <Smartphone className="h-5.5 w-5.5 text-[#075D42]" />
            AURORA DRIVER SIMULATOR
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-1 leading-relaxed">
            Esta pantalla interactiva simula la aplicación nativa del conductor para la recepción de domicilios. Puede iniciar rutas, visualizar cambios en el radar de despachos y registrar firmas de clientes.
          </p>
        </div>

        {/* Assigned Deliveries List queue on the right */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold font-mono text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-1.5 uppercase">
            📦 Cola de Domicilios Asignados ({driverDeliveries.length})
          </h4>

          {driverDeliveries.length === 0 ? (
            <p className="text-xs text-slate-400 font-mono italic">No hay entregas pendientes asignadas.</p>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {driverDeliveries.map((dom) => (
                <div 
                  key={dom.id} 
                  onClick={() => setActiveOrder(dom)}
                  className={`border p-3 rounded-2xl cursor-pointer transition-all ${
                    activeOrder?.id === dom.id 
                      ? 'border-[#075D42] bg-[#075D42]/5 shadow-xs' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start text-xs font-mono">
                    <span className="font-bold text-[#075D42]">{dom.id}</span>
                    <span className="text-slate-500">${dom.total.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-800 font-bold mt-1.5">{dom.customerName}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">{dom.customerAddress}</p>
                  <div className="flex justify-between items-center mt-2.5">
                    <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono font-bold">
                      {dom.status}
                    </span>
                    <span className="text-[10px] text-[#075D42] font-semibold flex items-center gap-1">
                      Ver en Teléfono <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Informational Guidelines card */}
        <div className="bg-[#075D42]/5 border border-[#075D42]/10 rounded-2xl p-4 text-xs leading-relaxed text-slate-600 space-y-2">
          <p className="font-bold text-[#075D42] flex items-center gap-1">
            <Volume2 className="h-4 w-4" /> Instrucciones del Simulador:
          </p>
          <ul className="list-disc pl-4 space-y-1 font-mono text-[10px]">
            <li>Configure un domicilio en la pestaña <b>Aurora Logistics</b>.</li>
            <li>Asígneselo al repartidor correspondiente.</li>
            <li>Abra <b>Aurora Driver</b>, seleccione la orden y haga clic en "Iniciar Ruta".</li>
            <li>Observe la telemetría y el progreso GPS sincronizarse en tiempo real.</li>
          </ul>
        </div>

      </div>

    </div>
  );
}
