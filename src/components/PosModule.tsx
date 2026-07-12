import React, { useState } from 'react';
import { 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Coins, 
  Receipt, 
  DollarSign, 
  QrCode, 
  CheckCircle, 
  AlertTriangle, 
  Download, 
  FileText,
  ShoppingCart,
  Search,
  X,
  User,
  Mail,
  Sparkles,
  Send,
  Map,
  Zap,
  Inbox,
  Wallet,
  Check,
  ChevronDown,
  Settings
} from 'lucide-react';
import { MenuItem, Comanda, Invoice, CierreCaja } from '../types';
import CashCheckoutModal from './CashCheckoutModal';

interface PosModuleProps {
  sedeId: string;
  menuItems: MenuItem[];
  onTriggerAction: (action: string, payload: any) => Promise<any>;
  currentUser: any;
  invoices: Invoice[];
  cierreCajas: CierreCaja[];
  comandas: Comanda[];
  refreshData: () => void;
}

export default function PosModule({
  sedeId,
  menuItems,
  onTriggerAction,
  currentUser,
  invoices,
  cierreCajas,
  comandas,
  refreshData
}: PosModuleProps) {
  // Filter menu items for current sede
  const items = menuItems.filter(item => item.sedeId === sedeId);

  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [productSearch, setProductSearch] = useState<string>('');
  const [cart, setCart] = useState<{ item: MenuItem; qty: number; notes: string }[]>([]);
  const [discountPct, setDiscountPct] = useState<number>(0);
  const [includeTip, setIncludeTip] = useState<boolean>(true);

  // Calculations
  const subtotal = cart.reduce((acc, curr) => acc + (curr.item.price * curr.qty), 0);
  const discountAmount = subtotal * (discountPct / 100);
  const subtotalWithDiscount = subtotal - discountAmount;
  const tax = subtotalWithDiscount * 0.08; // Standard 8% Impuesto Nacional al Consumo (Colombia)
  const tip = includeTip ? subtotalWithDiscount * 0.10 : 0;
  const total = subtotalWithDiscount + tax + tip;
  
  // Table mapping states
  const [selectedTable, setSelectedTable] = useState<string>('LLEVAR');
  const [activeComandaId, setActiveComandaId] = useState<string | null>(null);
  const [showTableMapModal, setShowTableMapModal] = useState<boolean>(false);
  const [isCuentasDropdownOpen, setIsCuentasDropdownOpen] = useState<boolean>(false);
  const [isPosAdminDropdownOpen, setIsPosAdminDropdownOpen] = useState<boolean>(false);
  const [isPaymentMenuOpen, setIsPaymentMenuOpen] = useState<boolean>(false);

  const tables = ['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4', 'Mesa 5', 'Mesa 6', 'Mesa 10', 'Mesa 12', 'Bar', 'LLEVAR'];
  
  // Billing details
  const [customerName, setCustomerName] = useState<string>('');
  const [customerDocument, setCustomerDocument] = useState<string>('');
  
  // Split payment state
  const [payments, setPayments] = useState<{
    EFECTIVO: number;
    TARJETA_DEBITO: number;
    TARJETA_CREDITO: number;
    TRANSFERENCIA: number;
  }>({
    EFECTIVO: 0,
    TARJETA_DEBITO: 0,
    TARJETA_CREDITO: 0,
    TRANSFERENCIA: 0
  });

  const [activePaymentMethod, setActivePaymentMethod] = useState<'EFECTIVO' | 'MIXTO'>('EFECTIVO');

  // Checkout (Report Z) Wizard Step state
  const [showZWizard, setShowZWizard] = useState(false);
  const [zStep, setZStep] = useState(1);
  const [openingCash, setOpeningCash] = useState<number>(150000); // Standard base COP
  const [countedCash, setCountedCash] = useState<number>(0);
  const [zFinishedReport, setZFinishedReport] = useState<CierreCaja | null>(null);

  // Active view
  const [posSubView, setPosSubView] = useState<'POS' | 'INVOICES' | 'CLOSURES'>('POS');

  const getProductImage = (name: string, category: string) => {
    const cleanName = name.toLowerCase();
    if (cleanName.includes('hamburguesa') || cleanName.includes('burger')) {
      return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80';
    }
    if (cleanName.includes('pasta') || cleanName.includes('carbonara') || cleanName.includes('spaghetti')) {
      return 'https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=300&q=80';
    }
    if (cleanName.includes('ensalada') || cleanName.includes('cesar') || cleanName.includes('salad')) {
      return 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=300&q=80';
    }
    if (cleanName.includes('carne') || cleanName.includes('steak') || cleanName.includes('res') || cleanName.includes('asada')) {
      return 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=300&q=80';
    }
    if (cleanName.includes('pizza') || cleanName.includes('pepperoni')) {
      return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80';
    }
    if (cleanName.includes('tacos') || cleanName.includes('taco')) {
      return 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=300&q=80';
    }
    if (cleanName.includes('empanada')) {
      return 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=300&q=80';
    }
    if (cleanName.includes('volcan') || cleanName.includes('postre') || cleanName.includes('arequipe') || cleanName.includes('brownie')) {
      return 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=300&q=80';
    }
    if (cleanName.includes('limonada') || cleanName.includes('coco') || cleanName.includes('jugo') || cleanName.includes('bebida') || cleanName.includes('cerveza') || cleanName.includes('agua')) {
      return 'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=300&q=80';
    }
    
    // Defaults based on category
    if (category === 'ENTRADAS') {
      return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=300&q=80';
    }
    if (category === 'BEBIDAS') {
      return 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=300&q=80';
    }
    if (category === 'POSTRES') {
      return 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=300&q=80';
    }
    
    return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=300&q=80';
  };

  const [isCartOpen, setIsCartOpen] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Keyboard Shortcuts: Ctrl+K, Ctrl+N, Escape, F3, F4
  React.useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      // Ctrl+K to search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Ctrl+N for new order
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setCart([]);
        setCustomerName('');
        setCustomerDocument('');
        setDiscountPct(0);
        setIncludeTip(true);
        setIsCartOpen(false);
        setSelectedTable('LLEVAR');
        setActiveComandaId(null);
      }
      // F2 to toggle table mapping modal
      if (e.key === 'F2') {
        e.preventDefault();
        setShowTableMapModal(prev => !prev);
      }
      // F3 to save/send to kitchen
      if (e.key === 'F3') {
        e.preventDefault();
        handleSaveComanda();
      }
      // F4 to pay
      if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) {
          openCheckoutModal();
        }
      }
      // Escape to close cart bottom sheet or modal
      if (e.key === 'Escape') {
        setIsCartOpen(false);
        setShowZWizard(false);
        setShowTableMapModal(false);
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [cart, activeComandaId, selectedTable, subtotal, tax, total, currentUser, sedeId]);

  const categories = ['ALL', 'ENTRADAS', 'PLATOS_FUERTES', 'BEBIDAS', 'POSTRES', 'COMBOS'];

  const filteredItems = items.filter(i => {
    const matchesCategory = activeCategory === 'ALL' || i.category === activeCategory;
    const parts = i.id.split('-');
    const code = parts[parts.length - 1] || '';
    const cleanCode = code.replace(/^0+/, ''); // "01" -> "1"
    const cleanQuery = productSearch.toLowerCase().trim().replace(/^0+/, '');
    const matchesCode = code.toLowerCase() === productSearch.toLowerCase().trim() || (cleanCode && cleanCode === cleanQuery);
    const matchesSearch = i.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                          i.description.toLowerCase().includes(productSearch.toLowerCase()) ||
                          matchesCode;
    return matchesCategory && matchesSearch;
  });

  const addToCart = (item: MenuItem) => {
    const existing = cart.find(c => c.item.id === item.id);
    if (existing) {
      setCart(cart.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { item, qty: 1, notes: '' }]);
    }
  };

  const updateQty = (itemId: string, diff: number) => {
    setCart(cart.map(c => {
      if (c.item.id === itemId) {
        const newQty = c.qty + diff;
        return newQty > 0 ? { ...c, qty: newQty } : c;
      }
      return c;
    }).filter(c => c.qty > 0));
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(c => c.item.id !== itemId));
  };

  const handleSelectTable = (table: string) => {
    setSelectedTable(table);
    // Find if there's an active comanda for this table
    const activeCom = comandas.find(c => 
      c.sedeId === sedeId && 
      c.tableNumber === table && 
      ['PENDIENTE', 'COCINANDO', 'LISTO'].includes(c.status)
    );

    if (activeCom) {
      setActiveComandaId(activeCom.id);
      // Load products of this active comanda into the cart
      const loadedCart = activeCom.items.map(comandaItem => {
        const menuItem = menuItems.find(m => m.id === comandaItem.menuItemId) || {
          id: comandaItem.menuItemId,
          name: comandaItem.name,
          price: comandaItem.price,
          category: 'PLATOS_FUERTES',
          description: '',
          ingredients: [],
          available: true,
          sedeId: sedeId
        } as MenuItem;
        return {
          item: menuItem,
          qty: comandaItem.qty,
          notes: comandaItem.notes || ''
        };
      });
      setCart(loadedCart);
    } else {
      setActiveComandaId(null);
      setCart([]);
    }
  };

  const handleSaveComanda = async () => {
    if (cart.length === 0) return;

    if (activeComandaId) {
      // Update existing comanda
      const updatedPayload = {
        id: activeComandaId,
        items: cart.map(c => ({
          menuItemId: c.item.id,
          name: c.item.name,
          price: c.item.price,
          qty: c.qty,
          notes: c.notes || 'POS Actualizado'
        })),
        subtotal,
        tax,
        total
      };
      await onTriggerAction("UPDATE_COMANDA", updatedPayload);
      alert(`✓ Comanda de ${selectedTable} actualizada y guardada en el sistema.`);
    } else {
      // Create new comanda
      const comandaId = `com-pos-${Date.now()}`;
      const newComanda = {
        id: comandaId,
        sedeId,
        tableNumber: selectedTable,
        items: cart.map(c => ({
          menuItemId: c.item.id,
          name: c.item.name,
          price: c.item.price,
          qty: c.qty,
          notes: c.notes || 'POS Mesa Nueva'
        })),
        status: 'PENDIENTE',
        timestamp: new Date().toISOString(),
        waiterId: currentUser.id,
        subtotal,
        tax,
        total
      };
      await onTriggerAction("CREATE_COMANDA", newComanda);
      setActiveComandaId(comandaId);
      alert(`✓ Nueva comanda creada para ${selectedTable} y enviada a cocina.`);
    }
    refreshData();
  };

  const handleSetFullPayment = (method: keyof typeof payments) => {
    setPayments({
      EFECTIVO: 0,
      TARJETA_DEBITO: 0,
      TARJETA_CREDITO: 0,
      TRANSFERENCIA: 0,
      [method]: total
    });
  };

  // Handle Payment Submit
  const [showInvoiceReceipt, setShowInvoiceReceipt] = useState<Invoice | null>(null);

  // ZERO FRICTION CHECKOUT MODAL STATES
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO'>('EFECTIVO');
  const [selectedInvoiceType, setSelectedInvoiceType] = useState<'POS' | 'ELECTRONICA' | null>(null);
  const [modalCustomerName, setModalCustomerName] = useState<string>('');
  const [modalCustomerDocument, setModalCustomerDocument] = useState<string>('');
  const [modalCustomerEmail, setModalCustomerEmail] = useState<string>('');
  const [modalValidationError, setModalValidationError] = useState<string>('');
  const [clientSearchQuery, setClientSearchQuery] = useState<string>('');

  // Clientes frecuentes para cero fricción
  const regularCustomers = [
    { name: "Alimentos del Norte S.A.S.", doc: "901.432.885-1", email: "facturacion@alimentosnorte.co" },
    { name: "Juan Carlos Gómez", doc: "79.345.912", email: "jc.gomez@gmail.com" },
    { name: "María Camila Restrepo", doc: "1.017.224.551", email: "camila.restrepo@outlook.com" },
    { name: "Consumidor Especial S.A.", doc: "800.192.443-4", email: "proveedores@consumidorespecial.com" },
  ];

  // Filtro de clientes para búsqueda rápida
  const filteredCustomers = regularCustomers.filter(c => 
    c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) || 
    c.doc.includes(clientSearchQuery) ||
    c.email.toLowerCase().includes(clientSearchQuery.toLowerCase())
  );

  const handleSelectCustomer = (customer: { name: string; doc: string; email: string }) => {
    setModalCustomerName(customer.name);
    setModalCustomerDocument(customer.doc);
    setModalCustomerEmail(customer.email);
    setModalValidationError('');
  };

  // Escuchar F1 y F2 para selección ultrarrápida cuando el modal esté abierto
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showCheckoutModal) return;
      if (e.key === 'F1') {
        e.preventDefault();
        setSelectedInvoiceType('POS');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setSelectedInvoiceType('ELECTRONICA');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCheckoutModal]);

  const openCheckoutModal = () => {
    if (cart.length === 0) return;
    setShowCheckoutModal(true);
  };

  const processCheckoutPayment = async (data: {
    type: 'POS' | 'ELECTRONICA';
    customerName: string;
    customerDocument: string;
    customerEmail: string;
    receivedCash: number;
    paymentMethod: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO';
  }) => {
    if (cart.length === 0) return;

    const { type, customerName: finalName, customerDocument: finalDoc, customerEmail: finalEmail, receivedCash, paymentMethod } = data;

    const resolution = type === 'ELECTRONICA' 
      ? "Resolución DIAN No. 187640251 del 2026-01-01 (Rango FE-1000 a FE-99999)"
      : "Documento de Control Interno - Remisión Comercial Simplificada";
      
    const xmlHash = type === 'ELECTRONICA'
      ? "sha256-" + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('')
      : "N/A - REMISION INTERNA";

    const invoiceNum = type === 'ELECTRONICA'
      ? `FE-DIAN-${1000 + invoices.length + 1}`
      : `REM-POS-${2000 + invoices.length + 1}`;

    // Map payments to standard invoice payment methods
    let invoicePayments: { method: 'EFECTIVO' | 'TARJETA_DEBITO' | 'TARJETA_CREDITO' | 'TRANSFERENCIA'; amount: number }[] = [];
    if (paymentMethod === 'EFECTIVO') {
      invoicePayments = [{ method: 'EFECTIVO', amount: total }];
    } else if (paymentMethod === 'TARJETA') {
      invoicePayments = [{ method: 'TARJETA_DEBITO', amount: total }];
    } else if (paymentMethod === 'TRANSFERENCIA') {
      invoicePayments = [{ method: 'TRANSFERENCIA', amount: total }];
    } else if (paymentMethod === 'MIXTO') {
      invoicePayments = [
        { method: 'EFECTIVO', amount: Math.floor(total / 2) },
        { method: 'TARJETA_DEBITO', amount: total - Math.floor(total / 2) }
      ];
    }

    const invoicePayload: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invoiceNum,
      sedeId,
      customerName: finalName,
      customerDocument: finalDoc,
      items: cart.map(c => ({
        name: c.item.name,
        qty: c.qty,
        price: c.item.price,
        subtotal: c.item.price * c.qty
      })),
      subtotal,
      tax,
      tip,
      total,
      payments: invoicePayments,
      electronicResolution: resolution,
      xmlHash,
      qrCodeData: type === 'ELECTRONICA' 
        ? `https://catalogo-factura.dian.gov.co/validador?cufe=${xmlHash.substring(0,20)}&total=${total}&num=${invoiceNum}`
        : '',
      timestamp: new Date().toISOString(),
      status: type === 'ELECTRONICA' ? 'VALIDADO_DIAN' : 'CONTABILIZADO'
    };

    // Add optional customer email and metadata to the payload
    if (finalEmail) {
      (invoicePayload as any).customerEmail = finalEmail;
    }
    (invoicePayload as any).voucherType = type;

    // Save on database
    await onTriggerAction("RECORD_INVOICE", invoicePayload);

    // Close or create comanda for kitchen logs
    if (activeComandaId) {
      // Update comanda items first to match latest changes, then change status to ENTREGADO
      await onTriggerAction("UPDATE_COMANDA", {
        id: activeComandaId,
        items: cart.map(c => ({
          menuItemId: c.item.id,
          name: c.item.name,
          price: c.item.price,
          qty: c.qty,
          notes: c.notes || 'Facturado'
        })),
        subtotal,
        tax,
        total
      });
      await onTriggerAction("UPDATE_COMANDA_STATUS", {
        id: activeComandaId,
        status: 'ENTREGADO'
      });
    } else {
      // Create fresh comanda for direct walk-in sale
      const comandaId = `com-pos-${Date.now()}`;
      await onTriggerAction("CREATE_COMANDA", {
        id: comandaId,
        sedeId,
        tableNumber: selectedTable,
        items: cart.map(c => ({
          menuItemId: c.item.id,
          name: c.item.name,
          price: c.item.price,
          qty: c.qty,
          notes: c.notes || 'POS Venta Rápida'
        })),
        status: 'ENTREGADO',
        timestamp: new Date().toISOString(),
        waiterId: currentUser.id,
        subtotal,
        tax,
        total
      });
    }

    // Reset states
    setCart([]);
    setCustomerName('');
    setCustomerDocument('');
    setDiscountPct(0);
    setPayments({
      EFECTIVO: 0,
      TARJETA_DEBITO: 0,
      TARJETA_CREDITO: 0,
      TRANSFERENCIA: 0
    });
    setIncludeTip(true);
    setSelectedTable('LLEVAR');
    setActiveComandaId(null);
    refreshData();
    setShowInvoiceReceipt(invoicePayload);
    setShowCheckoutModal(false);
  };

  // Z-Report Calculations
  const sedeInvoices = invoices.filter(inv => inv.sedeId === sedeId);
  const totalSalesExpected = sedeInvoices.reduce((acc, curr) => acc + curr.total, 0);
  
  // Sum up cash payments specifically
  const cashSalesExpected = sedeInvoices.reduce((acc, curr) => {
    const cashPay = curr.payments.find(p => p.method === 'EFECTIVO');
    return acc + (cashPay ? cashPay.amount : 0);
  }, 0);

  const cardSalesExpected = sedeInvoices.reduce((acc, curr) => {
    const cardPay = curr.payments.filter(p => p.method === 'TARJETA_DEBITO' || p.method === 'TARJETA_CREDITO');
    return acc + cardPay.reduce((s, p) => s + p.amount, 0);
  }, 0);

  const transferSalesExpected = sedeInvoices.reduce((acc, curr) => {
    const transPay = curr.payments.find(p => p.method === 'TRANSFERENCIA');
    return acc + (transPay ? transPay.amount : 0);
  }, 0);

  const executeZClosure = async () => {
    const actualCashTotal = countedCash;
    const expectedCashTotal = openingCash + cashSalesExpected;
    const difference = actualCashTotal - expectedCashTotal;
    
    const zReportCode = `Z-CLOSURE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${sedeId.toUpperCase()}`;

    const newZReport: CierreCaja = {
      id: `z-${Date.now()}`,
      sedeId,
      date: new Date().toISOString().slice(0, 10),
      openedBy: "Mateo Pérez",
      closedBy: currentUser.name,
      openingCash,
      expectedCash: expectedCashTotal,
      actualCash: actualCashTotal,
      cardSales: cardSalesExpected,
      transferSales: transferSalesExpected,
      totalExpenses: 0,
      difference,
      totalSales: totalSalesExpected,
      timestamp: new Date().toISOString(),
      reportZCode: zReportCode
    };

    await onTriggerAction("RECORD_CIERRE_CAJA", newZReport);
    
    // Clear invoice data on server for the new day but keep in reporting history
    setZFinishedReport(newZReport);
    setZStep(5);
    refreshData();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0F172A] text-slate-100 font-sans">
      {/* UNIFIED NAVIGATION & ACTIONS BAR (Saves space, fully customized in Spanish) */}
      <div className="bg-[#0D1425] border-b border-blue-900/30 p-2.5 shrink-0 relative z-30">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 w-full max-w-7xl mx-auto">
          
          {/* Button 1: CUENTAS EN ESPERA */}
          <div className="relative">
            <button
              onClick={() => {
                setIsCuentasDropdownOpen(!isCuentasDropdownOpen);
                setIsPosAdminDropdownOpen(false);
              }}
              className="w-full bg-[#121A2E] hover:bg-[#1A2642] border border-blue-900/40 hover:border-blue-500/40 text-slate-100 font-extrabold text-xs uppercase tracking-wider py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md select-none"
            >
              <Inbox className="h-4 w-4 text-blue-400" />
              <span>Cuentas en Espera</span>
              {comandas.filter(c => c.sedeId === sedeId && ['PENDIENTE', 'COCINANDO', 'LISTO'].includes(c.status)).length > 0 && (
                <span className="bg-blue-500 text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center border border-zinc-950 animate-pulse">
                  {comandas.filter(c => c.sedeId === sedeId && ['PENDIENTE', 'COCINANDO', 'LISTO'].includes(c.status)).length}
                </span>
              )}
            </button>

            {/* Dropdown menu for pending accounts */}
            {isCuentasDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsCuentasDropdownOpen(false)} />
                <div className="absolute left-0 mt-2 w-80 bg-[#0D1425] border border-blue-900/40 rounded-2xl shadow-2xl p-3 z-50 flex flex-col gap-2 max-h-80 overflow-y-auto">
                  <div className="text-[10px] uppercase font-mono text-slate-500 font-extrabold pb-2 border-b border-blue-950 tracking-wider">
                    📋 ORDENES ACTIVAS (MESAS EN SERVICIO)
                  </div>
                  {comandas.filter(c => c.sedeId === sedeId && ['PENDIENTE', 'COCINANDO', 'LISTO'].includes(c.status)).length === 0 ? (
                    <div className="p-4 text-center text-slate-500 font-mono text-[10px]">
                      No hay cuentas en espera en esta sede.
                    </div>
                  ) : (
                    comandas.filter(c => c.sedeId === sedeId && ['PENDIENTE', 'COCINANDO', 'LISTO'].includes(c.status)).map(com => (
                      <button
                        key={com.id}
                        onClick={() => {
                          handleSelectTable(com.tableNumber);
                          setPosSubView('POS');
                          setIsCuentasDropdownOpen(false);
                        }}
                        className="w-full p-2 rounded-xl border border-blue-950 hover:border-blue-500 bg-[#121A2E]/60 hover:bg-[#121A2E] text-left transition-all flex items-center justify-between text-xs cursor-pointer group"
                      >
                        <div>
                          <div className="font-extrabold text-slate-200 group-hover:text-blue-400 transition-colors uppercase">
                            {com.tableNumber === 'LLEVAR' ? '🛍️ Llevar / Rápida' : `🪑 ${com.tableNumber}`}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {com.items.length} {com.items.length === 1 ? 'producto' : 'productos'} • {com.status === 'LISTO' ? '🛎️ LISTO' : com.status === 'COCINANDO' ? '🍳 EN COCINA' : '⏳ PENDIENTE'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-emerald-400">
                            ${com.total.toLocaleString()}
                          </div>
                          <div className="text-[9px] text-slate-500 mt-0.5">
                            {new Date(com.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Button 2: MAPEO DE MESAS */}
          <button
            onClick={() => {
              setShowTableMapModal(true);
              setPosSubView('POS');
              setIsCuentasDropdownOpen(false);
              setIsPosAdminDropdownOpen(false);
            }}
            className="w-full bg-[#121A2E] hover:bg-[#1A2642] border border-blue-900/40 hover:border-blue-500/40 text-slate-100 font-extrabold text-xs uppercase tracking-wider py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md select-none"
          >
            <Map className="h-4 w-4 text-blue-400" />
            <span>Mapeo de Mesas</span>
          </button>

          {/* Button 3: VENTA RÁPIDA */}
          <button
            onClick={() => {
              setSelectedTable('LLEVAR');
              setActiveComandaId(null);
              setCart([]);
              setPosSubView('POS');
              setIsCuentasDropdownOpen(false);
              setIsPosAdminDropdownOpen(false);
            }}
            className="w-full bg-blue-600 hover:bg-blue-500 border border-blue-500 hover:border-blue-400 text-white font-extrabold text-xs uppercase tracking-wider py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md select-none"
          >
            <Zap className="h-4 w-4 text-white" />
            <span>Venta Rápida</span>
          </button>

          {/* Button 4: ADMINISTRACIÓN POS */}
          <div className="relative">
            <button
              onClick={() => {
                setIsPosAdminDropdownOpen(!isPosAdminDropdownOpen);
                setIsCuentasDropdownOpen(false);
              }}
              className="w-full bg-[#121A2E] hover:bg-[#1A2642] border border-blue-900/40 hover:border-blue-500/40 text-slate-100 font-extrabold text-xs uppercase tracking-wider py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md select-none"
            >
              <Settings className="h-4 w-4 text-blue-400" />
              <span>Administración POS</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {isPosAdminDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsPosAdminDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 bg-[#0D1425] border border-blue-900/40 rounded-2xl shadow-2xl p-2.5 z-50 flex flex-col gap-1">
                  <div className="text-[9px] uppercase font-mono text-slate-500 font-extrabold px-3 py-1.5 border-b border-blue-950 tracking-wider">
                    Menú de Administración
                  </div>
                  
                  <button
                    onClick={() => {
                      setPosSubView('POS');
                      setIsPosAdminDropdownOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                      posSubView === 'POS'
                        ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 font-black'
                        : 'hover:bg-[#121A2E] text-slate-300 border border-transparent'
                    }`}
                  >
                    <ShoppingCart className="h-4 w-4 text-blue-400" />
                    <span>Registrar Venta (POS)</span>
                  </button>

                  <button
                    onClick={() => {
                      setPosSubView('INVOICES');
                      setIsPosAdminDropdownOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                      posSubView === 'INVOICES'
                        ? 'bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/20 font-black'
                        : 'hover:bg-[#121A2E] text-slate-300 border border-transparent'
                    }`}
                  >
                    <Receipt className="h-4 w-4 text-emerald-400" />
                    <span>Facturas Emitidas ({sedeInvoices.length})</span>
                  </button>

                  <button
                    onClick={() => {
                      setPosSubView('CLOSURES');
                      setIsPosAdminDropdownOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                      posSubView === 'CLOSURES'
                        ? 'bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/20 font-black'
                        : 'hover:bg-[#121A2E] text-slate-300 border border-transparent'
                    }`}
                  >
                    <FileText className="h-4 w-4 text-purple-400" />
                    <span>Arqueos de Caja Z ({cierreCajas.filter(z => z.sedeId === sedeId).length})</span>
                  </button>

                  <div className="border-t border-blue-950 my-1"></div>

                  <button
                    onClick={() => {
                      setZStep(1);
                      setZFinishedReport(null);
                      setShowZWizard(true);
                      setIsPosAdminDropdownOpen(false);
                    }}
                    className="w-full p-2.5 rounded-xl text-left text-xs font-black text-amber-500 hover:bg-amber-500/10 border border-transparent transition-all flex items-center gap-2.5 cursor-pointer"
                  >
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>Ejecutar Cierre de Caja (Z)</span>
                  </button>
                </div>
              </>
            )}
          </div>

        </div>
      </div>

      {posSubView === 'POS' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0A0F1D]">
          
          {/* MAIN COLUMN SPACE */}
          <div className="flex-1 flex overflow-hidden relative">
            
            {/* LEFT COMPARTMENT: LA CARTA */}
            <div className="flex-1 flex flex-col overflow-hidden p-4 md:p-6 space-y-4">
              
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black tracking-widest text-slate-200 uppercase font-sans">
                  LA CARTA
                </h3>
                
                {/* Search products bar */}
                <div className="relative w-72">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Buscar platillo..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full bg-[#121A2E] border border-blue-950 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-sans shadow-sm"
                  />
                  {productSearch && (
                    <button 
                      onClick={() => setProductSearch('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Grid of categories on the left side, items on the right side */}
              <div className="flex-1 flex gap-5 overflow-hidden">
                
                {/* Vertical Category Selector Sidebar (from reference image) */}
                <div className="w-[140px] md:w-[160px] flex flex-col gap-2 shrink-0 overflow-y-auto pr-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`w-full py-3 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider text-left transition-all border cursor-pointer ${
                        activeCategory === cat 
                          ? 'bg-[#121A2E] text-blue-400 border-blue-500/80 shadow-md shadow-blue-500/5' 
                          : 'bg-[#121A2E]/40 hover:bg-[#121A2E]/80 text-slate-400 border-transparent hover:text-slate-200'
                      }`}
                    >
                      {cat === 'ALL' && '🍔 TODOS'}
                      {cat === 'ENTRADAS' && '🥗 ENTRADAS'}
                      {cat === 'PLATOS_FUERTES' && '🥩 PLATOS FUERTES'}
                      {cat === 'BEBIDAS' && '🥤 BEBIDAS'}
                      {cat === 'POSTRES' && '🍰 POSTRES'}
                      {cat === 'COMBOS' && '✨ COMBOS'}
                    </button>
                  ))}
                </div>

                {/* Grid of Menu Items with beautiful visual photography */}
                <div className="flex-1 overflow-y-auto pr-1">
                  {filteredItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-[#121A2E]/20 rounded-2xl border border-blue-950/40">
                      <ShoppingCart className="h-10 w-10 text-slate-600 mb-2 stroke-[1.5]" />
                      <h3 className="text-slate-300 font-bold text-xs">Sin platillos</h3>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                      {filteredItems.map((item) => (
                        <div 
                          key={item.id} 
                          onClick={() => item.available && addToCart(item)}
                          className={`bg-[#0D1425] border border-blue-900/20 p-3 rounded-2xl flex flex-col justify-between cursor-pointer hover:border-blue-500 hover:shadow-xl hover:shadow-blue-950/20 transition-all relative group shadow-sm min-h-[170px] ${
                            !item.available ? 'opacity-40 cursor-not-allowed' : ''
                          }`}
                        >
                          {/* Image preview matching reference style */}
                          <div className="h-24 w-full rounded-xl overflow-hidden bg-slate-900 relative shrink-0 mb-2">
                            <img 
                              src={getProductImage(item.name, item.category)} 
                              alt={item.name} 
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                              referrerPolicy="no-referrer"
                            />
                            {!item.available && (
                              <span className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-black text-rose-400 uppercase tracking-widest">
                                AGOTADO
                              </span>
                            )}
                          </div>

                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="text-xs font-black text-slate-100 group-hover:text-blue-400 transition-colors truncate">
                                {item.name}
                              </h4>
                              <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                                {item.description || 'Delicioso platillo tradicional preparado fresco'}
                              </p>
                            </div>
                            
                            <div className="mt-2 pt-2 border-t border-blue-950/60 flex items-center justify-between">
                              <span className="text-xs font-black font-mono text-emerald-400">
                                ${item.price.toLocaleString()} COP
                              </span>
                              <span className="h-6 w-6 rounded-lg bg-[#121A2E] border border-blue-950 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all text-xs font-black">
                                +
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* RIGHT COMPARTMENT: DETALLE DE LA CUENTA (Elegant, High Contrast Sidebar - Always visible for All-In-One POS) */}
            <div className="relative flex flex-col w-[350px] md:w-[420px] xl:w-[460px] h-full border-l border-blue-900/30 bg-[#0D1425] shrink-0 shadow-xl">
              
              <div className="p-4 border-b border-blue-950/60 bg-blue-950/10 flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest font-sans flex items-center gap-1.5">
                    DETALLE DE LA CUENTA
                  </h3>
                  
                  <div className="flex items-center gap-1">
                    <span className="bg-[#121A2E] text-blue-400 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono">
                      {cart.reduce((sum, item) => sum + item.qty, 0)} items
                    </span>
                    
                    {cart.length > 0 && (
                      <button
                        onClick={() => setCart([])}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-[#121A2E] transition-colors cursor-pointer"
                        title="Vaciar comanda"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Subtitle with active destination */}
                <div className="flex items-center justify-between text-[10px] bg-[#121A2E]/40 px-2.5 py-1.5 rounded-lg border border-blue-950">
                  <span className="text-slate-400 font-semibold">Mesa:</span>
                  <span className="font-mono font-black text-[#06B6D4]">{selectedTable}</span>
                </div>
              </div>

              {/* Items Detail Scroll Area */}
              <div className="flex-1 p-3 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-950">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                    <ShoppingCart className="h-10 w-10 mb-2 stroke-[1.2] text-slate-600" />
                    <p className="text-xs font-semibold text-slate-400">Comanda vacía</p>
                    <p className="text-[10px] text-slate-500 mt-1">Seleccione productos para agregar a la orden</p>
                  </div>
                ) : (
                  cart.map((cartItem) => (
                    <div key={cartItem.item.id} className="bg-[#121A2E]/40 border border-blue-950/60 p-2 rounded-xl space-y-1 relative hover:border-blue-900 transition-all">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-extrabold text-slate-100 leading-tight">
                            {cartItem.qty}x {cartItem.item.name}
                          </h4>
                        </div>
                        <button 
                          onClick={() => removeFromCart(cartItem.item.id)}
                          className="text-slate-500 hover:text-rose-400 p-0.5 hover:bg-[#121A2E] rounded transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between pt-1 border-t border-blue-950/40">
                        <span className="font-mono font-bold text-[#06B6D4] text-[11px]">
                          ${(cartItem.item.price * cartItem.qty).toLocaleString()} COP
                        </span>
                        
                        {/* Interactive Quantity Adjuster */}
                        <div className="flex items-center gap-1 bg-[#121A2E]/80 border border-blue-950 rounded-lg p-0.5">
                          <button 
                            onClick={() => updateQty(cartItem.item.id, -1)} 
                            className="h-4 w-4 rounded bg-[#1C2849] hover:bg-slate-800 flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
                          >
                            <Minus className="h-2 w-2" />
                          </button>
                          <span className="font-mono font-black text-slate-100 text-[9px] w-3.5 text-center">{cartItem.qty}</span>
                          <button 
                            onClick={() => updateQty(cartItem.item.id, 1)} 
                            className="h-4 w-4 rounded bg-[#1C2849] hover:bg-slate-800 flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
                          >
                            <Plus className="h-2 w-2" />
                          </button>
                        </div>
                      </div>

                      <input 
                        type="text" 
                        placeholder="Nota especial de cocina..."
                        value={cartItem.notes}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCart(cart.map(c => c.item.id === cartItem.item.id ? { ...c, notes: val } : c));
                        }}
                        className="w-full h-5 bg-[#121A2E]/50 border border-blue-950/40 rounded px-1.5 py-0 text-[8px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  ))
                )}
              </div>

              {/* Invoicing, Totals & Payment panel */}
              <div className="p-4 bg-[#0A0F1D]/60 border-t border-blue-950/60 space-y-3 shrink-0">
                
                {/* Billing Details (Minimized & sleek) */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Cliente (Opcional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="flex-1 bg-[#121A2E]/80 border border-blue-950 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 font-sans"
                  />
                  <input
                    type="text"
                    placeholder="Cédula / NIT"
                    value={customerDocument}
                    onChange={(e) => setCustomerDocument(e.target.value)}
                    className="w-24 bg-[#121A2E]/80 border border-blue-950 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                {/* Subtotal, IVA, TOTAL exactly matched to image */}
                <div className="space-y-1.5 text-xs font-semibold font-sans border-t border-blue-950/40 pt-2.5">
                  <div className="flex justify-between text-slate-400">
                    <span>SUBTOTAL:</span>
                    <span className="font-mono text-slate-300">${subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>IVA (8%):</span>
                    <span className="font-mono text-slate-300">${tax.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-slate-100 pt-2 border-t border-blue-950/60">
                    <span className="font-black tracking-wider text-xs">TOTAL A PAGAR:</span>
                    <span className="text-xl font-black text-emerald-400 font-mono">
                      ${total.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Direct payment process button */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setCheckoutPaymentMethod('EFECTIVO');
                      openCheckoutModal();
                    }}
                    disabled={cart.length === 0}
                    className="w-full bg-[#06B6D4] hover:bg-[#06B6D4]/90 disabled:opacity-30 disabled:cursor-not-allowed text-[#0F172A] py-3.5 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2.5 transition-all select-none shadow-lg shadow-[#06B6D4]/10 active:scale-[0.98]"
                    id="pos-proceed-payment-button"
                  >
                    <CreditCard className="h-4.5 w-4.5 text-[#0F172A]" />
                    <span>PROCESAR COBRO / PAGO</span>
                  </button>
                </div>

                {/* Secondary Save to Kitchen Option */}
                <button
                  onClick={handleSaveComanda}
                  disabled={cart.length === 0}
                  className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 font-extrabold text-[10px] uppercase py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-slate-700/60"
                  id="pos-save-comanda-button"
                  title="Enviar Orden a Cocina sin cobrar"
                >
                  <Send className="h-3 w-3" />
                  <span>Solo Enviar a Cocina [F3]</span>
                </button>

              </div>

            </div>

          </div>

        </div>
      )}

      {posSubView === 'INVOICES' && (
        <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-[#0F172A]">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
            <div>
              <h3 className="text-sm md:text-base font-black text-slate-100 flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#06B6D4]" />
                Historial de Facturación Electrónica (DIAN)
              </h3>
              <p className="text-xs text-slate-400 mt-1">Todas las transacciones emitidas con reporte fiscal regulado.</p>
            </div>
            <span className="text-xs font-mono font-bold text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/20 px-3.5 py-2 rounded-xl shadow-md self-start sm:self-auto">
              Firma Digital DIAN Activa ✅
            </span>
          </div>

          <div className="bg-[#1E293B] border border-slate-800 rounded-3xl overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-black tracking-wider bg-slate-900/40">
                    <th className="p-4.5 font-mono">Nº Factura</th>
                    <th className="p-4.5 font-mono">Fecha / Hora</th>
                    <th className="p-4.5">Cliente / Cédula</th>
                    <th className="p-4.5 text-right font-mono">Monto Neto</th>
                    <th className="p-4.5 text-right font-mono">Impuesto (8%)</th>
                    <th className="p-4.5 text-right font-mono">Total Factura</th>
                    <th className="p-4.5 text-center">Firma CUFE / XML Hash</th>
                    <th className="p-4.5 text-center">Estado Fiscal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium text-slate-300">
                  {sedeInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-500 font-mono text-xs">
                        No se han generado facturas en esta sucursal durante el turno actual.
                      </td>
                    </tr>
                  ) : (
                    sedeInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4.5 font-mono font-black text-slate-100 text-sm">{inv.invoiceNumber}</td>
                        <td className="p-4.5 text-slate-400">{new Date(inv.timestamp).toLocaleString()}</td>
                        <td className="p-4.5">
                          <div className="font-extrabold text-slate-200">{inv.customerName}</div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">CC: {inv.customerDocument}</div>
                        </td>
                        <td className="p-4.5 text-right font-mono text-slate-400">${inv.subtotal.toLocaleString()}</td>
                        <td className="p-4.5 text-right font-mono text-slate-500">${inv.tax.toLocaleString()}</td>
                        <td className="p-4.5 text-right font-mono text-emerald-400 font-black text-sm">${inv.total.toLocaleString()}</td>
                        <td className="p-4.5 text-center">
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-800/60 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700/50 cursor-pointer" title={inv.xmlHash}>
                            {inv.xmlHash.substring(0, 15)}...
                          </span>
                        </td>
                        <td className="p-4.5 text-center">
                          <span className="bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 px-3 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-[#10B981]" />
                            DIAN_VALIDA
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {posSubView === 'CLOSURES' && (
        <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-[#0F172A]">
          <div className="mb-6">
            <h3 className="text-sm md:text-base font-black text-slate-100 flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#06B6D4]" />
              Arqueos de Caja Diarios (Reportes Z)
            </h3>
            <p className="text-xs text-slate-400 mt-1">Historial de cierres de jornada, conciliaciones de efectivo y descuadres.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cierreCajas.filter(z => z.sedeId === sedeId).length === 0 ? (
              <div className="col-span-full bg-[#1E293B]/40 border border-slate-800 p-12 rounded-[2.5rem] text-center text-slate-500 font-mono text-xs">
                No hay registros de cierres Z archivados para esta sucursal.
              </div>
            ) : (
              cierreCajas.filter(z => z.sedeId === sedeId).map((z) => (
                <div key={z.id} className="bg-[#1E293B] border border-slate-800 rounded-[2rem] p-5 space-y-4 shadow-md hover:border-slate-700 transition-all font-sans text-slate-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg font-bold">
                        Z-CODE: {z.reportZCode.substring(10)}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-2 font-semibold">Fecha: {z.date}</p>
                    </div>
                    <span className="text-[10px] bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-full font-bold text-slate-400 uppercase tracking-wider font-mono">
                      FISCAL_CLOSE
                    </span>
                  </div>

                  <div className="space-y-2 border-t border-b border-slate-800 py-3 text-xs font-medium">
                    <div className="flex justify-between text-slate-400">
                      <span>Base Inicial Apertura:</span>
                      <span className="text-slate-200 font-mono">${z.openingCash.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Efectivo Esperado:</span>
                      <span className="text-slate-200 font-mono">${z.expectedCash.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Efectivo Real Contado:</span>
                      <span className="text-slate-100 font-bold font-mono">${z.actualCash.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Ventas Digitales Tarjetas:</span>
                      <span className="text-slate-200 font-mono">${z.cardSales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Ventas Transferencias QR:</span>
                      <span className="text-slate-200 font-mono">${z.transferSales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-2 border-t border-slate-800 text-slate-200">
                      <span>TOTAL RECAUDADO:</span>
                      <span className="text-emerald-400 font-mono">${z.totalSales.toLocaleString()}</span>
                    </div>
                    {z.difference !== 0 && (
                      <div className={`flex justify-between font-bold text-xs pt-1 ${z.difference > 0 ? 'text-[#10B981]' : 'text-rose-400'}`}>
                        <span>Diferencia Arqueo:</span>
                        <span>{z.difference > 0 ? `+$${z.difference.toLocaleString()}` : `-$${Math.abs(z.difference).toLocaleString()}`}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] font-mono text-slate-500 flex justify-between">
                    <span>Arqueador: {z.closedBy}</span>
                    <span>{new Date(z.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* RENDER PRINTABLE THERMAL INVOICE RECEIPT MODAL */}
      {showInvoiceReceipt && (
        <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans text-zinc-800">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col items-center border border-zinc-250 shadow-2xl relative animate-fade-in text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-emerald-500" />
            </div>
            
            <h3 className="text-sm font-bold tracking-tight text-zinc-800 uppercase font-mono">
              AURORA GASTRONOMÍA S.A.S
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Sede: Medellín Centro • Nit: 900.254.125-9</p>
            <div className="w-full border-t border-dashed border-zinc-200 my-4"></div>

            <div className="w-full text-left space-y-1 text-[11px] font-mono text-zinc-600 mb-4">
              <div className="flex justify-between font-bold text-zinc-900">
                <span>Nº Factura:</span>
                <span>{showInvoiceReceipt.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Fecha:</span>
                <span>{new Date(showInvoiceReceipt.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cliente:</span>
                <span className="font-semibold text-zinc-800">{showInvoiceReceipt.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>Cédula/NIT:</span>
                <span>{showInvoiceReceipt.customerDocument}</span>
              </div>
            </div>

            <div className="w-full text-left text-[11px] font-mono space-y-2 mb-4 border-b border-dashed border-zinc-200 pb-3">
              <span className="text-[10px] text-zinc-400 block uppercase tracking-widest font-bold">Consumo:</span>
              {showInvoiceReceipt.items.map((i, idx) => (
                <div key={idx} className="flex justify-between text-zinc-700">
                  <span>{i.qty}x {i.name}</span>
                  <span>${(i.price * i.qty).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="w-full text-left space-y-1 text-[11px] font-mono text-zinc-600 mb-4 pb-3 border-b border-dashed border-zinc-200">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${showInvoiceReceipt.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Impoconsumo (8%):</span>
                <span>${showInvoiceReceipt.tax.toLocaleString()}</span>
              </div>
              {showInvoiceReceipt.tip > 0 && (
                <div className="flex justify-between text-blue-600 font-semibold">
                  <span>Propina Voluntaria:</span>
                  <span>${showInvoiceReceipt.tip.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-zinc-900 pt-1.5 border-t border-zinc-200">
                <span>TOTAL PAGADO:</span>
                <span className="text-emerald-600">${showInvoiceReceipt.total.toLocaleString()} COP</span>
              </div>
            </div>

            {/* Simulated QR Code DIAN standard / Control Interno */}
            {showInvoiceReceipt.electronicResolution.includes("DIAN") ? (
              <>
                <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-2xl mb-4 flex flex-col items-center w-full">
                  <QrCode className="h-28 w-28 text-zinc-800" />
                  <span className="text-[9px] text-zinc-400 font-mono mt-2 truncate max-w-[220px]" title={showInvoiceReceipt.xmlHash}>
                    CUFE: {showInvoiceReceipt.xmlHash.substring(0, 30)}...
                  </span>
                </div>

                <p className="text-[9px] text-zinc-400 leading-normal mb-5 font-mono">
                  {showInvoiceReceipt.electronicResolution}
                  <br />
                  <span className="font-bold text-emerald-600">VALIDACIÓN ELECTRÓNICA DIAN EXITOSA</span>
                </p>
              </>
            ) : (
              <>
                <div className="bg-zinc-50 border border-dashed border-zinc-200 p-4 rounded-2xl mb-4 flex flex-col items-center w-full text-center">
                  <span className="text-[10px] font-bold text-zinc-700 font-mono uppercase tracking-widest">CONTROL INTERNO</span>
                  <span className="text-[9px] text-zinc-500 font-mono mt-1">Voucher de Control Comercial Simplificado</span>
                </div>
                <p className="text-[9px] text-zinc-400 leading-normal mb-5 font-mono">
                  {showInvoiceReceipt.electronicResolution}
                  <br />
                  <span className="font-semibold text-zinc-500">DOCUMENTO COMERCIAL SIN COSTO TRIBUTARIO</span>
                </p>
              </>
            )}

            <div className="flex gap-2 w-full">
              <button
                onClick={() => setShowInvoiceReceipt(null)}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 rounded-2xl text-xs transition-colors cursor-pointer"
              >
                Cerrar Recibo e Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ZERO FRICTION CHECKOUT VOUCHER SELECTOR MODAL */}
      <CashCheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        total={total}
        defaultPaymentMethod={checkoutPaymentMethod}
        onConfirm={processCheckoutPayment}
      />

      {/* CHECKOUT WIZARD DIALOG (REPORT Z) */}
      {showZWizard && (
        <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-md flex items-center justify-center p-4 font-sans text-zinc-800">
          <div className="bg-white border border-zinc-200 rounded-[2rem] p-8 w-full max-w-lg shadow-2xl relative space-y-6">
            <button 
              onClick={() => setShowZWizard(false)}
              className="absolute top-6 right-6 p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <AlertTriangle className="text-amber-500 h-5 w-5" />
              Proceso Fiscal: Arqueo y Cierre de Caja (Z)
            </h3>

            {/* Stepper progress indicator */}
            <div className="flex items-center justify-between font-mono text-[9px] font-bold uppercase text-zinc-400 border-b border-zinc-100 pb-4">
              <span className={zStep >= 1 ? 'text-blue-600 font-extrabold' : ''}>1. Base</span>
              <span className="text-zinc-300">➔</span>
              <span className={zStep >= 2 ? 'text-blue-600 font-extrabold' : ''}>2. Efectivo</span>
              <span className="text-zinc-300">➔</span>
              <span className={zStep >= 3 ? 'text-blue-600 font-extrabold' : ''}>3. Bancos</span>
              <span className="text-zinc-300">➔</span>
              <span className={zStep >= 4 ? 'text-blue-600 font-extrabold' : ''}>4. Conciliación</span>
              <span className="text-zinc-300">➔</span>
              <span className={zStep >= 5 ? 'text-emerald-600 font-extrabold' : ''}>5. Cierre Z</span>
            </div>

            {/* Step 1 Content */}
            {zStep === 1 && (
              <div className="space-y-4">
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Verifique el fondo fijo o base de caja con el que se abrió el turno comercial para dar cambios a clientes.
                </p>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase block tracking-wider">Fondo Fijo Base (Apertura)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-zinc-400 font-mono">$</span>
                    <input
                      type="number"
                      value={openingCash}
                      onChange={(e) => setOpeningCash(Number(e.target.value))}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 pl-8 pr-4 font-mono text-sm text-zinc-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                  <button onClick={() => setShowZWizard(false)} className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl text-xs hover:bg-zinc-200 transition-all cursor-pointer font-semibold">
                    Cancelar
                  </button>
                  <button onClick={() => setZStep(2)} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-all cursor-pointer">
                    Siguiente Paso
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 Content */}
            {zStep === 2 && (
              <div className="space-y-4">
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Realice el arqueo e ingrese el total de billetes y monedas contados físicamente en el cajón de la registradora.
                </p>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase block tracking-wider">Total Efectivo Físico Arqueado</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-emerald-600 font-mono">$</span>
                    <input
                      type="number"
                      value={countedCash || ''}
                      onChange={(e) => setCountedCash(Number(e.target.value))}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 pl-8 pr-4 font-mono text-sm text-zinc-800 focus:outline-none focus:border-blue-500"
                      placeholder="COP 0"
                    />
                  </div>
                </div>
                <div className="flex justify-between pt-4 border-t border-zinc-100">
                  <button onClick={() => setZStep(1)} className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl text-xs hover:bg-zinc-200 transition-all cursor-pointer font-semibold">
                    Atrás
                  </button>
                  <button onClick={() => setZStep(3)} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-all cursor-pointer">
                    Siguiente Paso
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 Content */}
            {zStep === 3 && (
              <div className="space-y-4 font-sans text-xs">
                <p className="text-zinc-500 leading-relaxed">
                  Ventas no-efectivo validadas por el sistema correspondientes a terminales POS (tarjetas) y transferencias bancarias.
                </p>
                <div className="bg-zinc-50 p-4.5 rounded-2xl border border-zinc-200 space-y-2.5 font-mono text-xs">
                  <div className="flex justify-between text-zinc-600">
                    <span>Ventas por Tarjeta:</span>
                    <span className="text-zinc-900 font-bold">${cardSalesExpected.toLocaleString()} COP</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>Ventas por Bancos / QR:</span>
                    <span className="text-zinc-900 font-bold">${transferSalesExpected.toLocaleString()} COP</span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-200 pt-2 font-bold text-zinc-700">
                    <span>Total Digital Esperado:</span>
                    <span className="text-blue-600 font-extrabold">${(cardSalesExpected + transferSalesExpected).toLocaleString()} COP</span>
                  </div>
                </div>
                <div className="flex justify-between pt-4 border-t border-zinc-100">
                  <button onClick={() => setZStep(2)} className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl text-xs hover:bg-zinc-200 transition-all cursor-pointer font-semibold">
                    Atrás
                  </button>
                  <button onClick={() => setZStep(4)} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-all cursor-pointer">
                    Ver Conciliación
                  </button>
                </div>
              </div>
            )}

            {/* Step 4 Content */}
            {zStep === 4 && (
              <div className="space-y-4 font-sans text-xs">
                <p className="text-zinc-500 leading-relaxed">
                  Comparación automatizada del efectivo teórico (Apertura + Ventas) contra el conteo físico real ingresado.
                </p>

                <div className="bg-zinc-50 p-4.5 rounded-2xl border border-zinc-200 space-y-3 font-mono text-xs">
                  <div className="flex justify-between text-zinc-600">
                    <span>(+) Base de Caja Inicial:</span>
                    <span className="text-zinc-700 font-bold">${openingCash.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>(+) Ventas Efectivo Esperado:</span>
                    <span className="text-zinc-700 font-bold">${cashSalesExpected.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-200 pb-2 text-zinc-800 font-bold">
                    <span>(=) Total Efectivo Teórico:</span>
                    <span className="text-zinc-900">${(openingCash + cashSalesExpected).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>(-) Su Conteo Físico Real:</span>
                    <span className="text-blue-600 font-bold">${countedCash.toLocaleString()}</span>
                  </div>

                  {/* Computes difference */}
                  {countedCash - (openingCash + cashSalesExpected) === 0 ? (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-[11px] font-bold flex items-center gap-1.5 mt-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span>Arqueo de Caja Perfecto: Diferencia de $0 COP.</span>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-[11px] space-y-1 mt-2">
                      <div className="font-bold flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span>Descuadre Detectado en Caja:</span>
                      </div>
                      <p className="font-bold">
                        Diferencia: {countedCash - (openingCash + cashSalesExpected) > 0 ? `Sobrante de +$${(countedCash - (openingCash + cashSalesExpected)).toLocaleString()}` : `Faltante de -$${Math.abs(countedCash - (openingCash + cashSalesExpected)).toLocaleString()}`} COP.
                      </p>
                      <p className="text-[10px] text-zinc-400 font-medium italic mt-1">
                        La discrepancia se registrará de forma permanente en la bitácora fiscal del sistema de auditoría.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-4 border-t border-zinc-100">
                  <button onClick={() => setZStep(3)} className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl text-xs hover:bg-zinc-200 transition-all cursor-pointer font-semibold">
                    Atrás
                  </button>
                  <button onClick={executeZClosure} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md">
                    Confirmar Arqueo y Emitir Reporte Z
                  </button>
                </div>
              </div>
            )}

            {/* Step 5 Content: Finished Report Z printable view */}
            {zStep === 5 && zFinishedReport && (
              <div className="space-y-4 font-sans text-xs">
                <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200 text-center font-mono space-y-3 shadow-sm max-h-[300px] overflow-y-auto">
                  <h4 className="font-bold border-b border-dashed border-zinc-300 pb-2 text-zinc-800">REPORTE FISCAL Z</h4>
                  <p className="text-[10px] text-zinc-400 uppercase font-bold">Cierre definitivo de jornada</p>
                  <div className="text-left text-[11px] space-y-1 text-zinc-600">
                    <div><strong>Código Fiscal:</strong> {zFinishedReport.reportZCode}</div>
                    <div><strong>Fecha/Hora:</strong> {new Date(zFinishedReport.timestamp).toLocaleString()}</div>
                    <div><strong>Arqueador:</strong> {zFinishedReport.closedBy}</div>
                    <div className="border-t border-dashed border-zinc-200 my-2 pt-2"></div>
                    <div className="flex justify-between">
                      <span>Total Facturado:</span>
                      <span>${zFinishedReport.totalSales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Base Caja Inicial:</span>
                      <span>${zFinishedReport.openingCash.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Efectivo Real:</span>
                      <span>${zFinishedReport.actualCash.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Tarjetas:</span>
                      <span>${zFinishedReport.cardSales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Bancos/QR:</span>
                      <span>${zFinishedReport.transferSales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-zinc-300 pt-1.5 text-zinc-900">
                      <span>Diferencia Arqueo:</span>
                      <span className={zFinishedReport.difference === 0 ? 'text-emerald-600' : 'text-red-500'}>
                        ${zFinishedReport.difference.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200 font-bold block text-center uppercase tracking-wider">
                      JORNADA CERRADA FISCALMENTE
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100">
                  <button 
                    onClick={() => {
                      const printData = JSON.stringify(zFinishedReport, null, 2);
                      const blob = new Blob([printData], {type: "text/plain"});
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Reporte_Z_${zFinishedReport.date}_Sede_${sedeId}.txt`;
                      a.click();
                    }}
                    className="px-4 py-2.5 bg-zinc-100 text-zinc-700 border border-zinc-200 font-semibold rounded-xl text-xs hover:bg-zinc-200 flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Download className="h-4 w-4 text-zinc-500" />
                    Descargar Reporte (.TXT)
                  </button>
                  <button 
                    onClick={() => setShowZWizard(false)} 
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-blue-600/10"
                  >
                    Finalizar Proceso
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 🗺️ INTERACTIVE TABLE MAPPING MODAL OVERLAY */}
      {showTableMapModal && (
        <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans text-slate-300">
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 w-full max-w-4xl shadow-2xl relative space-y-5 animate-fade-in">
            <button 
              onClick={() => setShowTableMapModal(false)}
              className="absolute top-6 right-6 p-1.5 rounded-full text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center"
              title="Cerrar mapa"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-[#06B6D4]/10 border border-[#06B6D4]/20 flex items-center justify-center text-[#06B6D4]">
                <Map className="h-4 w-4" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-black text-white tracking-tight">
                  🗺️ MAPEO DE MESAS & CONTROL DE SERVICIO
                </h3>
                <p className="text-[11px] text-slate-400">Seleccione una mesa para abrir su comanda activa o iniciar un nuevo pedido de inmediato.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 pt-2">
              {tables.map((table) => {
                const activeCom = comandas.find(c => 
                  c.sedeId === sedeId && 
                  c.tableNumber === table && 
                  ['PENDIENTE', 'COCINANDO', 'LISTO'].includes(c.status)
                );
                const isSelected = selectedTable === table;
                let statusText = "Vacía 🟢";
                let statusColor = "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-950/60";
                if (activeCom) {
                  if (activeCom.status === 'LISTO') {
                    statusText = `Listo 🔔`;
                    statusColor = "bg-amber-500/10 border-amber-500/40 text-amber-400 animate-pulse";
                  } else if (activeCom.status === 'COCINANDO') {
                    statusText = `Cocina 🍳`;
                    statusColor = "bg-orange-500/10 border-orange-500/40 text-orange-400";
                  } else {
                    statusText = `Pendiente ⏳`;
                    statusColor = "bg-blue-500/10 border-blue-500/40 text-blue-400";
                  }
                } else if (table === 'LLEVAR') {
                  statusText = "Directo 🛍️";
                  statusColor = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
                }

                return (
                  <button
                    key={table}
                    onClick={() => {
                      handleSelectTable(table);
                      setShowTableMapModal(false);
                    }}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col justify-between h-[80px] relative select-none ${
                      isSelected 
                        ? 'ring-2 ring-[#06B6D4] bg-[#06B6D4]/20 border-[#06B6D4] text-white shadow-md shadow-[#06B6D4]/10' 
                        : statusColor
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-black tracking-tight">{table}</span>
                      {activeCom && (
                        <span className="flex h-1.5 w-1.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-start w-full mt-1.5">
                      <span className="text-[9px] truncate uppercase font-extrabold tracking-wider opacity-90">
                        {statusText}
                      </span>
                      {activeCom && (
                        <span className="text-[9px] font-mono text-emerald-400 font-bold mt-0.5">
                          ${activeCom.total.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-[10px] text-slate-500 font-mono">
              <div className="flex gap-4">
                <span className="flex items-center gap-1">🟢 Vacía</span>
                <span className="flex items-center gap-1">⏳ Pendiente</span>
                <span className="flex items-center gap-1">🍳 Preparando</span>
                <span className="flex items-center gap-1">🔔 Comida Lista</span>
              </div>
              <span>Presione ESC para cerrar</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
