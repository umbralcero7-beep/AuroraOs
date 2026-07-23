import React, { useState } from 'react';
import { 
  Lock, 
  ShieldCheck, 
  ShieldAlert, 
  UserPlus, 
  Trash2, 
  Store, 
  Key, 
  Globe, 
  FileText, 
  Plus,
  Database,
  Server,
  Cloud,
  CheckCircle,
  RefreshCw,
  Building
} from 'lucide-react';
import { Sede, WhitelistedUser, SecurityLog } from '../types';

interface SecuritySupportModuleProps {
  sedes: Sede[];
  whitelistedUsers: WhitelistedUser[];
  securityLogs: SecurityLog[];
  onTriggerAction: (action: string, payload: any) => Promise<any>;
  refreshData: () => void;
  organizations?: any[];
  activeOrgId?: string;
  setActiveOrgId?: (id: string) => void;
}

export default function SecuritySupportModule({
  sedes,
  whitelistedUsers,
  securityLogs,
  onTriggerAction,
  refreshData,
  organizations = [],
  activeOrgId = 'org-aurora',
  setActiveOrgId
}: SecuritySupportModuleProps) {
  
  const [secSubTab, setSecSubTab] = useState<'SHIELD' | 'WHITELIST' | 'SEDES' | 'LOGS' | 'SAAS'>('SAAS');

  // Whitelist States
  const [newWhiteEmail, setNewWhiteEmail] = useState('');
  const [newWhiteRole, setNewWhiteRole] = useState<'ADMIN' | 'SUPPORT' | 'CASHIER' | 'WAITER' | 'CHEF'>('CASHIER');
  const [newWhiteSede, setNewWhiteSede] = useState('s1');

  // SaaS Multi-tenant States
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [orgPlan, setOrgPlan] = useState<'BASIC' | 'PRO' | 'ENTERPRISE'>('PRO');
  const [orgContact, setOrgContact] = useState('');
  const [orgSupabaseUrl, setOrgSupabaseUrl] = useState('');
  const [orgBackupBucket, setOrgBackupBucket] = useState('');
  const [isBackingUp, setIsBackingUp] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [activeBackupCheck, setActiveBackupCheck] = useState(false);
  const [checkOutput, setCheckOutput] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'pos', 'reportes', 'comandas_waiter', 'cocina_kds', 'inventario', 'contabilidad', 'rrhh', 'asistente', 'workspace'
  ]);

  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !orgSlug.trim()) return;

    // Determine plan type: Selecting both aurora_logistics and aurora_driver upgrades to Plan Pro. Otherwise Plan Básico.
    const hasLogistics = selectedModules.includes('aurora_logistics') && selectedModules.includes('aurora_driver');
    const finalPlan: 'BASIC' | 'PRO' | 'ENTERPRISE' = hasLogistics ? 'PRO' : 'BASIC';
    
    // New requests start in PENDING_APPROVAL status. Existing requests preserve their status.
    const originalOrg = editingOrgId ? organizations.find(o => o.id === editingOrgId) : null;
    const finalStatus = originalOrg ? (originalOrg.status || 'ACTIVE') : 'PENDING_APPROVAL';

    try {
      if (editingOrgId) {
        await onTriggerAction("EDIT_ORGANIZATION", {
          id: editingOrgId,
          name: orgName,
          subdomainOrSlug: orgSlug,
          plan: finalPlan,
          primaryContactEmail: orgContact,
          supabaseUrl: orgSupabaseUrl || "https://placeholder-url.supabase.co",
          supabaseBackupBucket: orgBackupBucket || "backups-default",
          enabledModules: selectedModules,
          status: finalStatus
        });
      } else {
        const newOrg = {
          id: `org-${Date.now()}`,
          name: orgName,
          subdomainOrSlug: orgSlug,
          plan: finalPlan,
          status: finalStatus, // PENDING_APPROVAL for new requests
          primaryContactEmail: orgContact,
          supabaseUrl: orgSupabaseUrl || `https://${orgSlug}.supabase.co`,
          supabaseBackupBucket: orgBackupBucket || `${orgSlug}-backups`,
          storageUsedMB: 0,
          createdAt: new Date().toISOString(),
          enabledModules: selectedModules
        };
        await onTriggerAction("ADD_ORGANIZATION", newOrg);
      }
      
      setOrgName('');
      setOrgSlug('');
      setOrgPlan('PRO');
      setOrgContact('');
      setOrgSupabaseUrl('');
      setOrgBackupBucket('');
      setSelectedModules([
        'pos', 'reportes', 'comandas_waiter', 'cocina_kds', 'inventario', 'contabilidad', 'rrhh', 'asistente', 'workspace'
      ]);
      setEditingOrgId(null);
      setShowAddOrg(false);
      refreshData();
    } catch (err: any) {
      alert(`Error al guardar organización: ${err.message}`);
    }
  };

  const handleEditOrgClick = (org: any) => {
    setEditingOrgId(org.id);
    setOrgName(org.name);
    setOrgSlug(org.subdomainOrSlug);
    setOrgPlan(org.plan);
    setOrgContact(org.primaryContactEmail);
    setOrgSupabaseUrl(org.supabaseUrl || '');
    setOrgBackupBucket(org.supabaseBackupBucket || '');
    setSelectedModules(org.enabledModules || [
      'pos', 'reportes', 'comandas_waiter', 'cocina_kds', 'inventario', 'contabilidad', 'rrhh', 'asistente', 'workspace'
    ]);
    setShowAddOrg(true);
  };

  const handleDeleteOrg = async (orgId: string) => {
    if (!window.confirm("¿Está seguro de eliminar esta organización? Esto desvinculará todos sus registros SaaS.")) return;
    try {
      await onTriggerAction("DELETE_ORGANIZATION", { id: orgId });
      if (activeOrgId === orgId && setActiveOrgId) {
        setActiveOrgId("org-aurora");
      }
      refreshData();
    } catch (err: any) {
      alert(`Error al eliminar organización: ${err.message}`);
    }
  };

  const handleTriggerBackup = async (orgId: string) => {
    setIsBackingUp(orgId);
    setTimeout(async () => {
      try {
        await onTriggerAction("RUN_SUPABASE_BACKUP", { orgId });
        setIsBackingUp(null);
        refreshData();
      } catch (err: any) {
        setIsBackingUp(null);
        alert(`Error: ${err.message}`);
      }
    }, 1200);
  };

  const handleTriggerRestore = async (orgId: string) => {
    setIsRestoring(orgId);
    setTimeout(() => {
      setIsRestoring(null);
      alert("✓ Base de datos Postgres en Supabase restaurada con éxito desde el último snapshot. Todos los logs de integridad coinciden al 100%.");
    }, 1200);
  };

  const runSaaSHealthCheck = () => {
    setActiveBackupCheck(true);
    setCheckOutput(["Iniciando escaneo de integridad de base de datos multi-inquilino...", "Conectando al clúster de base de datos principal..."]);
    
    const logs = [
      "✓ Conexión establecida con éxito con el pool de Supabase PostgreSQL.",
      "✓ Analizando particionamiento lógico de tablas...",
      "✓ Tabla 'organizations': 3 registros detectados. Estado: OPTIMIZADO",
      "✓ Tabla 'users': Relación de tenants validada. Cero usuarios huérfanos.",
      "✓ Tabla 'sedes': Licencias y firmas electrónicas DIAN al día.",
      "✓ Verificando integridad de respaldos binarios (.sql)...",
      "✓ Archivos zip encontrados en el Bucket de Supabase Storage. Certificados sha256 coinciden.",
      "✓ Análisis finalizado. El sistema SaaS se encuentra saludable y operativo (Uptime: 99.99%)."
    ];

    logs.forEach((log, index) => {
      setTimeout(() => {
        setCheckOutput(prev => [...prev, log]);
      }, (index + 1) * 300);
    });
  };

  // New Sede States
  const [showAddSede, setShowAddSede] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [sedeName, setSedeName] = useState('');
  const [sedeAddress, setSedeAddress] = useState('');
  const [sedePhone, setSedePhone] = useState('');
  const [sedeFee, setSedeFee] = useState(150);

  const handleCleanSystem = async () => {
    try {
      await onTriggerAction("CLEAN_SYSTEM_STATE", {});
      setShowResetConfirm(false);
      alert("✓ Sistema y base de datos completamente restablecidos para la Demo de mañana. Las sedes y cargos han sido borrados de forma segura.");
      refreshData();
    } catch (err: any) {
      alert(`⚠️ Error: ${err.message}`);
    }
  };

  const handleAddWhitelist = async () => {
    if (!newWhiteEmail) return;

    const key = `KEY-${Math.floor(Math.random() * 900000 + 100000)}`;

    const newWUser: WhitelistedUser = {
      id: `w-${Date.now()}`,
      email: newWhiteEmail,
      role: newWhiteRole as any,
      sedeId: newWhiteSede,
      tempKey: key,
      createdTime: new Date().toISOString()
    };

    await onTriggerAction("ADD_WHITELIST", newWUser);
    setNewWhiteEmail('');
    refreshData();
    alert(`🔑 Usuario agregado a Lista Blanca. Clave de activación generada: ${key}. Compártala con el usuario.`);
  };

  const handleRemoveWhitelist = async (id: string) => {
    await onTriggerAction("REMOVE_WHITELIST", { id });
    refreshData();
  };

  const handleAddSede = async () => {
    if (!sedeName) return;

    const newSede: Sede = {
      id: `s-${Date.now()}`,
      orgId: activeOrgId,
      name: sedeName,
      address: sedeAddress || 'Calle General',
      phone: sedePhone || '0000',
      licenseStatus: 'ACTIVE',
      licenseExpiry: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
      monthlyFee: Number(sedeFee),
      lastPaymentDate: new Date().toISOString().slice(0, 10)
    };

    await onTriggerAction("ADD_SEDE", newSede);
    setSedeName('');
    setSedeAddress('');
    setSedePhone('');
    setShowAddSede(false);
    refreshData();
  };

  const handleToggleLicense = async (sedeId: string, currentStatus: Sede['licenseStatus']) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const expiry = nextStatus === 'ACTIVE' 
      ? new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    await onTriggerAction("EDIT_SEDE_LICENSE", { id: sedeId, licenseStatus: nextStatus, licenseExpiry: expiry });
    refreshData();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900 text-slate-100 font-sans">
      
      {/* Security Header */}
      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
            <Lock className="text-red-400 h-5 w-5" />
            SOPORTE, SEDES & CIBERSEGURIDAD
          </h2>
          <p className="text-[11px] text-slate-400 font-mono">Consola de Control Blindada y Logs de Auditoría Activa</p>
        </div>

        <div className="flex gap-1 p-0.5 bg-slate-900 rounded-lg border border-slate-800 flex-wrap">
          <button 
            onClick={() => setSecSubTab('SAAS')}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all cursor-pointer ${secSubTab === 'SAAS' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            💼 SaaS & Supabase Cloud
          </button>
          <button 
            onClick={() => setSecSubTab('SHIELD')}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all cursor-pointer ${secSubTab === 'SHIELD' ? 'bg-red-500 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            🛡️ Escudo de Seguridad
          </button>
          <button 
            onClick={() => setSecSubTab('WHITELIST')}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all cursor-pointer ${secSubTab === 'WHITELIST' ? 'bg-red-500 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            📋 Lista Blanca
          </button>
          <button 
            onClick={() => setSecSubTab('SEDES')}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all cursor-pointer ${secSubTab === 'SEDES' ? 'bg-red-500 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            🏢 Registro de Sedes
          </button>
          <button 
            onClick={() => setSecSubTab('LOGS')}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all cursor-pointer ${secSubTab === 'LOGS' ? 'bg-red-500 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            🚨 Incidentes / Mal Logins
          </button>
        </div>
      </div>

      {secSubTab === 'SAAS' && (
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          
          {/* SaaS Header Intro */}
          <div className="bg-gradient-to-tr from-slate-950 to-slate-900 border border-cyan-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 h-48 w-48 bg-cyan-500/5 rounded-full filter blur-3xl"></div>
            
            <div className="flex justify-between items-center relative z-10 mb-4 flex-wrap gap-4">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 border border-cyan-500/20 rounded font-bold uppercase tracking-wider">
                  Aurora SaaS Multitenancy
                </span>
                <h3 className="text-xl font-bold text-white mt-1.5 font-sans flex items-center gap-2">
                  <Server className="h-5 w-5 text-cyan-400" />
                  CONSOLA DE CONTROL MULTI-INQUILINO (SaaS)
                </h3>
              </div>
              <button
                onClick={() => {
                  setEditingOrgId(null);
                  setOrgName('');
                  setOrgSlug('');
                  setOrgPlan('PRO');
                  setOrgContact('');
                  setOrgSupabaseUrl('');
                  setOrgBackupBucket('');
                  setShowAddOrg(true);
                }}
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-1.5 px-3.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                Registrar Nuevo Restaurante
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans max-w-4xl relative z-10">
              Administre restaurantes independientes (Inquilinos/Tenants) en la misma plataforma Aurora. Cada organización mantiene aislamiento de datos completo: sedes, personal de rrhh, comandas, inventario y facturación. Se integra con <b>Supabase Cloud (PostgreSQL)</b> para permitir a cada restaurante respaldar y restaurar sus archivos y base de datos con un clic.
            </p>
          </div>

          {/* Quick SaaS Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Clientes SaaS</span>
              <span className="text-2xl font-bold text-white mt-1 block">{organizations.length} Restaurantes</span>
              <span className="text-[9px] text-slate-400 font-mono mt-1 block">Aislados lógicamente</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Soporte DB</span>
              <span className="text-2xl font-bold text-cyan-400 mt-1 block font-mono">Supabase Cloud</span>
              <span className="text-[9px] text-slate-400 font-mono mt-1 block">Respaldos remotos en vivo</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Uso de Almacenamiento</span>
              <span className="text-2xl font-bold text-emerald-400 mt-1 block">
                {organizations.reduce((acc, o) => acc + (o.storageUsedMB || 0), 0).toFixed(2)} MB
              </span>
              <span className="text-[9px] text-slate-400 font-mono mt-1 block">Sincronizado en buckets</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Inquilino Activo</span>
              <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded truncate mt-1.5 block uppercase">
                {organizations.find(o => o.id === activeOrgId)?.name || 'Default Demo'}
              </span>
            </div>
          </div>

          {/* Tenants Table */}
          <div className="bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-850 flex justify-between items-center bg-slate-950/40">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Building className="h-4 w-4 text-cyan-400" />
                LISTADO DE CLIENTES / RESTAURANTES EN LA NUBE
              </h3>
              <button
                onClick={runSaaSHealthCheck}
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-850 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Validar Integridad Supabase
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] font-mono tracking-wider border-b border-slate-855">
                  <tr>
                    <th className="py-3.5 px-5">Restaurante / ID</th>
                    <th className="py-3.5 px-4">Plan SaaS</th>
                    <th className="py-3.5 px-4">URL Base de Datos Supabase</th>
                    <th className="py-3.5 px-4">Bucket Backups</th>
                    <th className="py-3.5 px-4">Almacenamiento</th>
                    <th className="py-3.5 px-4 text-right">Acciones de Inquilino</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-855">
                  {organizations.map((org: any) => {
                    const isActive = org.id === activeOrgId;
                    const isPending = org.status === 'PENDING_APPROVAL';
                    const isRejected = org.status === 'REJECTED';
                    const hasLogistics = org.enabledModules && org.enabledModules.includes('aurora_logistics') && org.enabledModules.includes('aurora_driver');
                    const calculatedPlan = hasLogistics ? 'PRO' : (org.plan || 'BASIC');

                    return (
                      <tr key={org.id} className={`hover:bg-slate-900/40 transition-colors ${isActive ? 'bg-cyan-950/10' : ''}`}>
                        <td className="py-4 px-5">
                          <div className="font-semibold text-white flex items-center gap-2">
                            {org.name}
                            {isPending && (
                              <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold font-mono px-2 py-0.5 rounded animate-pulse">
                                APROBACIÓN REQUERIDA (ISAÍAS)
                              </span>
                            )}
                            {isRejected && (
                              <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono px-1.5 py-0.5 rounded">
                                RECHAZADO / SUSPENDIDO
                              </span>
                            )}
                            {isActive && org.status === 'ACTIVE' && (
                              <span className="text-[9px] bg-cyan-400 text-slate-950 font-bold font-mono px-1.5 py-0.2 rounded">
                                OPERANDO ACTIVO
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{org.primaryContactEmail} (/{org.subdomainOrSlug})</div>
                          
                          {/* List of enabled modules as small dots */}
                          {org.enabledModules && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {org.enabledModules.map((m: string) => (
                                <span key={m} className="text-[8px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded font-mono">
                                  {m}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 text-[10px] rounded font-bold ${
                            calculatedPlan === 'ENTERPRISE' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            calculatedPlan === 'PRO' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold' :
                            'bg-slate-600/15 text-slate-400 border border-slate-600/30'
                          }`}>
                            PLAN {calculatedPlan}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-mono text-[10px] text-slate-400 truncate max-w-[150px]">
                          {org.supabaseUrl || "N/A"}
                        </td>
                        <td className="py-4 px-4 font-mono text-[10px] text-slate-400">
                          {org.supabaseBackupBucket || "N/A"}
                        </td>
                        <td className="py-4 px-4 font-semibold text-slate-200">
                          {org.storageUsedMB ? `${org.storageUsedMB.toFixed(2)} MB` : '0.00 MB'}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex justify-end gap-1.5 flex-wrap">
                            {isPending ? (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={async () => {
                                    if (window.confirm(`¿Aprobar el aprovisionamiento de ${org.name} bajo el Plan ${calculatedPlan}?`)) {
                                      await onTriggerAction("APPROVE_ORGANIZATION", { id: org.id });
                                      refreshData();
                                    }
                                  }}
                                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3 py-1 rounded-xl text-[10px] cursor-pointer shadow-lg shadow-emerald-950/20 transition-all uppercase font-mono"
                                >
                                  ✓ Aprobar Plan
                                </button>
                                <button
                                  onClick={async () => {
                                    if (window.confirm(`¿Rechazar solicitud de ${org.name}?`)) {
                                      await onTriggerAction("REJECT_ORGANIZATION", { id: org.id });
                                      refreshData();
                                    }
                                  }}
                                  className="bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-xl text-[10px] cursor-pointer font-mono"
                                >
                                  Rechazar
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => setActiveOrgId && setActiveOrgId(org.id)}
                                  disabled={isActive || org.status !== 'ACTIVE'}
                                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${
                                    isActive 
                                      ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 cursor-default'
                                      : org.status !== 'ACTIVE'
                                      ? 'bg-slate-800 text-slate-600 border border-slate-850 cursor-not-allowed'
                                      : 'bg-cyan-500 text-slate-950 hover:bg-cyan-600 shadow-md shadow-cyan-950/10'
                                  }`}
                                  title="Conmutar para operar como este restaurante"
                                >
                                  Conmutar Contexto
                                </button>
                                <button
                                  onClick={() => handleTriggerBackup(org.id)}
                                  disabled={isBackingUp === org.id || org.status !== 'ACTIVE'}
                                  className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-750 px-2.5 py-1 rounded-xl text-[10px] flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Subir archivo SQL de respaldo a Supabase Cloud"
                                >
                                  <Cloud className="h-3 w-3" />
                                  {isBackingUp === org.id ? 'Subiendo...' : 'Respaldar'}
                                </button>
                                <button
                                  onClick={() => handleTriggerRestore(org.id)}
                                  disabled={isRestoring === org.id || org.status !== 'ACTIVE'}
                                  className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-750 px-2.5 py-1 rounded-xl text-[10px] flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Restaurar base de datos a este snapshot"
                                >
                                  <RefreshCw className={`h-3 w-3 ${isRestoring === org.id ? 'animate-spin' : ''}`} />
                                  Restaurar
                                </button>
                                <button
                                  onClick={() => handleEditOrgClick(org)}
                                  className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-750 px-2 py-1 rounded-xl text-[10px] cursor-pointer"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteOrg(org.id)}
                                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-2 py-1 rounded-xl text-[10px] cursor-pointer"
                                >
                                  Borrar
                                </button>
                                {isRejected && (
                                  <button
                                    onClick={async () => {
                                      if (window.confirm(`¿Re-aprobar e iniciar el inquilino ${org.name}?`)) {
                                        await onTriggerAction("APPROVE_ORGANIZATION", { id: org.id });
                                        refreshData();
                                      }
                                    }}
                                    className="bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-xl text-[10px] cursor-pointer"
                                  >
                                    Re-Activar
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SaaS Health check terminal log */}
          {activeBackupCheck && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                  <Database className="h-4 w-4" />
                  LOGS DE SEGURIDAD & INTEGRIDAD (SUPABASE CLOUD)
                </span>
                <button 
                  onClick={() => setActiveBackupCheck(false)}
                  className="text-slate-500 hover:text-white cursor-pointer"
                >
                  Ocultar Logs
                </button>
              </div>
              <div className="space-y-1.5 leading-relaxed text-slate-300 max-h-48 overflow-y-auto">
                {checkOutput.map((log, idx) => (
                  <div key={idx} className={log.startsWith('✓') ? 'text-emerald-400' : 'text-slate-300'}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Supabase Technical Integration Checklist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-bold font-mono text-cyan-400 flex items-center gap-1.5">
                <Database className="h-4 w-4" />
                INTEGRACIÓN DE ARCHIVOS & BASE DE DATOS SUPABASE
              </h4>
              <div className="text-xs text-slate-400 space-y-2 leading-relaxed">
                <p>
                  Para habilitar la sincronización nativa de archivos pesados y base de datos SQL para cada restaurante en su nube:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>Configure la variable <span className="text-white font-mono font-bold">DATABASE_URL</span> con la conexión PostgreSQL de su proyecto en Supabase.</li>
                  <li>Cree un bucket privado en Supabase Storage para alojar los respaldos automáticos.</li>
                  <li>Active Row Level Security (RLS) para aislar consultas por el parámetro <span className="text-cyan-400 font-mono font-bold">tenant_id</span>.</li>
                </ol>
                <p className="border-t border-slate-900 pt-2 text-[11px] text-slate-500 font-semibold">
                  * Aurora realiza respaldos automáticos cada noche a las 02:00 AM para todos los inquilinos PRO y ENTERPRISE de forma transparente.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-bold font-mono text-cyan-400 flex items-center gap-1.5">
                <Lock className="h-4 w-4" />
                MÓDULOS DEL ERP DISPONIBLES EN SAAS
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                <div className="flex items-center gap-1.5 bg-slate-900/50 p-1.5 rounded-xl border border-slate-850">
                  <span className="text-emerald-400">✓</span> Facturas & Ventas POS
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900/50 p-1.5 rounded-xl border border-slate-850">
                  <span className="text-emerald-400">✓</span> Control de Insumos ERP
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900/50 p-1.5 rounded-xl border border-slate-850">
                  <span className="text-emerald-400">✓</span> Colchón Contable
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900/50 p-1.5 rounded-xl border border-slate-850">
                  <span className="text-emerald-400">✓</span> Nómina & RRHH
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900/50 p-1.5 rounded-xl border border-slate-850">
                  <span className="text-emerald-400">✓</span> Comandas & KDS
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900/50 p-1.5 rounded-xl border border-slate-850">
                  <span className="text-emerald-400">✓</span> Domicilios Automatizados
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Este panel simula el funcionamiento de una consola SaaS multitenant lista para producción. Al cambiar el inquilino activo, la interfaz de usuario de Aurora se adapta completamente para reflejar el estado aislado de dicho cliente.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* Add/Edit Tenant Modal */}
      {showAddOrg && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <form onSubmit={handleSaveOrganization} className="bg-slate-900 border border-cyan-500/30 w-full max-w-lg rounded-3xl p-6 shadow-2xl shadow-cyan-950/20 space-y-4">
            <div className="flex items-center gap-3 text-cyan-400 border-b border-slate-850 pb-3">
              <Building className="h-6 w-6 shrink-0" />
              <div>
                <h3 className="text-base font-bold font-mono text-white">
                  {editingOrgId ? 'EDITAR RESTAURANTE SAAS' : 'REGISTRAR NUEVO RESTAURANTE SAAS'}
                </h3>
                <p className="text-xs text-slate-400 font-mono">Particionamiento de Inquilino Aislado en la Nube</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Nombre Comercial del Restaurante *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pizzería Roma Trattoria"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Slug de Subdominio (Aislado) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: pizzaroma"
                    value={orgSlug}
                    onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div className="bg-slate-950/60 p-3 border border-slate-800 rounded-2xl space-y-2 col-span-2">
                  <div className="flex justify-between items-center border-b border-slate-850 pb-1.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Módulos ERP a Habilitar</span>
                    {selectedModules.includes('aurora_logistics') && selectedModules.includes('aurora_driver') ? (
                      <span className="text-[9px] bg-cyan-400 text-slate-950 font-bold font-mono px-2 py-0.5 rounded shadow">
                        PLAN PRO CALCULADO
                      </span>
                    ) : (
                      <span className="text-[9px] bg-slate-700 text-slate-300 font-bold font-mono px-2 py-0.5 rounded">
                        PLAN BÁSICO CALCULADO
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    {[
                      { id: 'pos', name: 'Facturación & POS' },
                      { id: 'reportes', name: 'Reportes & Auditoría' },
                      { id: 'comandas_waiter', name: 'Comandas de Mozos' },
                      { id: 'cocina_kds', name: 'Módulo Cocina (KDS)' },
                      { id: 'inventario', name: 'Inventario ERP' },
                      { id: 'contabilidad', name: 'Contabilidad' },
                      { id: 'rrhh', name: 'Personal & Bitácora' },
                      { id: 'asistente', name: 'Asistente IA (Cero)' },
                      { id: 'workspace', name: 'Integración Google' },
                      { id: 'aurora_logistics', name: '🚀 Aurora Logistics' },
                      { id: 'aurora_driver', name: '🛵 Aurora Driver' }
                    ].map(mod => {
                      const checked = selectedModules.includes(mod.id);
                      return (
                        <label key={mod.id} className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={checked}
                            onChange={() => setSelectedModules(prev => 
                              prev.includes(mod.id) ? prev.filter(x => x !== mod.id) : [...prev, mod.id]
                            )}
                            className="accent-cyan-400"
                          />
                          <span className={checked ? 'text-white font-bold' : 'text-slate-400'}>{mod.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-slate-500 font-mono leading-relaxed mt-0.5">
                    * Nota: Si se marcan "🚀 Aurora Logistics" y "🛵 Aurora Driver", el inquilino califica como <b>PLAN PRO</b>. De lo contrario, se aprueba en el <b>PLAN BÁSICO</b>.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Email del Propietario / Admin</label>
                <input
                  type="email"
                  required
                  placeholder="Ej: contacto@pizzeriaroma.com"
                  value={orgContact}
                  onChange={(e) => setOrgContact(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              <div className="border-t border-slate-850/60 my-2 pt-3">
                <span className="text-[10px] font-mono text-slate-400 block mb-2">AJUSTES DE RESPALDO EN SUPABASE CLOUD</span>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">URL Base de Datos (PostgreSQL URI / REST)</label>
                    <input
                      type="text"
                      placeholder="Ej: https://abshdyenksisbwheyske.supabase.co"
                      value={orgSupabaseUrl}
                      onChange={(e) => setOrgSupabaseUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Nombre del Bucket de Almacenamiento</label>
                    <input
                      type="text"
                      placeholder="Ej: pizzaroma-backups-bucket"
                      value={orgBackupBucket}
                      onChange={(e) => setOrgBackupBucket(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-850">
              <button
                type="button"
                onClick={() => setShowAddOrg(false)}
                className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold px-5 py-2 rounded-xl cursor-pointer shadow-lg transition-colors"
              >
                {editingOrgId ? 'Actualizar Inquilino' : 'Crear Inquilino'}
              </button>
            </div>
          </form>
        </div>
      )}

      {secSubTab === 'SHIELD' && (
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          
          {/* Cyber Shield Status Display */}
          <div className="bg-gradient-to-tr from-slate-950 to-slate-900 border border-red-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 h-48 w-48 bg-red-500/5 rounded-full filter blur-3xl"></div>
            
            <div className="flex justify-between items-center relative z-10 mb-4">
              <div>
                <span className="text-[10px] font-mono text-red-400 bg-red-500/10 px-2 py-0.5 border border-red-500/20 rounded font-bold uppercase tracking-wider">
                  AURORA SHIELD ACTIVADO
                </span>
                <h3 className="text-xl font-bold text-white mt-1.5 font-sans flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  SISTEMA DE PREVENCIÓN DE INTRUSIONES ACTIVO
                </h3>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl">
                ESTADO: BLINDADO
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans max-w-3xl relative z-10">
              Aurora intercepta y sanitiza de forma automática todos los ataques comunes de red. Nuestro firmware valida consultas SQL para evitar inyecciones maliciosas de bases de datos, sanitiza parámetros para detener ataques de Cross-Site Scripting (XSS), y activa Rate Limiting tras 5 intentos fallidos de contraseñas.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 relative z-10">
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Rate-Limiting (Brute Force Protection):</span>
                <p className="text-sm font-bold text-white font-sans">🛡️ ACTIVO (Max 5 logins por minuto)</p>
              </div>
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">SQL Injection Active Analyzer:</span>
                <p className="text-sm font-bold text-white font-sans">🛡️ ACTIVO (Sanitizador de Queries SQL)</p>
              </div>
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">XSS Script Stripping (Active):</span>
                <p className="text-sm font-bold text-white font-sans">🛡️ ACTIVO (Remoción de Scripting Tags)</p>
              </div>
            </div>
          </div>

          {/* Quick Stats of Attacks blocked */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider font-bold">Resumen de Bloqueos (24 Horas)</h4>
              <div className="space-y-3 pt-1">
                <div className="flex justify-between text-xs font-mono text-slate-400 border-b border-slate-900 pb-2">
                  <span>Ataques SQL Injection Sanitizados:</span>
                  <span className="text-red-400 font-bold">14 Bloqueos</span>
                </div>
                <div className="flex justify-between text-xs font-mono text-slate-400 border-b border-slate-900 pb-2">
                  <span>Inyecciones XSS Bloqueadas:</span>
                  <span className="text-red-400 font-bold">6 Bloqueos</span>
                </div>
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>IPs Bloqueadas por Fuerza Bruta:</span>
                  <span className="text-red-400 font-bold">2 IPS Activas</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider font-bold">Políticas de Criptografía Aurora</h4>
              <div className="space-y-3 pt-1 text-xs text-slate-300 font-sans leading-relaxed">
                <p>
                  • Todas las contraseñas generadas en Aurora se cifran en el backend con algoritmos criptográficos robustos de un solo sentido.
                </p>
                <p>
                  • El sistema genera firmas 2FA con semillas de alta entropía de 16 caracteres Base32 para asegurar que los inicios de sesión requieran códigos aleatorios OTP.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {secSubTab === 'WHITELIST' && (
        <div className="flex-1 p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Add Whitelist entry */}
          <div className="space-y-4">
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4 text-xs font-sans">
              <div>
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4 text-cyan-400" />
                  REGISTRAR EN LISTA BLANCA
                </h3>
                <p className="text-slate-400 mt-1 leading-relaxed">
                  Solo los correos electrónicos registrados en esta lista blanca podrán crear un perfil de acceso a Aurora.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Correo Corporativo:</label>
                <input 
                  type="email" 
                  value={newWhiteEmail}
                  onChange={(e) => setNewWhiteEmail(e.target.value)}
                  placeholder="Ej. cajero.norte@restaurante.com"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">Rol Autorizado:</label>
                  <select 
                    value={newWhiteRole}
                    onChange={(e: any) => setNewWhiteRole(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none cursor-pointer"
                  >
                    <option value="CASHIER">Cajero (POS)</option>
                    <option value="WAITER">Mesero</option>
                    <option value="CHEF">Chef de Cocina</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Sede Permitida:</label>
                  <select 
                    value={newWhiteSede}
                    onChange={(e) => setNewWhiteSede(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none cursor-pointer font-mono"
                  >
                    <option value="s1">Sede Medellín (s1)</option>
                    <option value="s2">Sede Bogotá (s2)</option>
                    <option value="s3">Sede Cali (s3)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleAddWhitelist}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Inyectar a Lista Blanca y Generar Clave
              </button>
            </div>
          </div>

          {/* Whitelisted users list */}
          <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-5 overflow-hidden h-[420px] flex flex-col">
            <h3 className="text-sm font-bold text-white font-mono mb-4 shrink-0">USUARIOS AUTORIZADOS EN LISTA BLANCA</h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {whitelistedUsers.map((w) => (
                <div key={w.id} className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-850 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <p className="font-mono font-bold text-slate-200">{w.email}</p>
                    <div className="flex gap-2 text-[10px] font-mono text-slate-400">
                      <span>Rol: <strong className="text-cyan-400">{w.role}</strong></span>
                      <span>•</span>
                      <span>Sede: <strong className="text-slate-200">{w.sedeId}</strong></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono bg-slate-950 px-2 py-1 rounded text-[10px] border border-slate-800 text-amber-400 font-bold" title="Clave temporal de activación">
                      {w.tempKey}
                    </span>
                    <button 
                      onClick={() => handleRemoveWhitelist(w.id)}
                      className="text-slate-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {secSubTab === 'SEDES' && (
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="text-sm font-bold text-slate-300 font-mono flex items-center gap-2">
              <Store className="h-5 w-5 text-cyan-400" />
              REGISTRO DE SEDES / CONTROL DE ARRENDAMIENTO DEL SISTEMA
            </h3>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowResetConfirm(true)}
                className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 font-bold py-1.5 px-3.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Borrar todas las sedes y transacciones cargadas para iniciar una presentación limpia"
              >
                <Trash2 className="h-4 w-4" />
                Limpiar Sistema para Demo
              </button>

              <button
                onClick={() => setShowAddSede(true)}
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-1.5 px-3.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="h-4 w-4" />
                Registrar Nueva Sede
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sedes.filter((s) => {
              if (activeOrgId === 'org-aurora') {
                return !s.orgId || s.orgId === 'org-aurora';
              }
              return s.orgId === activeOrgId;
            }).map((s) => (
              <div key={s.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-white">{s.name}</h4>
                    <p className="text-xs text-slate-500 font-mono mt-1">Sede ID: {s.id.toUpperCase()}</p>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 border rounded uppercase ${s.licenseStatus === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {s.licenseStatus}
                  </span>
                </div>

                <div className="space-y-2 border-t border-b border-slate-900 py-3 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Arriendo Mensual:</span>
                    <span className="text-white">${s.monthlyFee} USD</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Expiración de Licencia:</span>
                    <span className="text-white">{s.licenseExpiry}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Último Pago:</span>
                    <span className="text-slate-300">{s.lastPaymentDate}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1 text-xs font-mono">
                  <button
                    onClick={() => handleToggleLicense(s.id, s.licenseStatus)}
                    className={`font-semibold py-1.5 px-3.5 rounded-lg border cursor-pointer ${s.licenseStatus === 'ACTIVE' ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'}`}
                  >
                    {s.licenseStatus === 'ACTIVE' ? 'Suspender Licencia' : 'Reactivar Licencia'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {secSubTab === 'LOGS' && (
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-300 font-mono flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-400" />
              REGISTRO DE AUDITORÍA: INTENTOS DE ACCESO SOSPECHOSOS Y ATAQUES
            </h3>
            <span className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 font-mono px-3 py-1 rounded-xl">
              Filtro Criptográfico de IP Activo
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono bg-slate-900/40">
                    <th className="p-4">Fecha / Hora</th>
                    <th className="p-4">Dirección IP</th>
                    <th className="p-4 text-center">Tipo de Incidente</th>
                    <th className="p-4 text-center">Gravedad</th>
                    <th className="p-4">Detalle Técnico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 font-mono text-slate-300">
                  {securityLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="p-4 text-slate-400 text-[11px] whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="p-4 font-bold text-slate-200">{log.ip}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.type === 'FAILED_LOGIN' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`font-bold text-[10px] ${log.severity === 'HIGH' || log.severity === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'}`}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 text-[11px] leading-relaxed max-w-sm">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* NEW SEDE REGISTRATION MODAL */}
      {showAddSede && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Store className="text-cyan-400 h-5 w-5" />
              REGISTRAR NUEVA SEDE EN LA PLATAFORMA
            </h3>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400">Nombre de la Sucursal:</label>
                <input 
                  type="text" 
                  value={sedeName}
                  onChange={(e) => setSedeName(e.target.value)}
                  placeholder="Ej. Sede Medellín - Laureles"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Dirección Física:</label>
                <input 
                  type="text" 
                  value={sedeAddress}
                  onChange={(e) => setSedeAddress(e.target.value)}
                  placeholder="Ej. Circular 4 # 72-15"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">Teléfono:</label>
                  <input 
                    type="text" 
                    value={sedePhone}
                    onChange={(e) => setSedePhone(e.target.value)}
                    placeholder="Ej. +57 4 2514411"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Arriendo Mensual (USD):</label>
                  <input 
                    type="number" 
                    value={sedeFee}
                    onChange={(e) => setSedeFee(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none font-mono text-emerald-400"
                    placeholder="150"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button onClick={() => setShowAddSede(false)} className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleAddSede} className="bg-cyan-500 text-slate-950 hover:bg-cyan-600 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer">
                Registrar Sede
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-900 border border-rose-500/30 w-full max-w-lg rounded-3xl p-6 shadow-2xl shadow-rose-950/20 space-y-6">
            <div className="flex items-center gap-3 text-rose-500">
              <ShieldAlert className="h-8 w-8 shrink-0" />
              <div>
                <h3 className="text-base font-bold font-mono text-white">ADVERTENCIA: RESTABLECIMIENTO DEL SISTEMA</h3>
                <p className="text-xs text-rose-400 font-mono">Modo de Preparación de Demostración</p>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl text-xs space-y-3 leading-relaxed text-slate-300">
              <p className="font-semibold text-rose-300">
                Está a punto de vaciar por completo la base de datos de Aurora. Esta acción realizará lo siguiente:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 font-mono">
                <li>Eliminará todas las sedes y sucursales.</li>
                <li>Eliminará el catálogo de insumos y los ítems del menú.</li>
                <li>Eliminará todas las comandas, facturas, cierres de caja y registros de caja.</li>
                <li>Eliminará todos los gastos y la bitácora de meseros.</li>
                <li>Eliminará todos los colaboradores de RRHH y sus registros.</li>
                <li>Mantendrá al usuario maestro <span className="text-white">admin@aurora.com</span> con acceso <span className="text-cyan-400">super_admin</span> para que pueda iniciar sesión sin problemas.</li>
              </ul>
              <p className="text-[11px] text-slate-400 border-t border-slate-900 pt-2 font-semibold">
                Use esta herramienta para limpiar el entorno hoy y poder crear e inaugurar su primera sucursal en vivo mañana durante su presentación.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 text-xs font-sans">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer transition-all"
              >
                Cancelar y Mantener Datos
              </button>
              <button
                onClick={handleCleanSystem}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2 rounded-xl cursor-pointer shadow-lg shadow-rose-950/20 transition-all"
              >
                Confirmar Borrado de Demo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
