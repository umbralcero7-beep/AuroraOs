import React, { useState } from 'react';
import { Printer, X, ShieldAlert, Check } from 'lucide-react';
import { Domicilio, MenuItem } from '../types';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Domicilio | null;
  menuItems: MenuItem[];
}

export default function ReceiptModal({ isOpen, onClose, order, menuItems }: ReceiptModalProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  if (!isOpen || !order) return null;

  // Simple security passcode verification (Simulates manager authorization for reprint/print)
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === '1234' || passcode === '2026') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('🔑 Código de Supervisor incorrecto.');
    }
  };

  const getMenuItemCode = (name: string): string => {
    const item = menuItems.find(i => i.name.toLowerCase() === name.toLowerCase());
    if (item) {
      // Return numeric code derived from ID or name
      const numericId = item.id.replace(/\D/g, '');
      return numericId ? `1${numericId.substring(0, 2)}` : '101';
    }
    return '101';
  };

  const formattedDate = new Date(order.timestamp).toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const subtotal = order.items.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);

  // Raw monospace thermal print text generator
  const generateThermalText = (copyTitle: string) => {
    const divider = "------------------------------------------";
    const boldDivider = "==========================================";
    
    let text = `   *** ${copyTitle.toUpperCase()} ***\n`;
    text += `            AURORA RESTAURANTE\n`;
    text += `         NIT: 901.452.883-1 - MEDELLIN\n`;
    text += `             TELEFONO: 444-5566\n`;
    text += `${divider}\n`;
    text += `TICKET REF: #${order.id.substring(4).toUpperCase()}\n`;
    text += `FECHA: ${formattedDate}\n`;
    text += `CLIENTE: ${order.customerName}\n`;
    text += `TEL: ${order.customerPhone}\n`;
    text += `${boldDivider}\n`;
    text += `>>> DIRECCION DE DESPACHO <<<\n`;
    text += `${order.customerAddress.toUpperCase()}\n`;
    if (order.notes) {
      text += `NOTAS: ${order.notes}\n`;
    }
    text += `${boldDivider}\n`;
    text += `[COD] CANT  DETALLE               SUBTOTAL\n`;
    text += `${divider}\n`;
    
    order.items.forEach(item => {
      const code = getMenuItemCode(item.name).padEnd(5, ' ');
      const qtyStr = `${item.qty}x`.padEnd(5, ' ');
      
      // Truncate name to 20 chars
      const nameStr = item.name.substring(0, 20).padEnd(20, ' ');
      const subtotalStr = `$${(item.price * item.qty).toLocaleString('es-CO')}`.padStart(10, ' ');
      text += `${code}${qtyStr}${nameStr}${subtotalStr}\n`;
    });
    
    text += `${divider}\n`;
    text += `SUBTOTAL:`.padEnd(30, ' ') + `$${subtotal.toLocaleString('es-CO')}\n`;
    text += `ENVIO:`.padEnd(30, ' ') + `$${order.deliveryCost.toLocaleString('es-CO')}\n`;
    text += `TOTAL NETO:`.padEnd(30, ' ') + `$${order.total.toLocaleString('es-CO')}\n`;
    text += `${divider}\n`;
    text += `  Forma de pago prevista: ${order.notes?.includes('TARJETA') ? 'DATAFONO' : order.notes?.includes('TRANSFERENCIA') ? 'TRANSFERENCIA' : 'EFECTIVO'}\n`;
    text += `      ¡Gracias por elegir a Aurora!\n`;
    text += `        Branded by Umbral Cero OS\n\n`;
    return text;
  };

  const handlePrintTrigger = () => {
    // Standard alert simulation of physical thermal printer emit
    alert(`⚡ IMPRESORA TÉRMICA CASILLERO SECTOR 1:\nDisparando tiquete con ancho de 80mm de papel térmico.\n\nSe han impreso con éxito 2 copias:\n1. Copia de Control Interno Caja/Cocina\n2. Copia del Repartidor con dirección resaltada.`);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div id="receipt-modal-card" className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
          <div>
            <h4 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Printer className="h-4 w-4 text-cyan-400" /> Vista Previa del Ticket Térmico
            </h4>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Doble Copia / Papel Térmico Blanco de 80mm</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Security Gate */}
        {!isAuthenticated ? (
          <div className="p-8 flex-1 overflow-y-auto flex flex-col items-center justify-center space-y-6 text-center">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h5 className="text-slate-200 font-bold text-sm">Control de Seguridad de Impresión</h5>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-2">
                Para imprimir o reimprimir un ticket de despacho en hora pico, digite el código PIN del supervisor.
              </p>
            </div>
            <form onSubmit={handleAuthSubmit} className="w-full max-w-xs space-y-3">
              <input
                type="password"
                placeholder="PIN del Supervisor (ej. 1234)"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-sm tracking-widest text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                autoFocus
              />
              {authError && <p className="text-[11px] text-red-400 font-mono">{authError}</p>}
              <button
                type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-extrabold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer"
              >
                Validar PIN e Ingresar
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Thermal Ticket Mock */
          <div className="flex-1 overflow-y-auto p-6 bg-slate-950/20 flex flex-col items-center space-y-6">
            
            {/* Quick Actions Bar */}
            <div className="w-full flex justify-between items-center bg-slate-900 border border-slate-800/80 rounded-2xl p-3">
              <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1.5 bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1 rounded-lg">
                <Check className="h-3.5 w-3.5" /> Acceso de Impresión Concedido
              </span>
              <button
                onClick={handlePrintTrigger}
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs py-1.5 px-4 rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" /> Imprimir Ahora
              </button>
            </div>

            {/* The Ticket Container (Simulates Physical White Paper Roll) */}
            <div className="bg-white text-slate-900 font-mono text-[11px] leading-tight p-6 shadow-xl w-full max-w-[340px] rounded border border-slate-200 select-all overflow-x-auto select-text">
              
              {/* Copy 1: Control Interno */}
              <pre className="whitespace-pre">{generateThermalText("COPIA 1 - CONTROL INTERNO CAJA")}</pre>
              
              {/* Simulated physical cut tear */}
              <div className="my-4 border-t border-dashed border-slate-400 relative">
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-slate-100 text-[8px] text-slate-400 px-2 font-black tracking-wider uppercase border border-slate-200 rounded">
                  ✂ Corte de Papel Térmico ✂
                </span>
              </div>

              {/* Copy 2: Repartidor */}
              <pre className="whitespace-pre mt-4">{generateThermalText("COPIA 2 - ENTREGAS / REPARTIDOR")}</pre>
            </div>
            
            <p className="text-[9px] text-slate-500 font-mono text-center">
              * Nota: El tiquete es blanco y de fuente monospace para garantizar legibilidad en papel térmico físico de alta durabilidad.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
