import React, { useState, useEffect } from 'react';
import { 
  Truck, MapPin, Phone, User as UserIcon, Play, Navigation, Bell, 
  Printer, Lock, Clock, CheckCircle, AlertCircle, Plus, Search, 
  Check, ChevronRight, Smartphone, History, Clock3, FileText, 
  Trash2, ExternalLink, Keyboard, RotateCcw, Coins, CreditCard, 
  Wallet, Layers, Map, ShieldAlert, FileCheck, ArrowRight, UserCheck, 
  CheckSquare, Activity
} from 'lucide-react';
import { Domicilio, MenuItem, User } from '../types';

// Importing sub-components for modular architecture
import ReceiptModal from './ReceiptModal';
import DianQueuePanel from './DianQueuePanel';
import DriverPhoneSimulator from './DriverPhoneSimulator';
import DeliveryMap from './DeliveryMap';

interface SavedClient {
  phone: string;
  name: string;
  document?: string;
  addresses: string[];
  notes: Record<string, string>;
}

const SEED_CLIENTS: SavedClient[] = [
  { phone: '3124567890', name: 'Juan Carlos Gómez', document: '1017234556', addresses: ['Calle 10 # 43A - 15, El Poblado, Medellín'], notes: { 'Calle 10 # 43A - 15, El Poblado, Medellín': 'Portería principal, edificio Torre Alta' } },
  { phone: '3209876543', name: 'María Camila Restrepo', document: '1035987112', addresses: ['Circular 4 # 73 - 22, Laureles, Medellín'], notes: { 'Circular 4 # 73 - 22, Laureles, Medellín': 'Apartamento 402, tocar timbre azul' } },
  { phone: '3152223344', name: 'Alimentos del Norte S.A.S.', document: '901445123-9', addresses: ['Carrera 48 # 26 - 85, Industriales, Medellín'], notes: { 'Carrera 48 # 26 - 85, Industriales, Medellín': 'Entrada proveedores, preguntar por Carlos' } },
  { phone: '3115556677', name: 'Consumidor Especial S.A.', document: '890112445-5', addresses: ['Avenida El Poblado # 5 sur - 12, Medellín'], notes: { 'Avenida El Poblado # 5 sur - 12, Medellín': 'Piso 12, recepción principal' } },
  { phone: '3001234567', name: 'Estefanía Londoño', document: '1020456123', addresses: ['Calle 50 # 80 - 45, Calasanz, Medellín'], notes: { 'Calle 50 # 80 - 45, Calasanz, Medellín': 'Casa de rejas negras, dejar con vigilante' } }
];

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

interface DeliveryModuleProps {
  sedeId: string;
  domicilios: Domicilio[];
  menuItems: MenuItem[];
  currentUser: User;
  onTriggerAction: (action: string, payload: any) => Promise<any>;
  refreshData: () => void;
}

