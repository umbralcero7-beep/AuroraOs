import React, { useState, useEffect } from 'react';
import { 
  X, 
  Receipt, 
  QrCode, 
  Search, 
  Sparkles, 
  User, 
  Mail, 
  CheckCircle, 
  CreditCard, 
  Wallet,
  Coins,
  Info,
  ArrowRight
} from 'lucide-react';

interface Customer {
  name: string;
  doc: string;
  email: string;
}

interface CashCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  defaultPaymentMethod?: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO';
  onConfirm: (data: {
    type: 'POS' | 'ELECTRONICA';
    customerName: string;
    customerDocument: string;
    customerEmail: string;
    receivedCash: number;
    paymentMethod: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO';
  }) => void;
}

const REGULAR_CUSTOMERS: Customer[] = [
  { name: "Alimentos del Norte S.A.S.", doc: "901.432.885-1", email: "facturacion@alimentosnorte.co" },
  { name: "Juan Carlos Gómez", doc: "79.345.912", email: "jc.gomez@gmail.com" },
  { name: "María Camila Restrepo", doc: "1.017.224.551", email: "camila.restrepo@outlook.com" },
  { name: "Consumidor Especial S.A.", doc: "800.192.443-4", email: "proveedores@consumidorespecial.com" },
];

const COLOMBIAN_BILLS = [
  { value: 100000, label: '$100.000', color: 'border-emerald-900/40 hover:border-emerald-500 bg-emerald-500/10 text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
  { value: 50000, label: '$50.000', color: 'border-violet-900/40 hover:border-violet-500 bg-violet-500/10 text-violet-400', badge: 'bg-violet-500/20 text-violet-300' },
  { value: 20000, label: '$20.000', color: 'border-orange-900/40 hover:border-orange-500 bg-orange-500/10 text-orange-400', badge: 'bg-orange-500/20 text-orange-300' },
  { value: 10000, label: '$10.000', color: 'border-red-900/40 hover:border-red-500 bg-red-500/10 text-red-400', badge: 'bg-red-500/20 text-red-300' },
  { value: 5000, label: '$5.000', color: 'border-amber-900/40 hover:border-amber-500 bg-amber-500/10 text-amber-400', badge: 'bg-amber-500/20 text-amber-300' },
];

export default function CashCheckoutModal({
  isOpen,
  onClose,
  total,
  defaultPaymentMethod,
  onConfirm
}: CashCheckoutModalProps) {
  const [invoiceType, setInvoiceType] = useState<'POS' | 'ELECTRONICA'>('POS');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerDocument, setCustomerDocument] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [receivedCash, setReceivedCash] = useState<number | null>(null);
  const [selectedBills, setSelectedBills] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');
  const [customCashInput, setCustomCashInput] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO'>('EFECTIVO');

  // Reset states on open/close
  useEffect(() => {
    if (isOpen) {
      setInvoiceType('POS');
      setCustomerName('');
      setCustomerDocument('');
      setCustomerEmail('');
      setReceivedCash(null);
      setSelectedBills([]);
      setSearchQuery('');
      setValidationError('');
      setCustomCashInput('');
      setSelectedMethod(defaultPaymentMethod || 'EFECTIVO');
    }
  }, [isOpen, defaultPaymentMethod]);

  // Keyboard listeners for rapid POS checkout [F1] / [F2]
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'F1') {
        e.preventDefault();
        setInvoiceType('POS');
        setValidationError('');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setInvoiceType('ELECTRONICA');
        setValidationError('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredCustomers = REGULAR_CUSTOMERS.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.doc.includes(searchQuery) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectCustomer = (cust: Customer) => {
    setCustomerName(cust.name);
    setCustomerDocument(cust.doc);
    setCustomerEmail(cust.email);
    setValidationError('');
  };

  const calculateChange = () => {
    if (receivedCash === null || receivedCash < total) return 0;
    return receivedCash - total;
  };

  // Validate DIAN electronic details
  const validateDIAN = (): boolean => {
    if (invoiceType === 'ELECTRONICA') {
      if (!customerName.trim() || !customerDocument.trim()) {
        setValidationError("⚠️ Falta Información Fiscal: Nombre y Documento (NIT/Cédula) son obligatorios para Facturación Electrónica.");
        return false;
      }
      if (!customerEmail.trim() || !customerEmail.includes('@')) {
        setValidationError("⚠️ Correo Electrónico Requerido: Ingrese un correo electrónico válido para enviar el archivo XML reglamentado por la DIAN.");
        return false;
      }
    }
    return true;
  };

  // SUM UP BILLS AND AUTOMATICALLY CALCULATE CHANGE IN REAL-TIME
  const handleSelectBill = (billValue: number) => {
    const currentBills = [...selectedBills, billValue];
    setSelectedBills(currentBills);
    
    const sum = currentBills.reduce((acc, val) => acc + val, 0);
    setReceivedCash(sum);
    setValidationError('');
  };

  const handleExactPayment = () => {
    setSelectedBills([]);
    setReceivedCash(total);
    setValidationError('');
  };

  const handleClearCash = () => {
    setSelectedBills([]);
    setReceivedCash(null);
    setCustomCashInput('');
    setValidationError('');
  };

  // Manual payment submission
  const handleSubmit = (method: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO') => {
    if (invoiceType === 'ELECTRONICA') {
      const isValid = validateDIAN();
      if (!isValid) return;
    }

    const cash = receivedCash !== null ? receivedCash : total;
    
    if (method === 'EFECTIVO' && cash < total) {
      setValidationError(`⚠️ El monto recibido ($${cash.toLocaleString()}) es menor al total de la cuenta ($${total.toLocaleString()}).`);
      return;
    }

    onConfirm({
      type: invoiceType,
      customerName: invoiceType === 'ELECTRONICA' ? customerName.trim() : (customerName.trim() || 'Consumidor Final'),
      customerDocument: invoiceType === 'ELECTRONICA' ? customerDocument.trim() : (customerDocument.trim() || '222222222222'),
      customerEmail: customerEmail.trim(),
      receivedCash: method === 'EFECTIVO' ? cash : (method === 'MIXTO' ? (receivedCash !== null ? receivedCash : Math.floor(total / 2)) : 0),
      paymentMethod: method
    });
  };

  const changeDue = calculateChange();

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 font-sans text-slate-100 animate-fade-in">
      <div className="bg-[#0D1425] rounded-[2rem] p-6 md:p-8 w-full max-w-5xl shadow-2xl border border-blue-950/80 flex flex-col space-y-6 relative max-h-[92vh] overflow-y-auto">
        
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all cursor-pointer"
          title="Cerrar modal"
          id="close-cash-modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-blue-950 pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-cyan-500/10 text-[#06B6D4] text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider border border-cyan-500/20">
                Fricción Cero • UltraPOS
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 text-xs font-mono">Registro Inmediato de Caja</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-100 font-sans">
              Liquidación y Facturación
            </h2>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] text-slate-400 block font-mono font-bold tracking-wider">TOTAL A COBRAR</span>
            <span className="text-3xl font-black text-[#06B6D4] tracking-tight">
              ${total.toLocaleString()} <span className="text-xs text-slate-400 font-normal">COP</span>
            </span>
          </div>
        </div>

        {/* REDESIGNED: Two Main Buttons at the Top for Invoice Type Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => {
              setInvoiceType('POS');
              setValidationError('');
            }}
            className={`p-5 rounded-2xl border-2 text-left transition-all flex items-center justify-between cursor-pointer relative ${
              invoiceType === 'POS'
                ? 'border-[#06B6D4] bg-[#06B6D4]/5 ring-1 ring-[#06B6D4]/30 shadow-lg'
                : 'border-slate-800 bg-[#121A2E]/40 hover:border-slate-700 hover:bg-[#121A2E]/70'
            }`}
            id="invoice-type-pos"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${invoiceType === 'POS' ? 'bg-[#06B6D4]/10 text-[#06B6D4]' : 'bg-slate-800/50 text-slate-400'}`}>
                <Receipt className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-slate-100">Venta Interna</h4>
                <p className="text-xs text-slate-400 mt-0.5">Ticket POS simplificado sin datos de cliente</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              F1
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setInvoiceType('ELECTRONICA');
              setValidationError('');
            }}
            className={`p-5 rounded-2xl border-2 text-left transition-all flex items-center justify-between cursor-pointer relative ${
              invoiceType === 'ELECTRONICA'
                ? 'border-[#06B6D4] bg-[#06B6D4]/5 ring-1 ring-[#06B6D4]/30 shadow-lg'
                : 'border-slate-800 bg-[#121A2E]/40 hover:border-slate-700 hover:bg-[#121A2E]/70'
            }`}
            id="invoice-type-electronic"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${invoiceType === 'ELECTRONICA' ? 'bg-[#06B6D4]/10 text-[#06B6D4]' : 'bg-slate-800/50 text-slate-400'}`}>
                <QrCode className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-slate-100">Factura Electrónica</h4>
                <p className="text-xs text-slate-400 mt-0.5">Reporte oficial DIAN con datos fiscales</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              F2
            </span>
          </button>
        </div>

        {/* Main Body Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
          
          {/* COLUMN 1: Client details (For Factura Electrónica) or simplified info (for Venta Interna) */}
          <div className="lg:col-span-5 space-y-4">
            {invoiceType === 'POS' ? (
              <div className="bg-[#121A2E]/50 border border-blue-950/60 rounded-3xl p-6 text-xs text-slate-300 space-y-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block font-mono">
                  Datos de Facturación
                </span>
                <div className="flex items-start gap-3.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-[#06B6D4] shrink-0 mt-0.5">
                    <Info className="h-5 w-5" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="font-extrabold text-slate-100 text-sm block">Consumidor Final Automático</span>
                    <p className="leading-relaxed text-slate-300">
                      Esta opción emite una remisión comercial simplificada. No se requieren datos del comensal, permitiendo procesar el cobro de inmediato.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-blue-950/60 bg-[#121A2E]/50 rounded-3xl p-5 space-y-4 animate-slide-up">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block font-mono">
                  Datos Fiscales del Adquirente
                </span>
                
                {/* Auto-Complete Directory search */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 font-mono">
                    <Sparkles className="h-3 w-3 text-[#06B6D4]" />
                    Buscador Rápido de Clientes
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por Nombre, NIT o Correo..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#0D1425]/60 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-100 focus:outline-none focus:border-[#06B6D4] placeholder-slate-500 font-sans"
                    />
                  </div>

                  {/* Customer list results */}
                  <div className="flex flex-wrap gap-1.5 pt-1 max-h-24 overflow-y-auto">
                    {filteredCustomers.length === 0 ? (
                      <span className="text-[10px] text-slate-500 font-sans italic">No hay coincidencias en clientes frecuentes.</span>
                    ) : (
                      filteredCustomers.map((cust, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectCustomer(cust)}
                          className="bg-[#0D1425] border border-slate-800 text-slate-200 hover:border-[#06B6D4] hover:text-[#06B6D4] text-[10px] px-2.5 py-1.5 rounded-lg transition-all font-sans flex items-center gap-1 cursor-pointer shadow-sm"
                        >
                          <span className="font-bold">{cust.name}</span>
                          <span className="text-slate-400 font-mono">({cust.doc})</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="h-[1px] bg-slate-800 my-2"></div>

                {/* Form Inputs */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1 font-mono uppercase tracking-wide">
                      <User className="h-3 w-3 text-slate-400" />
                      Razón Social / Nombre Completo
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre del adquirente"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setValidationError('');
                      }}
                      className="w-full bg-[#0D1425]/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-[#06B6D4] font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1 font-mono uppercase tracking-wide">
                      <span className="font-mono text-xs text-slate-400 font-black">CC</span>
                      Documento / Cédula / NIT
                    </label>
                    <input
                      type="text"
                      placeholder="NIT sin dígito de verificación"
                      value={customerDocument}
                      onChange={(e) => {
                        setCustomerDocument(e.target.value);
                        setValidationError('');
                      }}
                      className="w-full bg-[#0D1425]/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-[#06B6D4] font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1 font-mono uppercase tracking-wide">
                      <Mail className="h-3 w-3 text-slate-400" />
                      Email Destinatario XML
                    </label>
                    <input
                      type="email"
                      placeholder="facturas@cliente.com"
                      value={customerEmail}
                      onChange={(e) => {
                        setCustomerEmail(e.target.value);
                        setValidationError('');
                      }}
                      className="w-full bg-[#0D1425]/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-[#06B6D4] font-sans"
                    />
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* COLUMN 2: REDESIGNED PAYMENT METHODS & CASH CALCULATOR INSIDE EACH TYPE */}
          <div className="lg:col-span-7 space-y-5">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block font-mono">
              Método de Cobro en esta Venta
            </span>

            {/* Tactile Payment Method buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('EFECTIVO');
                  setReceivedCash(null);
                  setSelectedBills([]);
                }}
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 text-center cursor-pointer ${
                  selectedMethod === 'EFECTIVO'
                    ? 'border-[#06B6D4] bg-[#06B6D4]/10 text-[#06B6D4] font-extrabold shadow-md shadow-[#06B6D4]/5'
                    : 'border-slate-800 bg-[#121A2E]/30 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <Coins className="h-5 w-5" />
                <span className="text-xs font-semibold">Efectivo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('TARJETA');
                  setReceivedCash(null);
                  setSelectedBills([]);
                }}
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 text-center cursor-pointer ${
                  selectedMethod === 'TARJETA'
                    ? 'border-[#06B6D4] bg-[#06B6D4]/10 text-[#06B6D4] font-extrabold shadow-md shadow-[#06B6D4]/5'
                    : 'border-slate-800 bg-[#121A2E]/30 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <CreditCard className="h-5 w-5" />
                <span className="text-xs font-semibold">Tarjeta</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('TRANSFERENCIA');
                  setReceivedCash(null);
                  setSelectedBills([]);
                }}
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 text-center cursor-pointer ${
                  selectedMethod === 'TRANSFERENCIA'
                    ? 'border-[#06B6D4] bg-[#06B6D4]/10 text-[#06B6D4] font-extrabold shadow-md shadow-[#06B6D4]/5'
                    : 'border-slate-800 bg-[#121A2E]/30 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <Wallet className="h-5 w-5" />
                <span className="text-xs font-semibold">Transferencia</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('MIXTO');
                  setReceivedCash(Math.floor(total / 2));
                  setSelectedBills([]);
                }}
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 text-center cursor-pointer ${
                  selectedMethod === 'MIXTO'
                    ? 'border-[#06B6D4] bg-[#06B6D4]/10 text-[#06B6D4] font-extrabold shadow-md shadow-[#06B6D4]/5'
                    : 'border-slate-800 bg-[#121A2E]/30 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
                <span className="text-xs font-semibold">Pago Mixto</span>
              </button>
            </div>

            {/* IF EFECTIVO: Display the beautiful cash calculation module */}
            {selectedMethod === 'EFECTIVO' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                    💵 Liquidación Rápida con Billetes
                  </span>
                  {(receivedCash !== null || selectedBills.length > 0) && (
                    <button
                      type="button"
                      onClick={handleClearCash}
                      className="text-[10px] font-mono text-rose-400 hover:text-rose-300 font-extrabold uppercase bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 border border-rose-500/20"
                    >
                      <span>🧹 Limpiar Dinero</span>
                    </button>
                  )}
                </div>

                {/* Colombian Bills tapping grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={handleExactPayment}
                    className="col-span-2 sm:col-span-1 p-3 rounded-xl border border-blue-900/60 bg-blue-600/10 text-blue-300 hover:bg-blue-600/20 transition-all flex flex-col justify-between h-20 text-left cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <Wallet className="h-4 w-4 opacity-75" />
                      <span className="text-[9px] font-mono font-bold bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded border border-blue-500/30">
                        Exacto
                      </span>
                    </div>
                    <div>
                      <h4 className="text-[9px] font-mono text-blue-400 uppercase leading-none">Pago Exacto</h4>
                      <p className="text-xs font-bold mt-1">
                        ${total.toLocaleString()}
                      </p>
                    </div>
                  </button>

                  {COLOMBIAN_BILLS.map((bill) => (
                    <button
                      key={bill.value}
                      type="button"
                      onClick={() => handleSelectBill(bill.value)}
                      className={`p-3 rounded-xl border transition-all flex flex-col justify-between h-20 text-left cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${bill.color}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Coins className="h-4 w-4 opacity-50" />
                        <span className={`text-[8px] font-mono font-bold px-1 rounded ${bill.badge}`}>
                          COP
                        </span>
                      </div>
                      <div>
                        <h4 className="text-[9px] font-mono uppercase text-slate-400 leading-none">Sumar Billete</h4>
                        <p className="text-xs font-bold mt-1">
                          +{bill.label}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Selected bills visualization block */}
                {selectedBills.length > 0 && (
                  <div className="bg-[#121A2E]/40 border border-blue-950/60 rounded-2xl p-3 space-y-2 animate-in fade-in duration-200">
                    <span className="text-[9px] uppercase font-mono text-slate-400 font-extrabold block tracking-wider">
                      💴 Billetes Entregados por el Comensal (Sumados):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedBills.map((bill, idx) => (
                        <span 
                          key={idx} 
                          className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-sm font-mono animate-in zoom-in-95 duration-100"
                        >
                          <span>${bill.toLocaleString()}</span>
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = [...selectedBills];
                              updated.splice(idx, 1);
                              setSelectedBills(updated);
                              setReceivedCash(updated.length > 0 ? updated.reduce((a, b) => a + b, 0) : null);
                            }}
                            className="text-slate-400 hover:text-rose-400 font-extrabold text-xs ml-0.5 hover:bg-rose-500/20 w-4 h-4 rounded-full flex items-center justify-center transition-all cursor-pointer"
                            title="Eliminar"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom manual amount form styled inside dark theme */}
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">$</span>
                    <input
                      type="text"
                      placeholder="Escribir otro monto en efectivo entregado..."
                      value={customCashInput}
                      onChange={(e) => {
                        const onlyNums = e.target.value.replace(/[^0-9]/g, '');
                        const val = onlyNums ? parseInt(onlyNums) : null;
                        setCustomCashInput(onlyNums ? val!.toLocaleString() : '');
                        setReceivedCash(val);
                        setSelectedBills([]); // reset bill list
                        setValidationError('');
                      }}
                      className="w-full bg-[#121A2E]/60 border border-slate-800 rounded-xl py-2 pl-7 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#06B6D4] font-mono"
                    />
                  </div>
                  <div className="bg-[#121A2E]/80 text-slate-400 font-mono text-[9px] uppercase font-bold px-3 py-2.5 rounded-xl border border-slate-800 shrink-0">
                    Auto-calcular ⚡
                  </div>
                </div>

                {/* Change Indicator Box */}
                <div className="bg-[#121A2E]/50 border border-blue-950/80 rounded-[1.5rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-inner">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block font-mono">
                      Dinero Recibido
                    </span>
                    <span className="text-lg font-bold text-slate-200 font-mono">
                      {receivedCash !== null ? `$${receivedCash.toLocaleString()} COP` : 'Sin registrar'}
                    </span>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block font-mono">
                      Cambio / Vueltas (A Regresar)
                    </span>
                    <span className={`text-2xl md:text-3xl font-black ${changeDue > 0 ? 'text-[#10B981] animate-pulse' : 'text-slate-400'} font-sans tracking-tight`}>
                      ${changeDue.toLocaleString()} <span className="text-xs font-normal text-slate-400">COP</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* IF TARJETA / TRANSFERENCIA: Nice summary message */}
            {(selectedMethod === 'TARJETA' || selectedMethod === 'TRANSFERENCIA') && (
              <div className="bg-[#121A2E]/50 border border-blue-950/60 rounded-2xl p-5 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-[#06B6D4] font-bold text-xs font-mono uppercase tracking-wider">
                  <CheckCircle className="h-4 w-4" />
                  Listo para liquidar
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {selectedMethod === 'TARJETA' 
                    ? 'Procesar el cobro a través del datáfono bancario por el valor exacto de la cuenta.' 
                    : 'Solicitar al cliente la transferencia (Nequi, Daviplata o QR) por el valor exacto de la cuenta.'}
                </p>
                <div className="flex justify-between items-center bg-[#0D1425]/60 border border-slate-800 p-3.5 rounded-xl">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Monto a Transar:</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">${total.toLocaleString()} COP</span>
                </div>
              </div>
            )}

            {/* IF MIXTO: Interactive split payment config */}
            {selectedMethod === 'MIXTO' && (
              <div className="bg-[#121A2E]/50 border border-blue-950/60 rounded-2xl p-5 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-[#06B6D4] font-bold text-xs font-mono uppercase tracking-wider">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Configurar Pago Mixto (Efectivo + Digital)
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Distribuye qué porción del total de <strong className="text-slate-100">${total.toLocaleString()} COP</strong> se cancelará en efectivo y cuál con tarjeta/transferencia digital.
                </p>

                {/* Quick Split Presets */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const half = Math.floor(total / 2);
                      setReceivedCash(half);
                      setValidationError('');
                    }}
                    className="p-2 bg-slate-800/60 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-700/50 hover:border-slate-600 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all"
                  >
                    50% / 50%
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cashPart = Math.floor(total * 0.3);
                      setReceivedCash(cashPart);
                      setValidationError('');
                    }}
                    className="p-2 bg-slate-800/60 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-700/50 hover:border-slate-600 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all"
                  >
                    30% Efe / 70% Dig
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cashPart = Math.floor(total * 0.7);
                      setReceivedCash(cashPart);
                      setValidationError('');
                    }}
                    className="p-2 bg-slate-800/60 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-700/50 hover:border-slate-600 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all"
                  >
                    70% Efe / 30% Dig
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Cash portion */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1 font-mono uppercase tracking-wide">
                      <Coins className="h-3.5 w-3.5 text-[#06B6D4]" />
                      Pago en Efectivo (COP)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">$</span>
                      <input
                        type="text"
                        value={receivedCash !== null ? receivedCash.toLocaleString() : '0'}
                        onChange={(e) => {
                          const onlyNums = e.target.value.replace(/[^0-9]/g, '');
                          let val = onlyNums ? parseInt(onlyNums) : 0;
                          if (val > total) val = total;
                          setReceivedCash(val);
                          setValidationError('');
                        }}
                        className="w-full bg-[#0D1425]/60 border border-slate-800 rounded-xl py-2 pl-7 pr-4 text-xs text-slate-100 font-mono focus:outline-none focus:border-[#06B6D4]"
                      />
                    </div>
                  </div>

                  {/* Digital portion */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1 font-mono uppercase tracking-wide">
                      <CreditCard className="h-3.5 w-3.5 text-violet-400" />
                      Pago Digital (COP)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">$</span>
                      <input
                        type="text"
                        disabled
                        value={receivedCash !== null ? (total - receivedCash).toLocaleString() : total.toLocaleString()}
                        className="w-full bg-[#0D1425]/30 border border-slate-850 rounded-xl py-2 pl-7 pr-4 text-xs text-slate-400 font-mono select-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-[#0D1425]/60 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 text-[10px] uppercase">Distribución de Caja:</span>
                  <span className="font-bold text-emerald-400">
                    ${(receivedCash || 0).toLocaleString()} (Efe) + ${(total - (receivedCash || 0)).toLocaleString()} (Dig)
                  </span>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Validation Errors inside modal */}
        {validationError && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-xs text-rose-400 font-medium leading-relaxed font-sans animate-bounce">
            {validationError}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 border-t border-blue-950">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-5 py-3 rounded-xl text-xs transition-colors cursor-pointer font-sans"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => {
              handleSubmit(selectedMethod);
            }}
            className="bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-[#0F172A] font-black px-6 py-3 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-[#06B6D4]/10 active:scale-95"
            id="confirm-checkout-btn"
          >
            <CheckCircle className="h-4 w-4" />
            <span>
              {selectedMethod === 'EFECTIVO' && 'Cobrar con Efectivo'}
              {selectedMethod === 'TARJETA' && 'Cobrar con Tarjeta'}
              {selectedMethod === 'TRANSFERENCIA' && 'Cobrar con Transferencia'}
              {selectedMethod === 'MIXTO' && 'Cobrar con Pago Mixto'}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
}
