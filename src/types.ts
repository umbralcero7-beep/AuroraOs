export type AuroraRole = 'super_admin' | 'admin' | 'cashier' | 'waiter' | 'kitchen';

export interface User {
  id: string;
  name: string;
  email: string;
  role: AuroraRole;
  allowedModules: string[];
  sedeId: string;
  active: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  backupCodes?: string[];
}

export interface Sede {
  id: string;
  name: string;
  address: string;
  phone: string;
  licenseStatus: 'ACTIVE' | 'PENDING_PAYMENT' | 'SUSPENDED';
  licenseExpiry: string;
  monthlyFee: number;
  lastPaymentDate: string;
}

export interface WhitelistedUser {
  id: string;
  email: string;
  role: AuroraRole;
  sedeId: string;
  tempKey: string;
  createdTime: string;
}

export interface Insumo {
  id: string;
  name: string;
  sku: string;
  unit: string;
  category: string;
  stock: number;
  minStock: number;
  costPrice: number;
  supplierId: string;
  sedeId: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  category: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: 'ENTRADAS' | 'PLATOS_FUERTES' | 'BEBIDAS' | 'POSTRES' | 'COMBOS';
  description: string;
  ingredients: { insumoId: string; qty: number }[]; // For automated stock depletion
  available: boolean;
  sedeId: string;
}

export interface Comanda {
  id: string;
  sedeId: string;
  tableNumber: string | 'LLEVAR';
  items: {
    menuItemId: string;
    name: string;
    price: number;
    qty: number;
    notes?: string;
  }[];
  status: 'PENDIENTE' | 'COCINANDO' | 'LISTO' | 'ENTREGADO';
  timestamp: string;
  waiterId: string;
  waiterName?: string;
  guestsCount?: number;
  subtotal: number;
  tax: number;
  total: number;
}

export interface Domicilio {
  id: string;
  sedeId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: {
    menuItemId: string;
    name: string;
    price: number;
    qty: number;
  }[];
  deliveryCost: number;
  total: number;
  status: 'PENDIENTE' | 'PREPARANDO' | 'LISTO' | 'DESPACHADO' | 'ENTREGADO' | 'ANULADO';
  repartidorId?: string;
  gpsCoordinates?: { lat: number; lng: number };
  routeProgress?: number; // 0 to 100%
  timestamp: string;
  notes?: string;
  routePriority?: number;
  requireInvoice?: boolean;
  invoiceStatus?: 'NO_REQUERIDO' | 'ESPERA_CAJA' | 'VALIDADO_DIAN' | 'RECHAZADO';
  cufeHash?: string;
  paymentConfirmedMethod?: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';
  customerDocument?: string;
}

export interface Reserva {
  id: string;
  sedeId: string;
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  guests: number;
  tableNumber: string;
  status: 'RESERVADO' | 'ASISTIDO' | 'CANCELADO';
}

export interface Gasto {
  id: string;
  sedeId: string;
  description: string;
  category: 'SERVICIOS' | 'NOMINA' | 'MATERIA_PRIMA' | 'ALQUILER' | 'PUBLICIDAD' | 'OTROS';
  amount: number;
  timestamp: string;
  receiptNumber?: string;
}

export interface PaymentMethod {
  method: 'EFECTIVO' | 'TARJETA_DEBITO' | 'TARJETA_CREDITO' | 'TRANSFERENCIA';
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // Secuencial DIAN style
  sedeId: string;
  orderId?: string;
  domicilioId?: string;
  customerName: string;
  customerDocument?: string;
  items: {
    name: string;
    qty: number;
    price: number;
    subtotal: number;
  }[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  payments: PaymentMethod[];
  electronicResolution: string;
  xmlHash: string;
  qrCodeData: string;
  timestamp: string;
  status: 'VALIDADO_DIAN' | 'RECHAZADO' | 'CONTABILIZADO';
}

export interface WaiterBitacora {
  id: string;
  waiterId: string;
  waiterName: string;
  sedeId: string;
  date: string;
  shift: 'DIURNO' | 'NOCTURNO';
  tipsCollected: number;
  incidents: string;
  rating: number; // 1 to 5
}

export interface HRColaborador {
  id: string;
  name: string;
  role: string;
  salary: number;
  contractType: 'INDEFINIDO' | 'TERMINO_FIJO' | 'POR_HORAS' | 'PRESTACION_SERVICIOS';
  startDate: string;
  kpiRating: number;
  attendancePct: number;
  payrollStatus: 'PAGADO' | 'PENDIENTE';
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  ip: string;
  userId?: string;
  emailAttempted?: string;
  sedeId?: string;
  type: 'FAILED_LOGIN' | 'SUSPICIOUS_PAYLOAD' | 'XSS_FILTER' | 'INJECTION_ATTEMPT' | 'BLOCKED_RATE_LIMIT' | 'SUCCESSFUL_LOGIN_2FA';
  details: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface CierreCaja {
  id: string;
  sedeId: string;
  date: string;
  openedBy: string;
  closedBy: string;
  openingCash: number;
  expectedCash: number;
  actualCash: number;
  cardSales: number;
  transferSales: number;
  totalExpenses: number;
  difference: number;
  totalSales: number;
  timestamp: string;
  reportZCode: string; // Resumen final fiscal
}

// Cushion state (Colchón Contable)
export interface AccountingCushion {
  retainedEarnings: number; // Fondo guardado
  cushionTarget: number; // Meta de colchón
  activeBufferAmount: number; // Monto actual disponible
  cushionHistory: {
    id: string;
    timestamp: string;
    action: 'INYECCION_RESERVA' | 'CUBRIR_PERDIDA' | 'AJUSTE_MANUAL';
    amount: number;
    description: string;
    balanceAfter: number;
  }[];
}
