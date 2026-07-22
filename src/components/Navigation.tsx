import React from 'react';
import { 
  ShieldAlert, 
  Store, 
  ShoppingCart, 
  ChefHat, 
  Truck, 
  Package2, 
  DollarSign, 
  Users2, 
  BrainCircuit, 
  Lock, 
  Network,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  X,
  Coffee,
  Download,
  Cloud
} from 'lucide-react';

interface NavigationProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  selectedSedeId: string;
  setSelectedSedeId: (id: string) => void;
  sedes: any[];
  currentUser: any;
  securityCount: number;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  isStandalone?: boolean;
  onInstall?: () => void;
  organizations?: any[];
  activeOrgId?: string;
  setActiveOrgId?: (id: string) => void;
}

export default function Navigation({
  currentTab,
  setCurrentTab,
  selectedSedeId,
  setSelectedSedeId,
  sedes,
  currentUser,
  securityCount,
  isMobileOpen,
  onMobileClose,
  isStandalone = false,
  onInstall,
  organizations = [],
  activeOrgId = 'org-aurora',
  setActiveOrgId
}: NavigationProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const activeOrg = organizations.find(o => o.id === activeOrgId) || { name: 'Restaurante Aurora Gourmet', plan: 'PRO' };

  const handleToggle = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const tabs = [
    { id: 'pos', name: 'POS & Caja', icon: ShoppingCart, roles: ['super_admin', 'admin', 'cashier'] },
    { id: 'reportes', name: 'Reportes & Auditoría', icon: BarChart3, roles: ['super_admin', 'admin'] },
    { id: 'comandas_waiter', name: 'Módulo de Comandas', icon: Coffee, roles: ['super_admin', 'admin', 'waiter'] },
    { id: 'cocina_kds', name: 'Módulo de Cocina (KDS)', icon: ChefHat, roles: ['super_admin', 'admin', 'kitchen'] },
    { id: 'domicilios', name: 'Domicilios & Repartidor', icon: Truck, roles: ['super_admin', 'admin', 'cashier', 'waiter'] },
    { id: 'inventario', name: 'Inventario ERP', icon: Package2, roles: ['super_admin', 'admin'] },
    { id: 'contabilidad', name: 'Contabilidad & Colchón', icon: DollarSign, roles: ['super_admin', 'admin'] },
    { id: 'rrhh', name: 'Personal & Bitácora', icon: Users2, roles: ['super_admin', 'admin'] },
    { id: 'asistente', name: 'Asistente IA (Cero)', icon: BrainCircuit, roles: ['super_admin', 'admin'] },
    { id: 'workspace', name: 'Integración Google', icon: Cloud, roles: ['super_admin', 'admin'] },
    { id: 'seguridad', name: 'Soporte & Ciberseguridad', icon: Lock, roles: ['super_admin'] }
  ];

  // Filter tabs by role and explicit allowedModules
  const allowedTabs = tabs.filter(t => 
    currentUser.role === 'super_admin' || 
    t.roles.includes(currentUser.role) ||
    (currentUser.allowedModules && currentUser.allowedModules.includes(t.id))
  );

  const activeSede = sedes.find(s => s.id === selectedSedeId) || sedes[0];

  const handleTabClick = (tabId: string) => {
    setCurrentTab(tabId);
    if (onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <>
      {/* Mobile drawer backdrop overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden" 
          onClick={onMobileClose}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 lg:relative lg:translate-x-0
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} w-[280px]
        bg-[#030712] border-r border-zinc-850 flex flex-col shrink-0 font-sans transition-all duration-300 ease-in-out
      `}>
        {/* Brand Header */}
        <div className={`p-4 border-b border-zinc-800 bg-zinc-900/10 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0 shadow-lg shadow-blue-950/40 border border-zinc-800">
                <img 
                  src="/icon_pwa.svg" 
                  alt="Aurora Logo" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const fallback = document.createElement('div');
                      fallback.className = 'w-full h-full bg-blue-600 flex items-center justify-center font-bold text-white text-sm';
                      fallback.innerText = 'A';
                      parent.appendChild(fallback);
                    }
                  }}
                />
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="flex flex-col min-w-0">
                  <h1 className="text-[11px] font-bold tracking-tight text-white truncate max-w-[140px] animate-fade-in uppercase" title={activeOrg.name}>
                    {activeOrg.name}
                  </h1>
                  <span className="text-[8px] font-mono font-bold text-zinc-500 mt-0.5">
                    PLAN <span className="text-blue-400">{activeOrg.plan}</span>
                  </span>
                </div>
              )}
            </div>
            
            <button 
              onClick={handleToggle}
              className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors hidden lg:block"
              title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>

            {/* Close button inside mobile drawer */}
            {isMobileOpen && (
              <button 
                onClick={onMobileClose}
                className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors lg:hidden"
                title="Cerrar menú"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Multi-branch selector */}
          {(!isCollapsed || isMobileOpen) ? (
            <div className="mt-4">
              <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">
                Sede / Sucursal
              </label>
              <div className="relative">
                <Store className="absolute left-2.5 top-2 h-3.5 w-3.5 text-blue-500" />
                <select
                  value={selectedSedeId}
                  onChange={(e) => setSelectedSedeId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md py-1.5 pl-8 pr-2 text-xs text-zinc-300 focus:outline-none focus:border-blue-500 font-sans cursor-pointer transition-colors"
                >
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id} className="bg-zinc-950">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              {activeSede && (
                <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono px-0.5">
                  <span className="text-zinc-500">Licencia:</span>
                  <span className={`font-semibold ${activeSede.licenseStatus === 'ACTIVE' ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {activeSede.licenseStatus === 'ACTIVE' ? '● ACTIVA' : '⚠️ PENDIENTE'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center" title={`Sede: ${activeSede?.name || 'N/A'}`}>
              <Store className="h-4 w-4 text-blue-500 hover:scale-110 transition-transform cursor-pointer" />
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {(!isCollapsed || isMobileOpen) && (
            <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest block px-2.5 mb-2">
              Módulos
            </span>
          )}
          {allowedTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`w-full flex items-center rounded-md text-xs transition-all duration-200 relative ${
                  (isCollapsed && !isMobileOpen) ? 'justify-center p-2.5' : 'gap-3 px-2.5 py-2'
                } ${
                  isActive
                    ? 'bg-[#18181b] text-blue-500 border-l-2 border-blue-500 font-medium'
                    : 'text-zinc-400 hover:bg-[#18181b] hover:text-blue-500'
                }`}
                title={tab.name}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-500' : 'text-zinc-500'}`} />
                {(!isCollapsed || isMobileOpen) && <span className="tracking-tight flex-1 text-left">{tab.name}</span>}
                {tab.id === 'seguridad' && securityCount > 0 && (
                  <span className={`h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse ${(isCollapsed && !isMobileOpen) ? 'absolute top-1.5 right-1.5' : ''}`} />
                )}
              </button>
            );
          })}

          {/* Seccion de Instalacion PWA */}
          {isStandalone ? (
            <div className={`mt-4 px-2.5 py-2 rounded-md bg-emerald-950/40 border border-emerald-900/50 flex items-center ${isCollapsed && !isMobileOpen ? 'justify-center' : 'gap-3'}`} title="Aplicación ejecutándose en modo nativo">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              {(!isCollapsed || isMobileOpen) && (
                <span className="text-[10px] text-emerald-400 font-mono font-semibold uppercase tracking-wider">
                  App Instalada (PWA)
                </span>
              )}
            </div>
          ) : (
            <button
              onClick={onInstall}
              className={`w-full flex items-center rounded-md text-xs transition-all duration-200 mt-4 cursor-pointer p-2 border border-dashed border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900 hover:border-blue-500/50 text-zinc-400 hover:text-white ${
                (isCollapsed && !isMobileOpen) ? 'justify-center' : 'gap-2.5'
              }`}
              title="Instalar App en este Dispositivo"
            >
              <Download className="h-3.5 w-3.5 shrink-0 text-blue-400" />
              {(!isCollapsed || isMobileOpen) && (
                <div className="text-left leading-tight">
                  <span className="font-semibold block text-[11px]">Instalar App</span>
                  <span className="text-[9px] text-zinc-500 block">Acceso de escritorio</span>
                </div>
              )}
            </button>
          )}
        </nav>

      {/* Footer Profile Details + Sentinel Block */}
      <div className={`p-3 border-t border-zinc-800 bg-zinc-900/10 font-sans space-y-2 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
        <div className={`flex items-center gap-2.5 bg-zinc-900/40 p-2 rounded-lg border border-zinc-800/60 w-full ${isCollapsed ? 'justify-center' : ''}`} title={`${currentUser.name} (${currentUser.role})`}>
          <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-500 text-white font-bold flex items-center justify-center uppercase shadow-inner text-[10px] shrink-0">
            {currentUser.name.substring(0, 2)}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <h4 className="text-[11px] font-semibold text-zinc-200 truncate leading-none">{currentUser.name}</h4>
              <span className="text-[8px] font-mono text-blue-400 block mt-0.5 uppercase">
                {currentUser.role}
              </span>
            </div>
          )}
        </div>

        {/* Sentinel Active Section */}
        {!isCollapsed ? (
          <div className="p-2.5 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider">Sentinel Active</span>
            </div>
            <p className="text-[9px] text-zinc-500 leading-tight">
              Session Secured (AES-256) IP: 190.142.10.85
            </p>
          </div>
        ) : (
          <div className="relative p-1" title="Sentinel Active - AES-256 Secured Session">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
        )}
      </div>
    </aside>
  </>
);
}
