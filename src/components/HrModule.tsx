import React, { useState } from 'react';
import { 
  Users2, 
  FileSpreadsheet, 
  Wallet, 
  Plus, 
  Star, 
  MessageSquare, 
  UserPlus, 
  CheckCircle 
} from 'lucide-react';
import { HRColaborador, WaiterBitacora, User } from '../types';

interface HrModuleProps {
  sedeId: string;
  hrColaboradores: HRColaborador[];
  waiterBitacoras: WaiterBitacora[];
  currentUser: User;
  onTriggerAction: (action: string, payload: any) => Promise<any>;
  refreshData: () => void;
}

export default function HrModule({
  sedeId,
  hrColaboradores,
  waiterBitacoras,
  currentUser,
  onTriggerAction,
  refreshData
}: HrModuleProps) {
  
  const [hrSubTab, setHrSubTab] = useState<'EQUIPO' | 'BITACORAS'>('EQUIPO');
  
  // Register team state
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [colName, setColName] = useState('');
  const [colRole, setColRole] = useState('Mesero Profesional');
  const [colSalary, setColSalary] = useState(1350000);
  const [colContract, setColContract] = useState<'INDEFINIDO' | 'TERMINO_FIJO' | 'POR_HORAS' | 'PRESTACION_SERVICIOS'>('TERMINO_FIJO');

  // Waiter log state
  const [showAddBitacora, setShowAddBitacora] = useState(false);
  const [bitWaiterId, setBitWaiterId] = useState('u4');
  const [bitShift, setBitShift] = useState<'DIURNO' | 'NOCTURNO'>('DIURNO');
  const [bitTips, setBitTips] = useState(80000);
  const [bitIncidents, setBitIncidents] = useState('');
  const [bitRating, setBitRating] = useState(5);

  const handlePaySalary = async (colId: string) => {
    await onTriggerAction("RECORD_HR_PAYROLL", { id: colId, payrollStatus: 'PAGADO' });
    
    // Also inject automatically in expenses!
    const employee = hrColaboradores.find(c => c.id === colId);
    if (employee) {
      await onTriggerAction("ADD_GASTO", {
        id: `gas-pay-${Date.now()}`,
        sedeId,
        description: `Pago nómina mes actual - Colaborador: ${employee.name}`,
        category: 'NOMINA',
        amount: employee.salary,
        timestamp: new Date().toISOString(),
        receiptNumber: `PAY-NOM-${colId.toUpperCase()}`
      });
    }

    refreshData();
    alert(`💸 Nómina desembolsada con éxito. Registrado egreso de salario en el balance auxiliar contable.`);
  };

  const handleCreateTeam = async () => {
    if (!colName) return;

    const newCol: HRColaborador = {
      id: `hr-${Date.now()}`,
      name: colName,
      role: colRole,
      salary: Number(colSalary),
      contractType: colContract,
      startDate: new Date().toISOString().slice(0, 10),
      kpiRating: 5.0,
      attendancePct: 100.0,
      payrollStatus: 'PENDIENTE'
    };

    // Save
    // We can simulate saving it inside in-memory state
    // Let's call the generic add user action since it updates state
    await onTriggerAction("ADD_USER", {
      id: `u-${Date.now()}`,
      name: colName,
      email: `${colName.toLowerCase().replace(/\s/g, '')}@restaurante.com`,
      role: colRole.includes('Chef') ? 'CHEF' : 'WAITER',
      sedeId,
      active: true,
      twoFactorEnabled: false
    });

    // Also push into custom list
    hrColaboradores.push(newCol);
    
    // Reset states
    setColName('');
    setShowAddTeam(false);
    refreshData();
  };

  const handleCreateBitacora = async () => {
    if (!bitIncidents) return;

    const newBit: WaiterBitacora = {
      id: `bit-${Date.now()}`,
      waiterId: bitWaiterId,
      waiterName: 'Sofia Castro', // Hardcoded active demo waiter
      sedeId,
      date: new Date().toISOString().slice(0, 10),
      shift: bitShift,
      tipsCollected: Number(bitTips),
      incidents: bitIncidents,
      rating: Number(bitRating)
    };

    await onTriggerAction("RECORD_WAITER_BITACORA", newBit);
    
    // Reset
    setBitIncidents('');
    setBitTips(80000);
    setShowAddBitacora(false);
    refreshData();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900 text-slate-100 font-sans">
      
      {/* HR Header */}
      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 font-sans">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users2 className="text-cyan-400 h-5 w-5" />
            RECURSOS HUMANOS (RRHH)
          </h2>
          <div className="h-4 w-px bg-slate-800"></div>
          <div className="flex gap-1 p-0.5 bg-slate-900 rounded-lg border border-slate-800">
            <button 
              onClick={() => setHrSubTab('EQUIPO')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${hrSubTab === 'EQUIPO' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Control de Nómina y Equipo
            </button>
            <button 
              onClick={() => setHrSubTab('BITACORAS')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${hrSubTab === 'BITACORAS' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Bitácora de Meseros
            </button>
          </div>
        </div>

        {hrSubTab === 'EQUIPO' ? (
          <button
            onClick={() => setShowAddTeam(true)}
            className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-1.5 px-3.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            Vincular Colaborador
          </button>
        ) : (
          <button
            onClick={() => setShowAddBitacora(true)}
            className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-1.5 px-3.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Nueva Bitácora Diario
          </button>
        )}
      </div>

      {hrSubTab === 'EQUIPO' && (
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-300 font-mono">LIBRO GENERAL DE COLABORADORES</h3>
            <span className="text-xs text-slate-500 font-mono">Asignación automática de nóminas por contrato</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hrColaboradores.map((col) => (
              <div key={col.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-white">{col.name}</h4>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{col.role}</p>
                  </div>
                  <span className="text-[10px] bg-slate-900 border border-slate-800 text-cyan-400 px-2 py-0.5 rounded font-mono uppercase">
                    {col.contractType}
                  </span>
                </div>

                <div className="space-y-2 border-t border-b border-slate-900 py-3 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Fecha Ingreso:</span>
                    <span className="text-slate-300">{col.startDate}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Salario Mensual:</span>
                    <span className="text-emerald-400 font-bold">${col.salary.toLocaleString()} COP</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Desempeño KPI:</span>
                    <span className="text-cyan-400 font-bold">{col.kpiRating} / 5.0</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Asistencia Mensual:</span>
                    <span className="text-slate-200">{col.attendancePct}%</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-mono">Nómina:</span>
                    <span className={`font-mono font-bold ${col.payrollStatus === 'PAGADO' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {col.payrollStatus === 'PAGADO' ? '✓ LIQUIDADO' : '● DEVENGO_PENDIENTE'}
                    </span>
                  </div>

                  {col.payrollStatus !== 'PAGADO' && (
                    <button
                      onClick={() => handlePaySalary(col.id)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-1.5 px-3 rounded-lg text-[10px] font-mono transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Wallet className="h-3 w-3" />
                      Pagar Nómina
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hrSubTab === 'BITACORAS' && (
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-300 font-mono">REGISTRO DE BITÁCORAS DE MESEROS</h3>
            <span className="text-xs text-slate-500 font-mono">Archivo histórico de novedades, propinas recolectadas y quejas de clientes</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {waiterBitacoras.map((bit) => (
              <div key={bit.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      {bit.waiterName}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono mt-1">Fecha de Turno: {bit.date}</p>
                  </div>
                  <span className="text-[10px] bg-slate-900 border border-slate-800 text-cyan-400 px-2 py-1 rounded font-mono font-bold">
                    TURNO_{bit.shift}
                  </span>
                </div>

                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-850 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-400 font-mono">
                    <span>Propinas Recibidas:</span>
                    <span className="text-emerald-400 font-bold">${bit.tipsCollected.toLocaleString()} COP</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400 font-mono">
                    <span>Evaluación Promedio Sabor/Servicio:</span>
                    <span className="text-amber-400 font-bold flex items-center gap-0.5">
                      {bit.rating} <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 inline" />
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed font-sans space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Incidencias y Log de Servicio:</span>
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-850 font-mono text-[11px] text-slate-400 flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
                    <span>{bit.incidents}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* vinculate NEW TEAM MEMBER MODAL */}
      {showAddTeam && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <UserPlus className="text-cyan-400 h-5 w-5" />
              VINCULAR NUEVO PERSONAL AL RESTAURANTE
            </h3>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400">Nombre del Colaborador:</label>
                <input 
                  type="text" 
                  value={colName}
                  onChange={(e) => setColName(e.target.value)}
                  placeholder="Ej. Andrés Felipe Restrepo"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">Rol Asignado:</label>
                  <select 
                    value={colRole}
                    onChange={(e) => setColRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none cursor-pointer"
                  >
                    <option value="Mesero Profesional">Mesero Profesional</option>
                    <option value="Chef de Cocina">Chef de Cocina</option>
                    <option value="Cajero / POS Principal">Cajero / POS Principal</option>
                    <option value="Rider / Repartidor">Rider / Repartidor</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Contrato Laboral:</label>
                  <select 
                    value={colContract}
                    onChange={(e: any) => setColContract(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none cursor-pointer"
                  >
                    <option value="INDEFINIDO">Término Indefinido</option>
                    <option value="TERMINO_FIJO">Término Fijo</option>
                    <option value="POR_HORAS">Por Horas</option>
                    <option value="PRESTACION_SERVICIOS">Prestación de Servicios</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Asignación Salarial Mensual (COP):</label>
                <input 
                  type="number" 
                  value={colSalary || ''}
                  onChange={(e) => setColSalary(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none font-mono text-emerald-400"
                  placeholder="COP 1,350,000"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button onClick={() => setShowAddTeam(false)} className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleCreateTeam} className="bg-cyan-500 text-slate-950 hover:bg-cyan-600 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer">
                Vincular y Contratar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW BITACORA ENTRY MODAL */}
      {showAddBitacora && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <FileSpreadsheet className="text-cyan-400 h-5 w-5" />
              NUEVA BITÁCORA DIARIO DE MESERO
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">Jornada / Turno:</label>
                  <select 
                    value={bitShift}
                    onChange={(e: any) => setBitShift(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none cursor-pointer"
                  >
                    <option value="DIURNO">Diurno (Día)</option>
                    <option value="NOCTURNO">Nocturno (Noche)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Evaluación Sabor/Servicio:</label>
                  <select 
                    value={bitRating}
                    onChange={(e) => setBitRating(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none cursor-pointer font-mono"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (Excelente)</option>
                    <option value={4}>⭐⭐⭐⭐ (Sobresaliente)</option>
                    <option value={3}>⭐⭐⭐ (Regular)</option>
                    <option value={2}>⭐⭐ (Bajo)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Propinas Recolectadas del Turno (COP):</label>
                <input 
                  type="number" 
                  value={bitTips || ''}
                  onChange={(e) => setBitTips(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none font-mono text-emerald-400"
                  placeholder="COP 80,000"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Log de Novedades / Incidencias del Servicio:</label>
                <textarea 
                  value={bitIncidents}
                  onChange={(e) => setBitIncidents(e.target.value)}
                  placeholder="Ej. El cliente de la mesa 3 felicitó al chef por la cocción del solomito. Sin percances en caja."
                  className="w-full h-24 bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button onClick={() => setShowAddBitacora(false)} className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleCreateBitacora} className="bg-cyan-500 text-slate-950 hover:bg-cyan-600 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer">
                Registrar Bitácora
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
