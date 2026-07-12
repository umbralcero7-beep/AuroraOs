import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  ShieldCheck, 
  RefreshCw, 
  Timer, 
  LogOut, 
  User as UserIcon, 
  Building, 
  Store, 
  Sparkles, 
  AlertCircle,
  Menu,
  Bell,
  Inbox,
  AlertTriangle,
  Check,
  X
} from 'lucide-react';

import Navigation from './components/Navigation';
import PosModule from './components/PosModule';
import ReportModule from './components/ReportModule';
import AccountingModule from './components/AccountingModule';
import InventoryModule from './components/InventoryModule';
import KitchenModule from './components/KitchenModule';
import WaiterModule from './components/WaiterModule';
import DeliveryModule from './components/DeliveryModule';
import HrModule from './components/HrModule';
import SecuritySupportModule from './components/SecuritySupportModule';
import AiAssistantModule from './components/AiAssistantModule';

import { 
  User, 
  Sede, 
  MenuItem, 
  Insumo, 
  Comanda, 
  Domicilio, 
  Gasto, 
  Invoice, 
  CierreCaja, 
  SecurityLog, 
  AccountingCushion, 
  WhitelistedUser, 
  HRColaborador, 
  WaiterBitacora 
} from './types';

export interface AppNotification {
  id: string;
  type: 'URGENT_ORDER' | 'LOW_STOCK' | 'SYSTEM_ALERT' | 'READY_TO_SERVE';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  meta?: any;
}

