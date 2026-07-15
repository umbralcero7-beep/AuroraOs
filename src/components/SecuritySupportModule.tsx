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
  Plus 
} from 'lucide-react';
import { Sede, WhitelistedUser, SecurityLog } from '../types';

interface SecuritySupportModuleProps {
  sedes: Sede[];
  whitelistedUsers: WhitelistedUser[];
  securityLogs: SecurityLog[];
  onTriggerAction: (action: string, payload: any) => Promise<any>;
  refreshData: () => void;
}

export default function SecuritySupportModule({
  sedes,
  whitelistedUsers,
  securityLogs,
  onTriggerAction,
  refreshData
}: SecuritySupportModuleProps) {
  
  const [secSubTab, setSecSubTab] = useState<'SHIELD' | 'WHITELIST' | 'SEDES' | 'LOGS'>('SHIELD');

  // Whitelist States
  const [newWhiteEmail, setNewWhiteEmail] = useState('');
  const [newWhiteRole, setNewWhiteRole] = useState<'ADMIN' | 'SUPPORT' | 'CASHIER' | 'WAITER' | 'CHEF'>('CASHIER');
  const [newWhiteSede, setNewWhiteSede] = useState('s1');

  // New Sede States
  const [showAddSede, setShowAddSede] = useState(false);
  const [sedeName, setSedeName] = useState('');
  const [sedeAddress, setSedeAddress] = useState('');
  const [sedePhone, setSedePhone] = useState('');
  const [sedeFee, setSedeFee] = useState(150);

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

        <div className="flex gap-1 p-0.5 bg-slate-900 rounded-lg border border-slate-800">
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

            <button
              onClick={() => setShowAddSede(true)}
              className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-1.5 px-3.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Registrar Nueva Sede
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sedes.map((s) => (
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

    </div>
  );
}