export default function DeliveryModule({
  sedeId,
  domicilios,
  menuItems,
  currentUser,
  onTriggerAction,
  refreshData
}: DeliveryModuleProps) {
  // Sede-specific filtering
  const currentDeliveries = domicilios.filter(d => d.sedeId === sedeId);
  const availableMenu = menuItems.filter(i => i.sedeId === sedeId && i.available);

  // Active tablet dashboard module toggle: 'recepcion' (Receptionist) or 'domiciliario' (Dispatch & Logistics)
  const [activeTab, setActiveTab] = useState<'recepcion' | 'domiciliario'>('recepcion');

  // Sub-tabs for Receptionist
  const [recepSubTab, setRecepSubTab] = useState<'toma_pedidos' | 'radar_gps' | 'historial'>('toma_pedidos');
  
  // Sub-tabs for Logistics & Delivery
  const [logisticsSubTab, setLogisticsSubTab] = useState<'kanban' | 'phone_simulator'>('kanban');

  // Saved clients directory load/save
  const [savedClients, setSavedClients] = useState<SavedClient[]>(() => {
    const stored = localStorage.getItem('aurora_saved_clients_v2');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) { /* ignore */ }
    }
    return SEED_CLIENTS;
  });

  useEffect(() => {
    localStorage.setItem('aurora_saved_clients_v2', JSON.stringify(savedClients));
  }, [savedClients]);

  // 📞 CALL CENTER / RECEPCIONIST STATES
  const [phoneSearch, setPhoneSearch] = useState('');
  const [matchedClient, setMatchedClient] = useState<SavedClient | null>(null);

  // Flash Order Form States
  const [custPhone, setCustPhone] = useState('');
  const [custName, setCustName] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custNotes, setCustNotes] = useState('');
  const [custDocument, setCustDocument] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'>('EFECTIVO');
  const [paymentReceivedWith, setPaymentReceivedWith] = useState('');
  const [requireInvoice, setRequireInvoice] = useState(false);
  const [selectedItems, setSelectedItems] = useState<{ [id: string]: number }>({});
  const [deliveryCost, setDeliveryCost] = useState(4000);
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [formFeedback, setFormFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Manual Dialog for registering new client address
  const [showNewAddressInput, setShowNewAddressInput] = useState(false);
  const [newAddressText, setNewAddressText] = useState('');
  const [newAddressNotes, setNewAddressNotes] = useState('');

  // Sorter / multi-stop sequential route assignment queue
  const [selectedDriverId, setSelectedDriverId] = useState<string>('u4');
  const [routeBatchIds, setRouteBatchIds] = useState<string[]>([]); // Ordered multi-stop order IDs

  // Modal receipt visual states
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptTargetOrder, setReceiptTargetOrder] = useState<Domicilio | null>(null);

  // Filter Menu Items using alphanumeric code mapping
  const getMenuItemCode = (name: string): string => {
    const codeMap: Record<string, string> = {
      'Burger Aurora': '101',
      'Steak Pimienta': '102',
      'Veggie Bowl': '103',
      'Limonada de Coco': '104',
      'Volcán de Chocolate': '105'
    };
    const key = Object.keys(codeMap).find(k => name.toLowerCase().includes(k.toLowerCase()));
    return key ? codeMap[key] : '101';
  };

  const filteredMenuItems = availableMenu.filter(item => {
    const code = getMenuItemCode(item.name);
    const query = menuSearchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      code.includes(query)
    );
  });

  // Client Phone Instant Autocomplete Directory Lookups
  useEffect(() => {
    if (phoneSearch.trim().length >= 3) {
      const match = savedClients.find(c => 
        c.phone.includes(phoneSearch) || 
        c.name.toLowerCase().includes(phoneSearch.toLowerCase())
      );
      setMatchedClient(match || null);
    } else {
      setMatchedClient(null);
    }
  }, [phoneSearch, savedClients]);

  // Keyboard Shortcuts (F4 - Clear, F9 - Quick Save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'recepcion') return;
      if (e.key === 'F4') {
        e.preventDefault();
        handleClearForm();
        setFormFeedback({ type: 'success', message: 'Formulario de recepción restaurado.' });
        setTimeout(() => setFormFeedback(null), 2500);
      }
      if (e.key === 'F9') {
        e.preventDefault();
        const saveBtn = document.getElementById('quick-submit-order-btn');
        if (saveBtn) saveBtn.click();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, custName, custPhone, custAddress, selectedItems, deliveryCost, paymentMethod, custNotes, custDocument, requireInvoice]);

  const handleApplyMatchedClient = (client: SavedClient) => {
    setCustPhone(client.phone);
    setCustName(client.name);
    setCustDocument(client.document || '');
    // Preselect the last address used
    setCustAddress(client.addresses[client.addresses.length - 1] || '');
    setCustNotes(client.notes[client.addresses[client.addresses.length - 1]] || '');
    setPhoneSearch('');
    setMatchedClient(null);
    setFormFeedback({ type: 'success', message: `Cliente "${client.name}" cargado automáticamente.` });
    setTimeout(() => setFormFeedback(null), 3000);
  };

  const handleClearForm = () => {
    setCustPhone('');
    setCustName('');
    setCustAddress('');
    setCustNotes('');
    setCustDocument('');
    setSelectedItems({});
    setPaymentMethod('EFECTIVO');
    setPaymentReceivedWith('');
    setRequireInvoice(false);
    setDeliveryCost(4000);
    setMenuSearchQuery('');
    setFormFeedback(null);
  };

  const handleAddRemoveItem = (itemId: string, direction: 'add' | 'remove') => {
    const qty = selectedItems[itemId] || 0;
    if (direction === 'add') {
      setSelectedItems({ ...selectedItems, [itemId]: qty + 1 });
    } else {
      if (qty <= 1) {
        const updated = { ...selectedItems };
        delete updated[itemId];
        setSelectedItems(updated);
      } else {
        setSelectedItems({ ...selectedItems, [itemId]: qty - 1 });
      }
    }
  };

  const handleAddNewAddressInline = () => {
    if (!newAddressText.trim()) return;
    
    setCustAddress(newAddressText.trim());
    setCustNotes(newAddressNotes.trim());
    
    // Append to search state if client exists
    if (custPhone) {
      setSavedClients(prev => {
        return prev.map(c => {
          if (c.phone === custPhone.trim()) {
            const alreadyExists = c.addresses.includes(newAddressText.trim());
            const updatedAddresses = alreadyExists ? c.addresses : [...c.addresses, newAddressText.trim()];
            return {
              ...c,
              addresses: updatedAddresses,
              notes: { ...c.notes, [newAddressText.trim()]: newAddressNotes.trim() }
            };
          }
          return c;
        });
      });
    }

    setNewAddressText('');
    setNewAddressNotes('');
    setShowNewAddressInput(false);
    setFormFeedback({ type: 'success', message: 'Nueva dirección cargada al formulario.' });
    setTimeout(() => setFormFeedback(null), 3000);
  };

  // Submit Flash Order to server
  const handleCreateDomicilio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custPhone.trim() || !custAddress.trim()) {
      setFormFeedback({ type: 'error', message: '⚠️ Teléfono, Nombre y Dirección son obligatorios.' });
      return;
    }

    const cartItems = (Object.entries(selectedItems) as [string, number][])
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => {
        const menuItem = availableMenu.find(item => item.id === id);
        return {
          menuItemId: id,
          name: menuItem?.name || 'Producto',
          price: menuItem?.price || 0,
          qty: Number(qty)
        };
      });

    if (cartItems.length === 0) {
      setFormFeedback({ type: 'error', message: '⚠️ Seleccione al menos un plato.' });
      return;
    }

    const subtotal = cartItems.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
    const total = subtotal + Number(deliveryCost);

    // Initial status and DIAN invoices workflow:
    // If electronic invoice is required, placed into PENDIENTE ("Espera en Caja")
    const initialStatus = requireInvoice ? 'PENDIENTE' : 'PREPARANDO';
    const invoiceStatus = requireInvoice ? 'ESPERA_CAJA' : 'NO_REQUERIDO';

    const notesWithPayment = [
      custNotes.trim(),
      `[Pago: ${paymentMethod}]`,
      paymentReceivedWith ? `[Paga con: $${Number(paymentReceivedWith).toLocaleString()}]` : ''
    ].filter(Boolean).join(' | ');

    const newDomicilio: Domicilio = {
      id: `dom-${Date.now()}`,
      sedeId,
      customerName: custName.trim(),
      customerPhone: custPhone.trim(),
      customerAddress: custAddress.trim(),
      items: cartItems,
      deliveryCost: Number(deliveryCost),
      total,
      status: initialStatus,
      timestamp: new Date().toISOString(),
      notes: notesWithPayment,
      requireInvoice,
      invoiceStatus,
      customerDocument: custDocument.trim() || undefined
    };

    try {
      await onTriggerAction("CREATE_DOMICILIO", newDomicilio);

      // Append Client metadata to persistent local directories
      setSavedClients(prev => {
        const existing = prev.find(c => c.phone.trim() === custPhone.trim());
        if (existing) {
          const hasAddr = existing.addresses.includes(custAddress.trim());
          const updatedAddresses = hasAddr ? existing.addresses : [...existing.addresses, custAddress.trim()];
          return prev.map(c => c.phone.trim() === custPhone.trim()
            ? {
                ...c,
                name: custName.trim(),
                document: custDocument.trim() || c.document,
                addresses: updatedAddresses,
                notes: { ...c.notes, [custAddress.trim()]: custNotes.trim() }
              }
            : c
          );
        } else {
          return [
            ...prev,
            {
              phone: custPhone.trim(),
              name: custName.trim(),
              document: custDocument.trim() || undefined,
              addresses: [custAddress.trim()],
              notes: { [custAddress.trim()]: custNotes.trim() }
            }
          ];
        }
      });

      handleClearForm();
      setFormFeedback({ 
        type: 'success', 
        message: requireInvoice 
          ? '🎉 Pedido registrado en "Espera en Caja". El Cajero ya lo tiene en su cola de XML/CUFE para la DIAN.' 
          : '🎉 ¡Pedido creado en cocina en estado "En Preparación"!' 
      });
      setTimeout(() => setFormFeedback(null), 5000);
      refreshData();
    } catch (err: any) {
      setFormFeedback({ type: 'error', message: `Fallo en creación: ${err.message}` });
    }
  };

  // Add order to sequential route batch
  const handleToggleOrderToRouteBatch = (orderId: string) => {
    if (routeBatchIds.includes(orderId)) {
      setRouteBatchIds(routeBatchIds.filter(id => id !== orderId));
    } else {
      setRouteBatchIds([...routeBatchIds, orderId]);
    }
  };

  // Process / dispatch sequential multi-stop route
  const handleDispatchSequentialRoute = async () => {
    if (!selectedDriverId) {
      alert('⚠️ Por favor elija un domiciliario.');
      return;
    }
    if (routeBatchIds.length === 0) {
      alert('⚠️ Seleccione al menos un pedido listo para conformar la ruta.');
      return;
    }

    const driverObj = DELIVERY_DRIVERS.find(d => d.id === selectedDriverId);

    try {
      // Dispatch sequentially updating route priority stops in the database
      for (let index = 0; index < routeBatchIds.length; index++) {
        const orderId = routeBatchIds[index];
        await onTriggerAction("UPDATE_DOMICILIO_STATUS", {
          id: orderId,
          status: 'DESPACHADO', // Sets status to active road shipment
          repartidorId: selectedDriverId,
          routePriority: index + 1, // 1st stop, 2nd stop, 3rd stop priority
          routeProgress: 0,
          gpsCoordinates: { lat: 6.2085, lng: -75.5670 } // resets position to kitchen
        });
      }

      alert(`✅ RUTA SECUENCIAL CREADA!\nEl Repartidor ${driverObj?.name} ha sido despachado en camino con ${routeBatchIds.length} paradas secuenciadas.`);
      setRouteBatchIds([]);
      refreshData();
    } catch (err: any) {
      alert(`⚠️ Falló despacho de ruta: ${err.message}`);
    }
  };

  const handlePrintRequest = (order: Domicilio) => {
    setReceiptTargetOrder(order);
    setShowReceiptModal(true);
  };

  // KANBAN GROUPING
  const listosParaRuta = currentDeliveries.filter(d => d.status === 'LISTO' || (d.status === 'PREPARANDO' && !d.repartidorId));
  const enCaminoRuta = currentDeliveries.filter(d => d.status === 'DESPACHADO');
  const entregadosList = currentDeliveries.filter(d => d.status === 'ENTREGADO');
  const anuladosList = currentDeliveries.filter(d => d.status === 'ANULADO');

  // Sales totals metrics
  const totalSalesDelivered = entregadosList.reduce((acc, curr) => acc + curr.total, 0);
  const totalAnuladosLoss = anuladosList.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <div id="aurora-os-domicilios-dashboard" className="flex flex-col h-full bg-[#070913] text-slate-100 min-h-screen">
      
      {/* 1. TOP HEADER WITH MASTER MODULE SELECTOR */}
      <div className="bg-[#0A0D1B] border-b border-slate-800/80 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 z-10 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-400 font-black px-2 py-0.5 rounded border border-cyan-500/20 uppercase tracking-widest">
              Aurora
            </span>
            <span className="text-slate-500 text-xs font-mono font-medium">// Umbral Cero Workstation</span>
          </div>
          <h2 className="text-lg font-sans font-black tracking-tight text-slate-200 mt-1">
            Módulo de Despachos & Control de Domicilios
          </h2>
        </div>

        {/* MASTER SWITCH BUTTONS */}
        <div className="flex flex-col sm:flex-row w-full sm:w-auto bg-[#070913] border border-slate-800 p-1 rounded-2xl shrink-0 shadow-inner">
          <button
            onClick={() => setActiveTab('recepcion')}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex-1 sm:flex-none ${
              activeTab === 'recepcion'
                ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/15 border border-cyan-500/30 text-cyan-300 shadow-md shadow-cyan-500/5'
                : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>MÓDULO 1: RECEPCIONISTA</span>
          </button>
          
          <button
            onClick={() => setActiveTab('domiciliario')}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex-1 sm:flex-none ${
              activeTab === 'domiciliario'
                ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/15 border border-cyan-500/30 text-cyan-300 shadow-md shadow-cyan-500/5'
                : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            <Truck className="h-4 w-4" />
            <span>MÓDULO 2: LOGÍSTICA & RUTAS</span>
          </button>
        </div>
      </div>

      {/* 2. LOWER VIEWS CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* --- MODULE 1: RECEPCIONISTA EXPERIENCE --- */}
        {activeTab === 'recepcion' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* Sidebar navigation inside module */}
            <div className="w-full md:w-56 bg-[#080B16] border-b md:border-b-0 md:border-r border-slate-800/80 flex flex-row md:flex-col justify-between p-2 md:py-4 shrink-0 gap-2">
              <div className="flex flex-row md:flex-col gap-1 px-2 w-full md:w-auto">
                {[
                  { id: 'toma_pedidos', label: 'Toma de Pedidos', icon: Layers },
                  { id: 'radar_gps', label: 'Radar de Monitoreo', icon: Map },
                  { id: 'historial', label: 'Historial & Cuadres', icon: History }
                ].map(item => {
                  const Icon = item.icon;
                  const isSel = recepSubTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setRecepSubTab(item.id as any)}
                      className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-2.5 md:gap-3 px-3 py-3 rounded-xl font-mono text-xs text-left transition-all cursor-pointer ${
                        isSel 
                          ? 'bg-cyan-500/10 text-cyan-300 font-extrabold border-l-2 border-cyan-500' 
                          : 'text-slate-500 hover:bg-slate-900/40 hover:text-slate-300'
                      }`}
                      title={item.label}
                    >
                      <Icon className="h-4 w-4 text-cyan-400 shrink-0" />
                      <span className="hidden sm:inline">{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="px-4 text-[9px] font-mono text-slate-600 hidden md:block">
                AURORA<br />Sede Poblado
              </div>
            </div>

            {/* Sub tab main workspace panel */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* SUB TAB 1: TOMA DE PEDIDO FLASH */}
              {recepSubTab === 'toma_pedidos' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* LEFT COLUMN: Fast Lookup & Forms */}
                  <div className="lg:col-span-7 space-y-5">
                    
                    {/* Instant client lookups banner */}
                    <div className="bg-[#0D1425]/40 backdrop-blur-md border border-slate-800/80 rounded-3xl p-5 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Search className="h-4 w-4" /> Búsqueda de Cliente Autocompletable
                        </span>
                        <span className="text-[9px] bg-slate-900 text-slate-500 px-2 py-0.5 rounded border border-slate-800 font-mono">
                          Llamada entrante
                        </span>
                      </div>
                      
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Digite teléfono, NIT/Cédula o Nombre del cliente..."
                          value={phoneSearch}
                          onChange={(e) => setPhoneSearch(e.target.value)}
                          className="w-full bg-[#05070D] border border-slate-800 rounded-xl py-3 px-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono shadow-inner"
                        />
                      </div>

                      {matchedClient ? (
                        <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-2xl p-4 flex justify-between items-center animate-in zoom-in-95 duration-100">
                          <div className="space-y-0.5 font-mono text-xs">
                            <h5 className="font-extrabold text-cyan-300">{matchedClient.name}</h5>
                            <p className="text-[10px] text-slate-400 truncate max-w-sm">📍 {matchedClient.addresses[0]}</p>
                            <p className="text-[9px] text-slate-500">📞 {matchedClient.phone} {matchedClient.document ? `| NIT: ${matchedClient.document}` : ''}</p>
                          </div>
                          <button
                            onClick={() => handleApplyMatchedClient(matchedClient)}
                            className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-extrabold text-[10px] font-mono px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                          >
                            <span>Cargar</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : phoneSearch.length >= 3 && (
                        <p className="text-[10px] text-slate-600 italic font-mono">No se encontraron clientes en el directorio de frecuentes.</p>
                      )}
                    </div>

                    {/* KEYBOARD SHORTCUTS PANEL */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 bg-[#080B16] px-4 py-2.5 rounded-2xl border border-slate-800/60">
                      <span className="flex items-center gap-1.5 font-mono font-bold">
                        <Keyboard className="h-4 w-4 text-cyan-500" /> Atajos Táctiles Rápidos:
                      </span>
                      <div className="flex gap-3 font-mono text-[9px]">
                        <span><kbd className="bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 border border-slate-800 font-bold">F4</kbd> Limpiar</span>
                        <span><kbd className="bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 border border-slate-800 font-bold">F9</kbd> Guardar</span>
                      </div>
                    </div>

                    {/* FLASH ORDER ENTRY FORM */}
                    <form onSubmit={handleCreateDomicilio} className="bg-[#0D1425]/40 backdrop-blur-md border border-slate-800/80 rounded-3xl p-5 space-y-4">
                      <div className="border-b border-slate-800/60 pb-2">
                        <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest">
                          Datos de Despacho del Comensal
                        </h3>
                      </div>

                      {formFeedback && (
                        <div className={`p-3.5 rounded-xl text-xs font-mono font-medium border ${
                          formFeedback.type === 'success' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        }`}>
                          {formFeedback.message}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider">Teléfono Celular *</label>
                          <input
                            type="text"
                            required
                            value={custPhone}
                            onChange={(e) => setCustPhone(e.target.value)}
                            placeholder="Ej. 312 456 7890"
                            className="w-full bg-[#05070D] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono shadow-inner"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider">Nombre del Cliente *</label>
                          <input
                            type="text"
                            required
                            value={custName}
                            onChange={(e) => setCustName(e.target.value)}
                            placeholder="Ej. Sofia Gomez"
                            className="w-full bg-[#05070D] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono shadow-inner"
                          />
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider">NIT / Cédula (Factura DIAN)</label>
                          <input
                            type="text"
                            value={custDocument}
                            onChange={(e) => setCustDocument(e.target.value)}
                            placeholder="Obligatorio si requiere Factura Electrónica..."
                            className="w-full bg-[#05070D] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono shadow-inner"
                          />
                        </div>
                      </div>

                      {/* MULTIPLE ADDRESS CHIPS SECTION */}
                      {(() => {
                        const clientDirRecord = savedClients.find(c => c.phone.trim() === custPhone.trim());
                        if (clientDirRecord) {
                          return (
                            <div className="bg-[#05070D]/40 border border-slate-800/80 rounded-2xl p-4 space-y-2.5">
                              <div className="flex justify-between items-center text-[10px] text-cyan-400 font-bold font-mono">
                                <span>📋 DIRECCIONES DE DESPACHO REGISTRADAS</span>
                                <span className="text-slate-500">Historial (Límite 5)</span>
                              </div>
                              
                              <div className="flex flex-wrap gap-1.5">
                                {clientDirRecord.addresses.map((addr, idx) => {
                                  const isSelected = custAddress === addr;
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => {
                                        setCustAddress(addr);
                                        setCustNotes(clientDirRecord.notes[addr] || '');
                                      }}
                                      className={`text-[10px] px-3 py-1.5 rounded-xl border font-mono transition-all text-left ${
                                        isSelected
                                          ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-bold'
                                          : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-300'
                                      }`}
                                    >
                                      📍 {addr.length > 30 ? `${addr.substring(0, 30)}...` : addr}
                                    </button>
                                  );
                                })}

                                {/* Add floating button for inline register */}
                                <button
                                  type="button"
                                  onClick={() => setShowNewAddressInput(!showNewAddressInput)}
                                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 p-1.5 rounded-full transition-all cursor-pointer flex items-center justify-center"
                                  title="Registrar nueva dirección"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>

                              {showNewAddressInput && (
                                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2.5 animate-in slide-in-from-top-1 duration-150 mt-2">
                                  <input
                                    type="text"
                                    placeholder="Nueva dirección exacta de entrega..."
                                    value={newAddressText}
                                    onChange={(e) => setNewAddressText(e.target.value)}
                                    className="w-full bg-[#05070D] border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Indicaciones (piso, apto, portería)..."
                                    value={newAddressNotes}
                                    onChange={(e) => setNewAddressNotes(e.target.value)}
                                    className="w-full bg-[#05070D] border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setShowNewAddressInput(false)}
                                      className="text-[10px] text-slate-500 px-2 py-1"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleAddNewAddressInline}
                                      className="bg-cyan-500 text-slate-950 font-bold text-[10px] px-3 py-1 rounded-lg"
                                    >
                                      Guardar
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* NO ADDRESS RECEPTACLES */}
                      {!savedClients.find(c => c.phone.trim() === custPhone.trim()) && (
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider">Dirección Exacta de Entrega *</label>
                          <input
                            type="text"
                            required={!custAddress}
                            value={custAddress}
                            onChange={(e) => setCustAddress(e.target.value)}
                            placeholder="Calle, Carrera, Edificio, Apto, Barrio..."
                            className="w-full bg-[#05070D] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono shadow-inner"
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider">Notas de Cocina / Indicaciones de Entrega</label>
                        <textarea
                          rows={2}
                          value={custNotes}
                          onChange={(e) => setCustNotes(e.target.value)}
                          placeholder="Ej. Sin cebolla. Tocar timbre de reja negra..."
                          className="w-full bg-[#05070D] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 shadow-inner"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/40 pt-4">
                        
                        {/* payment method selector */}
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider block">Método de Pago Previsto</label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {([
                              { id: 'EFECTIVO', icon: Coins, label: 'Efectivo' },
                              { id: 'TARJETA', icon: CreditCard, label: 'Datáfono' },
                              { id: 'TRANSFERENCIA', icon: Wallet, label: 'Transf.' }
                            ] as const).map(p => {
                              const IsSel = paymentMethod === p.id;
                              const Icon = p.icon;
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => setPaymentMethod(p.id)}
                                  className={`py-3 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                                    IsSel
                                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-bold'
                                      : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-300'
                                  }`}
                                >
                                  <Icon className="h-4 w-4 shrink-0" />
                                  <span className="text-[9px] font-mono">{p.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* change calculator if cash */}
                        <div className="space-y-1">
                          {paymentMethod === 'EFECTIVO' ? (
                            <div className="animate-in fade-in slide-in-from-top-1 duration-100">
                              <label className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider">¿Paga Con? (Efectivo)</label>
                              <input
                                type="number"
                                value={paymentReceivedWith}
                                onChange={(e) => setPaymentReceivedWith(e.target.value)}
                                placeholder="Ej. 50000"
                                className="w-full bg-[#05070D] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono shadow-inner"
                              />
                            </div>
                          ) : (
                            <div className="text-[10px] font-mono text-slate-500 p-3 bg-slate-950/40 rounded-xl border border-slate-850/60 h-full flex items-center justify-center">
                              No requiere cálculo de vueltas en efectivo.
                            </div>
                          )}
                        </div>

                      </div>

                      {/* DIAN COMPLIANCE SWITCH */}
                      <div className="bg-[#0D1425]/40 border border-slate-850 p-4 rounded-2xl flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-xs font-mono font-bold text-slate-200 block">Requiere Factura Electrónica (DIAN)</span>
                          <span className="text-[9px] font-mono text-slate-500 block">Delega validación de fondo a la cola de caja</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={requireInvoice} 
                            onChange={(e) => {
                              setRequireInvoice(e.target.checked);
                              if (e.target.checked && !custDocument) {
                                alert("💡 Recuerde rellenar el campo 'NIT / Cédula' para emitir la factura electrónica.");
                              }
                            }}
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500 peer-checked:after:bg-slate-950"></div>
                        </label>
                      </div>

                      {/* SUBMIT BUTTON */}
                      <button
                        type="submit"
                        id="quick-submit-order-btn"
                        className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black py-3 rounded-2xl text-xs transition-all cursor-pointer shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2"
                      >
                        <FileCheck className="h-4 w-4" />
                        <span>CREAR Y ENVIAR PEDIDO [F9]</span>
                      </button>

                    </form>

                  </div>

                  {/* RIGHT COLUMN: Interactive Alphanumeric Menu & Shopping Bag */}
                  <div className="lg:col-span-5 space-y-5">
                    
                    {/* BAG CART SUMMARY */}
                    <div className="bg-[#0D1425]/40 backdrop-blur-md border border-slate-800/80 rounded-3xl p-5 space-y-4">
                      <div className="border-b border-slate-800/60 pb-2 flex justify-between items-center">
                        <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest">
                          Bolsa de Compras Activa
                        </h4>
                        <span className="text-[10px] font-mono text-slate-500">
                          {(Object.values(selectedItems) as number[]).reduce((a, b) => a + b, 0)} items
                        </span>
                      </div>

                      {Object.keys(selectedItems).length === 0 ? (
                        <p className="text-xs text-slate-500 font-mono text-center py-10 italic">La bolsa está vacía. Seleccione platos en el buscador inferior.</p>
                      ) : (
                        <div className="space-y-3">
                          {(Object.entries(selectedItems) as [string, number][]).map(([id, qty]) => {
                            const item = availableMenu.find(m => m.id === id);
                            if (!item) return null;
                            const code = getMenuItemCode(item.name);
                            return (
                              <div key={id} className="flex justify-between items-center bg-[#05070D]/40 border border-slate-850 p-2.5 rounded-xl font-mono text-xs">
                                <div className="space-y-0.5 truncate max-w-[150px]">
                                  <p className="font-bold text-slate-200 flex items-center gap-1.5 truncate">
                                    <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded border border-slate-700 font-black">{code}</span>
                                    <span>{item.name}</span>
                                  </p>
                                  <p className="text-[10px] text-slate-500">${item.price.toLocaleString('es-CO')} c/u</p>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                                    <button 
                                      type="button" 
                                      onClick={() => handleAddRemoveItem(id, 'remove')}
                                      className="px-2 py-1 text-slate-400 hover:text-white"
                                    >
                                      -
                                    </button>
                                    <span className="px-2 text-xs font-bold text-cyan-400">{qty}</span>
                                    <button 
                                      type="button" 
                                      onClick={() => handleAddRemoveItem(id, 'add')}
                                      className="px-2 py-1 text-slate-400 hover:text-white"
                                    >
                                      +
                                    </button>
                                  </div>
                                  <span className="text-slate-300 font-bold">${(item.price * qty).toLocaleString('es-CO')}</span>
                                </div>
                              </div>
                            );
                          })}

                          {/* FINANCIAL VALUES */}
                          <div className="border-t border-slate-800/60 pt-3 space-y-2 font-mono text-xs text-slate-400">
                            <div className="flex justify-between">
                              <span>Subtotal Platos:</span>
                              <span className="text-slate-200">
                                ${(Object.entries(selectedItems) as [string, number][]).reduce((acc, [id, q]) => {
                                  const item = availableMenu.find(m => m.id === id);
                                  return acc + ((item?.price || 0) * q);
                                }, 0).toLocaleString('es-CO')} COP
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Tarifa de Envío:</span>
                              <input
                                type="number"
                                value={deliveryCost}
                                onChange={(e) => setDeliveryCost(Number(e.target.value))}
                                className="w-20 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-right text-xs text-white focus:outline-none"
                              />
                            </div>
                            
                            {/* Change math readout */}
                            {paymentMethod === 'EFECTIVO' && paymentReceivedWith && (
                              <div className="flex justify-between text-emerald-400 border-t border-dashed border-slate-800/60 pt-2 animate-in fade-in duration-100">
                                <span className="font-bold flex items-center gap-1">💸 VUELTAS EN EFECTIVO:</span>
                                <span className="font-extrabold text-sm">
                                  {(() => {
                                    const sub = (Object.entries(selectedItems) as [string, number][]).reduce((acc, [id, q]) => {
                                      const item = availableMenu.find(m => m.id === id);
                                      return acc + ((item?.price || 0) * q);
                                    }, 0) + Number(deliveryCost);
                                    const change = Number(paymentReceivedWith) - sub;
                                    return change >= 0 ? `$${change.toLocaleString('es-CO')} COP` : 'Invalido (Paga menos)';
                                  })()}
                                </span>
                              </div>
                            )}

                            <div className="flex justify-between border-t border-slate-800/80 pt-2 font-black text-sm text-slate-100">
                              <span>TOTAL GENERAL:</span>
                              <span className="text-cyan-400">
                                ${(() => {
                                  const sub = (Object.entries(selectedItems) as [string, number][]).reduce((acc, [id, q]) => {
                                    const item = availableMenu.find(m => m.id === id);
                                    return acc + ((item?.price || 0) * q);
                                  }, 0);
                                  return (sub + Number(deliveryCost)).toLocaleString('es-CO');
                                })()} COP
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* HYBRID MENU SEARCH */}
                    <div className="bg-[#0D1425]/40 backdrop-blur-md border border-slate-800/80 rounded-3xl p-5 space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider block">Buscador Híbrido (Plato o Código)</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Buscar plato (ej. 101, Steak, Hamburguesa)..."
                            value={menuSearchQuery}
                            onChange={(e) => setMenuSearchQuery(e.target.value)}
                            className="w-full bg-[#05070D] border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono shadow-inner"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {filteredMenuItems.map(item => {
                          const code = getMenuItemCode(item.name);
                          const qty = selectedItems[item.id] || 0;
                          return (
                            <div 
                              key={item.id} 
                              onClick={() => handleAddRemoveItem(item.id, 'add')}
                              className="p-3 bg-[#05070D]/40 hover:bg-slate-900/60 border border-slate-850 hover:border-slate-800 rounded-2xl flex justify-between items-center cursor-pointer transition-all active:scale-95"
                            >
                              <div className="space-y-0.5 font-mono text-xs">
                                <p className="font-extrabold text-slate-300 flex items-center gap-1.5">
                                  <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded border border-slate-700 font-black">{code}</span>
                                  <span>{item.name}</span>
                                </p>
                                <p className="text-[10px] text-slate-500 truncate max-w-xs">{item.description}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-cyan-400 font-mono">${item.price.toLocaleString('es-CO')}</span>
                                {qty > 0 && (
                                  <span className="text-[10px] bg-cyan-500 text-slate-950 font-black h-5 w-5 rounded-full flex items-center justify-center animate-bounce">
                                    {qty}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* SUB TAB 2: INTERACTIVE RADAR & MAP */}
              {recepSubTab === 'radar_gps' && (
                <DeliveryMap 
                  domicilios={domicilios}
                  onTriggerAction={onTriggerAction}
                  refreshData={refreshData}
                />
              )}

              {/* SUB TAB 3: HISTORY & REPORTS */}
              {recepSubTab === 'historial' && (
                <div className="space-y-6">
                  
                  {/* METRIC SUMMARIES */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 font-mono text-xs">
                    
                    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between">
                      <span className="text-slate-500 uppercase font-bold tracking-wider">Ventas Entregadas Sede</span>
                      <p className="text-2xl font-black text-emerald-400 mt-2">${totalSalesDelivered.toLocaleString('es-CO')} COP</p>
                      <p className="text-[10px] text-slate-500 mt-1">Total de {entregadosList.length} despachos exitosos hoy</p>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between">
                      <span className="text-slate-500 uppercase font-bold tracking-wider">Pérdida en Domicilios Anulados</span>
                      <p className="text-2xl font-black text-rose-400 mt-2">${totalAnuladosLoss.toLocaleString('es-CO')} COP</p>
                      <p className="text-[10px] text-slate-500 mt-1">Total de {anuladosList.length} pedidos anulados permanentemente</p>
                    </div>

                    <div className="bg-[#0D1425]/40 backdrop-blur-md border border-slate-800 rounded-3xl p-5 flex flex-col justify-between col-span-1 md:col-span-2 lg:col-span-1">
                      <span className="text-slate-500 uppercase font-bold tracking-wider">Total de Despachos Procesados</span>
                      <p className="text-2xl font-black text-cyan-400 mt-2">{currentDeliveries.length} Órdenes</p>
                      <p className="text-[10px] text-slate-500 mt-1">Suma total de todas las llamadas e integraciones</p>
                    </div>

                  </div>

                  {/* COLA DIAN COMPLIANCE PANEL */}
                  <DianQueuePanel 
                    domicilios={domicilios}
                    onTriggerAction={onTriggerAction}
                    refreshData={refreshData}
                  />

                  {/* LIST TABLE OF HISTORY */}
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 space-y-4">
                    <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest">
                      Registro Histórico de Transacciones
                    </h4>

                    <div className="overflow-x-auto">
                      <table className="w-full font-mono text-[11px] text-slate-400 border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500 text-left uppercase text-[9px]">
                            <th className="pb-3">Ref ID</th>
                            <th className="pb-3">Cliente / Tel</th>
                            <th className="pb-3">Dirección de Entrega</th>
                            <th className="pb-3">Método Pago</th>
                            <th className="pb-3 text-right">Monto Total</th>
                            <th className="pb-3 text-center">Estado</th>
                            <th className="pb-3 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {currentDeliveries.map((dom) => {
                            const isAnulled = dom.status === 'ANULADO';
                            const isDelivered = dom.status === 'ENTREGADO';
                            return (
                              <tr key={dom.id} className="hover:bg-slate-950/20">
                                <td className="py-3.5 font-bold text-slate-300">#{dom.id.substring(4).toUpperCase()}</td>
                                <td className="py-3.5">
                                  <p className="text-slate-300 font-bold">{dom.customerName}</p>
                                  <p className="text-[9px] text-slate-500">{dom.customerPhone}</p>
                                </td>
                                <td className="py-3.5 truncate max-w-[180px]" title={dom.customerAddress}>📍 {dom.customerAddress}</td>
                                <td className="py-3.5">
                                  <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-850">
                                    {dom.notes?.includes('TARJETA') ? 'TARJETA' : dom.notes?.includes('TRANSFERENCIA') ? 'TRANSFERENCIA' : 'EFECTIVO'}
                                  </span>
                                </td>
                                <td className="py-3.5 text-right font-extrabold text-slate-200">${dom.total.toLocaleString('es-CO')}</td>
                                <td className="py-3.5 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                                    isDelivered 
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : isAnulled
                                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  }`}>
                                    {dom.status}
                                  </span>
                                </td>
                                <td className="py-3.5 text-center">
                                  <button
                                    onClick={() => handlePrintRequest(dom)}
                                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                                    title="Imprimir Copias Térmicas"
                                  >
                                    <Printer className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}

                          {currentDeliveries.length === 0 && (
                            <tr>
                              <td colSpan={7} className="text-center py-8 text-slate-500">No se registran transacciones de domicilios.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>
        )}

        {/* --- MODULE 2: DOMICILIARIO Y LOGÍSTICA --- */}
        {activeTab === 'domiciliario' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* Sidebar navigation inside module 2 */}
            <div className="w-full md:w-56 bg-[#080B16] border-b md:border-b-0 md:border-r border-slate-800/80 flex flex-row md:flex-col justify-between p-2 md:py-4 shrink-0 gap-2">
              <div className="flex flex-row md:flex-col gap-1 px-2 w-full md:w-auto">
                {[
                  { id: 'kanban', label: 'Tablero Kanban Despacho', icon: CheckSquare },
                  { id: 'phone_simulator', label: 'App del Repartidor', icon: Smartphone }
                ].map(item => {
                  const Icon = item.icon;
                  const isSel = logisticsSubTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setLogisticsSubTab(item.id as any)}
                      className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-2.5 md:gap-3 px-3 py-3 rounded-xl font-mono text-xs text-left transition-all cursor-pointer ${
                        isSel 
                          ? 'bg-cyan-500/10 text-cyan-300 font-extrabold border-l-2 border-cyan-500' 
                          : 'text-slate-500 hover:bg-slate-900/40 hover:text-slate-300'
                      }`}
                      title={item.label}
                    >
                      <Icon className="h-4 w-4 text-cyan-400 shrink-0" />
                      <span className="hidden sm:inline">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sub tab main workspace panel */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* SUB TAB 1: LOGISTICA TABLERO KANBAN */}
              {logisticsSubTab === 'kanban' && (
                <div className="space-y-6">
                  
                  {/* SEQUENTIAL ROUTE DESIGN PANEL */}
                  <div className="bg-[#0D1425]/40 backdrop-blur-md border border-slate-800/80 rounded-3xl p-5 space-y-4">
                    <div className="border-b border-slate-800/60 pb-2 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-cyan-400" />
                        <div>
                          <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-widest">
                            Creador de Rutas Secuencial (Multi-pedido)
                          </h4>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">Asigne múltiples paradas secuenciadas a un repartidor</p>
                        </div>
                      </div>
                      
                      {routeBatchIds.length > 0 && (
                        <span className="text-[10px] font-mono bg-cyan-500 text-slate-950 font-black px-2 py-0.5 rounded-full animate-pulse">
                          {routeBatchIds.length} paradas en cola
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      
                      {/* Driver selector */}
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-500 font-mono tracking-wider block">Asignar Repartidor</label>
                        <select
                          value={selectedDriverId}
                          onChange={(e) => setSelectedDriverId(e.target.value)}
                          className="w-full bg-[#05070D] border border-slate-850 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                        >
                          {DELIVERY_DRIVERS.map(drv => (
                            <option key={drv.id} value={drv.id}>
                              🛵 {drv.name} ({drv.vehicle.split(' (')[0]})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Priorities helper readouts */}
                      <div className="space-y-1 text-xs font-mono text-slate-400 bg-[#05070D]/40 border border-slate-850 rounded-xl p-2.5">
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Secuencia Planificada:</span>
                        {routeBatchIds.length === 0 ? (
                          <p className="text-[10px] italic text-slate-600 mt-1">Marque pedidos abajo para ordenar las paradas...</p>
                        ) : (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {routeBatchIds.map((id, index) => (
                              <span key={id} className="text-[9px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-2 py-0.5 rounded">
                                {index + 1}° Stop: #{id.substring(4, 8).toUpperCase()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleDispatchSequentialRoute}
                        disabled={routeBatchIds.length === 0}
                        className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-black text-xs py-3 rounded-2xl transition-all cursor-pointer shadow-lg shadow-cyan-500/10 h-11 flex items-center justify-center gap-1.5"
                      >
                        <Play className="h-4 w-4" /> Despachar Ruta [Iniciar Viaje]
                      </button>

                    </div>
                  </div>

                  {/* KANBAN BOARD 4 COLUMNS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start font-mono text-xs">
                    
                    {/* COLUMN 1: PENDIENTES / EN COCINA */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 space-y-4 flex flex-col h-[520px]">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <span className="font-extrabold text-slate-400">EN COCINA / DIAN</span>
                        <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[10px]">
                          {currentDeliveries.filter(d => d.status === 'PREPARANDO' || d.status === 'PENDIENTE').length}
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                        {currentDeliveries.filter(d => d.status === 'PREPARANDO' || d.status === 'PENDIENTE').map(dom => {
                          const isDianPending = dom.status === 'PENDIENTE';
                          return (
                            <div key={dom.id} className="bg-slate-950/60 border border-slate-850 p-3.5 rounded-2xl space-y-2">
                              <div className="flex justify-between font-bold">
                                <span className="text-slate-300">#{dom.id.substring(4).toUpperCase()}</span>
                                <span className="text-cyan-400">${dom.total.toLocaleString('es-CO')}</span>
                              </div>
                              <p className="text-[10px] text-slate-400 truncate">📍 {dom.customerAddress}</p>
                              <div className="flex justify-between items-center pt-1 border-t border-slate-850/40">
                                {isDianPending ? (
                                  <span className="text-[8px] bg-amber-500/15 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded animate-pulse">
                                    Espera DIAN
                                  </span>
                                ) : (
                                  <span className="text-[8px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                                    En Cocina
                                  </span>
                                )}
                                
                                <button
                                  onClick={async () => {
                                    try {
                                      await onTriggerAction("UPDATE_DOMICILIO_STATUS", { id: dom.id, status: 'LISTO' });
                                      refreshData();
                                    } catch (e) { console.error(e); }
                                  }}
                                  className="text-[9px] font-bold text-cyan-400 hover:underline cursor-pointer"
                                  disabled={isDianPending}
                                >
                                  Listo para despacho →
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* COLUMN 2: LISTOS PARA SALIR (QUEUE ROUTE SELECTION) */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 space-y-4 flex flex-col h-[520px]">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <span className="font-extrabold text-cyan-400">LISTOS PARA SALIR</span>
                        <span className="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full text-[10px]">
                          {listosParaRuta.length}
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                        {listosParaRuta.map(dom => {
                          const isInBatch = routeBatchIds.includes(dom.id);
                          const seqIndex = routeBatchIds.indexOf(dom.id);
                          return (
                            <div 
                              key={dom.id} 
                              onClick={() => handleToggleOrderToRouteBatch(dom.id)}
                              className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:border-cyan-500/40 ${
                                isInBatch 
                                  ? 'bg-cyan-500/10 border-cyan-500/50 shadow-md shadow-cyan-500/5' 
                                  : 'bg-slate-950/60 border-slate-850'
                              }`}
                            >
                              <div className="flex justify-between font-bold">
                                <span className="text-slate-300">#{dom.id.substring(4).toUpperCase()}</span>
                                {isInBatch && (
                                  <span className="text-[9px] bg-cyan-500 text-slate-950 px-1.5 py-0.5 rounded-md font-black">
                                    {seqIndex + 1}° Stop
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 truncate mt-1">📍 {dom.customerAddress}</p>
                              <p className="text-[9px] text-slate-500 mt-0.5">{dom.customerName}</p>
                              
                              <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-850/40 text-[9px] text-slate-400">
                                <span>💰 ${dom.total.toLocaleString('es-CO')}</span>
                                <span className="text-[8px] uppercase font-bold text-slate-500">Haz clic para agregar</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* COLUMN 3: ENRUTADOS / EN CAMINO */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 space-y-4 flex flex-col h-[520px]">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <span className="font-extrabold text-amber-400">EN CAMINO (RUTA)</span>
                        <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full text-[10px]">
                          {enCaminoRuta.length}
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                        {enCaminoRuta.map(dom => {
                          const driver = DELIVERY_DRIVERS.find(d => d.id === dom.repartidorId);
                          return (
                            <div key={dom.id} className="bg-slate-950/60 border border-slate-850 p-3.5 rounded-2xl space-y-2 relative">
                              <div className="flex justify-between font-bold">
                                <span className="text-slate-300">#{dom.id.substring(4).toUpperCase()}</span>
                                <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded">
                                  Parada {dom.routePriority}°
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 truncate">📍 {dom.customerAddress}</p>
                              
                              <div className="bg-[#05070D]/40 p-1.5 rounded border border-slate-900 text-[9px] text-slate-500">
                                <p className="truncate text-slate-400">Repartidor: <span className="text-cyan-400 font-bold">{driver?.name}</span></p>
                                <p className="mt-0.5">Progreso GPS: {dom.routeProgress || 0}%</p>
                              </div>

                              <div className="flex justify-between items-center pt-1 border-t border-slate-850/40 text-[9px]">
                                <button
                                  onClick={() => handlePrintRequest(dom)}
                                  className="text-slate-500 hover:text-white flex items-center gap-1 cursor-pointer"
                                >
                                  <Printer className="h-3 w-3" /> Imprimir
                                </button>
                                
                                <button
                                  onClick={async () => {
                                    try {
                                      await onTriggerAction("UPDATE_DOMICILIO_STATUS", { id: dom.id, status: 'ENTREGADO', routeProgress: 100 });
                                      refreshData();
                                    } catch (e) { console.error(e); }
                                  }}
                                  className="text-emerald-400 font-bold hover:underline cursor-pointer"
                                >
                                  Entregado ✓
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* COLUMN 4: ENTREGADOS HOY */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 space-y-4 flex flex-col h-[520px]">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <span className="font-extrabold text-emerald-400">ENTREGADOS HOY</span>
                        <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full text-[10px]">
                          {entregadosList.length}
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                        {entregadosList.map(dom => (
                          <div key={dom.id} className="bg-slate-950/20 border border-emerald-500/10 p-3 rounded-2xl space-y-1 text-slate-400">
                            <div className="flex justify-between font-bold text-slate-300">
                              <span>#{dom.id.substring(4).toUpperCase()}</span>
                              <span className="text-emerald-400">${dom.total.toLocaleString('es-CO')}</span>
                            </div>
                            <p className="text-[10px] truncate">📍 {dom.customerAddress}</p>
                            <p className="text-[9px] text-slate-500">Cobro: {dom.paymentConfirmedMethod || 'EFECTIVO'}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* SUB TAB 2: SIMULADOR DE SMARTPHONE MÓVIL */}
              {logisticsSubTab === 'phone_simulator' && (
                <DriverPhoneSimulator 
                  domicilios={domicilios}
                  onTriggerAction={onTriggerAction}
                  refreshData={refreshData}
                />
              )}

            </div>
          </div>
        )}

      </div>

      {/* 3. DOUBLE-COPY THERMAL RECEIPT VIEW MODAL */}
      <ReceiptModal 
        isOpen={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          setReceiptTargetOrder(null);
        }}
        order={receiptTargetOrder}
        menuItems={menuItems}
      />

    </div>
  );
}
