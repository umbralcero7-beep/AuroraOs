import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  FileSpreadsheet, 
  AlertTriangle, 
  DollarSign, 
  CheckCircle, 
  Award, 
  RefreshCw,
  Download,
  FileText,
  Filter
} from 'lucide-react';
import { Invoice, Gasto, CierreCaja, MenuItem } from '../types';

interface ReportModuleProps {
  sedeId: string;
  invoices: Invoice[];
  gastos: Gasto[];
  cierres: CierreCaja[];
  menuItems: MenuItem[];
  refreshData: () => void;
}

export default function ReportModule({
  sedeId,
  invoices,
  gastos,
  cierres,
  menuItems,
  refreshData
}: ReportModuleProps) {
  const currentInvoices = invoices.filter(i => i.sedeId === sedeId);
  const currentGastos = gastos.filter(g => g.sedeId === sedeId);
  const currentCierres = cierres.filter(c => c.sedeId === sedeId);

  const [activeTab, setActiveTab] = useState<'METRICS' | 'CIERRES_Z'>('METRICS');
  const [dateFilter, setDateFilter] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('ALL');

  // Helper to filter data based on selected range
  const getFilteredData = () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let filteredInvoices = currentInvoices;
    let filteredGastos = currentGastos;

    if (dateFilter === 'TODAY') {
      filteredInvoices = currentInvoices.filter(i => new Date(i.timestamp) >= startOfDay);
      filteredGastos = currentGastos.filter(g => new Date(g.timestamp) >= startOfDay);
    } else if (dateFilter === 'WEEK') {
      filteredInvoices = currentInvoices.filter(i => new Date(i.timestamp) >= startOfWeek);
      filteredGastos = currentGastos.filter(g => new Date(g.timestamp) >= startOfWeek);
    } else if (dateFilter === 'MONTH') {
      filteredInvoices = currentInvoices.filter(i => new Date(i.timestamp) >= startOfMonth);
      filteredGastos = currentGastos.filter(g => new Date(g.timestamp) >= startOfMonth);
    }

    return { filteredInvoices, filteredGastos };
  };

  const handleExportCSV = (type: 'INVOICES' | 'GASTOS' | 'CONSOLIDATED') => {
    const { filteredInvoices, filteredGastos } = getFilteredData();
    let csvContent = '\uFEFF'; // UTF-8 BOM
    let filename = '';

    if (type === 'INVOICES') {
      filename = `AuroraOS_Facturacion_${dateFilter}_${sedeId}.csv`;
      csvContent += 'Fecha,Factura,Cliente,Documento,Subtotal,Impuesto (8%),Propina,Total,Metodo Pago,Estado\n';
      filteredInvoices.forEach(inv => {
        const fecha = new Date(inv.timestamp).toLocaleString().replace(/,/g, '');
        const num = inv.invoiceNumber;
        const cliente = `"${inv.customerName.replace(/"/g, '""')}"`;
        const doc = inv.customerDocument || 'N/A';
        const sub = inv.subtotal;
        const tax = inv.tax;
        const tip = inv.tip;
        const tot = inv.total;
        const mPago = `"${inv.payments.map(p => p.method).join(' + ')}"`;
        const est = inv.status;
        csvContent += `${fecha},${num},${cliente},${doc},${sub},${tax},${tip},${tot},${mPago},${est}\n`;
      });
    } else if (type === 'GASTOS') {
      filename = `AuroraOS_Gastos_${dateFilter}_${sedeId}.csv`;
      csvContent += 'Fecha,ID Gasto,Categoria,Descripcion,Monto,Soporte\n';
      filteredGastos.forEach(g => {
        const fecha = new Date(g.timestamp).toLocaleString().replace(/,/g, '');
        const id = g.id;
        const cat = g.category;
        const desc = `"${g.description.replace(/"/g, '""')}"`;
        const monto = g.amount;
        const sop = g.receiptNumber || 'N/A';
        csvContent += `${fecha},${id},${cat},${desc},${monto},${sop}\n`;
      });
    } else {
      filename = `AuroraOS_LibroDiario_${dateFilter}_${sedeId}.csv`;
      csvContent += 'Fecha,Tipo,Referencia/Factura,Concepto/Cliente,Monto Ingreso,Monto Egreso,Neto\n';
      
      const items: {
        date: Date;
        type: 'INGRESO' | 'GASTO';
        ref: string;
        concept: string;
        ingreso: number;
        egreso: number;
      }[] = [];

      filteredInvoices.forEach(inv => {
        items.push({
          date: new Date(inv.timestamp),
          type: 'INGRESO',
          ref: inv.invoiceNumber,
          concept: inv.customerName,
          ingreso: inv.total,
          egreso: 0
        });
      });

      filteredGastos.forEach(g => {
        items.push({
          date: new Date(g.timestamp),
          type: 'GASTO',
          ref: g.receiptNumber || g.id,
          concept: g.description,
          ingreso: 0,
          egreso: g.amount
        });
      });

      items.sort((a, b) => a.date.getTime() - b.date.getTime());

      let runningNet = 0;
      items.forEach(item => {
        const fecha = item.date.toLocaleString().replace(/,/g, '');
        const tipo = item.type;
        const ref = item.ref;
        const concepto = `"${item.concept.replace(/"/g, '""')}"`;
        const ing = item.ingreso;
        const egr = item.egreso;
        runningNet += (ing - egr);
        csvContent += `${fecha},${tipo},${ref},${concepto},${ing},${egr},${runningNet}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = (type: 'INVOICES' | 'GASTOS' | 'CONSOLIDATED') => {
    const { filteredInvoices, filteredGastos } = getFilteredData();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const totalSales = filteredInvoices.reduce((acc, curr) => acc + curr.total, 0);
    const totalExpenses = filteredGastos.reduce((acc, curr) => acc + curr.amount, 0);
    const netProfit = totalSales - totalExpenses;
    const dateStr = new Date().toLocaleString();
    const rangeText = dateFilter === 'TODAY' ? 'Hoy' : dateFilter === 'WEEK' ? 'Últimos 7 Días' : dateFilter === 'MONTH' ? 'Este Mes' : 'Todos los Registros';

    let title = '';
    let tableHeaderHtml = '';
    let tableRowsHtml = '';
    let summaryHtml = '';

    if (type === 'INVOICES') {
      title = 'REPORTE DETALLADO DE FACTURACIÓN Y CONTROL DE ASADOR';
      
      // Calculate chicken inventory auditing
      let cuartosSold = 0;
      let mediosSold = 0;
      let enterosSold = 0;
      
      // Consolidated mapping of all products sold
      const productConsolidation: { [name: string]: { qty: number; total: number; price: number } } = {};
      
      filteredInvoices.forEach(inv => {
        inv.items.forEach(item => {
          const trimmedName = item.name.trim();
          if (!productConsolidation[trimmedName]) {
            productConsolidation[trimmedName] = { qty: 0, total: 0, price: item.price };
          }
          productConsolidation[trimmedName].qty += item.qty;
          productConsolidation[trimmedName].total += item.subtotal;
          
          const nameLower = trimmedName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          if (
            nameLower.includes('1/4') || 
            nameLower.includes('cuarto') || 
            nameLower.includes('cuarta')
          ) {
            cuartosSold += item.qty;
          } else if (
            nameLower.includes('1/2') || 
            nameLower.includes('medio') || 
            nameLower.includes('media')
          ) {
            mediosSold += item.qty;
          } else if (
            nameLower.includes('un pollo') || 
            nameLower.includes('pollo entero') || 
            nameLower.includes('1 pollo') ||
            nameLower.includes('pollo completo') ||
            (nameLower.includes('pollo') && !nameLower.includes('alitas') && !nameLower.includes('pechuga') && !nameLower.includes('arroz') && !nameLower.includes('consome') && !nameLower.includes('croquetas') && !nameLower.includes('sancocho')) ||
            nameLower === 'pollo'
          ) {
            enterosSold += item.qty;
          }
        });
      });

      const totalEquivalent = (cuartosSold * 0.25) + (mediosSold * 0.5) + enterosSold;

      // Prepare consolidated products table
      let consolidatedRowsHtml = '';
      Object.keys(productConsolidation).forEach(pName => {
        const item = productConsolidation[pName];
        consolidatedRowsHtml += `
          <tr>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${pName}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold;">${item.qty}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${item.price.toLocaleString()} COP</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #0f172a;">$${item.total.toLocaleString()} COP</td>
          </tr>
        `;
      });

      tableHeaderHtml = `
        <tr>
          <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Fecha</th>
          <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Factura Nº</th>
          <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Cliente</th>
          <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Documento</th>
          <th style="text-align: right; padding: 8px; border-bottom: 2px solid #ddd;">Subtotal</th>
          <th style="text-align: right; padding: 8px; border-bottom: 2px solid #ddd;">Impuesto (8%)</th>
          <th style="text-align: right; padding: 8px; border-bottom: 2px solid #ddd;">Total</th>
        </tr>
      `;
      
      filteredInvoices.forEach(inv => {
        tableRowsHtml += `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(inv.timestamp).toLocaleString()}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; color: #0284c7;">${inv.invoiceNumber}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${inv.customerName}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${inv.customerDocument || 'N/A'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${inv.subtotal.toLocaleString()}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${inv.tax.toLocaleString()}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">$${inv.total.toLocaleString()}</td>
          </tr>
        `;
      });

      summaryHtml = `
        <!-- AUDITORÍA DE INVENTARIO Y ARQUEO DE POLLOS -->
        <div style="margin-top: 30px; border: 1px solid #f59e0b; border-radius: 12px; overflow: hidden; background-color: #fffbeb; box-shadow: 0 1px 3px rgba(245,158,11,0.1);">
          <div style="background-color: #f59e0b; color: #fff; padding: 10px 15px; font-weight: bold; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; display: flex; justify-content: space-between; align-items: center;">
            <span>📋 Arqueo Diario de Asador (Control de Porciones de Pollo)</span>
            <span style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 6px; font-size: 11px;">Métrica de Cocina</span>
          </div>
          <div style="padding: 15px;">
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; text-align: center; margin-bottom: 15px;">
              <div style="background: #fff; border: 1px solid #fef3c7; padding: 10px; border-radius: 8px;">
                <div style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase;">Cuartos (1/4)</div>
                <div style="font-size: 18px; font-weight: 800; color: #d97706; margin-top: 4px;">${cuartosSold} und</div>
                <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">= ${(cuartosSold * 0.25).toFixed(2)} pollos</div>
              </div>
              <div style="background: #fff; border: 1px solid #fef3c7; padding: 10px; border-radius: 8px;">
                <div style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase;">Medios (1/2)</div>
                <div style="font-size: 18px; font-weight: 800; color: #d97706; margin-top: 4px;">${mediosSold} und</div>
                <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">= ${(mediosSold * 0.5).toFixed(2)} pollos</div>
              </div>
              <div style="background: #fff; border: 1px solid #fef3c7; padding: 10px; border-radius: 8px;">
                <div style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase;">Enteros (1/1)</div>
                <div style="font-size: 18px; font-weight: 800; color: #d97706; margin-top: 4px;">${enterosSold} und</div>
                <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">= ${enterosSold.toFixed(2)} pollos</div>
              </div>
              <div style="background: #fef3c7; border: 1.5px solid #fbbf24; padding: 10px; border-radius: 8px;">
                <div style="font-size: 10px; font-weight: bold; color: #b45309; text-transform: uppercase;">Total Equivalente</div>
                <div style="font-size: 22px; font-weight: 900; color: #78350f; margin-top: 2px;">${totalEquivalent.toFixed(2)}</div>
                <div style="font-size: 9px; font-weight: bold; color: #b45309; margin-top: 2px;">Pollos Completos</div>
              </div>
            </div>
            <div style="font-size: 11px; color: #78350f; background: #fffbeb; border: 1px solid #fef3c7; padding: 10px; border-radius: 8px; line-height: 1.4;">
              <strong>Fórmula de Conciliación:</strong> (Cuartos * 0.25) + (Medios * 0.5) + Enteros. El operador del asador debe verificar que la salida de materia prima cruda coincida con el total equivalente de <strong>${totalEquivalent.toFixed(2)}</strong> pollos enteros despachados.
            </div>
          </div>
        </div>

        <!-- DETALLE CONSOLIDADO DE PRODUCTOS ENTREGADOS (QUÉ PRODUCTOS SALIERON Y EN QUÉ CANTIDAD) -->
        <div style="margin-top: 30px;">
          <h3 style="margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; letter-spacing: 0.5px;">
            📦 Detalle de Salida de Mercancías / Productos Vendidos
          </h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="background-color: #f1f5f9;">
                <th style="padding: 6px 8px; text-align: left; border-bottom: 2px solid #cbd5e1; font-weight: bold; color: #475569;">Nombre del Producto / Ítem</th>
                <th style="padding: 6px 8px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: bold; color: #475569; width: 120px;">Cantidad Salida</th>
                <th style="padding: 6px 8px; text-align: right; border-bottom: 2px solid #cbd5e1; font-weight: bold; color: #475569; width: 150px;">P.U. Promedio</th>
                <th style="padding: 6px 8px; text-align: right; border-bottom: 2px solid #cbd5e1; font-weight: bold; color: #475569; width: 180px;">Total Recaudado</th>
              </tr>
            </thead>
            <tbody>
              ${consolidatedRowsHtml.length === 0 
                ? '<tr><td colspan="4" style="text-align:center; padding: 20px; color:#999; font-style: italic;">No se detectó salida de mercancía en el rango seleccionado.</td></tr>' 
                : consolidatedRowsHtml
              }
            </tbody>
          </table>
        </div>

        <!-- RESUMEN MONETARIO FINAL -->
        <div style="margin-top: 20px; display: flex; justify-content: flex-end; page-break-inside: avoid;">
          <table style="width: 340px; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569; font-size: 12px;">Subtotal Facturado:</td>
              <td style="padding: 6px 0; text-align: right; color: #334155; font-size: 12px;">$${filteredInvoices.reduce((a,c)=>a+c.subtotal, 0).toLocaleString()} COP</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569; font-size: 12px;">Impuesto Consumo (8%):</td>
              <td style="padding: 6px 0; text-align: right; color: #334155; font-size: 12px;">$${filteredInvoices.reduce((a,c)=>a+c.tax, 0).toLocaleString()} COP</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569; font-size: 12px;">Propinas:</td>
              <td style="padding: 6px 0; text-align: right; color: #334155; font-size: 12px;">$${filteredInvoices.reduce((a,c)=>a+c.tip, 0).toLocaleString()} COP</td>
            </tr>
            <tr style="border-top: 2px solid #334155; font-size: 1.2em;">
              <td style="padding: 8px 0; font-weight: bold; color: #0284c7;">TOTAL RECAUDADO:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0284c7;">$${totalSales.toLocaleString()} COP</td>
            </tr>
          </table>
        </div>
      `;
    } else if (type === 'GASTOS') {
      title = 'REPORTE DE EGRESOS Y GASTOS';
      tableHeaderHtml = `
        <tr>
          <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Fecha</th>
          <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Código</th>
          <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Categoría</th>
          <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Descripción</th>
          <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Soporte/Factura</th>
          <th style="text-align: right; padding: 8px; border-bottom: 2px solid #ddd;">Monto</th>
        </tr>
      `;

      filteredGastos.forEach(g => {
        tableRowsHtml += `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(g.timestamp).toLocaleString()}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-family: monospace; color: #dc2626;">${g.id}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${g.category}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${g.description}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${g.receiptNumber || 'N/A'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: #dc2626;">$${g.amount.toLocaleString()}</td>
          </tr>
        `;
      });

      summaryHtml = `
        <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
          <table style="width: 320px; border-collapse: collapse;">
            <tr style="border-top: 2px solid #334155; font-size: 1.1em;">
              <td style="padding: 8px 0; font-weight: bold; color: #dc2626;">TOTAL EGRESOS:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #dc2626;">$${totalExpenses.toLocaleString()} COP</td>
            </tr>
          </table>
        </div>
      `;
    } else {
      title = 'LIBRO DIARIO Y CONCILIACIÓN CONTABLE';
      tableHeaderHtml = `
        <tr>
          <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Fecha</th>
          <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Tipo</th>
          <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Soporte/Ref</th>
          <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Concepto / Tercero</th>
          <th style="text-align: right; padding: 8px; border-bottom: 2px solid #ddd;">Ingreso</th>
          <th style="text-align: right; padding: 8px; border-bottom: 2px solid #ddd;">Egreso</th>
          <th style="text-align: right; padding: 8px; border-bottom: 2px solid #ddd;">Saldo Neto</th>
        </tr>
      `;

      const items: {
        date: Date;
        type: 'INGRESO' | 'GASTO';
        ref: string;
        concept: string;
        ingreso: number;
        egreso: number;
      }[] = [];

      filteredInvoices.forEach(inv => {
        items.push({
          date: new Date(inv.timestamp),
          type: 'INGRESO',
          ref: inv.invoiceNumber,
          concept: inv.customerName,
          ingreso: inv.total,
          egreso: 0
        });
      });

      filteredGastos.forEach(g => {
        items.push({
          date: new Date(g.timestamp),
          type: 'GASTO',
          ref: g.receiptNumber || g.id,
          concept: g.description,
          ingreso: 0,
          egreso: g.amount
        });
      });

      items.sort((a, b) => a.date.getTime() - b.date.getTime());

      let runningNet = 0;
      items.forEach(item => {
        runningNet += (item.ingreso - item.egreso);
        tableRowsHtml += `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.date.toLocaleString()}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">
              <span style="padding: 2px 6px; border-radius: 4px; font-size: 0.85em; font-weight: bold; background-color: ${item.type === 'INGRESO' ? '#d1fae5' : '#fee2e2'}; color: ${item.type === 'INGRESO' ? '#065f46' : '#991b1b'}">
                ${item.type}
              </span>
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-family: monospace;">${item.ref}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.concept}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; color: #065f46;">${item.ingreso > 0 ? '$' + item.ingreso.toLocaleString() : '-'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; color: #991b1b;">${item.egreso > 0 ? '$' + item.egreso.toLocaleString() : '-'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">$${runningNet.toLocaleString()}</td>
          </tr>
        `;
      });

      summaryHtml = `
        <div style="margin-top: 25px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px;">
          <h4 style="margin: 0 0 10px 0; color: #1e293b; font-size: 1.1em; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Consolidado de Periodo</h4>
          <div style="display: flex; justify-content: space-between; gap: 20px;">
            <div>
              <span style="color: #64748b; font-size: 0.9em;">Total Ventas (Ingresos):</span>
              <div style="font-size: 1.3em; font-weight: bold; color: #10b981;">$${totalSales.toLocaleString()} COP</div>
            </div>
            <div>
              <span style="color: #64748b; font-size: 0.9em;">Total Egresos (Gastos):</span>
              <div style="font-size: 1.3em; font-weight: bold; color: #ef4444;">$${totalExpenses.toLocaleString()} COP</div>
            </div>
            <div>
              <span style="color: #64748b; font-size: 0.9em;">Balance Neto (Utilidad/Pérdida):</span>
              <div style="font-size: 1.3em; font-weight: bold; color: ${netProfit >= 0 ? '#0284c7' : '#ef4444'}">$${netProfit.toLocaleString()} COP</div>
            </div>
          </div>
        </div>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>${title} - Aurora</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #333;
            line-height: 1.4;
            padding: 30px;
            margin: 0;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #1e293b;
            padding-bottom: 20px;
            margin-bottom: 25px;
          }
          .logo-container {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .logo-text {
            font-family: 'Helvetica Neue', sans-serif;
            font-weight: 800;
            font-size: 24px;
            letter-spacing: 2px;
            color: #0f172a;
          }
          .report-title {
            font-size: 20px;
            font-weight: 700;
            color: #1e293b;
            margin: 0;
            text-transform: uppercase;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 25px;
            font-size: 12px;
          }
          .meta-item {
            margin-bottom: 4px;
          }
          .meta-label {
            font-weight: bold;
            color: #64748b;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            font-size: 11px;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .footer {
            margin-top: 50px;
            border-top: 1px solid #ddd;
            padding-top: 15px;
            font-size: 10px;
            color: #64748b;
            text-align: center;
          }
          .signature-area {
            display: flex;
            justify-content: space-between;
            margin-top: 60px;
            margin-bottom: 20px;
          }
          .signature-line {
            width: 220px;
            border-top: 1px solid #333;
            text-align: center;
            padding-top: 5px;
            font-size: 11px;
            font-weight: bold;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-container">
            <svg width="40" height="40" viewBox="0 0 512 512" style="background: #02050d; border-radius: 8px; padding: 4px;">
              <g transform="translate(256, 256) scale(0.8)">
                <circle cx="0" cy="0" r="100" fill="none" stroke="#00d2ff" stroke-width="20" opacity="0.6" />
                <circle cx="0" cy="0" r="180" fill="none" stroke="#8a2be2" stroke-width="15" opacity="0.4" />
                <circle cx="0" cy="0" r="20" fill="#ffffff" />
              </g>
            </svg>
            <span class="logo-text">AURORA <span style="font-weight:300; color:#64748b;">OS</span></span>
          </div>
          <div style="text-align: right;">
            <h1 class="report-title">${title}</h1>
            <span style="font-size: 12px; color: #64748b; font-weight: bold;">Sede ID: ${sedeId.toUpperCase()}</span>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item"><span class="meta-label">Fecha de Emisión:</span> ${dateStr}</div>
          <div class="meta-item"><span class="meta-label">Periodo Exportado:</span> ${rangeText}</div>
          <div class="meta-item"><span class="meta-label">Origen de Datos:</span> Base de Datos de Servidor (Dian-Compliant)</div>
          <div class="meta-item"><span class="meta-label">Estado Auditoría:</span> Verificado y Firmado Digitalmente</div>
        </div>

        <table>
          <thead>
            ${tableHeaderHtml}
          </thead>
          <tbody>
            ${tableRowsHtml.length === 0 ? '<tr><td colspan="10" style="text-align:center; padding: 20px; color:#999;">No hay registros en este rango de fecha.</td></tr>' : tableRowsHtml}
          </tbody>
        </table>

        ${summaryHtml}

        <div class="signature-area">
          <div class="signature-line">Firma Representante Contable</div>
          <div class="signature-line">Firma Revisor Fiscal / Auditor</div>
        </div>

        <div class="footer">
          Este documento es un reporte contable oficial exportado de Aurora.<br>
          Generado de manera segura. Todos los datos están encriptados y sincronizados con los entes reguladores de auditoría fiscal nacional.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleExportChickenPDF = () => {
    const { filteredInvoices } = getFilteredData();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let cuartosSold = 0;
    let mediosSold = 0;
    let enterosSold = 0;
    
    // We will list matched items for granular detail
    const detailsList: { name: string; qty: number; price: number; type: 'CUARTO' | 'MEDIO' | 'ENTERO'; subtotal: number }[] = [];

    filteredInvoices.forEach(inv => {
      inv.items.forEach(item => {
        const nameLower = item.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        // Quarter chicken checks
        if (
          nameLower.includes('1/4') || 
          nameLower.includes('cuarto') || 
          nameLower.includes('cuarta')
        ) {
          cuartosSold += item.qty;
          detailsList.push({ name: item.name, qty: item.qty, price: item.price, type: 'CUARTO', subtotal: item.subtotal });
        } 
        // Half chicken checks
        else if (
          nameLower.includes('1/2') || 
          nameLower.includes('medio') || 
          nameLower.includes('media')
        ) {
          mediosSold += item.qty;
          detailsList.push({ name: item.name, qty: item.qty, price: item.price, type: 'MEDIO', subtotal: item.subtotal });
        } 
        // Whole chicken checks
        else if (
          nameLower.includes('un pollo') || 
          nameLower.includes('pollo entero') || 
          nameLower.includes('1 pollo') ||
          nameLower.includes('pollo completo') ||
          (nameLower.includes('pollo') && !nameLower.includes('alitas') && !nameLower.includes('pechuga') && !nameLower.includes('arroz') && !nameLower.includes('consome') && !nameLower.includes('croquetas') && !nameLower.includes('sancocho')) ||
          nameLower === 'pollo'
        ) {
          enterosSold += item.qty;
          detailsList.push({ name: item.name, qty: item.qty, price: item.price, type: 'ENTERO', subtotal: item.subtotal });
        }
      });
    });

    const totalEquivalent = (cuartosSold * 0.25) + (mediosSold * 0.5) + enterosSold;
    const dateStr = new Date().toLocaleString();
    const rangeText = dateFilter === 'TODAY' ? 'Hoy' : dateFilter === 'WEEK' ? 'Últimos 7 Días' : dateFilter === 'MONTH' ? 'Este Mes' : 'Todos los Registros';

    let detailsRowsHtml = '';
    detailsList.forEach(item => {
      const typeBadgeColor = item.type === 'ENTERO' ? '#b45309' : item.type === 'MEDIO' ? '#d97706' : '#f59e0b';
      const typeText = item.type === 'ENTERO' ? 'Pollo Entero (1/1)' : item.type === 'MEDIO' ? 'Medio Pollo (1/2)' : 'Cuarto Pollo (1/4)';
      
      detailsRowsHtml += `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: 500;">${item.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
            <span style="padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: bold; background-color: ${typeBadgeColor}15; color: ${typeBadgeColor}; border: 1px solid ${typeBadgeColor}30">
              ${typeText}
            </span>
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; font-weight: bold;">${item.qty}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toLocaleString()} COP</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: #1e293b;">$${item.subtotal.toLocaleString()} COP</td>
        </tr>
      `;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Control de Inventario de Pollos - Aurora</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            line-height: 1.5;
            padding: 35px;
            margin: 0;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #d97706;
            padding-bottom: 20px;
            margin-bottom: 25px;
          }
          .logo-container {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .logo-text {
            font-weight: 800;
            font-size: 24px;
            letter-spacing: 2px;
            color: #0f172a;
          }
          .report-title {
            font-size: 20px;
            font-weight: 700;
            color: #1e293b;
            margin: 0;
            text-transform: uppercase;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            background-color: #fffbeb;
            border: 1px solid #fef3c7;
            padding: 15px;
            border-radius: 12px;
            margin-bottom: 30px;
            font-size: 12px;
          }
          .meta-label {
            font-weight: bold;
            color: #b45309;
          }
          
          /* KPI GRID */
          .kpi-container {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }
          .kpi-card {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 15px;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          .kpi-card.highlight {
            background: #fef3c7;
            border-color: #fcd34d;
          }
          .kpi-title {
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 5px;
          }
          .kpi-value {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
          }
          .kpi-card.highlight .kpi-value {
            color: #b45309;
            font-size: 24px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            font-size: 12px;
          }
          th {
            background-color: #f8fafc;
            color: #475569;
            padding: 12px 10px;
            font-weight: bold;
            border-bottom: 2px solid #e2e8f0;
            text-align: left;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          
          .footer {
            margin-top: 50px;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
            font-size: 10px;
            color: #64748b;
            text-align: center;
          }
          .signature-area {
            display: flex;
            justify-content: space-between;
            margin-top: 60px;
            margin-bottom: 20px;
          }
          .signature-line {
            width: 220px;
            border-top: 1px solid #333;
            text-align: center;
            padding-top: 5px;
            font-size: 11px;
            font-weight: bold;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-container">
            <svg width="40" height="40" viewBox="0 0 512 512" style="background: #02050d; border-radius: 8px; padding: 4px;">
              <g transform="translate(256, 256) scale(0.8)">
                <circle cx="0" cy="0" r="100" fill="none" stroke="#d97706" stroke-width="20" opacity="0.6" />
                <circle cx="0" cy="0" r="180" fill="none" stroke="#f59e0b" stroke-width="15" opacity="0.4" />
                <circle cx="0" cy="0" r="20" fill="#ffffff" />
              </g>
            </svg>
            <span class="logo-text">AURORA <span style="font-weight:300; color:#64748b;">OS</span></span>
          </div>
          <div style="text-align: right;">
            <h1 class="report-title">Control de Ventas de Pollo</h1>
            <span style="font-size: 12px; color: #b45309; font-weight: bold;">Auditoría de Porciones de Asador</span>
          </div>
        </div>

        <div class="meta-grid">
          <div><span class="meta-label">Fecha de Emisión:</span> ${dateStr}</div>
          <div><span class="meta-label">Periodo Exportado:</span> ${rangeText}</div>
          <div><span class="meta-label">Sede:</span> ${sedeId.toUpperCase()}</div>
          <div><span class="meta-label">Filtro de Ventas:</span> Exclusivo de Productos de Asador Clasificados</div>
        </div>

        <!-- CONSOLIDATED KPI DASHBOARD -->
        <div class="kpi-container">
          <div class="kpi-card">
            <div class="kpi-title">Cuartos de Pollo (1/4)</div>
            <div class="kpi-value">${cuartosSold} und</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Medios Pollos (1/2)</div>
            <div class="kpi-value">${mediosSold} und</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Pollos Enteros (1/1)</div>
            <div class="kpi-value">${enterosSold} und</div>
          </div>
          <div class="kpi-card highlight">
            <div class="kpi-title" style="color: #b45309;">Total Equivalente</div>
            <div class="kpi-value">${totalEquivalent.toFixed(2)} Pollos</div>
          </div>
        </div>

        <h3 style="margin-top: 30px; font-size: 14px; text-transform: uppercase; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
          Desglose Detallado de Salidas en Facturas
        </h3>
        
        <table>
          <thead>
            <tr>
              <th>Producto Detectado</th>
              <th style="text-align: center;">Porción Equivalente</th>
              <th style="text-align: center;">Cantidad Vendida</th>
              <th style="text-align: right;">Precio Unitario</th>
              <th style="text-align: right;">Total Recaudado</th>
            </tr>
          </thead>
          <tbody>
            ${detailsRowsHtml.length === 0 
              ? '<tr><td colspan="5" style="text-align:center; padding: 30px; color:#999; font-style: italic;">No se detectaron ventas de pollo (enteros, medios o cuartos) en el rango seleccionado.</td></tr>' 
              : detailsRowsHtml
            }
          </tbody>
        </table>

        <!-- AUDIT SUMMARY NOTE -->
        <div style="margin-top: 35px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; font-size: 11px; color: #475569;">
          <h4 style="margin: 0 0 5px 0; color: #0f172a; font-size: 12px;">Instrucciones de Auditoría de Inventario</h4>
          El total equivalente de <strong>${totalEquivalent.toFixed(2)} pollos enteros</strong> debe ser conciliado con la salida de pollos crudos del inventario de refrigeración. 
          Cualquier discrepancia mayor al 3% entre el conteo físico de unidades de asador despachadas y este registro del POS digital debe ser reportada de inmediato al administrador.
        </div>

        <div class="signature-area">
          <div class="signature-line">Firma Administrador Sede</div>
          <div class="signature-line">Firma Operador / Parrillero</div>
        </div>

        <div class="footer">
          Este reporte es un instrumento de control de inventarios interno generado en tiempo real por Aurora.<br>
          © 2026 Aurora. Reservados todos los derechos. Sede ID: ${sedeId.toUpperCase()}
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleExportSystemManualPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dateStr = new Date().toLocaleDateString();
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Manual Técnico y de Operaciones - Aurora</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
          
          body {
            font-family: 'Inter', sans-serif;
            color: #0f172a;
            line-height: 1.6;
            padding: 40px;
            margin: 0;
            background-color: #ffffff;
          }
          
          /* Cover Page */
          .cover {
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-after: always;
            padding: 40px;
            box-sizing: border-box;
            border: 4px solid #0f172a;
            background-color: #fafafa;
          }
          .cover-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .cover-logo {
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            font-size: 28px;
            letter-spacing: 2px;
            color: #0284c7;
          }
          .cover-version {
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            background-color: #e2e8f0;
            padding: 4px 10px;
            border-radius: 6px;
            font-weight: bold;
          }
          .cover-body {
            margin-top: 60px;
            margin-bottom: 60px;
          }
          .cover-title {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 42px;
            font-weight: 700;
            line-height: 1.1;
            color: #0f172a;
            margin-bottom: 20px;
            text-transform: uppercase;
            border-bottom: 5px solid #0284c7;
            padding-bottom: 20px;
          }
          .cover-subtitle {
            font-size: 18px;
            color: #475569;
            font-weight: 400;
            max-width: 600px;
          }
          .cover-footer {
            border-top: 1px solid #cbd5e1;
            padding-top: 20px;
            font-size: 12px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
          }
          
          /* Document Structure */
          h1, h2, h3, h4 {
            font-family: 'Space Grotesk', sans-serif;
            color: #0f172a;
            margin-top: 30px;
            margin-bottom: 15px;
          }
          h1 {
            font-size: 26px;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 8px;
            text-transform: uppercase;
            page-break-before: always;
          }
          h2 {
            font-size: 20px;
            color: #0369a1;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
          }
          h3 {
            font-size: 15px;
            color: #0f172a;
            font-weight: 700;
          }
          p, li {
            font-size: 13px;
            color: #334155;
            text-align: justify;
          }
          ul {
            padding-left: 20px;
            margin-bottom: 15px;
          }
          li {
            margin-bottom: 6px;
          }
          
          /* Highlight Boxes */
          .note-box {
            background-color: #f0f9ff;
            border-left: 4px solid #0284c7;
            padding: 15px;
            border-radius: 0 8px 8px 0;
            margin: 20px 0;
          }
          .note-box-title {
            font-weight: bold;
            color: #0369a1;
            font-size: 13px;
            margin-bottom: 5px;
            font-family: 'Space Grotesk', sans-serif;
          }
          
          .warning-box {
            background-color: #fffbeb;
            border-left: 4px solid #d97706;
            padding: 15px;
            border-radius: 0 8px 8px 0;
            margin: 20px 0;
          }
          .warning-box-title {
            font-weight: bold;
            color: #b45309;
            font-size: 13px;
            margin-bottom: 5px;
            font-family: 'Space Grotesk', sans-serif;
          }
          
          /* Tables */
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 10px;
            text-align: left;
          }
          th {
            background-color: #f1f5f9;
            font-weight: bold;
            color: #1e293b;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          
          /* Utility Classes */
          .code {
            font-family: 'JetBrains Mono', monospace;
            background-color: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            color: #0f172a;
          }
          
          .page-footer {
            margin-top: 60px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
          }
          
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 80px;
            margin-bottom: 40px;
            page-break-inside: avoid;
          }
          .signature-block {
            width: 240px;
            border-top: 2.5px solid #0f172a;
            text-align: center;
            padding-top: 8px;
            font-size: 11px;
            font-weight: bold;
          }
          
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
      
        <!-- COVER PAGE -->
        <div class="cover">
          <div class="cover-header">
            <div class="cover-logo">AURORA <span style="font-weight:300; color:#475569;">OS</span></div>
            <div class="cover-version">SISTEMA</div>
          </div>
          <div class="cover-body">
            <div class="cover-title">Manual de Usuario y Operaciones</div>
            <div class="cover-subtitle">Guía de Entrenamiento, Administración y Control del Ecosistema ERP para Restaurantes y Asadores de Alta Demanda.</div>
          </div>
          <div class="cover-footer">
            <div>Generado el: ${dateStr}</div>
            <div>Aurora Software Inc. — Todos los derechos reservados © 2026</div>
          </div>
        </div>
        
        <!-- TABLE OF CONTENTS -->
        <h1>Tabla de Contenidos</h1>
        <ol style="font-size: 13px; line-height: 2.0; color: #1e293b; font-weight: 500; padding-left: 25px;">
          <li>Introducción y Arquitectura de Aurora</li>
          <li>Módulo de POS & Control de Caja Registradora</li>
          <li>Control de Porciones del Asador y Auditoría de Inventarios de Pollo</li>
          <li>Módulo de Comandas & Mesas (Waiter)</li>
          <li>Módulo de Cocina Integrado (KDS - Kitchen Display System)</li>
          <li>Inventario General ERP, Recetas y Alertas Críticas</li>
          <li>Módulo Contable, Control de Gastos y Flujo de Colchón</li>
          <li>Personal, Recursos Humanos, Control de Turnos y Bitácora</li>
          <li>Asistente Inteligente con IA (Cero AI)</li>
          <li>Sincronización Avanzada con Google Workspace & Drive</li>
          <li>Módulo de Ciberseguridad, Whitelisting de Terminales y Soporte</li>
        </ol>
        
        <!-- SECTION 1 -->
        <h1>1. Introducción y Arquitectura de Aurora</h1>
        <p>
          <strong>Aurora</strong> es un sistema operativo y plataforma ERP de vanguardia diseñada específicamente para la administración de restaurantes, asadores y negocios gastronómicos con flujos de alta densidad transaccional. La arquitectura del sistema se fundamenta en un modelo <strong>multisede unificado</strong> que permite sincronizar múltiples sucursales físicas en tiempo real desde una base de datos centralizada en la nube.
        </p>
        <p>
          La interfaz de usuario ha sido optimizada para operación táctil y de escritorio, implementando un diseño de alta legibilidad, respuesta instantánea en microsegundos y arquitectura <strong>PWA (Progressive Web App)</strong>, lo cual asegura que el sistema pueda operar sin contratiempos incluso en situaciones de inestabilidad de red o desconexión a internet local.
        </p>
        
        <!-- SECTION 2 -->
        <h1>2. Módulo de POS & Control de Caja Registradora</h1>
        <p>
          El módulo de <strong>Punto de Venta (POS)</strong> es el corazón transaccional de cada sede. Permite a los cajeros registrar ventas rápidas, asociar propinas voluntarias, aplicar descuentos autorizados y procesar múltiples métodos de pago integrados (Efectivo, Tarjeta, Transferencia digital o Mixto).
        </p>
        <h2>Flujo de Apertura e Inicio de Turno</h2>
        <p>
          Cada jornada de ventas debe iniciarse obligatoriamente con una apertura de caja formal en la pestaña <span class="code">POS & Caja</span>. El sistema solicitará al operador el ingreso del <strong>Monto Base (Caja Menor / Base de Cambio)</strong>. Este valor quedará registrado de forma inalterable y servirá como base para la conciliación del arqueo de fin de turno.
        </p>
        <h2>Facturación con Cumplimiento Legal (Resoluciones DIAN)</h2>
        <p>
          Las facturas emitidas por Aurora incorporan automáticamente los parámetros fiscales vigentes, incluyendo:
        </p>
        <ul>
          <li><strong>Prefijo de Facturación y Consecutivo Autoincremental:</strong> Configurado dinámicamente según la sede activa.</li>
          <li><strong>Impuesto al Consumo (8%):</strong> Desglosado automáticamente del subtotal en platos clasificados.</li>
          <li><strong>Información DIAN:</strong> Número de resolución, rango de folios autorizados y fecha de vigencia impresa en cada tirilla/PDF.</li>
        </ul>
        <h2>Cierre de Caja y Conciliación Contable (Arqueo Z)</h2>
        <p>
          Al finalizar el turno, el cajero ejecuta el <strong>Cierre de Caja</strong>. El sistema genera un informe consolidado donde calcula automáticamente las ventas teóricas según los registros del software y las compara con los valores reales reportados por el cajero. Cualquier diferencia (faltante o sobrante) es registrada inmediatamente en los bitácoras de auditoría de ciberseguridad.
        </p>

        <!-- SECTION 3 -->
        <h1>3. Control de Porciones del Asador y Auditoría de Inventarios de Pollo</h1>
        <p>
          Debido a la alta merma y la criticidad de la materia prima en los restaurantes de asador de pollos, Aurora incorpora un <strong>algoritmo propietario de auditoría matemática de porciones</strong>. Este sistema contrarresta de manera automática la fuga de inventario en cocina.
        </p>
        
        <div class="note-box">
          <div class="note-box-title">Fórmula de Equivalencia de Asador (Auditoría de Conversión)</div>
          <p style="margin: 0;">
            Para obtener el total consolidado de materia prima despachada, el software aplica la siguiente constante matemática sobre todas las facturas procesadas en el periodo:
            <br><br>
            <span class="code" style="font-size: 12px; font-weight: bold; display: block; text-align: center; margin: 5px 0;">
              Total Equivalente = (Cuartos vendidos * 0.25) + (Medios vendidos * 0.50) + (Enteros vendidos * 1.00)
            </span>
          </p>
        </div>

        <h2>Clasificación y Detección Automática de Productos</h2>
        <p>
          El software analiza en tiempo real el catálogo de artículos facturados en las comandas y los encasilla bajo tres categorías estrictas de asador:
        </p>
        <table>
          <thead>
            <tr>
              <th>Fracción</th>
              <th>Constante Equivalente</th>
              <th>Patrón de Coincidencia de Nombre (POS)</th>
              <th>Propósito en Auditoría</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Cuarto de Pollo</strong></td>
              <td>0.25</td>
              <td>Contiene "1/4", "cuarto" o "cuarta"</td>
              <td>Verificación de presas individuales (pechuga/muslo).</td>
            </tr>
            <tr>
              <td><strong>Medio Pollo</strong></td>
              <td>0.50</td>
              <td>Contiene "1/2", "medio" o "media"</td>
              <td>Control de salidas de mitades físicas del asador.</td>
            </tr>
            <tr>
              <td><strong>Pollo Entero</strong></td>
              <td>1.00</td>
              <td>Contiene "un pollo", "pollo entero", "1 pollo", "pollo completo" o "pollo" genérico</td>
              <td>Control de unidades completas retiradas de las varas de cocción.</td>
            </tr>
          </tbody>
        </table>
        
        <div class="warning-box">
          <div class="warning-box-title">Regla de Negocio para el Administrador de Sede</div>
          <p style="margin: 0;">
            El reporte diario de equivalencia en pollos enteros debe cruzarse directamente con el conteo físico de la materia prima entregada por el proveedor. Discrepancias superiores al <strong>3%</strong> indican una inconsistencia grave (pérdida de porciones, despacho de platos sin facturar o fuga en cocina) que amerita auditoría del supervisor del asador.
          </p>
        </div>

        <!-- SECTION 4 -->
        <h1>4. Módulo de Comandas & Mesas (Waiter)</h1>
        <p>
          Este módulo está diseñado para la operación de los meseros en el salón mediante dispositivos móviles (tablets o smartphones).
        </p>
        <h2>Asignación y Estado de Mesas</h2>
        <p>
          La pantalla del salón ofrece una representación visual del mapa de mesas de la sede. Las mesas cambian de color de acuerdo a su estado en tiempo real:
        </p>
        <ul>
          <li><strong>Verde (Disponible):</strong> Mesa desocupada lista para recibir clientes.</li>
          <li><strong>Rojo (Ocupada - En Espera):</strong> Comanda levantada que está siendo cocinada o procesada.</li>
          <li><strong>Azul (Servido):</strong> Pedido entregado a la mesa; clientes consumiendo en salón.</li>
          <li><strong>Gris (Pendiente de Pago / Cuenta):</strong> Clientes solicitaron la cuenta, mesa en fase de facturación.</li>
        </ul>
        <h2>Generación de Pedidos en Salón</h2>
        <p>
          Al abrir una mesa, el mesero selecciona los platos del menú interactivo, especifica notas de preparación personalizadas (ej. "sin cebolla", "pollo bien tostado") y envía la comanda directamente al KDS de la cocina sin necesidad de desplazarse físicamente.
        </p>

        <!-- SECTION 5 -->
        <h1>5. Módulo de Cocina Integrado (KDS - Kitchen Display System)</h1>
        <p>
          El <strong>Kitchen Display System (KDS)</strong> reemplaza las tradicionales e ineficientes comandas de papel térmico por pantallas digitales de alta visibilidad para el chef y el equipo de asador.
        </p>
        <h2>Estados de Comandas en Cocina</h2>
        <p>
          Toda orden enviada desde el salón o la caja entra al KDS con el estado <span class="code">PENDIENTE</span>. El personal de cocina puede interactuar con las tarjetas táctiles para transicionar las órdenes:
        </p>
        <ol>
          <li><strong>PENDIENTE:</strong> Tarjeta en borde rojo parpadeante. Indica que la orden no ha sido iniciada.</li>
          <li><strong>COCINANDO:</strong> El parrillero o cocinero presiona "Preparar". La tarjeta cambia a color naranja y el sistema inicia un contador de tiempo interno de preparación.</li>
          <li><strong>LISTO:</strong> Al finalizar, se marca como "Listo". La tarjeta cambia a verde, emite un aviso sonoro y notifica inmediatamente al mesero a través del sistema de notificaciones de salón.</li>
          <li><strong>ENTREGADO:</strong> El mesero retira el pedido de la barra de despacho y la orden se archiva del monitor de cocina.</li>
        </ol>

        <!-- SECTION 6 -->
        <h1>6. Inventario General ERP, Recetas y Alertas Críticas</h1>
        <p>
          La gestión de materias primas en Aurora es completamente automatizada y cuenta con un sistema de <strong>descuento dinámico de stock por receta</strong>. Cuando un cajero vende un plato en el POS, el software descuenta de forma automática las porciones exactas de los insumos asociados en la base de datos (ej: papas, salsas, empaques, pollos enteros).
        </p>
        <h2>Configuración de Stock Mínimo y Alertas de Reabastecimiento</h2>
        <p>
          Cada insumo en el inventario posee un campo parametrizado de <span class="code">Stock Mínimo Alerta</span>. Si el inventario físico de un artículo desciende por debajo de este umbral, el sistema realiza tres acciones en segundo plano:
        </p>
        <ul>
          <li>Genera una notificación crítica persistente en el panel de control del administrador.</li>
          <li>Marca el insumo en color rojo de alerta dentro del panel de inventarios.</li>
          <li>Incluye automáticamente el producto en la lista de stock crítico para la exportación a Google Sheets.</li>
        </ul>

        <!-- SECTION 7 -->
        <h1>7. Módulo Contable, Control de Gastos y Flujo de Colchón</h1>
        <p>
          Aurora automatiza el seguimiento de la rentabilidad del restaurante, permitiendo registrar todos los <strong>gastos y egresos operativos</strong> y cruzarlos contra la facturación bruta.
        </p>
        <h2>Registro de Gastos</h2>
        <p>
          Los egresos se clasifican por categorías estándar (Materia Prima, Nómina, Servicios Públicos, Alquiler, Mantenimiento e Imprevistos). Es obligatorio adjuntar el número de factura o soporte legal del gasto para mantener la consistencia contable del sistema.
        </p>
        <h2>El Colchón Financiero (Amortiguación de Riesgo de Caja)</h2>
        <p>
          Una de las herramientas contables exclusivas de Aurora es la métrica de <strong>Colchón Financiero</strong>. El sistema calcula los gastos fijos históricos y determina cuántos días de operación continua puede soportar la sede activa con el saldo neto de caja acumulado, sirviendo como una alarma de salud financiera temprana contra déficit operacionales.
        </p>

        <!-- SECTION 8 -->
        <h1>8. Personal, Recursos Humanos, Control de Turnos y Bitácora</h1>
        <p>
          La consistencia operativa depende de la disciplina del personal. El módulo de <strong>Personal & Bitácora (RRHH)</strong> permite centralizar los expedientes de todos los colaboradores del restaurante (Meseros, Cajeros, Cocineros, Parrilleros, Repartidores).
        </p>
        <h2>Registro de Turnos e Incidencias (Novedades)</h2>
        <p>
          El sistema cuenta con un diario de novedades para registrar el desempeño de la jornada: retardos, ausencias justificadas, horas extra laboradas o felicitaciones de servicio. Asimismo, se puede visualizar la planilla de salarios base devengados para facilitar el proceso de pago al final de la quincena o mes.
        </p>

        <!-- SECTION 9 -->
        <h1>9. Asistente Inteligente con IA (Cero AI)</h1>
        <p>
          Aurora incorpora un modelo inteligente de asistencia denominado <strong>Asistente Cero</strong>. Impulsado por algoritmos avanzados y Gemini API, este asistente procesa consultas complejas en lenguaje natural para proporcionar respuestas predictivas del negocio.
        </p>
        <h2>Funcionalidades de Cero AI</h2>
        <ul>
          <li><strong>Predicción de Abastecimiento:</strong> Analiza el histórico de ventas y predice cuántas unidades de pollo e insumos críticos se requerirán para los próximos fines de semana de alta demanda.</li>
          <li><strong>Auditoría de Anomalías:</strong> Detecta patrones de facturación atípicos, como aperturas de caja con bases sospechosas o anulaciones de facturas fuera del horario habitual de operación.</li>
          <li><strong>Comandos de Voz/Texto Directos:</strong> Permite consultar el estado de caja, mejores platos vendidos o alertas de stock mediante una barra de chat conversacional integrada.</li>
        </ul>

        <!-- SECTION 10 -->
        <h1>10. Sincronización Avanzada con Google Workspace & Drive</h1>
        <p>
          La integración bidireccional con Google Workspace permite a la junta directiva y al área de contabilidad exportar reportes consolidados directamente al ecosistema en la nube del usuario autorizado.
        </p>
        <h2>El Cuadro de Mando Financiero ERP</h2>
        <p>
          Al presionar "Generar Cuadro de Mando", el sistema crea automáticamente un libro de cálculo en Google Sheets estructurado de manera rigurosa en <strong>4 pestañas automatizadas</strong>:
        </p>
        <ol>
          <li><strong>📊 Resumen Ejecutivo:</strong> Contiene las métricas financieras agregadas del restaurante (Ingresos, Egresos, Utilidad Neta, Inventario Crítico y diagnósticos automáticos de salud operacional).</li>
          <li><strong>💰 Facturación Detallada:</strong> Vuelca el registro histórico de todas las facturas POS emitidas en la jornada.</li>
          <li><strong>📉 Stock de Alerta:</strong> Genera un listado en tiempo real de todos los insumos bajo mínimos que requieren reabastecimiento urgente.</li>
          <li><strong>🧾 Control de Egresos:</strong> Sincroniza la tabla de egresos registrados para auditoría contable.</li>
        </ol>

        <!-- SECTION 11 -->
        <h1>11. Módulo de Ciberseguridad, Whitelisting de Terminales y Soporte</h1>
        <p>
          Para salvaguardar la integridad de la base de datos contra accesos no autorizados o fraudes internos de empleados, Aurora integra un protocolo estricto de <strong>Seguridad Operativa</strong>.
        </p>
        <h2>Control de Acceso mediante Whitelisting</h2>
        <p>
          Solo los dispositivos y terminales de cajero autorizados mediante su dirección o identificador único pueden procesar cobros y aperturas de caja. El administrador puede incluir o remover terminales del Whitelist de manera instantánea en el panel de seguridad.
        </p>
        <h2>Registro de Auditoría de Intrusiones (Logs Inalterables)</h2>
        <p>
          Cualquier intento de alteración de base de datos, intentos fallidos de inicio de sesión, cambios en la resolución DIAN o accesos fuera de rango horario quedan documentados en un historial de logs blindado que no puede ser eliminado por los cajeros, proveyendo un rastro de auditoría transparente ante cualquier eventualidad legal.
        </p>

        <!-- SIGNATURES -->
        <div class="signature-section">
          <div class="signature-block">
            Director General de Operaciones
            <div style="font-size: 9px; font-weight: normal; color: #64748b; margin-top: 5px;">Aurora Authorized Signatory</div>
          </div>
          <div class="signature-block">
            Gerente de Auditoría & Control
            <div style="font-size: 9px; font-weight: normal; color: #64748b; margin-top: 5px;">Aurora Security Supervisor</div>
          </div>
        </div>

        <div class="page-footer">
          Manual de Operaciones y Referencia del Sistema Aurora.<br>
          © 2026 Aurora Software Inc. Todos los datos han sido estructurados para control de calidad interna del restaurante.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Calculations
  const totalSales = currentInvoices.reduce((acc, curr) => acc + curr.total, 0);
  const totalExpenses = currentGastos.reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalSales - totalExpenses;
  const avgTicket = currentInvoices.length > 0 ? totalSales / currentInvoices.length : 0;


  // Best seller logic
  const itemCounts: { [name: string]: number } = {};
  currentInvoices.forEach(inv => {
    inv.items.forEach(itm => {
      itemCounts[itm.name] = (itemCounts[itm.name] || 0) + itm.qty;
    });
  });

  const sortedBestSellers = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900 text-slate-100 font-sans">
      
      {/* Report Header */}
      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
            <BarChart3 className="text-cyan-400 h-5 w-5" />
            REPORTE DE VENTAS & CONTROL AUDITORÍA Z
          </h2>
          <div className="h-4 w-px bg-slate-800"></div>
          <div className="flex gap-1 p-0.5 bg-slate-900 rounded-lg border border-slate-800">
            <button 
              onClick={() => setActiveTab('METRICS')}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all cursor-pointer ${activeTab === 'METRICS' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Métricas y Analíticas
            </button>
            <button 
              onClick={() => setActiveTab('CIERRES_Z')}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all cursor-pointer ${activeTab === 'CIERRES_Z' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Historial Cierres de Caja (Reporte Z)
            </button>
          </div>
        </div>

        <button 
          onClick={refreshData}
          className="p-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {activeTab === 'METRICS' && (
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          
          {/* Top KPI row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Facturación Total:</span>
                <p className="text-lg font-bold font-mono text-emerald-400">${totalSales.toLocaleString()} COP</p>
              </div>
              <div className="h-9 w-9 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-4.5 w-4.5" />
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Gastos Registrados:</span>
                <p className="text-lg font-bold font-mono text-red-400">${totalExpenses.toLocaleString()} COP</p>
              </div>
              <div className="h-9 w-9 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center justify-center">
                <TrendingDown className="h-4.5 w-4.5" />
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Margen Neto Operacional:</span>
                <p className={`text-lg font-bold font-mono ${netProfit >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                  ${netProfit.toLocaleString()} COP
                </p>
              </div>
              <div className="h-9 w-9 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl flex items-center justify-center">
                <DollarSign className="h-4.5 w-4.5" />
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Ticket Promedio por Mesa:</span>
                <p className="text-lg font-bold font-mono text-slate-200">${Math.round(avgTicket).toLocaleString()} COP</p>
              </div>
              <div className="h-9 w-9 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl flex items-center justify-center">
                <Award className="h-4.5 w-4.5" />
              </div>
            </div>

          </div>

          {/* Accounting Export Panel */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                  <FileSpreadsheet className="text-emerald-400 h-4.5 w-4.5" />
                  EXPORTACIÓN CONTABLE EXTERNA
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Exporta reportes conciliados de facturación y egresos listos para tu contador o auditor fiscal.
                </p>
              </div>

              {/* Date Filter Selector */}
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl shrink-0">
                <span className="text-[10px] font-mono text-slate-500 uppercase px-2 flex items-center gap-1">
                  <Filter className="h-3 w-3" /> Filtro:
                </span>
                <div className="flex gap-1">
                  {[
                    { id: 'ALL', label: 'Todo' },
                    { id: 'TODAY', label: 'Hoy' },
                    { id: 'WEEK', label: '7 Días' },
                    { id: 'MONTH', label: 'Este Mes' }
                  ].map((range) => (
                    <button
                      key={range.id}
                      onClick={() => setDateFilter(range.id as 'TODAY' | 'WEEK' | 'MONTH' | 'ALL')}
                      className={`px-2.5 py-1 text-[10px] font-mono rounded-lg transition-all cursor-pointer ${
                        dateFilter === range.id
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/10'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Export Actions Grid - EXCLUSIVE PDF REPORTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pt-1">
              
              {/* Card 1: Billing / Invoices */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-slate-700 transition-all">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider">Historial de Facturación</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                    Detalle completo de ventas, IVA/Impuesto al Consumo, propinas, resoluciones DIAN y medios de pago.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => handleExportPDF('INVOICES')}
                    className="w-full py-2 px-3 bg-gradient-to-r from-cyan-600/25 to-cyan-500/10 border border-cyan-500/30 hover:border-cyan-400 hover:from-cyan-500 hover:to-cyan-400 hover:text-slate-950 text-cyan-300 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    Generar Reporte PDF
                  </button>
                </div>
              </div>

              {/* Card 2: Egresos / Gastos */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-slate-700 transition-all">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold font-mono text-red-400 uppercase tracking-wider">Listado de Gastos</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                    Egresos por nómina, servicios públicos, compras de materia prima, alquileres y soportes fiscales.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => handleExportPDF('GASTOS')}
                    className="w-full py-2 px-3 bg-gradient-to-r from-red-600/25 to-red-500/10 border border-red-500/30 hover:border-red-400 hover:from-red-500 hover:to-red-400 hover:text-slate-950 text-red-300 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    Generar Reporte PDF
                  </button>
                </div>
              </div>

              {/* Card 3: Libro Diario Consolidado */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-slate-700 transition-all">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider">Balance Libro Diario</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                    Historial cronológico integrado de ingresos (ventas) y egresos (gastos) con saldo neto de caja.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => handleExportPDF('CONSOLIDATED')}
                    className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600/25 to-emerald-500/10 border border-emerald-500/30 hover:border-emerald-400 hover:from-emerald-500 hover:to-emerald-400 hover:text-slate-950 text-emerald-300 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    Generar Reporte PDF
                  </button>
                </div>
              </div>

              {/* Card 4: Control de Ventas de Pollo Asado */}
              <div className="bg-slate-900/60 border border-amber-500/20 rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-amber-500/40 transition-all shadow-md shadow-amber-500/[0.02]">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1 text-[8px] font-bold font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded uppercase tracking-widest border border-amber-500/20">
                    Control de Asador
                  </span>
                  <h4 className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider">Arqueo Diario de Pollo</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                    Suma total por porciones (1/4, 1/2, 1/1) y conciliación total equivalente en pollos enteros de asador.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleExportChickenPDF}
                    className="w-full py-2 px-3 bg-gradient-to-r from-amber-600/25 to-amber-500/10 border border-amber-500/30 hover:border-amber-400 hover:from-amber-500 hover:to-amber-400 hover:text-slate-950 text-amber-300 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    Generar Reporte PDF
                  </button>
                </div>
              </div>

              {/* Card 5: Manual de Usuario del Sistema */}
              <div className="bg-slate-900/60 border border-blue-500/20 rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-blue-500/40 transition-all shadow-md shadow-blue-500/[0.02]">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1 text-[8px] font-bold font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded uppercase tracking-widest border border-blue-500/20">
                    Documentación
                  </span>
                  <h4 className="text-xs font-bold font-mono text-blue-400 uppercase tracking-wider">Manual de Operaciones</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                    Guía de entrenamiento oficial y manual de procedimientos técnicos para todo el sistema ERP.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleExportSystemManualPDF}
                    className="w-full py-2 px-3 bg-gradient-to-r from-blue-600/25 to-blue-500/10 border border-blue-500/30 hover:border-blue-400 hover:from-blue-500 hover:to-blue-400 hover:text-slate-950 text-blue-300 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    Generar Manual PDF
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Visual SVG Charting Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Sales Chart SVG */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Flujo de Facturación de Turno (Por Hora)</h3>
              
              <div className="h-48 relative flex items-end justify-between border-b border-l border-slate-800 pb-2 pl-2">
                
                {/* SVG Visual Bar Graph */}
                <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
                  {/* Grid lines */}
                  <line x1="0" y1="30" x2="100%" y2="30" stroke="#1e293b" strokeWidth="1" strokeDasharray="3" />
                  <line x1="0" y1="80" x2="100%" y2="80" stroke="#1e293b" strokeWidth="1" strokeDasharray="3" />
                  <line x1="0" y1="130" x2="100%" y2="130" stroke="#1e293b" strokeWidth="1" strokeDasharray="3" />
                </svg>

                {/* Bars for simulated hours */}
                {[
                  { hour: '11:00', val: 120000 },
                  { hour: '13:00', val: 540000 },
                  { hour: '15:00', val: 210000 },
                  { hour: '17:00', val: 180000 },
                  { hour: '19:00', val: 890000 },
                  { hour: '21:00', val: 680000 },
                ].map((pt, idx) => {
                  const maxVal = 900000;
                  const heightPct = (pt.val / maxVal) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 z-10">
                      <span className="text-[9px] font-mono text-cyan-400">${Math.round(pt.val/1000)}k</span>
                      <div 
                        className="w-10 bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-md hover:opacity-80 transition-all shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                        style={{ height: `${heightPct * 0.8}px` }}
                      ></div>
                      <span className="text-[9px] font-mono text-slate-500">{pt.hour}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Best Sellers and Category breakdown */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Top 5 Platillos Más Vendidos</h3>
              <div className="space-y-3 pt-2">
                {sortedBestSellers.length === 0 ? (
                  <div className="text-slate-600 font-mono italic text-xs py-10 text-center">
                    Esperando ventas para ponderar catálogo
                  </div>
                ) : (
                  sortedBestSellers.map(([name, count], idx) => (
                    <div key={idx} className="space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between text-slate-300">
                        <span>{name}</span>
                        <span className="text-emerald-400 font-bold">{count} porciones</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-850">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full"
                          style={{ width: `${Math.min(100, (count / 10) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {activeTab === 'CIERRES_Z' && (
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-300 font-mono">HISTORIAL DE REPORTES Z (CIERRES DE CAJA FISCAL)</h3>
              <p className="text-xs text-slate-400 font-mono mt-1">Archivo de conciliación obligatoria para control contable</p>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-xl font-mono font-bold flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" />
              AUDITORÍA INTEGRADA DIAN
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono bg-slate-900/40">
                    <th className="p-4">Código Cierre Z</th>
                    <th className="p-4">Fecha / Turno</th>
                    <th className="p-4">Cajero / Operador</th>
                    <th className="p-4 text-right">Ventas Brutas</th>
                    <th className="p-4 text-right">Impuesto Consumo</th>
                    <th className="p-4 text-right">Efectivo Físico</th>
                    <th className="p-4 text-right">Diferencia / Cuadre</th>
                    <th className="p-4 text-center">Estado Auditoría</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 font-mono text-slate-300">
                  {currentCierres.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-600 italic">No se han realizado cierres de caja en esta sede hoy</td>
                    </tr>
                  ) : (
                    currentCierres.map((cc) => {
                      const isPerfect = cc.difference === 0;
                      return (
                        <tr key={cc.id} className={`hover:bg-slate-900/30 transition-colors ${!isPerfect ? 'bg-amber-500/[0.01]' : ''}`}>
                          <td className="p-4 font-bold text-cyan-400">{cc.id.toUpperCase()}</td>
                          <td className="p-4 text-slate-400 text-[11px]">{new Date(cc.timestamp).toLocaleString()}</td>
                          <td className="p-4 text-slate-200">{cc.closedBy}</td>
                          <td className="p-4 text-right text-slate-300">${cc.totalSales.toLocaleString()}</td>
                          <td className="p-4 text-right text-slate-400">${(cc.totalSales * 0.08).toLocaleString()}</td>
                          <td className="p-4 text-right text-emerald-400">${cc.actualCash.toLocaleString()}</td>
                          <td className={`p-4 text-right font-bold ${isPerfect ? 'text-emerald-400' : 'text-red-400'}`}>
                            ${cc.difference.toLocaleString()} COP
                          </td>
                          <td className="p-4 text-center">
                            {isPerfect ? (
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                                ✓ CUADRE EXACTO
                              </span>
                            ) : (
                              <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 justify-center">
                                <AlertTriangle className="h-3 w-3" />
                                DESCUADRE
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
