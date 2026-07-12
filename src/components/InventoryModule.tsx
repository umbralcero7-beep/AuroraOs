import React, { useState, useEffect } from 'react';
import { 
  Package2, 
  Sparkles, 
  FileText, 
  TrendingDown, 
  Users2, 
  RefreshCw, 
  CheckCircle, 
  Plus, 
  AlertTriangle,
  Settings,
  Mail,
  Phone,
  Terminal,
  FileSpreadsheet,
  Download,
  Send,
  Coffee,
  Calculator,
  TrendingUp,
  Coins
} from 'lucide-react';
import { Insumo, MenuItem, Supplier } from '../types';

interface InventoryModuleProps {
  sedeId: string;
  insumos: Insumo[];
  menuItems: MenuItem[];
  suppliers: Supplier[];
  onTriggerAction: (action: string, payload: any) => Promise<any>;
  refreshData: () => void;
}

export default function InventoryModule({
  sedeId,
  insumos,
  menuItems,
  suppliers,
  onTriggerAction,
  refreshData
}: InventoryModuleProps) {
  const currentInsumos = insumos.filter(i => i.sedeId === sedeId);
  const currentMenu = menuItems.filter(m => m.sedeId === sedeId);

  const [activeSubTab, setActiveSubTab] = useState<'INSUMOS' | 'CARTA' | 'SUPPLIERS' | 'INJECT_SUMINISTROS' | 'CIERRE_CAJA'>('INSUMOS');
  
  // Python FastAPI integration states
  const [emailDestino, setEmailDestino] = useState('prueba_gerente@grocer.com');
  const [telefonoDestino, setTelefonoDestino] = useState('+573001234567');
  const [smtpServer, setSmtpServer] = useState('smtp.gmail.com');
  const [smtpUser, setSmtpUser] = useState('reportes@grocer.com');
  const [smtpPassword, setSmtpPassword] = useState('contraseña_segura_smtp');
  
  const [pythonProducts, setPythonProducts] = useState<any[]>([]);
  const [loadingPythonProducts, setLoadingPythonProducts] = useState(false);
  const [pythonStatusError, setPythonStatusError] = useState<string | null>(null);

  const [ventaPruebaCode, setVentaPruebaCode] = useState('01');
  const [ventaPruebaSalon, setVentaPruebaSalon] = useState(1);
  const [ventaPruebaDomicilio, setVentaPruebaDomicilio] = useState(1);
  const [registrandoVenta, setRegistrandoVenta] = useState(false);

  const [conteosFisicos, setConteosFisicos] = useState<{[key: string]: number}>({});
  const [forzarSmtp, setForzarSmtp] = useState(false);
  const [ejecutandoCierre, setEjecutandoCierre] = useState(false);
  const [cierreResult, setCierreResult] = useState<any | null>(null);
  const [notifSaving, setNotifSaving] = useState(false);

  const loadPythonBackendData = async () => {
    setLoadingPythonProducts(true);
    setPythonStatusError(null);
    try {
      // 1. Get notifications config
      const configRes = await fetch('/api/python/notificaciones-configuradas');
      if (configRes.ok) {
        const configData = await configRes.json();
        if (configData.email_destino) setEmailDestino(configData.email_destino);
        if (configData.telefono_destino) setTelefonoDestino(configData.telefono_destino);
        if (configData.smtp_server) setSmtpServer(configData.smtp_server);
        if (configData.smtp_user) setSmtpUser(configData.smtp_user);
      } else {
        throw new Error("No se pudo obtener la configuración de notificaciones del backend.");
      }

      // 2. Get products
      const prodRes = await fetch('/api/python/productos');
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setPythonProducts(prodData);
        
        // Populate default physical counts with theoretical stock values
        const initialConteos: {[key: string]: number} = {};
        prodData.forEach((p: any) => {
          if (p.es_critico) {
            initialConteos[p.codigo] = p.stock_actual;
          }
        });
        setConteosFisicos(initialConteos);
      } else {
        throw new Error("No se pudo obtener el listado de productos del backend.");
      }
    } catch (err: any) {
      console.error(err);
      setPythonStatusError(err.message || "Error al conectar con el backend de Python.");
    } finally {
      setLoadingPythonProducts(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'CIERRE_CAJA') {
      loadPythonBackendData();
    }
  }, [activeSubTab]);

  const handleSaveNotifications = async () => {
    setNotifSaving(true);
    try {
      const res = await fetch('/api/python/configurar-notificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_destino: emailDestino,
          telefono_destino: telefonoDestino,
          smtp_server: smtpServer,
          smtp_port: 587,
          smtp_user: smtpUser,
          smtp_password: smtpPassword
        })
      });
      if (!res.ok) throw new Error("Fallo al guardar la configuración");
      const data = await res.json();
      alert("✓ " + data.message);
    } catch (err: any) {
      alert("❌ Error: " + err.message);
    } finally {
      setNotifSaving(false);
    }
  };

  const handleRegistrarVentaPrueba = async () => {
    setRegistrandoVenta(true);
    try {
      const res = await fetch('/api/python/registrar-venta-prueba', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_producto: ventaPruebaCode,
          cantidad_salon: Number(ventaPruebaSalon),
          cantidad_domicilio: Number(ventaPruebaDomicilio)
        })
      });
      if (!res.ok) throw new Error("Fallo al registrar la venta de prueba");
      const data = await res.json();
      alert("✓ " + data.message);
      // Reload products list
      const prodRes = await fetch('/api/python/productos');
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setPythonProducts(prodData);
      }
    } catch (err: any) {
      alert("❌ Error: " + err.message);
    } finally {
      setRegistrandoVenta(false);
    }
  };

  const handleEjecutarCierreMaestro = async () => {
    setEjecutandoCierre(true);
    try {
      const formattedConteos = Object.keys(conteosFisicos).map(code => ({
        codigo_producto: code,
        conteo_fisico: Number(conteosFisicos[code])
      }));

      const res = await fetch('/api/python/ejecutar-cierre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conteos_fisicos: formattedConteos,
          forzar_envio_smtp: forzarSmtp
        })
      });
      if (!res.ok) throw new Error("Fallo al ejecutar el cierre maestro de caja");
      const data = await res.json();
      setCierreResult(data);
      // Reload products
      const prodRes = await fetch('/api/python/productos');
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setPythonProducts(prodData);
      }
    } catch (err: any) {
      alert("❌ Error: " + err.message);
    } finally {
      setEjecutandoCierre(false);
    }
  };
  
  // Bulk supply injector state
  const [csvText, setCsvText] = useState(
    `# SKU, NUEVO_STOCK, COSTO_UNIDAD_COP\nRAW-BEEF-01, 35.0, 31500\nRAW-CHEESE-04, 18.0, 17800\nRAW-AVO-05, 80.0, 2400`
  );
  const [injectLogs, setInjectLogs] = useState<string[]>([]);
  const [loadingInject, setLoadingInject] = useState(false);

  // New Insumo state
  const [showAddInsumo, setShowAddInsumo] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newUnit, setNewUnit] = useState('Kg');
  const [newCat, setNewCat] = useState('Carnes');
  const [newStock, setNewStock] = useState(10);
  const [newMin, setNewMin] = useState(5);
  const [newCost, setNewCost] = useState(10000);

  const handleBulkInject = async () => {
    setLoadingInject(true);
    const logs: string[] = [];
    const payloadToSync: any[] = [];

    const lines = csvText.split('\n');
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      const parts = trimmed.split(',');
      if (parts.length >= 3) {
        const sku = parts[0].trim();
        const stock = parseFloat(parts[1].trim());
        const costPrice = parseFloat(parts[2].trim());

        if (sku && !isNaN(stock) && !isNaN(costPrice)) {
          payloadToSync.push({ sku, stock, costPrice, sedeId });
          logs.push(`✅ Procesado con éxito fila ${idx+1}: SKU [${sku}] ajustado a ${stock} unidades. Costo: $${costPrice.toLocaleString()} COP.`);
        } else {
          logs.push(`❌ Error en fila ${idx+1}: Datos de formato inválidos en "${trimmed}"`);
        }
      } else {
        logs.push(`⚠️ Saltando fila ${idx+1}: Formato incompleto, se esperaban 3 valores.`);
      }
    });

    if (payloadToSync.length > 0) {
      await onTriggerAction("BULK_UPDATE_INSUMOS", payloadToSync);
      logs.push(`🎉 Sincronización Heurística ERP Finalizada: ${payloadToSync.length} insumos de stock inyectados con éxito.`);
      refreshData();
    } else {
      logs.push(`❌ No se encontraron datos válidos para procesar.`);
    }

    setInjectLogs(logs);
    setLoadingInject(false);
  };

  const handleAddSingleInsumo = async () => {
    if (!newName || !newSku) return;

    const insumoPayload: Insumo = {
      id: `ins-${Date.now()}`,
      name: newName,
      sku: newSku,
      unit: newUnit,
      category: newCat,
      stock: Number(newStock),
      minStock: Number(newMin),
      costPrice: Number(newCost),
      supplierId: suppliers[0]?.id || 'sup1',
      sedeId
    };

    await onTriggerAction("ADD_INSUMO", insumoPayload);
    
    // Reset states
    setNewName('');
    setNewSku('');
    setShowAddInsumo(false);
    refreshData();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900 text-slate-100 font-sans">
      
      {/* Inventory Sub-Header */}
      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Package2 className="text-cyan-400 h-5 w-5" />
            CONTROL DE INVENTARIOS ERP
          </h2>
          <div className="h-4 w-px bg-slate-800"></div>
          <div className="flex gap-1 p-0.5 bg-slate-900 rounded-lg border border-slate-800">
            <button 
              onClick={() => setActiveSubTab('INSUMOS')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${activeSubTab === 'INSUMOS' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Insumos ERP
            </button>
            <button 
              onClick={() => setActiveSubTab('CARTA')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${activeSubTab === 'CARTA' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Fórmulas y Recetas
            </button>
            <button 
              onClick={() => setActiveSubTab('SUPPLIERS')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${activeSubTab === 'SUPPLIERS' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Proveedores
            </button>
            <button 
              onClick={() => setActiveSubTab('INJECT_SUMINISTROS')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${activeSubTab === 'INJECT_SUMINISTROS' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              ⚡ Inyectar Suministros
            </button>
            <button 
              onClick={() => setActiveSubTab('CIERRE_CAJA')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${activeSubTab === 'CIERRE_CAJA' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              📊 Cierre & Reportes
            </button>
          </div>
        </div>

        <button
          onClick={() => setShowAddInsumo(true)}
          className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Nuevo Insumo
        </button>
      </div>

      {activeSubTab === 'INSUMOS' && (
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-300 font-mono">BODEGA DE MATERIAS PRIMAS</h3>
            <span className="text-xs text-slate-500 font-mono">
              Insumos en rojo requieren reordenamiento crítico
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono bg-slate-900/40">
                    <th className="p-4">Insumo</th>
                    <th className="p-4">SKU ERP</th>
                    <th className="p-4">Categoría</th>
                    <th className="p-4 text-center">Unidad</th>
                    <th className="p-4 text-right">Costo / Unidad</th>
                    <th className="p-4 text-right">Stock Actual</th>
                    <th className="p-4 text-right">Stock Mínimo</th>
                    <th className="p-4 text-center">Estado Crítico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 font-mono">
                  {currentInsumos.map((ins) => {
                    const isLow = ins.stock <= ins.minStock;
                    return (
                      <tr key={ins.id} className={`hover:bg-slate-900/40 transition-colors ${isLow ? 'bg-red-500/[0.02]' : ''}`}>
                        <td className="p-4 font-sans font-bold text-slate-200">{ins.name}</td>
                        <td className="p-4 text-slate-400">{ins.sku}</td>
                        <td className="p-4 text-slate-400">{ins.category}</td>
                        <td className="p-4 text-center text-slate-300">{ins.unit}</td>
                        <td className="p-4 text-right text-emerald-400 font-bold">${ins.costPrice.toLocaleString()}</td>
                        <td className={`p-4 text-right font-bold text-sm ${isLow ? 'text-red-400' : 'text-emerald-400'}`}>
                          {ins.stock} {ins.unit}
                        </td>
                        <td className="p-4 text-right text-slate-500">{ins.minStock} {ins.unit}</td>
                        <td className="p-4 text-center">
                          {isLow ? (
                            <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-mono font-bold inline-flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              REORDENAR
                            </span>
                          ) : (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                              SALUDABLE
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'CARTA' && (
        <div className="flex-1 p-6 overflow-y-auto">
          <h3 className="text-sm font-bold text-slate-300 font-mono mb-4">RECETAS Y DEPRECIACIÓN AUTOMÁTICA</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentMenu.map((item) => (
              <div key={item.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 border border-cyan-500/20 rounded uppercase">
                    {item.category.replace('_', ' ')}
                  </span>
                  <h4 className="text-sm font-bold text-white mt-2">{item.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                </div>

                <div className="border-t border-slate-900 pt-3 space-y-2 text-xs">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Ingredientes de Receta:</span>
                  {item.ingredients.length === 0 ? (
                    <span className="text-slate-600 font-mono italic">Sin ingredientes vinculados</span>
                  ) : (
                    item.ingredients.map((ing, idx) => {
                      const insumoObj = insumos.find(i => i.id === ing.insumoId);
                      return (
                        <div key={idx} className="flex justify-between text-slate-300 font-mono text-[11px]">
                          <span>• {insumoObj ? insumoObj.name : 'Insumo Eliminado'}</span>
                          <span className="font-bold text-cyan-400">{ing.qty} {insumoObj?.unit || 'Und'}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'SUPPLIERS' && (
        <div className="flex-1 p-6 overflow-y-auto">
          <h3 className="text-sm font-bold text-slate-300 font-mono mb-4 font-sans">PORTAFOLIO DE PROVEEDORES</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {suppliers.map((sup) => (
              <div key={sup.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex items-start gap-4">
                <div className="h-10 w-10 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl flex items-center justify-center shrink-0">
                  <Users2 className="h-5 w-5" />
                </div>
                <div className="space-y-1.5 text-xs">
                  <h4 className="text-sm font-bold text-white leading-tight">{sup.name}</h4>
                  <p className="text-slate-400 font-mono">Categoría: {sup.category}</p>
                  <p className="text-slate-400 font-mono">Teléfono: {sup.phone}</p>
                  <p className="text-slate-400 font-mono">Email: {sup.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'INJECT_SUMINISTROS' && (
        <div className="flex-1 p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                  SISTEMA DE INYECCIÓN ERP
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Pegue o escriba los datos de los suministros entregados por el proveedor en formato CSV para actualizar el stock y costos de forma automática.
                </p>
              </div>

              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full h-44 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-emerald-400 font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                placeholder="SKU, NUEVO_STOCK, COSTO_UNIDAD_COP"
              />

              <button
                onClick={handleBulkInject}
                disabled={loadingInject}
                className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                {loadingInject ? 'Procesando Sincronización Heurística...' : 'Efectuar Sincronización de Bodega'}
              </button>
            </div>
          </div>

          {/* Logs of injection */}
          <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col overflow-hidden h-[420px]">
            <h4 className="text-xs font-mono font-bold text-slate-300 border-b border-slate-800 pb-3 mb-3 shrink-0 flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 text-cyan-400 animate-spin" />
              CONSOLA DE AJUSTES EN TIEMPO REAL
            </h4>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-[10px] text-slate-400">
              {injectLogs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-600">
                  Esperando inyección de datos para procesar registros...
                </div>
              ) : (
                injectLogs.map((log, idx) => (
                  <div key={idx} className="bg-slate-900/60 p-2 rounded border border-slate-850">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'CIERRE_CAJA' && (
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-300 font-mono flex items-center gap-2 uppercase">
                <Calculator className="h-4.5 w-4.5 text-cyan-400" />
                Módulo Grocer OS - Cierre de Caja & Automatización de Reportes
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Calcule arqueos de stock de proteínas y bebidas, registre mermas reales y despache informes PDF/Excel por SMTP y WhatsApp.
              </p>
            </div>
            
            <button
              onClick={loadPythonBackendData}
              disabled={loadingPythonProducts}
              className="bg-slate-950 hover:bg-slate-800 text-cyan-400 border border-slate-800 font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingPythonProducts ? 'animate-spin' : ''}`} />
              Sincronizar Backend
            </button>
          </div>

          {pythonStatusError && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-xs text-red-400 font-mono space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="h-4.5 w-4.5" />
                <span>Error de Comunicación con el Servidor Backend:</span>
              </div>
              <p>{pythonStatusError}</p>
              <p className="text-[10px] text-slate-500 leading-normal">
                Nota: El contenedor se está aprovisionando e instalando pip en segundo plano. Una vez finalice la instalación del paquete, el proceso se enlazará automáticamente al puerto 8001. Espere unos instantes y presione "Sincronizar Backend".
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            
            {/* PANEL IZQUIERDO: CONFIGURACIONES & INYECCIÓN (4 COLS) */}
            <div className="xl:col-span-4 space-y-6">
              
              {/* CONFIGURACIÓN DE NOTIFICACIONES */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-md">
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-2">
                  <Settings className="h-3.5 w-3.5 text-cyan-400" />
                  Destinatarios de Reportes
                </h4>
                
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-mono text-[10px]">CORREO ELECTRÓNICO (SMTP DEST):</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                      <input 
                        type="email" 
                        value={emailDestino}
                        onChange={(e) => setEmailDestino(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                        placeholder="gerente@grocer.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 font-mono text-[10px]">CELULAR / WHATSAPP (DESTINO):</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                      <input 
                        type="text" 
                        value={telefonoDestino}
                        onChange={(e) => setTelefonoDestino(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                        placeholder="+573155556677"
                      />
                    </div>
                  </div>

                  <details className="text-[10px] text-slate-500 space-y-2 cursor-pointer">
                    <summary className="hover:text-slate-300 font-mono">Credenciales SMTP de Remitente (Opcional)</summary>
                    <div className="space-y-2 bg-slate-900 p-3 rounded-lg border border-slate-850 mt-1 cursor-default" onClick={(e)=>e.stopPropagation()}>
                      <div className="space-y-1">
                        <label className="text-slate-500 font-mono text-[8px]">Servidor SMTP:</label>
                        <input 
                          type="text" 
                          value={smtpServer} 
                          onChange={(e)=>setSmtpServer(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-white font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-500 font-mono text-[8px]">Usuario SMTP:</label>
                        <input 
                          type="text" 
                          value={smtpUser} 
                          onChange={(e)=>setSmtpUser(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-white font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-500 font-mono text-[8px]">Contraseña SMTP:</label>
                        <input 
                          type="password" 
                          value={smtpPassword} 
                          onChange={(e)=>setSmtpPassword(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-white font-mono"
                        />
                      </div>
                    </div>
                  </details>

                  <button
                    onClick={handleSaveNotifications}
                    disabled={notifSaving}
                    className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-45 text-slate-950 font-bold py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {notifSaving ? 'Guardando Destinatarios...' : 'Guardar Destinatarios de Pruebas'}
                  </button>
                </div>
              </div>

              {/* INYECCIÓN DE VENTAS DE PRUEBA */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-md">
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-2">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  Inyectar Ventas Diarias
                </h4>
                
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Utilice este panel para simular el consumo operativo diario. Las proteínas y gaseosas consumidas descontarán automáticamente su stock teórico.
                </p>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-400">Seleccionar Producto:</label>
                    <select
                      value={ventaPruebaCode}
                      onChange={(e) => setVentaPruebaCode(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none font-mono cursor-pointer"
                    >
                      {pythonProducts.map((p) => (
                        <option key={p.codigo} value={p.codigo}>
                          [{p.codigo}] {p.nombre} - ${p.precio.toLocaleString()} ({p.es_critico ? 'Crítico' : 'Estadístico'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-400">Cant. Salón (Unids):</label>
                      <input 
                        type="number" 
                        value={ventaPruebaSalon}
                        onChange={(e) => setVentaPruebaSalon(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-400">Cant. Domicilio:</label>
                      <input 
                        type="number" 
                        value={ventaPruebaDomicilio}
                        onChange={(e) => setVentaPruebaDomicilio(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleRegistrarVentaPrueba}
                    disabled={registrandoVenta}
                    className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 font-bold py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Coffee className="h-3.5 w-3.5" />
                    {registrandoVenta ? 'Registrando Venta...' : 'Registrar Venta de Prueba'}
                  </button>
                </div>
              </div>

            </div>

            {/* PANEL CENTRAL: ARQUEO DE STOCK CRÍTICO (5 COLS) */}
            <div className="xl:col-span-5 space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                  <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Coins className="h-3.5 w-3.5 text-cyan-400" />
                    Arqueo de Inventario Crítico
                  </h4>
                  <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 border border-amber-500/20 rounded">
                    Conteo Físico Obligatorio al Cierre
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Para proteínas (pollo, carne, pescado) y bebidas/gaseosas se requiere un conteo físico manual al cierre de caja. El sistema calcula las mermas automáticamente.
                </p>

                <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-850">
                  {pythonProducts.length === 0 ? (
                    <div className="text-center py-12 text-slate-600 font-mono text-xs">
                      Cargando listado de productos... El backend se está enlazando.
                    </div>
                  ) : (
                    pythonProducts.map((p) => {
                      if (!p.es_critico) return null;
                      return (
                        <div key={p.codigo} className="flex items-center justify-between py-2.5 text-xs font-mono">
                          <div className="space-y-0.5 max-w-[240px]">
                            <div className="text-slate-200 font-bold truncate">
                              [{p.codigo}] {p.nombre}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2">
                              <span>Inicial: {p.stock_inicial} u</span>
                              <span className="text-slate-600">|</span>
                              <span className="text-emerald-400">Teórico: {p.stock_actual} u</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500">Conteo Físico:</span>
                            <input
                              type="number"
                              value={conteosFisicos[p.codigo] !== undefined ? conteosFisicos[p.codigo] : p.stock_actual}
                              onChange={(e) => setConteosFisicos({
                                ...conteosFisicos,
                                [p.codigo]: Number(e.target.value)
                              })}
                              className="w-16 bg-slate-900 border border-slate-800 text-cyan-400 font-bold rounded p-1 text-center text-xs focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Accompaniments notification */}
                <div className="bg-slate-900/50 border border-slate-850 p-3 rounded-xl mt-3 space-y-1">
                  <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                    📌 Acompañamientos Estadísticos (Papa, arroz, ensalada, etc.):
                  </span>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                    Estos productos acumulan unidades vendidas en el día de forma automática para fines informativos, pero no requieren control de stock crudo por kilo ni conteo físico obligatorio al final del día.
                  </p>
                </div>
              </div>
            </div>

            {/* PANEL DERECHO: CONSOLA DE CIERRE & RESULTADOS (3 COLS) */}
            <div className="xl:col-span-3 space-y-4">
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-md flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-2">
                    <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
                    Cierre de Caja Maestro
                  </h4>

                  <p className="text-[11px] text-slate-400 leading-relaxed mt-2">
                    Efectúe el cálculo final del recaudo financiero separado por canales (Salón vs Domicilio), genere los reportes listos para descargar y despache las notificaciones de prueba.
                  </p>

                  <div className="space-y-3 mt-4 text-xs">
                    <label className="flex items-center gap-2 text-slate-300 font-mono text-[10px] cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={forzarSmtp}
                        onChange={(e) => setForzarSmtp(e.target.checked)}
                        className="rounded border-slate-800 bg-slate-900 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      <span>FORZAR ENVÍO SMTP REAL</span>
                    </label>
                    <p className="text-[9px] text-slate-500 leading-normal font-sans">
                      Por defecto, el sistema emula el envío SMTP local de pruebas para no requerir credenciales reales. Marque para intentar conexión real con las credenciales ingresadas.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleEjecutarCierreMaestro}
                  disabled={ejecutandoCierre || pythonProducts.length === 0}
                  className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 disabled:opacity-40 text-slate-950 font-black py-3 rounded-xl text-xs transition-all shadow-lg shadow-cyan-950/20 cursor-pointer flex items-center justify-center gap-1.5 mt-4"
                >
                  <Calculator className="h-4.5 w-4.5" />
                  {ejecutandoCierre ? 'Procesando Cierre de Jornada...' : 'EJECUTAR CIERRE DE JORNADA'}
                </button>
              </div>

              {/* REPORT OUTCOME CARD */}
              {cierreResult && (
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-md animate-fade-in">
                  <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-2">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Cierre Exitoso: {cierreResult.fecha_cierre}
                  </h4>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Recaudado:</span>
                      <span className="font-bold text-emerald-400">${cierreResult.total_recaudado_cop.toLocaleString()} COP</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">• Canal Salón:</span>
                      <span className="text-slate-300">${cierreResult.resumen_financiero.salon.toLocaleString()} ({cierreResult.resumen_financiero.unidades_salon} u)</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">• Canal Domicilio:</span>
                      <span className="text-slate-300">${cierreResult.resumen_financiero.domicilio.toLocaleString()} ({cierreResult.resumen_financiero.unidades_domicilio} u)</span>
                    </div>
                  </div>

                  {/* Document Downloads */}
                  <div className="space-y-2 pt-2 border-t border-slate-900">
                    <span className="text-[9px] font-mono text-slate-400 block uppercase font-bold">Reportes de Control Generados:</span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={`/api/python/descargar/${cierreResult.reportes_generados.excel}`}
                        download
                        className="bg-slate-900 hover:bg-slate-850 border border-slate-800 px-2 py-1.5 rounded-lg text-[10px] font-mono font-bold text-cyan-400 flex items-center justify-center gap-1 text-center cursor-pointer"
                        title="Descargar Reporte Completo en Excel"
                      >
                        <FileSpreadsheet className="h-3 w-3" />
                        Excel
                      </a>
                      
                      <a
                        href={`/api/python/descargar/${cierreResult.reportes_generados.pdf}`}
                        download
                        className="bg-slate-900 hover:bg-slate-850 border border-slate-800 px-2 py-1.5 rounded-lg text-[10px] font-mono font-bold text-rose-400 flex items-center justify-center gap-1 text-center cursor-pointer"
                        title="Descargar Reporte Firmado en PDF"
                      >
                        <FileText className="h-3 w-3" />
                        PDF
                      </a>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* SIMULATION CONSOLE LOGS AT THE BOTTOM */}
          {cierreResult && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg p-5">
              <h4 className="text-xs font-mono font-bold text-slate-200 border-b border-slate-850 pb-2 mb-3 flex items-center gap-2">
                <Terminal className="h-4 w-4 text-cyan-400" />
                CONSOLA DE ENVÍOS AUTOMÁTICOS EN TIEMPO REAL - PRUEBAS DE SOFTWARE
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-850 flex flex-col h-[280px]">
                  <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block mb-2 border-b border-slate-800 pb-1">
                    📩 LOG DE PRUEBA CORREO SMTP
                  </span>
                  <pre className="flex-1 overflow-y-auto text-[9px] font-mono text-slate-300 leading-normal whitespace-pre-wrap font-semibold pr-1">
                    {cierreResult.resultado_envios_prueba.email_smtp.log_simulacion}
                  </pre>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-850 flex flex-col h-[280px]">
                  <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block mb-2 border-b border-slate-800 pb-1">
                    📱 LOG DE PRUEBA MENSAJERÍA MÓVIL (WHATSAPP/SMS)
                  </span>
                  <pre className="flex-1 overflow-y-auto text-[9px] font-mono text-slate-300 leading-normal whitespace-pre-wrap font-semibold pr-1">
                    {cierreResult.resultado_envios_prueba.telefono_push.log_simulacion}
                  </pre>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* NEW SINGLE INSUMO MODAL */}
      {showAddInsumo && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Plus className="text-cyan-400 h-5 w-5" />
              AGREGAR NUEVO INSUMO AL ERP
            </h3>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400">Nombre del Insumo:</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej. Pechuga de Pollo Premium (Kg)"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">SKU Código Interno:</label>
                  <input 
                    type="text" 
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    placeholder="Ej. RAW-CHICK-09"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none font-mono text-cyan-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Unidad:</label>
                  <select 
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none cursor-pointer"
                  >
                    <option value="Kg">Kilogramo (Kg)</option>
                    <option value="Und">Unidad (Und)</option>
                    <option value="Lt">Litro (Lt)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">Stock Inicial:</label>
                  <input 
                    type="number" 
                    value={newStock}
                    onChange={(e) => setNewStock(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Mínimo Alerta:</label>
                  <input 
                    type="number" 
                    value={newMin}
                    onChange={(e) => setNewMin(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none font-mono text-red-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Costo Unitario:</label>
                  <input 
                    type="number" 
                    value={newCost}
                    onChange={(e) => setNewCost(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none font-mono text-emerald-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button onClick={() => setShowAddInsumo(false)} className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleAddSingleInsumo} className="bg-cyan-500 text-slate-950 hover:bg-cyan-600 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer">
                Agregar Insumo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
