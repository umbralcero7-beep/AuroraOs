import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Calendar, 
  Mail, 
  Database, 
  FileSpreadsheet, 
  Plus, 
  Send, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  ExternalLink,
  RefreshCw,
  LogOut,
  UserCheck,
  FileDown,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { googleSignIn, logout, initAuth, getAccessToken } from '../lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { Invoice, Insumo, MenuItem, Gasto } from '../types';

interface GoogleWorkspaceModuleProps {
  sedeId: string;
  invoices: Invoice[];
  insumos: Insumo[];
  menuItems: MenuItem[];
  currentUser: any;
  gastos?: Gasto[];
  onTriggerAction?: (actionType: string, payload: any) => void;
  refreshData?: () => void;
}

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
}

interface GmailMessage {
  id: string;
  threadId: string;
  subject?: string;
  from?: string;
  date?: string;
  snippet?: string;
}

export default function GoogleWorkspaceModule({
  sedeId,
  invoices,
  insumos,
  menuItems,
  currentUser,
  gastos = [],
  onTriggerAction,
  refreshData
}: GoogleWorkspaceModuleProps) {
  // Authentication & token states
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active module tab within Google Integration
  const [activeSubTab, setActiveSubTab] = useState<'calendar' | 'gmail' | 'sheets'>('calendar');

  // Loading and error indicators
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Google Calendar state
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [newCalEvent, setNewCalEvent] = useState({
    summary: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: '12:00',
    duration: '60' // minutes
  });

  // Gmail state
  const [gmailMessages, setGmailMessages] = useState<GmailMessage[]>([]);
  const [newEmail, setNewEmail] = useState({
    to: '',
    subject: '',
    body: ''
  });

  // Google Sheets state
  const [recentSheets, setRecentSheets] = useState<{ id: string; name: string; url: string; date: string }[]>(() => {
    try {
      const saved = localStorage.getItem('aurora_sheets_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Initialize auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (firebaseUser, token) => {
        setUser(firebaseUser);
        setAccessToken(token);
        setNeedsAuth(false);
        // Load initial data
        loadModuleData(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Sync recent sheets to localStorage
  useEffect(() => {
    localStorage.setItem('aurora_sheets_history', JSON.stringify(recentSheets));
  }, [recentSheets]);

  // Load everything when logged in
  const loadModuleData = async (token: string) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      await Promise.all([
        fetchCalendarEvents(token),
        fetchGmailInbox(token)
      ]);
    } catch (err: any) {
      console.error("Error loading workspace data", err);
      setErrorMessage("No se pudieron sincronizar algunos datos de Google. Por favor, re-vincula tu cuenta si expira el token.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        setNeedsAuth(false);
        await loadModuleData(res.accessToken);
        setSuccessMessage('¡Cuenta de Google vinculada con éxito en Aurora OS!');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Error al vincular con Google: ' + (err.message || err));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    if (window.confirm('¿Desvincular tu cuenta de Google de Aurora OS?')) {
      await logout();
      setUser(null);
      setAccessToken(null);
      setNeedsAuth(true);
      setEvents([]);
      setGmailMessages([]);
      setSuccessMessage('Cuenta desvinculada correctamente.');
    }
  };

  // ==========================================
  // GOOGLE CALENDAR API INTEGRATION
  // ==========================================
  const fetchCalendarEvents = async (token: string) => {
    try {
      const now = new Date().toISOString();
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&maxResults=8&orderBy=startTime&singleEvents=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Calendar fetch failed');
      const data = await res.json();
      if (data.items) {
        setEvents(data.items);
      }
    } catch (err) {
      console.error("Calendar fetch error:", err);
    }
  };

  const createCalendarEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    if (!newCalEvent.summary) return;

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const startDateTime = new Date(`${newCalEvent.date}T${newCalEvent.time}:00`).toISOString();
      const endDateTime = new Date(new Date(startDateTime).getTime() + parseInt(newCalEvent.duration) * 60 * 1000).toISOString();

      const body = {
        summary: newCalEvent.summary,
        description: newCalEvent.description || 'Creado automáticamente desde Aurora OS - Restaurant Management',
        start: {
          dateTime: startDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error('No se pudo crear el evento');
      
      const created = await res.json();
      setSuccessMessage(`¡Evento "${created.summary}" programado con éxito en tu Google Calendar!`);
      
      // Reset form
      setNewCalEvent({
        summary: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        time: '12:00',
        duration: '60'
      });

      // Reload
      await fetchCalendarEvents(accessToken);
    } catch (err: any) {
      setErrorMessage('Error al programar evento: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // GMAIL API INTEGRATION
  // ==========================================
  const fetchGmailInbox = async (token: string) => {
    try {
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=is:unread', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Gmail fetch failed');
      const listData = await res.json();
      
      if (listData.messages && listData.messages.length > 0) {
        // Fetch details for each message in parallel
        const detailsPromises = listData.messages.map(async (msg: any) => {
          const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=minimal`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            // Try to extract Subject and From from headers
            const headers = detailData.payload?.headers || [];
            const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject');
            const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from');
            const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date');
            
            return {
              id: detailData.id,
              threadId: detailData.threadId,
              subject: subjectHeader ? subjectHeader.value : '(Sin Asunto)',
              from: fromHeader ? fromHeader.value : 'Desconocido',
              date: dateHeader ? new Date(dateHeader.value).toLocaleDateString() : '',
              snippet: detailData.snippet
            };
          }
          return null;
        });

        const detailedMessages = await Promise.all(detailsPromises);
        setGmailMessages(detailedMessages.filter(m => m !== null) as GmailMessage[]);
      } else {
        setGmailMessages([]);
      }
    } catch (err) {
      console.error("Gmail inbox fetch error:", err);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    if (!newEmail.to || !newEmail.subject || !newEmail.body) {
      setErrorMessage('Por favor, completa todos los campos del correo electrónico.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Build raw email message
      const fromEmail = user?.email || 'aurora-os@applet.com';
      const str = [
        "Content-Type: text/html; charset=\"UTF-8\"\r\n",
        "MIME-Version: 1.0\r\n",
        "Content-Transfer-Encoding: 7bit\r\n",
        `to: ${newEmail.to}\r\n`,
        `from: ${fromEmail}\r\n`,
        `subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(newEmail.subject)))}?=\r\n\r\n`,
        `<div style="font-family: sans-serif; padding: 20px; background-color: #0f172a; color: #f1f5f9; border-radius: 12px; border: 1px solid #334155;">
          <h2 style="color: #06b6d4; margin-top: 0; font-size: 20px; border-b: 1px solid #1e293b; padding-bottom: 10px;">Aurora OS - Restaurant Intelligence</h2>
          <div style="font-size: 14px; line-height: 1.6; margin-top: 15px;">
            ${newEmail.body.replace(/\n/g, '<br />')}
          </div>
          <p style="font-size: 11px; color: #64748b; margin-top: 30px; border-t: 1px solid #1e293b; padding-top: 10px; font-family: monospace;">
            Correo enviado de forma automatizada por el módulo de vinculación en la nube de Aurora OS.
          </p>
         </div>`
      ].join("");

      const encodedEmail = btoa(unescape(encodeURIComponent(str)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: encodedEmail })
      });

      if (!res.ok) throw new Error('Error al enviar el correo mediante la API de Gmail');

      setSuccessMessage(`¡Correo enviado con éxito a ${newEmail.to}!`);
      setNewEmail({ to: '', subject: '', body: '' });
    } catch (err: any) {
      setErrorMessage('Error al enviar correo: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // GOOGLE SHEETS API INTEGRATION (REAL EXPORT)
  // ==========================================
  const handleExportToSheets = async (type: 'invoices' | 'inventory' | 'menu') => {
    if (!accessToken) return;
    
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      let sheetTitle = '';
      let headers: string[] = [];
      let rows: any[][] = [];

      if (type === 'invoices') {
        sheetTitle = `Reporte de Facturación Aurora OS (${new Date().toLocaleDateString()})`;
        headers = ['ID Factura', 'Nro Factura', 'Cliente', 'Documento', 'Total (COP)', 'Método Pago', 'Fecha'];
        rows = invoices.map(inv => [
          inv.id,
          inv.invoiceNumber,
          inv.customerName,
          inv.customerDocument || 'N/A',
          inv.total,
          inv.payments ? inv.payments.map(p => p.method).join(', ') : 'N/A',
          new Date(inv.timestamp || Date.now()).toLocaleDateString()
        ]);
      } else if (type === 'inventory') {
        sheetTitle = `Insumos & Stock Crítico Aurora OS (${new Date().toLocaleDateString()})`;
        headers = ['ID Insumo', 'Nombre', 'SKU / Código', 'Categoría', 'Stock Actual', 'Mínimo Crítico', 'Unidad Medida', 'Estado Stock'];
        rows = insumos.map(ins => {
          const state = ins.stock <= ins.minStock ? 'CRÍTICO' : 'OK';
          return [
            ins.id,
            ins.name,
            ins.sku,
            ins.category,
            ins.stock,
            ins.minStock,
            ins.unit,
            state
          ];
        });
      } else {
        sheetTitle = `Menú Activo de Platos - Aurora OS (${new Date().toLocaleDateString()})`;
        headers = ['ID Plato', 'Nombre Plato', 'Categoría', 'Precio Venta (COP)', 'Descripción', 'Disponible'];
        rows = menuItems.map(m => [
          m.id,
          m.name,
          m.category,
          m.price,
          m.description,
          m.available ? 'SÍ' : 'NO'
        ]);
      }

      // Step 1: Create a brand new Google Spreadsheet
      const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: { title: sheetTitle }
        })
      });

      if (!createRes.ok) throw new Error('No se pudo crear la hoja de cálculo en Drive');
      const spreadsheet = await createRes.ok ? await createRes.json() : null;
      if (!spreadsheet || !spreadsheet.spreadsheetId) throw new Error('Spreadsheet creation returned invalid data');

      const spreadsheetId = spreadsheet.spreadsheetId;
      const spreadsheetUrl = spreadsheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

      // Step 2: Append Headers and Data rows
      const values = [headers, ...rows];

      const appendRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: 'Sheet1!A1',
          majorDimension: 'ROWS',
          values: values
        })
      });

      if (!appendRes.ok) throw new Error('No se pudieron escribir las filas de datos');

      // Add to recent sheets list
      const newSheetRecord = {
        id: spreadsheetId,
        name: sheetTitle,
        url: spreadsheetUrl,
        date: new Date().toLocaleString()
      };

      setRecentSheets(prev => [newSheetRecord, ...prev.slice(0, 9)]);
      setSuccessMessage(`¡Base de datos exportada con éxito! Hoja creada en tu Drive.`);

      // Open sheet in a new tab
      window.open(spreadsheetUrl, '_blank');
    } catch (err: any) {
      setErrorMessage('Error al exportar a Google Sheets: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // GOOGLE SHEETS ERP CONSOLIDATED DASHBOARD (OPCIÓN 3)
  // ==========================================
  const handleExportConsolidatedERPDashboard = async () => {
    if (!accessToken) return;
    
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const sheetTitle = `Cuadro de Mando Financiero ERP - Aurora OS (${new Date().toLocaleDateString()})`;
      
      // Step 1: Create a Google Spreadsheet with 4 Sheets (pestañas)
      const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: { title: sheetTitle },
          sheets: [
            { properties: { title: '📊 Resumen Ejecutivo' } },
            { properties: { title: '💰 Facturación Detallada' } },
            { properties: { title: '📉 Stock de Alerta' } },
            { properties: { title: '🧾 Control de Egresos' } }
          ]
        })
      });

      if (!createRes.ok) throw new Error('No se pudo crear el Cuadro de Mando consolidado en Drive');
      const spreadsheet = await createRes.json();
      if (!spreadsheet || !spreadsheet.spreadsheetId) throw new Error('La creación del libro devolvió datos inválidos');

      const spreadsheetId = spreadsheet.spreadsheetId;
      const spreadsheetUrl = spreadsheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

      // Step 2: Prepare data for each tab
      
      // Tab 1: Resumen Ejecutivo
      const filteredInvoices = invoices.filter(i => i.sedeId === sedeId);
      const filteredGastos = (gastos || []).filter(g => g.sedeId === sedeId);
      const filteredInsumos = insumos.filter(i => i.sedeId === sedeId);
      
      const totalSales = filteredInvoices.reduce((acc, curr) => acc + curr.total, 0);
      const totalExpenses = filteredGastos.reduce((acc, curr) => acc + curr.amount, 0);
      const netProfit = totalSales - totalExpenses;
      const lowStockCount = filteredInsumos.filter(i => i.stock <= i.minStock).length;
      const activeMenuItemsCount = menuItems.filter(m => m.sedeId === sedeId).length;

      const summaryValues = [
        ["CUADRO DE MANDO FINANCIERO ERP - AURORA OS", ""],
        ["Reporte Consolidado de Operación e Inteligencia Financiera", ""],
        ["", ""],
        ["INFORMACIÓN DEL REPORTE", ""],
        ["Fecha de Generación", new Date().toLocaleString()],
        ["Sede ID", sedeId],
        ["Usuario Responsable", user?.displayName || currentUser?.name || "Administrador"],
        ["", ""],
        ["MÉTRICAS CLAVE", "VALOR"],
        ["Ingresos Totales (POS + Domicilios)", totalSales],
        ["Egresos Totales (Gastos)", totalExpenses],
        ["Utilidad de Operación Neta", netProfit],
        ["Insumos por Debajo del Stock Crítico", lowStockCount],
        ["Total Platos Activos en el Menú", activeMenuItemsCount],
        ["", ""],
        ["ESTADO DE SALUD FINANCIERA", netProfit >= 0 ? "EXCEDENTE OPERACIONAL (SALDO POSITIVO)" : "DÉFICIT OPERACIONAL (ALERTA DE CAJA)"],
        ["ESTADO DE INVENTARIO", lowStockCount > 0 ? `REABASTECIMIENTO REQUERIDO (${lowStockCount} INSUMOS EN CRÍTICO)` : "INVENTARIO SANO"]
      ];

      // Tab 2: Facturación Detallada
      const billingHeaders = ['ID Factura', 'Nro Factura', 'Cliente', 'Documento', 'Total (COP)', 'Método Pago', 'Fecha'];
      const billingRows = filteredInvoices.map(inv => [
        inv.id,
        inv.invoiceNumber,
        inv.customerName,
        inv.customerDocument || 'N/A',
        inv.total,
        inv.payments ? inv.payments.map(p => p.method).join(', ') : 'N/A',
        new Date(inv.timestamp || Date.now()).toLocaleDateString()
      ]);
      const billingValues = [billingHeaders, ...billingRows];

      // Tab 3: Stock de Alerta
      const stockHeaders = ['ID Insumo', 'Nombre Insumo', 'SKU / Código', 'Categoría', 'Stock Actual', 'Mínimo Alerta', 'Unidad Medida', 'Estado Stock'];
      const stockRows = filteredInsumos.map(ins => [
        ins.id,
        ins.name,
        ins.sku,
        ins.category,
        ins.stock,
        ins.minStock,
        ins.unit,
        ins.stock <= ins.minStock ? 'CRÍTICO' : 'OK'
      ]);
      const stockValues = [stockHeaders, ...stockRows];

      // Tab 4: Control de Egresos
      const expenseHeaders = ['ID Gasto', 'Descripción Gasto', 'Categoría', 'Monto (COP)', 'Soporte / Factura', 'Fecha Registro'];
      const expenseRows = filteredGastos.map(g => [
        g.id,
        g.description,
        g.category,
        g.amount,
        g.receiptNumber || 'N/A',
        new Date(g.timestamp || Date.now()).toLocaleDateString()
      ]);
      const expenseValues = [expenseHeaders, ...expenseRows];

      // Step 3: Call batchUpdate to write data into all 4 tabs in a single call
      const appendRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: [
            { range: '📊 Resumen Ejecutivo!A1', majorDimension: 'ROWS', values: summaryValues },
            { range: '💰 Facturación Detallada!A1', majorDimension: 'ROWS', values: billingValues },
            { range: '📉 Stock de Alerta!A1', majorDimension: 'ROWS', values: stockValues },
            { range: '🧾 Control de Egresos!A1', majorDimension: 'ROWS', values: expenseValues }
          ]
        })
      });

      if (!appendRes.ok) throw new Error('No se pudieron rellenar los datos del cuadro de mando en las pestañas');

      // Add to recent sheets list
      const newSheetRecord = {
        id: spreadsheetId,
        name: sheetTitle,
        url: spreadsheetUrl,
        date: new Date().toLocaleString()
      };

      setRecentSheets(prev => [newSheetRecord, ...prev.slice(0, 9)]);
      setSuccessMessage(`¡Cuadro de Mando Financiero ERP (Opción 3) generado con éxito en Google Sheets!`);

      // Open sheet in a new tab
      window.open(spreadsheetUrl, '_blank');
    } catch (err: any) {
      setErrorMessage('Error al exportar Cuadro de Mando: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#09090b] text-[#fafafa] flex flex-col gap-6 font-sans">
      
      {/* Top Welcome Title Grid */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-500 font-mono font-bold text-xs uppercase tracking-widest mb-1.5">
            <Cloud className="h-4.5 w-4.5 text-blue-500 animate-pulse" />
            Integración Oficial de Google Cloud
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Nube Aurora OS <span className="text-zinc-500 font-normal">| G-Workspace</span>
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Conexión en vivo con tus cuentas corporativas de Google Sheets, Calendar y Gmail.
          </p>
        </div>

        {/* Google Authentication Box */}
        {needsAuth ? (
          <button
            onClick={handleSignIn}
            disabled={isLoggingIn}
            className="px-5 py-3 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] border border-zinc-800 hover:border-[#38BDF8]/50 text-white transition-all duration-300 shadow-xl shadow-blue-950/10 flex items-center gap-3 cursor-pointer select-none font-sans text-xs font-bold"
          >
            {isLoggingIn ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#38BDF8]" />
            ) : (
              <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
            )}
            {isLoggingIn ? 'Autenticando en Google...' : 'Vincular Cuenta de Google'}
          </button>
        ) : (
          <div className="flex items-center gap-3 bg-[#121A2E]/60 border border-blue-950/60 rounded-xl p-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 border border-blue-400 overflow-hidden shrink-0">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-white text-sm">G</div>
              )}
            </div>
            <div className="text-left leading-tight min-w-0">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                {user?.displayName || 'Usuario Google'}
              </div>
              <span className="text-[10px] text-zinc-400 font-mono block mt-0.5 max-w-[150px] truncate">{user?.email}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="ml-2 p-2 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/50 text-zinc-400 hover:text-rose-400 rounded-lg cursor-pointer transition-all"
              title="Cerrar sesión de Google"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Messages banner */}
      {errorMessage && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-start gap-3 text-xs leading-relaxed font-sans">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <span className="font-extrabold block uppercase tracking-wider mb-0.5">Atención de Seguridad</span>
            {errorMessage}
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-start gap-3 text-xs leading-relaxed font-sans">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <span className="font-extrabold block uppercase tracking-wider mb-0.5">Operación Completa</span>
            {successMessage}
          </div>
        </div>
      )}

      {/* IF AUTHENTICATION REQUIRED STATE */}
      {needsAuth ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-950/10 text-center max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/20 rounded-3xl flex items-center justify-center text-blue-500 mb-5 shadow-lg shadow-blue-950/40">
            <Cloud className="h-8 w-8 animate-pulse" />
          </div>
          <h3 className="text-lg font-black text-white">Sincronización Cloud Requerida</h3>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-md mt-2 mb-6">
            Para habilitar el volcado de ventas diarias en Google Sheets, agendar reservas de mesa automáticamente en Google Calendar, y enviar recibos y correos mediante Gmail, debes autorizar el enlace en la nube de Aurora OS.
          </p>
          <button
            onClick={handleSignIn}
            disabled={isLoggingIn}
            className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs font-mono tracking-wider transition-all shadow-lg shadow-blue-900/30 flex items-center gap-2 cursor-pointer"
          >
            {isLoggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : 'CONECTAR CON GOOGLE WORKSPACE'}
          </button>
        </div>
      ) : (
        /* CORE ACTIVE WORKSPACE CONTAINER */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Sub-Tabs Left Navigation */}
          <div className="lg:col-span-1 bg-zinc-950/30 border border-zinc-800 rounded-2xl p-2.5 flex flex-row lg:flex-col gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveSubTab('calendar')}
              className={`flex-1 lg:flex-initial p-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all ${
                activeSubTab === 'calendar'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
              }`}
            >
              <Calendar className="h-4.5 w-4.5" />
              <span>Google Calendar</span>
            </button>
            <button
              onClick={() => setActiveSubTab('gmail')}
              className={`flex-1 lg:flex-initial p-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all ${
                activeSubTab === 'gmail'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
              }`}
            >
              <Mail className="h-4.5 w-4.5" />
              <span>Gmail Corporativo</span>
            </button>
            <button
              onClick={() => setActiveSubTab('sheets')}
              className={`flex-1 lg:flex-initial p-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all ${
                activeSubTab === 'sheets'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
              }`}
            >
              <FileSpreadsheet className="h-4.5 w-4.5" />
              <span>Google Sheets ERP</span>
            </button>
            
            <div className="border-t border-zinc-800/80 my-2 pt-2 hidden lg:block text-center">
              <button
                onClick={() => loadModuleData(accessToken!)}
                disabled={isLoading}
                className="text-[10px] font-bold text-[#06B6D4] hover:underline flex items-center justify-center gap-1.5 mx-auto p-1.5 rounded cursor-pointer"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                Sincronizar APIs
              </button>
            </div>
          </div>

          {/* Active Feature Dashboard Area */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* GOOGLE CALENDAR AREA */}
            {activeSubTab === 'calendar' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                
                {/* Upcoming events list */}
                <div className="bg-[#121A2E]/20 border border-zinc-800 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <span className="font-extrabold text-xs uppercase text-blue-500 font-mono tracking-wider flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Calendario de Reservas y Agenda
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">Próximos Eventos</span>
                  </div>

                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                      <span className="text-[10px] font-mono">Conectando con Google Calendar...</span>
                    </div>
                  ) : events.length === 0 ? (
                    <div className="text-center py-16 text-zinc-500 font-mono text-[10px] space-y-2">
                      <span>No hay reservas programadas en Google Calendar para los próximos días.</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                      {events.map((event) => {
                        const start = event.start.dateTime ? new Date(event.start.dateTime) : (event.start.date ? new Date(event.start.date) : null);
                        return (
                          <div key={event.id} className="p-3 bg-zinc-950/40 border border-zinc-850 hover:border-zinc-750 transition-colors rounded-xl flex items-start gap-3">
                            <div className="h-9 w-9 bg-blue-600/10 border border-blue-500/20 text-blue-400 font-mono text-[10px] font-black rounded-lg flex flex-col items-center justify-center shrink-0">
                              <span>{start ? start.getDate() : '?'}</span>
                              <span className="text-[8px] uppercase">{start ? start.toLocaleString('es-CO', { month: 'short' }) : '?'}</span>
                            </div>
                            <div className="flex-1 min-w-0 leading-normal">
                              <span className="text-xs font-bold text-zinc-200 block truncate">{event.summary}</span>
                              <p className="text-[10px] text-zinc-400 truncate mt-0.5">{event.description || 'Creado vía Aurora OS'}</p>
                              <div className="text-[9px] font-mono text-[#06B6D4] mt-1">
                                {start ? start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Todo el día'}
                              </div>
                            </div>
                            {event.htmlLink && (
                              <a
                                href={event.htmlLink}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                                title="Ver en Google Calendar"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Form to Schedule Event */}
                <div className="bg-zinc-950/20 border border-zinc-800 rounded-3xl p-5">
                  <div className="border-b border-zinc-800 pb-3 mb-4">
                    <span className="font-extrabold text-xs uppercase text-emerald-400 font-mono tracking-wider flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Programar Evento / Reserva
                    </span>
                  </div>

                  <form onSubmit={createCalendarEvent} className="space-y-3 text-xs leading-normal">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 font-mono uppercase">Título del Evento</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Reserva Mesa 3 - Carlos Gomez (5 Personas)"
                        value={newCalEvent.summary}
                        onChange={(e) => setNewCalEvent({ ...newCalEvent, summary: e.target.value })}
                        className="w-full bg-[#0D1425]/60 border border-zinc-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-blue-500 font-mono text-[11px]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 font-mono uppercase">Descripción / Comensales</label>
                      <textarea
                        rows={2}
                        placeholder="Notas adicionales (Ej. Cliente VIP, requiere decoración especial, menú de bodas)"
                        value={newCalEvent.description}
                        onChange={(e) => setNewCalEvent({ ...newCalEvent, description: e.target.value })}
                        className="w-full bg-[#0D1425]/60 border border-zinc-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-blue-500 text-[11px]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 font-mono uppercase">Fecha</label>
                        <input
                          type="date"
                          required
                          value={newCalEvent.date}
                          onChange={(e) => setNewCalEvent({ ...newCalEvent, date: e.target.value })}
                          className="w-full bg-[#0D1425]/60 border border-zinc-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-blue-500 font-mono text-[11px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 font-mono uppercase">Hora Inicio</label>
                        <input
                          type="time"
                          required
                          value={newCalEvent.time}
                          onChange={(e) => setNewCalEvent({ ...newCalEvent, time: e.target.value })}
                          className="w-full bg-[#0D1425]/60 border border-zinc-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-blue-500 font-mono text-[11px]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 font-mono uppercase">Duración Estimada</label>
                      <select
                        value={newCalEvent.duration}
                        onChange={(e) => setNewCalEvent({ ...newCalEvent, duration: e.target.value })}
                        className="w-full bg-[#0D1425]/60 border border-zinc-800 rounded-xl py-2 px-3 text-zinc-300 focus:outline-none focus:border-blue-500 font-mono text-[11px] cursor-pointer"
                      >
                        <option value="30">30 Minutos</option>
                        <option value="60">1 Hora</option>
                        <option value="90">1.5 Horas</option>
                        <option value="120">2 Horas</option>
                        <option value="180">3 Horas</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/50 text-white font-bold py-2.5 rounded-xl text-xs font-mono transition-colors tracking-wide shadow-lg shadow-emerald-950/20 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      {isLoading ? 'Agendando...' : 'AGENDAR EN GOOGLE CALENDAR'}
                    </button>
                  </form>
                </div>

              </div>
            )}

            {/* GMAIL AREA */}
            {activeSubTab === 'gmail' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                
                {/* Recent unread emails from restaurant profile */}
                <div className="bg-[#121A2E]/20 border border-zinc-800 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <span className="font-extrabold text-xs uppercase text-[#06B6D4] font-mono tracking-wider flex items-center gap-2">
                      <Mail className="h-4.5 w-4.5 text-[#06B6D4]" />
                      Bandeja de Entrada (No Leídos)
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">Últimos No Leídos</span>
                  </div>

                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-[#06B6D4]" />
                      <span className="text-[10px] font-mono">Revisando bandeja corporativa Gmail...</span>
                    </div>
                  ) : gmailMessages.length === 0 ? (
                    <div className="text-center py-16 text-zinc-500 font-mono text-[10px] space-y-2">
                      <span>¡Bandeja al día! No tienes correos sin leer que requieran atención inmediata.</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                      {gmailMessages.map((msg) => (
                        <div key={msg.id} className="p-3 bg-zinc-950/40 border border-zinc-850 hover:border-zinc-750 transition-colors rounded-xl flex flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-2 border-b border-zinc-900/50 pb-1.5">
                            <span className="text-[10px] font-bold text-zinc-300 truncate max-w-[130px] font-mono">
                              De: {msg.from?.split('<')[0]}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-500">{msg.date}</span>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block leading-snug">{msg.subject}</span>
                            <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                              {msg.snippet}
                            </p>
                          </div>
                          <a
                            href={`https://mail.google.com/mail/u/0/#inbox/${msg.threadId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[9px] font-bold text-blue-400 hover:underline inline-flex items-center gap-1 self-start mt-1 cursor-pointer"
                          >
                            Ver hilo en Gmail <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Send New Email Form */}
                <div className="bg-zinc-950/20 border border-zinc-800 rounded-3xl p-5">
                  <div className="border-b border-zinc-800 pb-3 mb-4">
                    <span className="font-extrabold text-xs uppercase text-amber-400 font-mono tracking-wider flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Enviar Correo de Negocio / Recibo
                    </span>
                  </div>

                  <form onSubmit={handleSendEmail} className="space-y-3 text-xs leading-normal">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 font-mono uppercase">Para (Email Destino)</label>
                      <input
                        type="email"
                        required
                        placeholder="ej. cliente@correo.com"
                        value={newEmail.to}
                        onChange={(e) => setNewEmail({ ...newEmail, to: e.target.value })}
                        className="w-full bg-[#0D1425]/60 border border-zinc-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-blue-500 font-mono text-[11px]"
                      />
                      {/* Shortcut to send to active HR profiles or template triggers */}
                      <div className="flex gap-1.5 mt-1 overflow-x-auto pb-0.5">
                        <button
                          type="button"
                          onClick={() => setNewEmail({ 
                            ...newEmail, 
                            to: 'ventas@vallecarnes.com', 
                            subject: 'Solicitud de Reabastecimiento - Aurora OS',
                            body: 'Estimados Señores,\n\nEscribimos para solicitar cotización y envío de los siguientes insumos de carne críticos para nuestro restaurante...\n\nAtentamente,\nEquipo de Cocina Aurora OS'
                          })}
                          className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-850 text-[8px] font-mono text-zinc-400 hover:text-white rounded cursor-pointer shrink-0"
                        >
                          Pedido Proveedor
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const lastInvoice = invoices[0];
                            const defaultBody = lastInvoice 
                              ? `Hola ${lastInvoice.customerName},\n\nAdjuntamos los detalles de tu compra en Aurora OS.\nTotal Facturado: $${lastInvoice.total.toLocaleString()} COP.\nFactura Nro: ${lastInvoice.invoiceNumber}.\n\n¡Gracias por tu visita!`
                              : `Hola,\n\nTe enviamos los detalles de tu compra en Aurora OS.\n\n¡Gracias por preferirnos!`;
                            setNewEmail({ 
                              ...newEmail, 
                              to: 'cliente@correo.com', 
                              subject: `Factura Digital ${lastInvoice?.invoiceNumber || ''} - Aurora OS`,
                              body: defaultBody
                            });
                          }}
                          className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-850 text-[8px] font-mono text-zinc-400 hover:text-white rounded cursor-pointer shrink-0"
                        >
                          Última Factura
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 font-mono uppercase">Asunto</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Confirmación de Reserva Especial - Mesa 2"
                        value={newEmail.subject}
                        onChange={(e) => setNewEmail({ ...newEmail, subject: e.target.value })}
                        className="w-full bg-[#0D1425]/60 border border-zinc-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-blue-500 text-[11px]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 font-mono uppercase">Mensaje</label>
                      <textarea
                        rows={4}
                        required
                        placeholder="Escribe el cuerpo del correo aquí..."
                        value={newEmail.body}
                        onChange={(e) => setNewEmail({ ...newEmail, body: e.target.value })}
                        className="w-full bg-[#0D1425]/60 border border-zinc-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-blue-500 text-[11px]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800/50 text-white font-bold py-2.5 rounded-xl text-xs font-mono transition-colors tracking-wide shadow-lg shadow-blue-950/20 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      {isLoading ? 'Enviando...' : 'ENVIAR POR GMAIL CORPORATIVO'}
                    </button>
                  </form>
                </div>

              </div>
            )}

            {/* GOOGLE SHEETS ERP AREA */}
            {activeSubTab === 'sheets' && (
              <div className="space-y-6 animate-fade-in">
                
                {/* 🌟 OPCIÓN 3: CUADRO DE MANDO ERP CONSOLIDADO MULTI-PESTAÑA */}
                <div className="relative overflow-hidden bg-gradient-to-r from-zinc-950 via-[#0a1224] to-zinc-950 border border-[#38BDF8]/30 rounded-3xl p-6 shadow-2xl shadow-[#38BDF8]/5">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                    <Sparkles className="h-40 w-40 text-[#38BDF8]" />
                  </div>
                  
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2 max-w-2xl text-left">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 font-mono text-[9px] font-bold rounded-full uppercase tracking-widest">
                        <Sparkles className="h-3 w-3 animate-pulse" /> Opción 3 Implementada
                      </div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        Cuadro de Mando Integrado ERP <span className="text-cyan-400">| Control Multi-Pestaña</span>
                      </h3>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        Sincroniza y vuelca el estado de operación general del restaurante en un único libro de cálculo estructurado con <strong className="text-cyan-300">4 pestañas automatizadas</strong> en tu Google Drive. Ideal para juntas directivas, contabilidad avanzada o auditoría de un solo vistazo:
                      </p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-[10px] font-mono text-zinc-400">
                        <div className="flex items-center gap-1.5 bg-zinc-950/50 p-2 rounded-xl border border-zinc-900">
                          <span className="text-xs">📊</span>
                          <span>Resumen Ejecutivo</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-zinc-950/50 p-2 rounded-xl border border-zinc-900">
                          <span className="text-xs">💰</span>
                          <span>Facturas de Hoy</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-zinc-950/50 p-2 rounded-xl border border-zinc-900">
                          <span className="text-xs">📉</span>
                          <span>Stock de Alerta</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-zinc-950/50 p-2 rounded-xl border border-zinc-900">
                          <span className="text-xs">🧾</span>
                          <span>Control de Gastos</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full lg:w-auto shrink-0">
                      <button
                        onClick={handleExportConsolidatedERPDashboard}
                        disabled={isLoading}
                        className="w-full lg:w-auto px-6 py-4 bg-[#06B6D4] hover:bg-[#22D3EE] disabled:bg-[#06B6D4]/40 text-black font-black text-xs font-mono tracking-wider rounded-2xl transition-all shadow-lg shadow-cyan-950/40 cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 select-none"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-black" />
                        ) : (
                          <FileSpreadsheet className="h-4 w-4 text-black" />
                        )}
                        {isLoading ? 'SINCRONIZANDO ERP...' : 'GENERAR CUADRO DE MANDO'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Grid for export tools */}
                <div className="bg-[#121A2E]/20 border border-zinc-800 rounded-3xl p-5">
                  <div className="border-b border-zinc-800 pb-3 mb-5">
                    <span className="font-extrabold text-xs uppercase text-emerald-400 font-mono tracking-wider flex items-center gap-2">
                      <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-400" />
                      Herramientas de Exportación a Google Sheets (Tiempo Real)
                    </span>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Genera bases de datos vivas y reportes profesionales en tu cuenta de Google Drive con un solo clic.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Invoice export card */}
                    <div className="bg-zinc-950/40 border border-zinc-850 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-colors">
                      <div className="space-y-2">
                        <div className="h-9 w-9 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20">
                          <FileDown className="h-5 w-5" />
                        </div>
                        <h4 className="text-xs font-extrabold text-white uppercase font-mono tracking-wider">Reporte de Facturación</h4>
                        <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                          Exporta la lista de facturas registradas en el día, incluyendo montos, clientes y métodos de pago.
                        </p>
                      </div>
                      <button
                        onClick={() => handleExportToSheets('invoices')}
                        disabled={isLoading}
                        className="mt-4 w-full bg-emerald-600/15 border border-emerald-500/20 hover:border-emerald-500 hover:bg-emerald-600 hover:text-white text-emerald-400 font-bold py-2 rounded-xl text-[10px] font-mono cursor-pointer transition-all flex items-center justify-center gap-1"
                      >
                        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileSpreadsheet className="h-3 w-3" />}
                        Exportar Invoices ({invoices.length})
                      </button>
                    </div>

                    {/* Stock inventory card */}
                    <div className="bg-zinc-950/40 border border-zinc-850 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-colors">
                      <div className="space-y-2">
                        <div className="h-9 w-9 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/20">
                          <Database className="h-5 w-5" />
                        </div>
                        <h4 className="text-xs font-extrabold text-white uppercase font-mono tracking-wider">Inventario ERP Stock</h4>
                        <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                          Vuelca la base de datos de insumos críticos del restaurante, incluyendo stock mínimo, SKU y unidad.
                        </p>
                      </div>
                      <button
                        onClick={() => handleExportToSheets('inventory')}
                        disabled={isLoading}
                        className="mt-4 w-full bg-blue-600/15 border border-blue-500/20 hover:border-blue-500 hover:bg-blue-600 hover:text-white text-blue-400 font-bold py-2 rounded-xl text-[10px] font-mono cursor-pointer transition-all flex items-center justify-center gap-1"
                      >
                        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileSpreadsheet className="h-3 w-3" />}
                        Exportar Stock ({insumos.length})
                      </button>
                    </div>

                    {/* Menu items list card */}
                    <div className="bg-zinc-950/40 border border-zinc-850 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-colors">
                      <div className="space-y-2">
                        <div className="h-9 w-9 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center border border-purple-500/20">
                          <Cloud className="h-5 w-5" />
                        </div>
                        <h4 className="text-xs font-extrabold text-white uppercase font-mono tracking-wider">Menú & Platos</h4>
                        <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                          Genera un listado de tus platos activos de la sede para auditoría externa o revisión de carta/precios.
                        </p>
                      </div>
                      <button
                        onClick={() => handleExportToSheets('menu')}
                        disabled={isLoading}
                        className="mt-4 w-full bg-purple-600/15 border border-purple-500/20 hover:border-purple-500 hover:bg-purple-600 hover:text-white text-purple-400 font-bold py-2 rounded-xl text-[10px] font-mono cursor-pointer transition-all flex items-center justify-center gap-1"
                      >
                        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileSpreadsheet className="h-3 w-3" />}
                        Exportar Menú ({menuItems.length})
                      </button>
                    </div>

                  </div>
                </div>

                {/* Local export history lists */}
                <div className="bg-zinc-950/20 border border-zinc-800 rounded-3xl p-5 space-y-3">
                  <span className="font-extrabold text-xs uppercase text-zinc-300 font-mono tracking-wider block border-b border-zinc-900 pb-2">
                    Historial Reciente de Hojas Creadas
                  </span>
                  
                  {recentSheets.length === 0 ? (
                    <div className="text-center py-8 text-zinc-600 font-mono text-[9px]">
                      Aún no has generado ninguna hoja de cálculo en esta sesión.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                      {recentSheets.map((sheet, idx) => (
                        <div key={idx} className="p-3 bg-zinc-950/60 border border-zinc-850 hover:border-zinc-750 transition-colors rounded-xl flex items-center justify-between gap-4">
                          <div className="min-w-0 leading-normal">
                            <span className="text-xs font-bold text-zinc-200 block truncate">{sheet.name}</span>
                            <span className="text-[9px] font-mono text-zinc-500 block mt-0.5">{sheet.date}</span>
                          </div>
                          <a
                            href={sheet.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-zinc-900 border border-zinc-800 hover:border-[#06B6D4] text-zinc-400 hover:text-[#06B6D4] rounded-lg transition-all cursor-pointer shrink-0"
                            title="Abrir hoja de cálculo"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