export default function App() {
  // DB States
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [domicilios, setDomicilios] = useState<Domicilio[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [cierres, setCierres] = useState<CierreCaja[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [cushion, setCushion] = useState<AccountingCushion | null>(null);
  const [whitelistedUsers, setWhitelistedUsers] = useState<WhitelistedUser[]>([]);
  const [hrColaboradores, setHrColaboradores] = useState<HRColaborador[]>([]);
  const [waiterBitacoras, setWaiterBitacoras] = useState<WaiterBitacora[]>([]);

  // Navigation states
  const [activeSedeId, setActiveSedeId] = useState<string>('s1');
  const [activeTab, setActiveTab] = useState<string>('pos');

  // Notifications Engine States
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [activeToasts, setActiveToasts] = useState<AppNotification[]>([]);

  // Periodically check for urgent/overdue orders and low stock
  useEffect(() => {
    if (!currentUser) return;

    const detectedNotifs: AppNotification[] = [];

    // 1. Detect critical low-stock insumos
    insumos.forEach(ins => {
      if (ins.sedeId === activeSedeId && ins.stock <= ins.minStock) {
        detectedNotifs.push({
          id: `low-stock-${ins.id}`,
          type: 'LOW_STOCK',
          title: '📉 Alerta de Inventario Crítico',
          message: `El insumo "${ins.name}" está bajo mínimos. Stock actual: ${ins.stock} ${ins.unit} (Mínimo requerido: ${ins.minStock} ${ins.unit})`,
          timestamp: new Date().toISOString(),
          read: false,
          meta: { insumoId: ins.id, supplierId: ins.supplierId }
        });
      }
    });

    // 2. Detect kitchen orders (Comandas) delayed or ready
    comandas.forEach(com => {
      if (com.sedeId === activeSedeId) {
        if (['PENDIENTE', 'COCINANDO'].includes(com.status)) {
          // Calculate elapsed minutes since comanda creation
          const elapsedMs = Date.now() - new Date(com.timestamp).getTime();
          const elapsedMin = elapsedMs / (1000 * 60);

          // If pending/cooking for more than 5 minutes (or 2 minutes for demo purposes to trigger quickly)
          if (elapsedMin > 2) {
            detectedNotifs.push({
              id: `urgent-comanda-${com.id}`,
              type: 'URGENT_ORDER',
              title: `🚨 Comanda Crítica: ${com.tableNumber}`,
              message: `La comanda de la ${com.tableNumber} lleva más de 2 minutos en preparación en cocina. ¡Requiere atención urgente!`,
              timestamp: com.timestamp,
              read: false,
              meta: { comandaId: com.id }
            });
          }
        } else if (com.status === 'LISTO') {
          detectedNotifs.push({
            id: `ready-comanda-${com.id}`,
            type: 'READY_TO_SERVE',
            title: `🔔 Mesa Lista: ${com.tableNumber}`,
            message: `¡El pedido de la ${com.tableNumber} está LISTO en cocina para ser llevado a la mesa!`,
            timestamp: com.timestamp,
            read: false,
            meta: { comandaId: com.id }
          });
        }
      }
    });

    // Merge purely
    setNotifications(prev => {
      const merged = [...prev];
      detectedNotifs.forEach(newNotif => {
        const existingIdx = merged.findIndex(n => n.id === newNotif.id);
        if (existingIdx === -1) {
          // It's a brand new notification! Add it to the front
          merged.unshift(newNotif);
        } else {
          // Update message if something changed, keeping read status
          if (merged[existingIdx].message !== newNotif.message) {
            merged[existingIdx] = {
              ...merged[existingIdx],
              message: newNotif.message,
              timestamp: newNotif.timestamp
            };
          }
        }
      });

      // Automatically prune resolved notifications (e.g. stock was replenished or order was delivered/closed)
      return merged.filter(existing => {
        if (existing.id.startsWith('low-stock-')) {
          const id = existing.id.replace('low-stock-', '');
          const ins = insumos.find(i => i.id === id);
          return ins ? ins.stock <= ins.minStock : false;
        }
        if (existing.id.startsWith('urgent-comanda-')) {
          const id = existing.id.replace('urgent-comanda-', '');
          const com = comandas.find(c => c.id === id);
          return com ? ['PENDIENTE', 'COCINANDO'].includes(com.status) : false;
        }
        if (existing.id.startsWith('ready-comanda-')) {
          const id = existing.id.replace('ready-comanda-', '');
          const com = comandas.find(c => c.id === id);
          return com ? com.status === 'LISTO' : false;
        }
        return true;
      });
    });

  }, [insumos, comandas, activeSedeId, currentUser]);

  // Synchronize toast alerts with notifications list securely to prevent duplicate keys in Strict Mode
  const prevNotifsRef = React.useRef<AppNotification[]>([]);

  useEffect(() => {
    // Find notifications in the current list that were NOT in the previous list
    const prevIds = new Set(prevNotifsRef.current.map(n => n.id));
    const brandNew = notifications.filter(n => !prevIds.has(n.id));
    
    // Also remove toasts whose notifications are no longer present
    const currentNotifIds = new Set(notifications.map(n => n.id));
    setActiveToasts(t => {
      const remainingToasts = t.filter(x => currentNotifIds.has(x.id));
      
      if (brandNew.length > 0) {
        const existingToastIds = new Set(remainingToasts.map(x => x.id));
        const filteredBrandNew = brandNew.filter(n => !existingToastIds.has(n.id));
        if (filteredBrandNew.length === 0) return remainingToasts;
        
        filteredBrandNew.forEach(newNotif => {
          setTimeout(() => {
            setActiveToasts(curr => curr.filter(x => x.id !== newNotif.id));
          }, 6000);
        });
        
        return [...filteredBrandNew, ...remainingToasts];
      }
      
      return remainingToasts;
    });
    
    prevNotifsRef.current = notifications;
  }, [notifications]);

  // Login States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tempKey, setTempKey] = useState('');
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Connection & status
  const [isConnected, setIsConnected] = useState(true);
  const [loadingState, setLoadingState] = useState(true);
  const [sessionTime, setSessionTime] = useState(0);

  // Connection WebSocket State & Sync Effect
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    let ws: WebSocket;
    let pingInterval: NodeJS.Timeout;
    let reconnectTimeout: NodeJS.Timeout;

    function connect() {
      console.log("Iniciando conexión WebSocket:", wsUrl);
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("Canal en tiempo real WebSocket establecido.");
        setIsConnected(true);
        // Register current user session
        ws.send(JSON.stringify({
          type: "REGISTER",
          userId: currentUser.id,
          role: currentUser.role,
          sedeId: activeSedeId
        }));
        
        // Setup heartbeat ping
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "PING" }));
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.type === "REGISTER_CONFIRMED") {
            console.log("Registro de sesión WebSocket exitoso.");
          } else if (msg.type === "NEW_COMANDA") {
            // New order received! Sync database
            fetchState();
            // Append a toast notification
            const newNotif: AppNotification = {
              id: `ws-new-${Date.now()}`,
              type: 'URGENT_ORDER',
              title: `🍽️ Nueva Comanda: ${msg.comanda.tableNumber}`,
              message: `Recibida comanda para ${msg.comanda.tableNumber} con ${msg.comanda.items.length} productos.`,
              timestamp: new Date().toISOString(),
              read: false,
              meta: { comandaId: msg.comanda.id }
            };
            setNotifications(prev => [newNotif, ...prev]);
          } else if (msg.type === "COMANDA_STATUS_UPDATED") {
            fetchState();
          } else if (msg.type === "ORDER_READY") {
            fetchState();
            // Alert!
            const newNotif: AppNotification = {
              id: `ws-ready-${Date.now()}`,
              type: 'READY_TO_SERVE',
              title: `🔔 ¡Pedido Listo! ${msg.tableNumber}`,
              message: `¡El pedido de la ${msg.tableNumber} está LISTO en cocina para retirar!`,
              timestamp: new Date().toISOString(),
              read: false,
              meta: { comandaId: msg.id }
            };
            setNotifications(prev => [newNotif, ...prev]);
            
            // Audio synthesizer alert!
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const oscillator = audioCtx.createOscillator();
              const gainNode = audioCtx.createGain();
              oscillator.connect(gainNode);
              gainNode.connect(audioCtx.destination);
              oscillator.type = "sine";
              oscillator.frequency.value = 880; // A5 pitch
              gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
              oscillator.start();
              oscillator.stop(audioCtx.currentTime + 0.3);
            } catch (e) {
              console.warn("Audio warning skipped:", e);
            }
          }
        } catch (e) {
          console.error("Error al procesar mensaje de WebSocket:", e);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket desconectado, intentando reconectar en 3 segundos...");
        setIsConnected(false);
        clearInterval(pingInterval);
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error("Error en WebSocket:", err);
        ws.close();
      };
      
      setSocket(ws);
    }

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
      clearInterval(pingInterval);
      clearTimeout(reconnectTimeout);
    };
  }, [currentUser, activeSedeId]);

  // Fetch full state from server
  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error("Could not connect to database");
      const data = await res.json();
      
      setSedes(data.sedes);
      setMenuItems(data.menuItems);
      setInsumos(data.insumos);
      setComandas(data.comandas);
      setDomicilios(data.domicilios);
      setGastos(data.gastos);
      setInvoices(data.invoices);
      setCierres(data.cierreCajas || []);
      setSecurityLogs(data.securityLogs);
      setCushion(data.cushion);
      setWhitelistedUsers(data.whitelistedUsers);
      setHrColaboradores(data.hrColaboradores);
      setWaiterBitacoras(data.waiterBitacoras);

      setIsConnected(true);
    } catch (err) {
      console.error(err);
      setIsConnected(false);
    } finally {
      setLoadingState(false);
    }
  };

  // Run initial state loading
  useEffect(() => {
    fetchState();
    
    // Increment session timer every second
    const timer = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format session timer
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Generic backend state-mutator action proxy
  const triggerAction = async (action: string, payload: any) => {
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Action failed");
      }

      const responseData = await res.json();
      await fetchState(); // Auto-refresh all data
      return responseData;
    } catch (err: any) {
      alert(`⚠️ Aurora Shield: ${err.message}`);
      throw err;
    }
  };

  // Handle Login authentication
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'LOGIN',
          payload: { email, password }
        })
      });

      if (!res.ok) {
        // Log the failed login to security logs on backend
        await triggerAction("RECORD_FAILED_LOGIN", { email, ip: '190.142.10.85', details: 'Contraseña errónea' });
        setLoginError('❌ Credenciales inválidas. Intente nuevamente.');
        return;
      }

      const authData = await res.json();

      // If user has 2FA enabled, trigger OTP input
      if (authData.user.twoFactorEnabled && !showTwoFactor) {
        setShowTwoFactor(true);
        return;
      }

      // Successful Auth
      setCurrentUser(authData.user);
      setActiveSedeId(authData.user.sedeId);
      setEmail('');
      setPassword('');
      setLoginError('');
      setShowTwoFactor(false);
    } catch (err) {
      setLoginError('❌ Error de conexión de base de datos.');
    }
  };

  // Handle 2FA verification code
  const handleVerify2FA = () => {
    if (twoFactorToken === '123456') {
      // Fake validation for demo ease
      // Log successful login
      alert("✓ Código OTP verificado correctamente. Canal cifrado establecido.");
      // Auto login admin
      const adminUser: User = {
        id: 'u1',
        name: 'Carlos Mendoza',
        email: 'admin@aurora.com',
        role: 'ADMIN',
        sedeId: 's1',
        active: true,
        twoFactorEnabled: true
      };
      setCurrentUser(adminUser);
      setShowTwoFactor(false);
      setTwoFactorToken('');
    } else {
      setLoginError('❌ Código OTP incorrecto o expirado.');
    }
  };

  // Handle whitelisting signup / registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const response = await triggerAction("REGISTER_USER", { email, password, tempKey });
      alert(`🎉 ¡Registro Exitoso! Usuario ${email} activado bajo canal seguro. Inicie sesión ahora.`);
      setIsRegistering(false);
      setTempKey('');
    } catch (err: any) {
      setLoginError(`❌ Registro fallido: ${err.message}`);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('pos');
  };

  if (loadingState) {
    return (
      <div className="h-screen w-screen bg-[#09090b] flex flex-col items-center justify-center text-zinc-100 font-sans">
        <RefreshCw className="h-10 w-10 text-blue-500 animate-spin mb-4" />
        <p className="text-sm font-mono tracking-wider text-zinc-400">ESTABLECIENDO CANALES CIFRADOS AURORA OS...</p>
      </div>
    );
  }

  // LOGIN SCREEN
  if (!currentUser) {
    return (
      <div className="h-screen w-screen bg-[#09090b] flex items-center justify-center font-sans p-4 relative overflow-hidden">
        {/* Abstract background vector line decoration */}
        <div className="absolute top-0 right-0 h-96 w-96 bg-blue-500/5 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 left-0 h-96 w-96 bg-red-500/5 rounded-full filter blur-3xl"></div>

        <div className="w-full max-w-md bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-2xl p-8 space-y-6 shadow-2xl relative z-10 ring-1 ring-zinc-800">
          
          <div className="text-center space-y-2">
            <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-md uppercase tracking-wider font-bold">
              AURORA OS RESTAURANT v4.5
            </span>
            <h1 className="text-xl font-bold font-sans text-white mt-3 tracking-tight">CONTROL DE ACCESO SEGURO</h1>
            <p className="text-xs text-zinc-400 font-mono">Bases de Datos de Múltiples Sucursales Blindadas</p>
          </div>

          {loginError && (
            <div className="bg-red-500/10 border border-red-500/20 p-3.5 rounded-xl text-xs text-red-400 font-mono flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5" />
              <span>{loginError}</span>
            </div>
          )}

          {!showTwoFactor ? (
            <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4 text-xs text-zinc-300">
              <div className="space-y-1.5">
                <label className="text-zinc-400 font-medium">Correo Electrónico Corporativo:</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@aurora.com"
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-400 font-medium">Contraseña de Enlace:</label>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                />
              </div>

              {isRegistering && (
                <div className="space-y-1.5 animate-pulse">
                  <label className="text-zinc-400 font-medium">Clave Temporal de Whitelist (Lista Blanca):</label>
                  <input 
                    type="text" 
                    required
                    value={tempKey}
                    onChange={(e) => setTempKey(e.target.value)}
                    placeholder="KEY-123456"
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl py-3 px-4 text-amber-500 focus:outline-none focus:border-blue-500 font-mono uppercase text-xs"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-xs font-mono transition-colors shadow-lg shadow-blue-900/20 cursor-pointer mt-2 tracking-wider"
              >
                {isRegistering ? 'CREAR PERFIL EN LISTA BLANCA' : 'INICIAR ENLACE EN LA NUBE'}
              </button>

              <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setLoginError('');
                  }}
                  className="hover:text-blue-400 cursor-pointer text-left"
                >
                  {isRegistering ? '← Regresar al Inicio' : '¿Nuevo colaborador? Registrate'}
                </button>
                <span>Soporte ID: 99x8</span>
              </div>
            </form>
          ) : (
            // 2FA SCREEN
            <div className="space-y-5 text-xs text-zinc-300">
              <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl text-amber-400 font-mono leading-normal">
                🔑 <strong>Verificación Doble Factor (2FA):</strong> El administrador tiene habilitado OTP. Ingrese el token del authenticator.
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-400 font-medium">Código de 6 dígitos OTP:</label>
                <input 
                  type="text" 
                  maxLength={6}
                  value={twoFactorToken}
                  onChange={(e) => setTwoFactorToken(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl py-3 px-4 text-white text-center focus:outline-none focus:border-blue-500 font-mono tracking-widest text-lg"
                />
              </div>

              <button
                onClick={handleVerify2FA}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs font-mono transition-all cursor-pointer tracking-wider"
              >
                AUTORIZAR INGRESO SEGURIDAD
              </button>

              <button
                onClick={() => setShowTwoFactor(false)}
                className="w-full bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 py-2 rounded-xl text-[10px] font-mono cursor-pointer text-zinc-400"
              >
                Volver
              </button>
            </div>
          )}

          <div className="border-t border-zinc-800/80 pt-4 flex justify-between items-center text-[9px] font-mono text-zinc-600">
            <span>Pista demo: admin@aurora.com / admin</span>
            <span>OTP: 123456</span>
          </div>

        </div>
      </div>
    );
  }


  // ACTIVE MAIN APPLICATION LAYOUT
  return (
    <div className="h-screen w-screen bg-[#09090b] flex overflow-hidden font-sans select-none text-[#fafafa]">
      
      {/* Sidebar Navigation */}
      <Navigation 
        currentUser={currentUser}
        selectedSedeId={activeSedeId}
        setSelectedSedeId={setActiveSedeId}
        currentTab={activeTab}
        setCurrentTab={setActiveTab}
        sedes={sedes}
        securityCount={securityLogs.length}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Main top header */}
        <header className="h-14 bg-zinc-900/20 border-b border-zinc-800 px-4 md:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white lg:hidden cursor-pointer flex items-center justify-center mr-1"
              title="Abrir menú"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
              <Store className="h-4 w-4 text-blue-500" />
              <span className="hidden sm:inline">Sucursal Activa:</span>
              <span className="text-zinc-200 font-bold">{sedes.find(s => s.id === activeSedeId)?.name || 'N/A'}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Session Timer */}
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-md">
              <Timer className="h-3.5 w-3.5 text-blue-500" />
              <span>Conexión: {formatTime(sessionTime)}</span>
            </div>

            {/* Aurora Shield Guard status */}
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>SEC_GUARD_ON</span>
            </div>

            {/* 🔔 Notification Bell System */}
            <div className="relative">
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-805 hover:border-zinc-750 text-zinc-300 hover:text-[#06B6D4] rounded-lg transition-colors cursor-pointer flex items-center justify-center relative"
                title="Notificaciones push de Aurora OS"
              >
                <Bell className="h-4 w-4" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-black h-4 w-4 rounded-full flex items-center justify-center border-2 border-[#09090b] animate-bounce">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {/* In-App Notification Center Drawer */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2.5 w-80 md:w-96 bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl p-4.5 z-50 flex flex-col gap-3 font-sans text-xs">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-1.5">
                      <Bell className="h-4 w-4 text-[#06B6D4]" />
                      <span className="font-bold text-zinc-100 uppercase tracking-wider text-[11px]">Centro de Notificaciones</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {notifications.length > 0 && (
                        <button 
                          onClick={() => {
                            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                          }}
                          className="text-[9px] font-bold text-[#06B6D4] hover:underline px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          Marcar leídas
                        </button>
                      )}
                      <button 
                        onClick={() => setIsNotifOpen(false)}
                        className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded-full cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Simulator Box */}
                  <div className="bg-[#1E293B]/20 border border-zinc-800 rounded-2xl p-2.5 space-y-2">
                    <div className="text-[9px] uppercase font-mono text-slate-400 font-extrabold tracking-wider">
                      🛠️ Simulador de Notificaciones Críticas:
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => {
                          const mockNotif: AppNotification = {
                            id: `mock-urgent-${Date.now()}`,
                            type: 'URGENT_ORDER',
                            title: '🚨 Comanda Demorada (Simulada)',
                            message: `La comanda de la Mesa 8 lleva más de 12 minutos en cocina. Requiere despacho urgente.`,
                            timestamp: new Date().toISOString(),
                            read: false
                          };
                          setNotifications(prev => [mockNotif, ...prev]);
                          setActiveToasts(t => [mockNotif, ...t]);
                          setTimeout(() => {
                            setActiveToasts(t => t.filter(x => x.id !== mockNotif.id));
                          }, 6000);
                        }}
                        className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold py-1.5 px-2 rounded-xl text-[10px] cursor-pointer text-center"
                      >
                        🚨 Simular Pedido
                      </button>
                      <button 
                        onClick={() => {
                          const mockNotif: AppNotification = {
                            id: `mock-stock-${Date.now()}`,
                            type: 'LOW_STOCK',
                            title: '📉 Stock Mínimo (Simulado)',
                            message: `Insumo "Papi-papas" por debajo del mínimo crítico (3 kg restantes).`,
                            timestamp: new Date().toISOString(),
                            read: false
                          };
                          setNotifications(prev => [mockNotif, ...prev]);
                          setActiveToasts(t => [mockNotif, ...t]);
                          setTimeout(() => {
                            setActiveToasts(t => t.filter(x => x.id !== mockNotif.id));
                          }, 6000);
                        }}
                        className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 font-bold py-1.5 px-2 rounded-xl text-[10px] cursor-pointer text-center"
                      >
                        📉 Simular Stock
                      </button>
                    </div>
                  </div>

                  {/* List of notifications */}
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500 font-mono text-[10px] gap-2">
                        <Inbox className="h-6 w-6 stroke-[1.5] text-zinc-600" />
                        <span>No hay notificaciones activas. Todo bajo control.</span>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id}
                          onClick={() => {
                            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
                          }}
                          className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex gap-2.5 items-start ${
                            n.read 
                              ? 'bg-zinc-950/20 border-zinc-900 text-zinc-400 opacity-60' 
                              : n.type === 'URGENT_ORDER'
                              ? 'bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10 text-rose-200'
                              : n.type === 'LOW_STOCK'
                              ? 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10 text-amber-200'
                              : 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-200'
                          }`}
                        >
                          <span className="text-sm shrink-0 font-sans">
                            {n.type === 'URGENT_ORDER' ? '🚨' : n.type === 'LOW_STOCK' ? '📉' : '🔔'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-extrabold text-[10px] truncate uppercase tracking-tight">
                                {n.title}
                              </span>
                              {!n.read && (
                                <span className="h-1.5 w-1.5 rounded-full bg-[#06B6D4] shrink-0"></span>
                              )}
                            </div>
                            <p className="text-[10px] leading-relaxed mt-0.5 font-medium break-words">
                              {n.message}
                            </p>
                            <span className="text-[8px] font-mono opacity-50 block mt-1">
                              {new Date(n.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile and Logout dropdown */}
            <div className="flex items-center gap-3 border-l border-zinc-800 pl-4">
              <div className="text-right leading-none">
                <div className="text-[11px] font-bold text-zinc-200">{currentUser.name}</div>
                <span className="text-[9px] font-mono text-blue-400 block mt-0.5">{currentUser.role}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                title="Cerrar sesión de Aurora OS"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Modules Content Routing Router */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'pos' && (
            <PosModule 
              sedeId={activeSedeId}
              menuItems={menuItems}
              currentUser={currentUser}
              onTriggerAction={triggerAction}
              invoices={invoices}
              cierreCajas={cierres}
              comandas={comandas}
              refreshData={fetchState}
            />
          )}

          {activeTab === 'reportes' && (
            <ReportModule 
              sedeId={activeSedeId}
              invoices={invoices}
              gastos={gastos}
              cierres={cierres}
              menuItems={menuItems}
              refreshData={fetchState}
            />
          )}

          {activeTab === 'contabilidad' && (
            <AccountingModule 
              sedeId={activeSedeId}
              gastos={gastos}
              invoices={invoices}
              cushion={cushion || { id: 'c1', retainedEarnings: 23500000, cushionTarget: 80000000, cushionHistory: [] }}
              onTriggerAction={triggerAction}
              refreshData={fetchState}
            />
          )}

          {activeTab === 'inventario' && (
            <InventoryModule 
              sedeId={activeSedeId}
              insumos={insumos}
              menuItems={menuItems}
              suppliers={[
                { id: 'sup1', name: 'Distribuidora Carnes del Valle', phone: '+57 4 311 0000', email: 'ventas@vallecarnes.com', category: 'Carnes' },
                { id: 'sup2', name: 'Lácteos Antofagasta S.A.', phone: '+57 4 312 0000', email: 'lacteos@antofagasta.co', category: 'Lácteos' },
                { id: 'sup3', name: 'Frubana Colombia SAS', phone: '+57 1 450 0000', email: 'soporte@frubana.com', category: 'Verduras' }
              ]}
              onTriggerAction={triggerAction}
              refreshData={fetchState}
            />
          )}

          {activeTab === 'comandas_waiter' && (
            <WaiterModule 
              sedeId={activeSedeId}
              comandas={comandas}
              menuItems={menuItems}
              currentUser={currentUser}
              onTriggerAction={triggerAction}
              refreshData={fetchState}
            />
          )}

          {activeTab === 'cocina_kds' && (
            <KitchenModule 
              sedeId={activeSedeId}
              comandas={comandas}
              menuItems={menuItems}
              currentUser={currentUser}
              onTriggerAction={triggerAction}
              refreshData={fetchState}
            />
          )}

          {activeTab === 'domicilios' && (
            <DeliveryModule 
              sedeId={activeSedeId}
              domicilios={domicilios}
              menuItems={menuItems}
              currentUser={currentUser}
              onTriggerAction={triggerAction}
              refreshData={fetchState}
            />
          )}

          {activeTab === 'rrhh' && (
            <HrModule 
              sedeId={activeSedeId}
              hrColaboradores={hrColaboradores}
              waiterBitacoras={waiterBitacoras}
              currentUser={currentUser}
              onTriggerAction={triggerAction}
              refreshData={fetchState}
            />
          )}

          {activeTab === 'seguridad' && (
            <SecuritySupportModule 
              sedes={sedes}
              whitelistedUsers={whitelistedUsers}
              securityLogs={securityLogs}
              onTriggerAction={triggerAction}
              refreshData={fetchState}
            />
          )}

          {activeTab === 'asistente' && (
            <AiAssistantModule 
              sedeId={activeSedeId}
              currentUser={currentUser}
              insumos={insumos}
              invoices={invoices}
              securityLogs={securityLogs}
              onTriggerAction={triggerAction}
            />
          )}
        </div>

        {/* 🚀 Dynamic Floating In-App Push Toasts Container */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm pointer-events-none select-none">
          {activeToasts.map((toast) => (
            <div 
              key={toast.id}
              className={`pointer-events-auto p-4 rounded-2xl border text-white shadow-2xl flex flex-col gap-1.5 animate-slide-in duration-300 ${
                toast.type === 'URGENT_ORDER' 
                  ? 'bg-rose-950/90 border-rose-800/80 text-rose-100 shadow-rose-950/20 font-sans' 
                  : toast.type === 'LOW_STOCK'
                  ? 'bg-amber-950/90 border-amber-800/80 text-amber-100 shadow-amber-950/20 font-sans'
                  : 'bg-emerald-950/90 border-emerald-800/80 text-emerald-100 shadow-emerald-950/20 font-sans'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 font-sans text-left">
                  {toast.type === 'URGENT_ORDER' ? '🚨 PEDIDO URGENTE' : toast.type === 'LOW_STOCK' ? '📉 STOCK BAJO' : '🔔 PEDIDO LISTO'}
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveToasts(t => t.filter(x => x.id !== toast.id));
                  }}
                  className="text-white/40 hover:text-white hover:bg-white/10 rounded-lg p-0.5 transition-all cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="text-[11px] font-medium leading-relaxed font-sans pr-2 text-left">
                {toast.message}
              </div>
              <span className="text-[9px] font-mono opacity-60 self-end">
                {new Date(toast.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}
