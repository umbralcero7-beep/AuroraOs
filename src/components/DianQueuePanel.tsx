import React, { useState } from 'react';
import { FileText, Clock, CheckCircle2, AlertCircle, RefreshCw, Send, HelpCircle } from 'lucide-react';
import { Domicilio } from '../types';

interface DianQueuePanelProps {
  domicilios: Domicilio[];
  onTriggerAction: (action: string, payload: any) => Promise<any>;
  refreshData: () => void;
}

export default function DianQueuePanel({ domicilios, onTriggerAction, refreshData }: DianQueuePanelProps) {
  // Filter deliveries that require invoice and are currently in DIAN pipeline
  const dianOrders = domicilios.filter(d => d.requireInvoice === true || d.invoiceStatus === 'ESPERA_CAJA' || d.invoiceStatus === 'VALIDADO_DIAN');
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  const handleValidateDianInvoice = async (orderId: string) => {
    setProcessingOrderId(orderId);
    
    // Simulate DIAN validation API latency (3 seconds)
    setTimeout(async () => {
      try {
        const randomCUFE = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        
        // Fully updated state payload
        await onTriggerAction("UPDATE_DOMICILIO_STATUS", {
          id: orderId,
          status: 'PREPARANDO', // Shift to preparing state once validated
          invoiceStatus: 'VALIDADO_DIAN',
          cufeHash: randomCUFE,
          dianXmlUrl: `https://catalogo.dian.gov.co/document/validation?cufe=${randomCUFE}`
        });
        
        alert(`🎉 DIAN Colombia - Factura Electrónica Validada!\nID: #${orderId.substring(4).toUpperCase()}\nCUFE generado con éxito:\n${randomCUFE}\n\nEl pedido ya pasó de "Espera en Caja" a "En Preparación" en cocina.`);
        refreshData();
      } catch (err: any) {
        alert(`⚠️ Error en pasarela DIAN: ${err.message}`);
      } finally {
        setProcessingOrderId(null);
      }
    }, 2500);
  };

  return (
    <div className="bg-[#0D1425]/40 backdrop-blur-md border border-slate-800/80 rounded-3xl p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-amber-400" />
          <div>
            <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              Cola de Validación Facturación Electrónica DIAN
            </h4>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Módulo de Cajero Central & Enlace Gubernamental</p>
          </div>
        </div>
        <span className="text-[10px] bg-amber-500/10 text-amber-400 font-mono font-extrabold px-2 py-0.5 rounded-lg border border-amber-500/10">
          {dianOrders.filter(o => o.status === 'PENDIENTE' || o.invoiceStatus === 'ESPERA_CAJA').length} En Espera
        </span>
      </div>

      {dianOrders.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-xs font-mono">
          <Clock className="h-6 w-6 mx-auto text-slate-600 mb-2" />
          No hay pedidos pendientes en la cola de facturación electrónica.
        </div>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {dianOrders.map((order) => {
            const isWaiting = order.status === 'PENDIENTE' || order.invoiceStatus === 'ESPERA_CAJA';
            const isValidated = order.invoiceStatus === 'VALIDADO_DIAN';
            
            return (
              <div 
                key={order.id} 
                className={`p-3.5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  isValidated 
                    ? 'bg-emerald-950/10 border-emerald-500/20 text-slate-300' 
                    : 'bg-amber-950/10 border-amber-500/20 text-slate-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-200">
                      Pedido #{order.id.substring(4).toUpperCase()}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                      {order.customerName}
                    </span>
                    <span className="text-[9px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                      💰 ${order.total.toLocaleString('es-CO')}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 font-mono truncate max-w-sm">
                    📍 {order.customerAddress}
                  </p>

                  {/* CUFE display if validated */}
                  {order.cufeHash && (
                    <div className="text-[9px] font-mono text-emerald-400 bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10 mt-1 flex flex-col gap-0.5">
                      <span className="font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" /> XML VALIDADO & FIRMADO DIAN
                      </span>
                      <span className="truncate block select-all">CUFE: {order.cufeHash}</span>
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  {isValidated ? (
                    <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-mono bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                      <CheckCircle2 className="h-4 w-4" /> Validado DIAN
                    </div>
                  ) : processingOrderId === order.id ? (
                    <div className="flex items-center gap-2 text-amber-400 text-[11px] font-mono bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Procesando XML...
                    </div>
                  ) : (
                    <button
                      onClick={() => handleValidateDianInvoice(order.id)}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-[10px] font-mono px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-500/10"
                    >
                      <Send className="h-3 w-3" /> Validar XML/CUFE
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="bg-slate-950/20 rounded-2xl p-3 border border-slate-800/40 text-[10px] text-slate-400 font-mono leading-relaxed flex gap-2">
        <HelpCircle className="h-4 w-4 text-cyan-400 shrink-0" />
        <span>
          En hora pico, al activar la Factura Electrónica, el pedido queda en "Espera en Caja" para evitar que el call center espere la respuesta de la DIAN. El cajero procesa el XML/CUFE aquí, liberando al recepcionista de inmediato.
        </span>
      </div>
    </div>
  );
}
