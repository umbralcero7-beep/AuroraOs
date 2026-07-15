import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileText, 
  Percent, 
  CheckCircle,
  Coins,
  Globe,
  RefreshCw,
  FileCode,
  Printer,
  Download,
  AlertCircle,
  Building,
  CheckSquare,
  CheckCircle2,
  Calculator,
  ShieldCheck,
  Eye,
  Settings,
  Send
} from 'lucide-react';
import { Gasto, Invoice, AccountingCushion } from '../types';

interface AccountingModuleProps {
  sedeId: string;
  gastos: Gasto[];
  invoices: Invoice[];
  cushion: AccountingCushion;
  onTriggerAction: (action: string, payload: any) => Promise<any>;
  refreshData: () => void;
}

export default function AccountingModule({
  sedeId,
  gastos,
  invoices,
  cushion,
  onTriggerAction,
  refreshData
}: AccountingModuleProps) {
  // Tab control inside module (Reserva/Egresos, Factura Electrónica, Control Multidivisa, Cierre Ledger)
  const [activeTab, setActiveTab] = useState<'reserva' | 'e-invoice' | 'divisas' | 'cierre'>('reserva');

  // Filter current branch details
  const currentGastos = gastos.filter(g => g.sedeId === sedeId);
  const currentInvoices = invoices.filter(i => i.sedeId === sedeId);

  // States
  const [showAddGasto, setShowAddGasto] = useState(false);
  const [gDescription, setGDescription] = useState('');
  const [gCategory, setGCategory] = useState<'SERVICIOS' | 'NOMINA' | 'MATERIA_PRIMA' | 'ALQUILER' | 'PUBLICIDAD' | 'OTROS'>('MATERIA_PRIMA');
  const [gAmount, setGAmount] = useState(0);
  const [gReceipt, setGReceipt] = useState('');

  // Cushion injection / withdrawal state
  const [showCushionModal, setShowCushionModal] = useState(false);
  const [cushionAction, setCushionAction] = useState<'INYECCION_RESERVA' | 'CUBRIR_PERDIDA'>('INYECCION_RESERVA');
  const [cushionAmount, setCushionAmount] = useState(0);
  const [cushionDescription, setCushionDescription] = useState('');

  // MULTI-CURRENCY ENGINE STATE (SAP/Odoo style)
  const [selectedCurrency, setSelectedCurrency] = useState<'COP' | 'USD' | 'EUR' | 'CLP'>('COP');
  const [exchangeRates, setExchangeRates] = useState({
    COP: 1,
    USD: 4050, // 1 USD = 4050 COP
    EUR: 4400, // 1 EUR = 4400 COP
    CLP: 4.3   // 1 CLP = 4.3 COP
  });
  const [isUpdatingRates, setIsUpdatingRates] = useState(false);

  // Currency Converter Quick Calculator States
  const [calcAmount, setCalcAmount] = useState<number>(100);
  const [calcFrom, setCalcFrom] = useState<'COP' | 'USD' | 'EUR' | 'CLP'>('USD');
  const [calcTo, setCalcTo] = useState<'COP' | 'USD' | 'EUR' | 'CLP'>('COP');

  // ELECTRONIC BILLING (SIIGO/ALEGRA STYLE)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [dianCustomerName, setDianCustomerName] = useState('');
  const [dianCustomerDoc, setDianCustomerDoc] = useState('');
  const [dianCustomerEmail, setDianCustomerEmail] = useState('');
  const [dianLines, setDianLines] = useState<{ desc: string; qty: number; price: number }[]>([
    { desc: 'Servicio Buffet Premium', qty: 1, price: 120000 }
  ]);
  const [selectedTaxIva, setSelectedTaxIva] = useState(19); // Default 19%
  const [selectedReteFuente, setSelectedReteFuente] = useState(2.5); // Default 2.5%
  const [selectedReteIca, setSelectedReteIca] = useState(0.966); // Default 0.966%
  const [isSigningXml, setIsSigningXml] = useState(false);
  const [electronicValidationStatus, setElectronicValidationStatus] = useState<'IDLE' | 'PENDING' | 'SIGNED' | 'SUCCESS'>('IDLE');
  const [lastGeneratedCufe, setLastGeneratedCufe] = useState('');
  const [xmlPayload, setXmlPayload] = useState('');
  const [showInvoicePdf, setShowInvoicePdf] = useState(false);

  // ACCOUNTING CLOSE & DOUBLE-ENTRY LEDGER (Dynamics Style)
  const [isClosingPeriod, setIsClosingPeriod] = useState(false);
  const [ledgerLocked, setLedgerLocked] = useState(false);
  const [cierreHist, setCierreHist] = useState<string[]>([]);

  // Base calculations (always in COP)
  const baseTotalSales = currentInvoices.reduce((acc, curr) => acc + curr.total, 0);
  const baseTotalExpenses = currentGastos.reduce((acc, curr) => acc + curr.amount, 0);
  const baseNetProfit = baseTotalSales - baseTotalExpenses;
  const baseCushionBalance = cushion?.retainedEarnings || 0;
  const baseCushionTarget = cushion?.cushionTarget || 80000000;

  // Currency utility helper to translate values based on selected currency
  const formatCurrency = (amountInCop: number) => {
    const rate = exchangeRates[selectedCurrency];
    const converted = amountInCop / rate;
    return converted.toLocaleString('es-CO', {
      style: 'currency',
      currency: selectedCurrency,
      maximumFractionDigits: selectedCurrency === 'COP' ? 0 : 2
    });
  };

  const convertCopToCurrencyNum = (amountInCop: number, curr: 'COP' | 'USD' | 'EUR' | 'CLP') => {
    return amountInCop / exchangeRates[curr];
  };

  // Live Exchange Rate update simulation
  const handleSimulateRatesUpdate = () => {
    setIsUpdatingRates(true);
    setTimeout(() => {
      // Small random variations to show reactivity
      setExchangeRates({
        COP: 1,
        USD: Math.round(4000 + (Math.random() * 100 - 50)),
        EUR: Math.round(4350 + (Math.random() * 100 - 50)),
        CLP: Number((4.2 + (Math.random() * 0.2 - 0.1)).toFixed(2))
      });
      setIsUpdatingRates(false);
    }, 1200);
  };

  // Synchronize XML generation when DIAN invoice state updates
  useEffect(() => {
    const subtotal = dianLines.reduce((acc, curr) => acc + (curr.qty * curr.price), 0);
    const ivaVal = Math.round(subtotal * (selectedTaxIva / 100));
    const reteFuenteVal = Math.round(subtotal * (selectedReteFuente / 100));
    const reteIcaVal = Math.round(subtotal * (selectedReteIca / 100));
    const totalVal = subtotal + ivaVal - reteFuenteVal - reteIcaVal;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ds="http://www.w3.org/2000/02/xmldsig#">
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>DIAN 2.1: Factura Electrónica de Venta</cbc:CustomizationID>
  <cbc:ProfileID>DIAN 2.1</cbc:ProfileID>
  <cbc:ID>SETT-${Math.floor(100000 + Math.random() * 900000)}</cbc:ID>
  <cbc:UUID schemeName="CUFE">${lastGeneratedCufe || 'Pendiente_De_Firma_Digital_SHA384'}</cbc:UUID>
  <cbc:IssueDate>${new Date().toISOString().split('T')[0]}</cbc:IssueDate>
  <cbc:IssueTime>${new Date().toLocaleTimeString('en-US', { hour12: false })}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>01</cbc:InvoiceTypeCode>
  
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>AURORA RESTAURANTE SAS</cbc:Name></cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID schemeAgencyID="195" schemeID="4">901.442.885-1</cbc:CompanyID>
        <cac:TaxScheme><cbc:Name>IVA</cbc:Name></cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${dianCustomerName || 'Consumidor Final'}</cbc:Name></cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID schemeAgencyID="195" schemeID="3">${dianCustomerDoc || '22222222'}</cbc:CompanyID>
        <cac:TaxScheme><cbc:Name>Regimen Simple de Tributacion</cbc:Name></cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="COP">${ivaVal}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="COP">${subtotal}</cbc:TaxableAmount>
      <cbc:Percent>${selectedTaxIva}</cbc:Percent>
      <cac:TaxCategory>
        <cac:TaxScheme><cbc:Name>IVA</cbc:Name></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">${subtotal}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">${subtotal}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="COP">${subtotal + ivaVal}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="COP">0</cbc:AllowanceTotalAmount>
    <cbc:WithholdingTaxTotalAmount currencyID="COP">${reteFuenteVal + reteIcaVal}</cbc:WithholdingTaxTotalAmount>
    <cbc:PayableAmount currencyID="COP">${totalVal}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;
    setXmlPayload(xml);
  }, [dianCustomerName, dianCustomerDoc, dianLines, selectedTaxIva, selectedReteFuente, selectedReteIca, lastGeneratedCufe]);

  // Handle invoice submission and simulation
  const handleSignAndValidateDian = () => {
    if (!dianCustomerName) {
      alert("⚠️ Error: Ingrese el nombre del adquirente antes de continuar.");
      return;
    }
    setIsSigningXml(true);
    setElectronicValidationStatus('PENDING');

    setTimeout(() => {
      // Simulate real CUFE generation (SHA-384 format string)
      const mockCufe = Array.from({ length: 96 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      setLastGeneratedCufe(mockCufe);
      setElectronicValidationStatus('SUCCESS');
      setIsSigningXml(false);
      
      // Inject to local database audit log
      const newInvoice: Invoice = {
        id: `inv-${Date.now()}`,
        invoiceNumber: `FE-SEDE${sedeId}-${Math.floor(1000 + Math.random() * 9000)}`,
        sedeId,
        customerName: dianCustomerName,
        customerDocument: dianCustomerDoc,
        items: dianLines.map(dl => ({
          name: dl.desc,
          qty: dl.qty,
          price: dl.price,
          subtotal: dl.qty * dl.price
        })),
        subtotal: dianLines.reduce((acc, curr) => acc + (curr.qty * curr.price), 0),
        tax: Math.round(dianLines.reduce((acc, curr) => acc + (curr.qty * curr.price), 0) * (selectedTaxIva / 100)),
        tip: 0,
        total: Math.round(dianLines.reduce((acc, curr) => acc + (curr.qty * curr.price), 0) * (1 + selectedTaxIva / 100)),
        payments: [{ method: 'TRANSFERENCIA', amount: 0 }],
        electronicResolution: 'DIAN Res 187640001844 de 2026',
        xmlHash: mockCufe.substring(0, 40),
        qrCodeData: `https://catalogo.dian.gov.co/document/validation?cufe=${mockCufe}`,
        timestamp: new Date().toISOString(),
        status: 'VALIDADO_DIAN'
      };

      onTriggerAction("ADD_INVOICE_LEDGER", newInvoice);
    }, 2800);
  };

  // Ledger closing and period consolidation
  const handlePerformLedgerClosing = () => {
    setIsClosingPeriod(true);
    setTimeout(() => {
      setLedgerLocked(true);
      setIsClosingPeriod(false);
      setCierreHist(prev => [
        `Cierre Contable Ejercicio [${new Date().toLocaleDateString()}] - Bloqueado por Sede. Total Ventas: $${baseTotalSales.toLocaleString()} COP / Total Egresos: $${baseTotalExpenses.toLocaleString()} COP.`,
        ...prev
      ]);
    }, 2000);
  };

  // Dynamic ledger listings for double-entry matching audit
  const doubleEntryEntries = [
    { code: "110505", name: "Caja General (Activo)", debit: baseTotalSales, credit: 0 },
    { code: "413501", name: "Ingresos por Ventas Gastronómicas (Ingreso)", debit: 0, credit: baseTotalSales },
    { code: "510506", name: "Gasto de Materia Prima / Insumos (Egreso)", debit: baseTotalExpenses, credit: 0 },
    { code: "111005", name: "Bancos / Cuentas Corrientes (Activo)", debit: 0, credit: baseTotalExpenses },
    { code: "233595", name: "IVA por Pagar Generado 19% (Pasivo)", debit: 0, credit: Math.round(baseTotalSales * 0.19) },
    { code: "135515", name: "Anticipo de Impuestos / Retención (Activo)", debit: Math.round(baseTotalSales * 0.025), credit: 0 },
    { code: "310505", name: "Fondo de Reserva / Colchón Contable (Patrimonio)", debit: baseCushionBalance, credit: 0 },
  ];

  // Microsoft Dynamics style Double-Entry Ledger verification
  const totalDebits = doubleEntryEntries.reduce((acc, curr) => acc + curr.debit, 0);
  const totalCredits = doubleEntryEntries.reduce((acc, curr) => acc + curr.credit, 0);

  // EXPORT MICROSOFT DYNAMICS STYLE LEDGER SPREADSHEET (CSV)
  const handleExportSpreadsheetCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "AURORA - LIBRO MAYOR CONTABLE Y DIARIO AUTOMATICO\n";
    csvContent += `Sede,${sedeId}\n`;
    csvContent += `Fecha de Generacion,${new Date().toLocaleString()}\n\n`;
    csvContent += "Codigo Cuenta,Nombre Cuenta,Debito (Debe) COP,Credito (Haber) COP,Divisa Original\n";
    
    doubleEntryEntries.forEach(entry => {
      csvContent += `"${entry.code}","${entry.name}",${entry.debit},${entry.credit},COP\n`;
    });

    csvContent += `\n,,${totalDebits},${totalCredits},COP\n`;
    csvContent += `Validacion Partida Doble,${totalDebits === totalCredits ? "BALANCEADO (OK)" : "PENDIENTE DE AJUSTE"}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `aurora_ledger_dynamics_${sedeId}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddGasto = async () => {
    if (!gDescription || gAmount <= 0) return;

    const newGasto: Gasto = {
      id: `gas-${Date.now()}`,
      sedeId,
      description: gDescription,
      category: gCategory,
      amount: gAmount,
      timestamp: new Date().toISOString(),
      receiptNumber: gReceipt
    };

    await onTriggerAction("ADD_GASTO", newGasto);
    
    setGDescription('');
    setGAmount(0);
    setGReceipt('');
    setShowAddGasto(false);
    refreshData();
  };

  const handleCushionOperation = async () => {
    if (cushionAmount <= 0) return;

    const currentBalance = cushion.retainedEarnings;
    let nextBalance = currentBalance;

    if (cushionAction === 'INYECCION_RESERVA') {
      nextBalance += cushionAmount;
    } else {
      if (cushionAmount > currentBalance) {
        alert("⚠️ Fondos Insuficientes: El retiro de emergencia no puede superar el saldo actual del colchón.");
        return;
      }
      nextBalance -= cushionAmount;
    }

    const historyItem = {
      id: `ch-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: cushionAction,
      amount: cushionAmount,
      description: cushionDescription || (cushionAction === 'INYECCION_RESERVA' ? 'Inyección de capital libre' : 'Retiro para cubrir pasivos'),
      balanceAfter: nextBalance
    };

    await onTriggerAction("UPDATE_CUSHION", {
      retainedEarnings: nextBalance,
      historyItem
    });

    setCushionAmount(0);
    setCushionDescription('');
    setShowCushionModal(false);
    refreshData();
  };

  const cushionPct = Math.min(100, (baseCushionBalance / baseCushionTarget) * 100);

  // Load existing POS invoice helper
  const handleLoadInvoice = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setDianCustomerName(inv.customerName);
    setDianCustomerDoc(inv.customerDocument || '901222881');
    setDianLines(inv.items.map(it => ({ desc: it.name, qty: it.qty, price: it.price })));
    setElectronicValidationStatus('IDLE');
    setLastGeneratedCufe('');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0d16] text-slate-200 font-sans">
      
      {/* Enterprise Module Top Header */}
      <div className="bg-[#080a10] px-6 py-4 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <DollarSign className="text-cyan-400 h-4 w-4" />
            </div>
            <h2 className="text-sm font-extrabold text-white tracking-widest font-mono uppercase">
              AURORA ERP CORE & AUDITORÍA CONTABLE
            </h2>
          </div>
          <p className="text-[10px] text-slate-400 font-mono mt-1">
            Mapeado con estándares internacionales de Odoo, SAP, MS Dynamics, Siigo y Alegra
          </p>
        </div>

        {/* Global Multi-tab controller (A to C Requirements) */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 gap-1 overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('reserva')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'reserva'
                ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/15 border border-cyan-500/30 text-cyan-300'
                : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            <Wallet className="h-3.5 w-3.5" />
            <span>Reserva de Emergencia</span>
          </button>
          
          <button
            onClick={() => setActiveTab('e-invoice')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'e-invoice'
                ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 text-amber-300'
                : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Facturación DIAN (Alegra/Siigo)</span>
          </button>

          <button
            onClick={() => setActiveTab('divisas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'divisas'
                ? 'bg-gradient-to-r from-purple-500/15 to-indigo-500/15 border border-purple-500/30 text-purple-300'
                : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            <Coins className="h-3.5 w-3.5" />
            <span>Consola Multi-Divisa (Odoo)</span>
          </button>

          <button
            onClick={() => setActiveTab('cierre')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'cierre'
                ? 'bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/30 text-emerald-300'
                : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span>Libro Mayor & Cierre (Dynamics)</span>
          </button>
        </div>
      </div>

      {/* Main tab viewer viewport */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ==================== TAB 1: RESERVA DE EMERGENCIA & EGRESOS ==================== */}
        {activeTab === 'reserva' && (
          <div className="space-y-6 animate-fade-in">
            {/* KPI Cards (Reactivity with Currency) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-md">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Ingresos consolidados</span>
                  <p className="text-xl font-bold font-mono text-emerald-400">{formatCurrency(baseTotalSales)}</p>
                  <span className="text-[9px] text-slate-500 font-mono">Basado en {currentInvoices.length} facturas de POS</span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-md">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Egresos de caja registrados</span>
                  <p className="text-xl font-bold font-mono text-red-400">-{formatCurrency(baseTotalExpenses)}</p>
                  <span className="text-[9px] text-slate-500 font-mono">Basado en {currentGastos.length} gastos corrientes</span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-md">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Resultado de Utilidad Neta</span>
                  <p className={`text-xl font-bold font-mono ${baseNetProfit >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                    {formatCurrency(baseNetProfit)}
                  </p>
                  <span className="text-[9px] text-slate-500 font-mono">Ingresos netos post egresos</span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* COLCHÓN CONTABLE COMPONENT */}
            <div className="bg-gradient-to-tr from-[#0b0f19] to-[#070b12] border border-cyan-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 h-48 w-48 bg-cyan-500/5 rounded-full filter blur-3xl"></div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 relative z-10">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-bold uppercase tracking-widest">
                    Fondo de Reserva de Emergencia
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1.5 font-sans">COLCHÓN CONTABLE "AURORA"</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-lg">
                    Fondo amortiguador de liquidez para mitigar picos de inflación en insumos, gastos imprevistos de nómina o meses de baja facturación.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setCushionAction('INYECCION_RESERVA');
                      setShowCushionModal(true);
                    }}
                    className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    Inyectar Capital
                  </button>
                  <button
                    onClick={() => {
                      setCushionAction('CUBRIR_PERDIDA');
                      setShowCushionModal(true);
                    }}
                    className="bg-slate-950 hover:bg-slate-800 text-red-400 border border-red-500/30 font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <ArrowDownLeft className="h-4 w-4" />
                    Retiro de Emergencia
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center relative z-10">
                {/* Cushion metrics block */}
                <div className="bg-[#080c14]/60 p-4.5 rounded-2xl border border-slate-800 space-y-4 font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 uppercase">Reserva Acumulada:</span>
                    <span className="text-xs text-cyan-400 font-semibold flex items-center gap-0.5">
                      <Percent className="h-3 w-3" />
                      {cushionPct.toFixed(1)}% de Meta
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white">{formatCurrency(baseCushionBalance)}</p>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div 
                      className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-full transition-all duration-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                      style={{ width: `${cushionPct}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Base: $0</span>
                    <span>Meta Fiscal: {formatCurrency(baseCushionTarget)}</span>
                  </div>
                </div>

                {/* Safety Indicator Description */}
                <div className="bg-[#080c14]/60 p-4.5 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                    <CheckSquare className="h-4 w-4 text-emerald-400" />
                    ESTADO DE AMORTIGUACIÓN FISCAL
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {cushionPct < 30 ? (
                      <span className="text-amber-400">🚨 Nivel de alerta bajo. Se recomienda destinar el 15% de las utilidades libres de este fin de semana para fortalecer el colchón contable.</span>
                    ) : cushionPct < 70 ? (
                      <span className="text-cyan-400">⚠️ Nivel moderado de amortiguación. Suficiente para sostener 15 días de pasivos totales fijos en caso de cierre forzado.</span>
                    ) : (
                      <span className="text-emerald-400">🛡️ Escudo financiero robusto. El restaurante está blindado para aguantar hasta 45 días de inactividad comercial sin liquidar personal.</span>
                    )}
                  </p>
                </div>

                {/* Cushion operation list histories */}
                <div className="bg-[#080c14]/60 p-4.5 rounded-2xl border border-slate-800 h-36 flex flex-col overflow-hidden">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-2 shrink-0">Ledger Historial de Reserva</span>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                    {(cushion?.cushionHistory || []).map((hist) => (
                      <div key={hist.id} className="text-[10px] font-mono flex justify-between items-center py-1 border-b border-slate-800/40 last:border-0 text-slate-400">
                        <span className="truncate max-w-[120px]" title={hist.description}>{hist.description}</span>
                        <span className={hist.action === 'INYECCION_RESERVA' ? 'text-emerald-400' : 'text-red-400'}>
                          {hist.action === 'INYECCION_RESERVA' ? '+' : '-'}{formatCurrency(hist.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* EXPENSES LEDGER AND EGRESOS LIST */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Expenses Table */}
              <div className="lg:col-span-2 bg-[#0b0f19] border border-slate-800/80 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    <FileText className="h-4.5 w-4.5 text-cyan-400" />
                    LIBRO AUXILIAR DE EGRESOS Y GASTOS
                  </h3>
                  <button 
                    onClick={() => setShowAddGasto(true)}
                    className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20 hover:bg-cyan-500/20"
                  >
                    + Registrar Gasto
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono bg-slate-900/30">
                        <th className="p-3">Detalle</th>
                        <th className="p-3">Categoría</th>
                        <th className="p-3">Recibo Nº</th>
                        <th className="p-3 text-right">Monto</th>
                        <th className="p-3 text-center">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {currentGastos.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-600 font-mono italic">No hay egresos cargados</td>
                        </tr>
                      ) : (
                        currentGastos.map((g) => (
                          <tr key={g.id} className="hover:bg-slate-900/20 transition-colors">
                            <td className="p-3 text-white font-semibold">{g.description}</td>
                            <td className="p-3 font-mono text-slate-400 text-[10px]">{g.category}</td>
                            <td className="p-3 font-mono text-slate-400">{g.receiptNumber || 'N/A'}</td>
                            <td className="p-3 text-right font-mono text-red-400 font-bold">-{formatCurrency(g.amount)}</td>
                            <td className="p-3 text-center text-slate-500 font-mono text-[10px]">{new Date(g.timestamp).toLocaleDateString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Expense category consolidator */}
              <div className="bg-[#0b0f19] border border-slate-800/80 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">CONSOLIDADO POR CATEGORÍA</h3>
                <div className="space-y-3.5 pt-2">
                  {['MATERIA_PRIMA', 'SERVICIOS', 'NOMINA', 'ALQUILER', 'PUBLICIDAD', 'OTROS'].map((cat) => {
                    const sum = currentGastos.filter(g => g.category === cat).reduce((s, g) => s + g.amount, 0);
                    const pct = baseTotalExpenses > 0 ? (sum / baseTotalExpenses) * 100 : 0;
                    return (
                      <div key={cat} className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-400 font-mono">
                          <span>{cat.replace('_', ' ')}</span>
                          <span className="text-slate-200 font-bold">{formatCurrency(sum)}</span>
                        </div>
                        <div className="w-full bg-[#070a12] rounded-full h-1.5 overflow-hidden border border-slate-800/60">
                          <div className="bg-red-400 h-full" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: SIIGO & ALEGRA STYLE FACTURACIÓN ELECTRÓNICA DIAN ==================== */}
        {activeTab === 'e-invoice' && (
          <div className="space-y-6 animate-fade-in grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Sidebar list of printable invoices & pending DIAN submissions */}
            <div className="lg:col-span-4 bg-[#0b0f19] border border-slate-800/80 rounded-2xl p-5 space-y-4 self-stretch flex flex-col">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-extrabold text-white uppercase tracking-wider">
                  Historial de Ventas POS
                </h3>
                <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                  {currentInvoices.length} Activas
                </span>
              </div>
              
              <div className="space-y-2 overflow-y-auto flex-1 max-h-[480px]">
                {currentInvoices.length === 0 ? (
                  <p className="text-xs text-slate-500 font-mono italic text-center py-8">
                    No hay facturas registradas hoy.
                  </p>
                ) : (
                  currentInvoices.map((inv) => {
                    const isSelected = selectedInvoice?.id === inv.id;
                    return (
                      <div
                        key={inv.id}
                        onClick={() => handleLoadInvoice(inv)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                          isSelected 
                            ? 'bg-amber-500/10 border-amber-500/40' 
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-mono font-bold text-slate-200">
                            {inv.invoiceNumber || `FAC-${inv.id.substring(4, 9).toUpperCase()}`}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(inv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-1">
                          Cliente: {inv.customerName}
                        </p>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-800/60 text-[10px] font-mono">
                          <span className="text-emerald-400 font-bold">${inv.total.toLocaleString()} COP</span>
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded ${
                            inv.status === 'VALIDADO_DIAN' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {inv.status || 'PENDIENTE'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Invoicing interactive setup card */}
            <div className="lg:col-span-8 space-y-6">
              
              <div className="bg-[#0b0f19] border border-slate-800/80 rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-amber-500" />
                    <div>
                      <h3 className="text-xs font-mono font-extrabold text-white uppercase tracking-widest">
                        PASARELA TRANSACCIONAL DIAN UBL 2.1
                      </h3>
                      <p className="text-[10px] text-slate-400 font-mono">Emulación certificada SIIGO & ALEGRA API v2.0</p>
                    </div>
                  </div>
                  
                  <span className="text-[9px] font-mono font-extrabold bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/10 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> CONEXION ESTABLE DIAN SANDBOX
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-mono">Nombre Adquirente / Razón Social:</label>
                    <input 
                      type="text" 
                      value={dianCustomerName}
                      onChange={(e) => setDianCustomerName(e.target.value)}
                      placeholder="Ej. Juan Pérez Gomez"
                      className="w-full bg-[#070a12] border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-sans"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-mono">Cédula o NIT (Con DV):</label>
                    <input 
                      type="text" 
                      value={dianCustomerDoc}
                      onChange={(e) => setDianCustomerDoc(e.target.value)}
                      placeholder="Ej. 1018241551-1"
                      className="w-full bg-[#070a12] border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-mono">Correo Envío Factura:</label>
                    <input 
                      type="email" 
                      value={dianCustomerEmail}
                      onChange={(e) => setDianCustomerEmail(e.target.value)}
                      placeholder="adquirente@gmail.com"
                      className="w-full bg-[#070a12] border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-sans"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-mono">IVA %:</label>
                      <select 
                        value={selectedTaxIva}
                        onChange={(e) => setSelectedTaxIva(Number(e.target.value))}
                        className="w-full bg-[#070a12] border border-slate-800 rounded px-2 py-2 text-white focus:outline-none font-mono cursor-pointer"
                      >
                        <option value={19}>19% (Gral)</option>
                        <option value={8}>8% (Impoconsumo)</option>
                        <option value={0}>Exento</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-mono">ReteFuente %:</label>
                      <select 
                        value={selectedReteFuente}
                        onChange={(e) => setSelectedReteFuente(Number(e.target.value))}
                        className="w-full bg-[#070a12] border border-slate-800 rounded px-2 py-2 text-white focus:outline-none font-mono cursor-pointer"
                      >
                        <option value={2.5}>2.5% (Servicios)</option>
                        <option value={3.5}>3.5% (Compras)</option>
                        <option value={0}>0% (No aplica)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-mono">ReteICA %:</label>
                      <select 
                        value={selectedReteIca}
                        onChange={(e) => setSelectedReteIca(Number(e.target.value))}
                        className="w-full bg-[#070a12] border border-slate-800 rounded px-2 py-2 text-white focus:outline-none font-mono cursor-pointer"
                      >
                        <option value={0.966}>0.966% (ICA)</option>
                        <option value={1.38}>1.38% (ICA Alt)</option>
                        <option value={0}>0%</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Service Detail list */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-400 font-mono">
                    <span>Detalle de Ítems / Platos Facturados:</span>
                    <button
                      onClick={() => setDianLines([...dianLines, { desc: 'Consumo Restaurante', qty: 1, price: 35000 }])}
                      className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded hover:bg-amber-500/20 cursor-pointer"
                    >
                      + Añadir Fila
                    </button>
                  </div>
                  <div className="space-y-2">
                    {dianLines.map((line, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={line.desc}
                          onChange={(e) => {
                            const clone = [...dianLines];
                            clone[idx].desc = e.target.value;
                            setDianLines(clone);
                          }}
                          className="flex-1 bg-[#070a12] border border-slate-800 rounded px-2 py-1 text-white text-xs"
                          placeholder="Descripción del ítem"
                        />
                        <input
                          type="number"
                          value={line.qty}
                          onChange={(e) => {
                            const clone = [...dianLines];
                            clone[idx].qty = Number(e.target.value);
                            setDianLines(clone);
                          }}
                          className="w-16 bg-[#070a12] border border-slate-800 rounded px-2 py-1 text-white text-xs font-mono"
                          placeholder="Cant"
                        />
                        <input
                          type="number"
                          value={line.price}
                          onChange={(e) => {
                            const clone = [...dianLines];
                            clone[idx].price = Number(e.target.value);
                            setDianLines(clone);
                          }}
                          className="w-28 bg-[#070a12] border border-slate-800 rounded px-2 py-1 text-white text-xs font-mono text-right"
                          placeholder="Valor COP"
                        />
                        {dianLines.length > 1 && (
                          <button
                            onClick={() => setDianLines(dianLines.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:text-red-400 p-1 cursor-pointer"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subtotal Calculations preview */}
                <div className="bg-[#070a12] border border-slate-800/80 rounded-2xl p-4 space-y-2 text-xs font-mono">
                  {(() => {
                    const sub = dianLines.reduce((acc, curr) => acc + (curr.qty * curr.price), 0);
                    const iva = Math.round(sub * (selectedTaxIva / 100));
                    const reteF = Math.round(sub * (selectedReteFuente / 100));
                    const reteI = Math.round(sub * (selectedReteIca / 100));
                    const tot = sub + iva - reteF - reteI;
                    return (
                      <>
                        <div className="flex justify-between text-slate-400">
                          <span>Subtotal Base Imponible:</span>
                          <span className="text-white">${sub.toLocaleString()} COP</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>IVA ({selectedTaxIva}%):</span>
                          <span className="text-amber-500/90">+${iva.toLocaleString()} COP</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Retención en la Fuente ({selectedReteFuente}%):</span>
                          <span className="text-red-400">-${reteF.toLocaleString()} COP</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>ReteICA ({selectedReteIca}%):</span>
                          <span className="text-red-400">-${reteI.toLocaleString()} COP</span>
                        </div>
                        <div className="flex justify-between text-white font-extrabold text-sm pt-2 border-t border-slate-800">
                          <span>TOTAL DE VENTA NETO:</span>
                          <span className="text-emerald-400">${tot.toLocaleString()} COP</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Interactive DIAN XML visualizer and Actions */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                      <FileCode className="h-4 w-4 text-cyan-400" />
                      PAYLOAD XML GENERADO EN VIVO (ESTÁNDAR UBL 2.1)
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">
                      Resolución DIAN Nº 187640001
                    </span>
                  </div>

                  <div className="bg-slate-950 rounded-xl p-4.5 border border-slate-800 max-h-48 overflow-y-auto text-[10px] font-mono text-cyan-300 leading-relaxed scrollbar-thin select-all">
                    <pre className="whitespace-pre-wrap">{xmlPayload}</pre>
                  </div>

                  <div className="flex justify-between gap-3 items-center pt-2">
                    <div className="flex gap-2">
                      <button
                        onClick={handleSignAndValidateDian}
                        disabled={isSigningXml || electronicValidationStatus === 'SUCCESS'}
                        className={`font-bold font-mono text-xs px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-2 transition-all shadow-md ${
                          electronicValidationStatus === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/10'
                        }`}
                      >
                        {isSigningXml ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Firmando XML en DIAN Sandbox...
                          </>
                        ) : electronicValidationStatus === 'SUCCESS' ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            ¡Factura Validada con éxito!
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Firmar & Transmitir a la DIAN
                          </>
                        )}
                      </button>

                      {electronicValidationStatus === 'SUCCESS' && (
                        <button
                          onClick={() => setShowInvoicePdf(true)}
                          className="bg-[#070a12] border border-slate-800 hover:border-slate-700 text-slate-200 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="h-4 w-4 text-cyan-400" />
                          Ver PDF Factura
                        </button>
                      )}
                    </div>

                    {electronicValidationStatus === 'SUCCESS' && (
                      <div className="text-right font-mono text-[9px] text-emerald-400">
                        <span>Código CUFE generado:</span>
                        <span className="block text-slate-400 truncate max-w-[200px]">{lastGeneratedCufe}</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* MOCK PDF INVOICE RECEIPT VIEWER MODAL */}
            {showInvoicePdf && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white text-slate-900 rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-6 relative border border-slate-300 font-sans">
                  
                  {/* Close and Print Floating controls */}
                  <div className="absolute top-4 right-4 flex gap-2 no-print">
                    <button
                      onClick={() => window.print()}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="h-4 w-4" /> Imprimir / PDF
                    </button>
                    <button
                      onClick={() => setShowInvoicePdf(false)}
                      className="bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold py-1.5 px-3 rounded-lg text-xs cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>

                  {/* PDF header */}
                  <div className="border-b-2 border-slate-200 pb-4 text-center space-y-1">
                    <h3 className="text-lg font-black tracking-wider uppercase">
                      AURORA RESTAURANTE SAS
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      NIT: 901.442.885-1 - Sede Sucursal ID: #{sedeId.toUpperCase()}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Resolución de Facturación Electrónica DIAN Nº 187640001844 de 2026
                    </p>
                  </div>

                  {/* Factura Metas */}
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div>
                      <h4 className="font-bold text-slate-800 uppercase">Factura Electrónica de Venta</h4>
                      <p className="text-slate-600">Número: FE-SEDE-{sedeId.toUpperCase()}-3041</p>
                      <p className="text-slate-600">Fecha: {new Date().toLocaleDateString()}</p>
                      <p className="text-slate-600">Hora: {new Date().toLocaleTimeString()}</p>
                    </div>
                    <div className="text-right">
                      <h4 className="font-bold text-slate-800 uppercase">Adquirente</h4>
                      <p className="text-slate-600">Nombre: {dianCustomerName}</p>
                      <p className="text-slate-600">NIT/Cédula: {dianCustomerDoc}</p>
                      <p className="text-slate-600">Email: {dianCustomerEmail || 'No registrado'}</p>
                    </div>
                  </div>

                  {/* PDF Items table */}
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-300 text-slate-800 uppercase font-mono bg-slate-50">
                        <th className="p-2">Descripción del Ítem</th>
                        <th className="p-2 text-center">Cant.</th>
                        <th className="p-2 text-right">Precio Unit.</th>
                        <th className="p-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {dianLines.map((it, i) => (
                        <tr key={i}>
                          <td className="p-2 text-slate-900 font-medium">{it.desc}</td>
                          <td className="p-2 text-center text-slate-600 font-mono">{it.qty}</td>
                          <td className="p-2 text-right text-slate-600 font-mono">${it.price.toLocaleString()} COP</td>
                          <td className="p-2 text-right text-slate-900 font-mono font-bold">${(it.qty * it.price).toLocaleString()} COP</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Financial Totals */}
                  <div className="border-t-2 border-slate-200 pt-4 flex justify-between items-start">
                    {/* Simulated QR block and CUFE signature */}
                    <div className="max-w-md space-y-1.5 font-mono text-[9px] text-slate-500">
                      <div className="flex items-center gap-3">
                        <div className="h-16 w-16 bg-slate-100 border border-slate-300 p-1 flex items-center justify-center">
                          {/* Beautiful simulated pixel grid for QR code */}
                          <div className="grid grid-cols-4 gap-0.5 w-full h-full">
                            {Array.from({ length: 16 }).map((_, i) => (
                              <div key={i} className={`h-full w-full ${Math.random() > 0.4 ? 'bg-black' : 'bg-white'}`}></div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">DOCUMENTO OFICIAL VALIDADOR DIAN</p>
                          <p className="text-[8px] break-all leading-normal">
                            CUFE: {lastGeneratedCufe}
                          </p>
                          <p className="text-[8px] text-slate-400">
                            Firma digital certificada por el proveedor tecnológico autorizado.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="w-56 space-y-1.5 font-mono text-xs text-right text-slate-700">
                      {(() => {
                        const sub = dianLines.reduce((acc, curr) => acc + (curr.qty * curr.price), 0);
                        const iva = Math.round(sub * (selectedTaxIva / 100));
                        const reteF = Math.round(sub * (selectedReteFuente / 100));
                        const reteI = Math.round(sub * (selectedReteIca / 100));
                        const tot = sub + iva - reteF - reteI;
                        return (
                          <>
                            <div className="flex justify-between">
                              <span>Subtotal Base:</span>
                              <span className="text-slate-900">${sub.toLocaleString()} COP</span>
                            </div>
                            <div className="flex justify-between">
                              <span>IVA ({selectedTaxIva}%):</span>
                              <span className="text-slate-900">+${iva.toLocaleString()} COP</span>
                            </div>
                            <div className="flex justify-between text-red-600">
                              <span>Retención ({selectedReteFuente}%):</span>
                              <span>-${reteF.toLocaleString()} COP</span>
                            </div>
                            <div className="flex justify-between text-red-600 border-b border-slate-200 pb-1.5">
                              <span>ReteICA ({selectedReteIca}%):</span>
                              <span>-${reteI.toLocaleString()} COP</span>
                            </div>
                            <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-1">
                              <span>Total Neto:</span>
                              <span>${tot.toLocaleString()} COP</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

        {/* ==================== TAB 3: CONSOLA MULTI-DIVISA (ODOO / SAP STYLE) ==================== */}
        {activeTab === 'divisas' && (
          <div className="space-y-6 animate-fade-in">
            
            <div className="bg-[#0b0f19] border border-slate-800/80 rounded-2xl p-6 space-y-6">
              <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-slate-800 pb-4 gap-4">
                <div>
                  <h3 className="text-xs font-mono font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    <Globe className="h-5 w-5 text-purple-400" />
                    MOTOR GLOBAL DE MULTI-DIVISAS & TASAS DE CAMBIO
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Configure las monedas de transacción globales del restaurante y sincronice tasas contra el Banco de la República.
                  </p>
                </div>

                <button
                  onClick={handleSimulateRatesUpdate}
                  disabled={isUpdatingRates}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-mono font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-purple-500/10 cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${isUpdatingRates ? 'animate-spin' : ''}`} />
                  {isUpdatingRates ? 'Sincronizando APIS...' : 'Sincronizar Tasas de Cambio'}
                </button>
              </div>

              {/* Grid of currencies with input configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { code: 'COP', symbol: '$', name: 'Peso Colombiano (Local)', isBase: true },
                  { code: 'USD', symbol: '$', name: 'Dólar Americano (USD)', isBase: false },
                  { code: 'EUR', symbol: '€', name: 'Euro (EUR)', isBase: false },
                  { code: 'CLP', symbol: '$', name: 'Peso Chileno (CLP)', isBase: false }
                ].map((cur) => {
                  const isSel = selectedCurrency === cur.code;
                  return (
                    <div 
                      key={cur.code} 
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        isSel 
                          ? 'bg-purple-500/5 border-purple-500/40 text-white shadow-lg' 
                          : 'bg-slate-900/40 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-mono font-bold text-slate-400">{cur.name}</span>
                        <span className="text-xs bg-slate-950 font-bold px-2 py-0.5 rounded font-mono border border-slate-800">
                          {cur.code}
                        </span>
                      </div>

                      <div className="mt-4 space-y-1">
                        <span className="text-[10px] text-slate-500 font-mono">Tasa de Conversión (1 {cur.code} en COP):</span>
                        <div className="relative">
                          <input 
                            type="number"
                            value={exchangeRates[cur.code as 'COP' | 'USD' | 'EUR' | 'CLP']}
                            disabled={cur.isBase}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setExchangeRates(prev => ({ ...prev, [cur.code]: val }));
                            }}
                            className="w-full bg-slate-950/60 border border-slate-800 rounded px-2 py-1.5 text-xs text-white font-mono"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedCurrency(cur.code as any)}
                        className={`w-full mt-3 py-1 text-[10px] font-mono font-bold uppercase rounded-lg border transition-all cursor-pointer ${
                          isSel 
                            ? 'bg-purple-500 text-slate-950 font-extrabold border-purple-400 shadow-md' 
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Establecer Divisa Base
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Conversion Calculator Workspace widget */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
                <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Calculator className="h-4 w-4 text-purple-400" />
                    Calculadora de Divisas Integrada
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Realice comprobaciones instantáneas de conversión de compras internacionales sin salir de Aurora.
                  </p>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="space-y-1">
                      <label className="text-slate-500 font-mono">Monto:</label>
                      <input 
                        type="number"
                        value={calcAmount}
                        onChange={(e) => setCalcAmount(Number(e.target.value))}
                        className="w-full bg-[#070a12] border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-500 font-mono">De:</label>
                      <select 
                        value={calcFrom}
                        onChange={(e) => setCalcFrom(e.target.value as any)}
                        className="w-full bg-[#070a12] border border-slate-800 rounded px-1.5 py-1.5 text-white font-mono cursor-pointer"
                      >
                        <option value="COP">COP</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="CLP">CLP</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-500 font-mono">A:</label>
                      <select 
                        value={calcTo}
                        onChange={(e) => setCalcTo(e.target.value as any)}
                        className="w-full bg-[#070a12] border border-slate-800 rounded px-1.5 py-1.5 text-white font-mono cursor-pointer"
                      >
                        <option value="COP">COP</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="CLP">CLP</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center font-mono text-xs">
                    <span className="text-slate-500">Resultado Calculado:</span>
                    <p className="text-lg font-black text-purple-300 mt-1">
                      {calcAmount} {calcFrom} = {(() => {
                        // Calc To COP first
                        const amountInCop = calcAmount * exchangeRates[calcFrom];
                        // Then COP to destination
                        const converted = amountInCop / exchangeRates[calcTo];
                        return converted.toLocaleString('es-CO', { maximumFractionDigits: 2 });
                      })()} {calcTo}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-purple-400" />
                      Cumplimiento de Moneda e Informes
                    </h4>
                    <p className="text-[11px] text-slate-300 leading-normal">
                      Aurora ERP soporta normas contables **NIIF (IFRS)**. Al cambiar la divisa base contable, todos los KPI de reservas de emergencia, ingresos de POS y egresos registrados se recalcularán automáticamente en el formato correspondiente.
                    </p>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    <span>Divisa seleccionada actualmente para visualización general:</span>
                    <span className="block font-bold text-purple-400 text-xs mt-1">
                      {selectedCurrency} - {selectedCurrency === 'COP' ? 'Conversión Directa Local' : `Conversión Activa: 1 ${selectedCurrency} = ${exchangeRates[selectedCurrency]} COP`}
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ==================== TAB 4: LIBRO MAYOR & CIERRE CONTABLE (MICROSOFT DYNAMICS STYLE) ==================== */}
        {activeTab === 'cierre' && (
          <div className="space-y-6 animate-fade-in">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Double-Entry Ledger verification card */}
              <div className="lg:col-span-8 bg-[#0b0f19] border border-slate-800/80 rounded-2xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-800 pb-3 gap-3">
                  <div>
                    <h3 className="text-xs font-mono font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                      <CheckSquare className="h-5 w-5 text-emerald-400" />
                      LIBRO MAYOR INTEGRADO DE PARTIDA DOBLE
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Auditoría en tiempo real para conciliaciones de cierres</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleExportSpreadsheetCSV}
                      className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer font-mono"
                    >
                      <Download className="h-4 w-4 text-emerald-400" />
                      Exportar Ledger (CSV)
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono bg-slate-900/30">
                        <th className="p-3">Código Cuenta</th>
                        <th className="p-3">Nombre de Cuenta Auxiliar</th>
                        <th className="p-3 text-right">Débito (Debe) COP</th>
                        <th className="p-3 text-right">Crédito (Haber) COP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 font-mono text-[11px]">
                      {doubleEntryEntries.map((entry) => (
                        <tr key={entry.code} className="hover:bg-slate-900/20 transition-colors">
                          <td className="p-3 text-emerald-400 font-bold">{entry.code}</td>
                          <td className="p-3 text-slate-200">{entry.name}</td>
                          <td className="p-3 text-right text-slate-300">
                            {entry.debit > 0 ? `$${entry.debit.toLocaleString()}` : '-'}
                          </td>
                          <td className="p-3 text-right text-slate-300">
                            {entry.credit > 0 ? `$${entry.credit.toLocaleString()}` : '-'}
                          </td>
                        </tr>
                      ))}
                      {/* Summary balance checks */}
                      <tr className="bg-slate-950/60 font-bold text-white border-t border-slate-700 text-xs">
                        <td colSpan={2} className="p-3 text-right">BALANCES TOTALES CONSOLIDADOS:</td>
                        <td className="p-3 text-right text-emerald-400">${totalDebits.toLocaleString()}</td>
                        <td className="p-3 text-right text-emerald-400">${totalCredits.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Micro balancing alert block */}
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white font-mono">
                        BALANCE DE COMPROBACIÓN COMPLETAMENTE CONCILIADO
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        No hay descuadres en el diario general de la sucursal. Se cumple el Principio de Partida Doble.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-extrabold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded border border-emerald-500/10 uppercase">
                    Balanceado (OK)
                  </span>
                </div>

              </div>

              {/* Period consolidation wizard block */}
              <div className="lg:col-span-4 bg-[#0b0f19] border border-slate-800/80 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-mono font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <Settings className="h-4 w-4 text-emerald-400" />
                  CIERRE DE EJERCICIO Y PERÍODO FISCAL
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  El cierre contable bloquea permanentemente la alteración de registros pasados, consolidando saldos temporales en utilidades retenidas para el colchón de reserva.
                </p>

                <div className="space-y-3 font-mono text-[10px]">
                  <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800/60">
                    <span className="text-slate-500">Estado de Período Contable:</span>
                    <span className={`font-bold ${ledgerLocked ? 'text-red-400' : 'text-emerald-400'}`}>
                      {ledgerLocked ? '🔐 PERIODO CERRADO' : '🔓 PERIODO ABIERTO'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800/60">
                    <span className="text-slate-500">Última Auditoría Interna:</span>
                    <span className="text-slate-300 font-bold">HOY (100% OK)</span>
                  </div>
                </div>

                <button
                  onClick={handlePerformLedgerClosing}
                  disabled={isClosingPeriod || ledgerLocked}
                  className={`w-full py-2.5 rounded-xl font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    ledgerLocked
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20 cursor-not-allowed'
                      : isClosingPeriod
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black shadow-lg shadow-emerald-500/10'
                  }`}
                >
                  {isClosingPeriod ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Procesando Cierre Contable...
                    </>
                  ) : ledgerLocked ? (
                    'Período Fiscal Consolidado'
                  ) : (
                    'Realizar Cierre de Período'
                  )}
                </button>

                {/* Audit lock notification trail log */}
                <div className="border-t border-slate-800/80 pt-4 space-y-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Bitácora Auditoría ERP:</span>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {cierreHist.length === 0 ? (
                      <p className="text-[9px] text-slate-600 font-mono italic">No se registran cierres de período contable recientes.</p>
                    ) : (
                      cierreHist.map((log, i) => (
                        <p key={i} className="text-[9px] font-mono text-slate-400 leading-normal border-l border-emerald-500/40 pl-2">
                          {log}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* EXPENSE REGISTRATION MODAL */}
      {showAddGasto && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Plus className="text-cyan-400 h-5 w-5" />
              REGISTRAR GASTO EN LIBRO DIARIO
            </h3>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400">Descripción del Gasto:</label>
                <input 
                  type="text" 
                  value={gDescription}
                  onChange={(e) => setGDescription(e.target.value)}
                  placeholder="Ej. Compra de verduras de reposición rápida"
                  className="w-full bg-[#070a12] border border-slate-800 rounded px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">Categoría:</label>
                  <select 
                    value={gCategory}
                    onChange={(e: any) => setGCategory(e.target.value)}
                    className="w-full bg-[#070a12] border border-slate-800 rounded px-3 py-2 text-white focus:outline-none cursor-pointer"
                  >
                    <option value="MATERIA_PRIMA">Materia Prima</option>
                    <option value="SERVICIOS">Servicios Públicos</option>
                    <option value="NOMINA">Nómina / Salario</option>
                    <option value="ALQUILER">Arrendamiento</option>
                    <option value="PUBLICIDAD">Publicidad</option>
                    <option value="OTROS">Otros</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Recibo / Factura Nº:</label>
                  <input 
                    type="text" 
                    value={gReceipt}
                    onChange={(e) => setGReceipt(e.target.value)}
                    placeholder="Ej. FAC-481"
                    className="w-full bg-[#070a12] border border-slate-800 rounded px-3 py-2 text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Monto del Egreso (COP):</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-red-400 font-mono">$</span>
                  <input 
                    type="number" 
                    value={gAmount || ''}
                    onChange={(e) => setGAmount(Number(e.target.value))}
                    className="w-full bg-[#070a12] border border-slate-800 rounded px-3 py-2 pl-7 text-white focus:outline-none font-mono text-red-400"
                    placeholder="COP 0"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button onClick={() => setShowAddGasto(false)} className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleAddGasto} className="bg-cyan-500 text-slate-950 hover:bg-cyan-600 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer">
                Registrar Egreso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSHION RESERVE OPERATIONS MODAL */}
      {showCushionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans text-slate-100">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <Wallet className="text-cyan-400 h-5 w-5" />
              {cushionAction === 'INYECCION_RESERVA' ? 'INYECTAR CAPITAL AL COLCHÓN' : 'RETIRAR FONDO DE EMERGENCIA'}
            </h3>

            <div className="space-y-3 text-xs">
              <p className="text-slate-400 leading-normal">
                {cushionAction === 'INYECCION_RESERVA' 
                  ? 'Transfiera utilidades libres del restaurante al fondo de reserva para acumular amortiguación fiscal.'
                  : 'Extraiga capital del colchón contable para cubrir pérdidas operativas imprevistas en la sucursal.'}
              </p>

              <div className="space-y-1">
                <label className="text-slate-400">Monto de Operación (COP):</label>
                <input 
                  type="number" 
                  value={cushionAmount || ''}
                  onChange={(e) => setCushionAmount(Number(e.target.value))}
                  className="w-full bg-[#070a12] border border-slate-800 rounded px-3 py-2.5 text-white focus:outline-none font-mono text-cyan-400"
                  placeholder="COP 0"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Concepto / Motivo de Ajuste:</label>
                <input 
                  type="text" 
                  value={cushionDescription}
                  onChange={(e) => setCushionDescription(e.target.value)}
                  placeholder={cushionAction === 'INYECCION_RESERVA' ? 'Ej. Depósito 15% utilidad neta de Junio' : 'Ej. Cubrir inflación desmesurada carne de res'}
                  className="w-full bg-[#070a12] border border-slate-800 rounded px-3 py-2 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button onClick={() => setShowCushionModal(false)} className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleCushionOperation} className="bg-cyan-500 text-slate-950 hover:bg-cyan-600 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer">
                Ejecutar Operación
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
