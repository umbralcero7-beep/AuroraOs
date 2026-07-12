import express from "express";
import path from "path";
import fs from "fs";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import pg from "pg";
const { Pool } = pg;

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "aurora_db.json");

// Initialize PostgreSQL connection pool if DATABASE_URL is configured (e.g. on Supabase)
let pool: pg.Pool | null = null;
if (process.env.DATABASE_URL) {
  console.log("Configurando conexión a base de datos PostgreSQL (Supabase)...");
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Necessary for hosted platforms like Supabase / Render
    }
  });
}

// Real-Time WebSocket Connections State
interface ConnectedClient {
  ws: WebSocket;
  userId?: string;
  role?: string;
  sedeId?: string;
}
let activeClients: ConnectedClient[] = [];

const wss = new WebSocketServer({ noServer: true });

function broadcastToSede(sedeId: string, message: any) {
  const payloadStr = JSON.stringify(message);
  activeClients.forEach(client => {
    if (client.ws.readyState === WebSocket.OPEN && client.sedeId === sedeId) {
      client.ws.send(payloadStr);
    }
  });
}

// Simulated printed tickets store
let printedTickets: { id: string; comandaId: string; sedeId: string; content: string; timestamp: string }[] = [];

function generateThermalTicket(comanda: any, waiterName: string) {
  const dateStr = new Date(comanda.timestamp).toLocaleString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "numeric",
    month: "numeric",
    year: "numeric"
  });
  
  let ticket = `========================================\n`;
  ticket += `       TIQUETE DE COCINA - ENTRANTE     \n`;
  ticket += `========================================\n`;
  ticket += `MESA:       ${comanda.tableNumber}\n`;
  ticket += `MESERO:     ${waiterName || "Sofia Castro"}\n`;
  ticket += `PERSONAS:   ${comanda.guestsCount || 1} Personas\n`;
  ticket += `HORA:       ${dateStr}\n`;
  ticket += `----------------------------------------\n`;
  ticket += `CANT  PLATO / PRODUCTO\n`;
  ticket += `----------------------------------------\n`;
  
  comanda.items.forEach((item: any) => {
    ticket += `${String(item.qty).padEnd(5)}${item.name}\n`;
    if (item.notes && item.notes.trim()) {
      ticket += `   * NOTA PREPARACIÓN: \n`;
      ticket += `     >> [ ${item.notes.toUpperCase()} ] <<\n`;
    }
  });
  
  ticket += `----------------------------------------\n`;
  ticket += `       AURORA OS - IMPRESIÓN AUTOMÁTICA\n`;
  ticket += `========================================\n`;
  return ticket;
}

// Middleware to parse JSON payloads safely
app.use(express.json());

// Initialize Gemini SDK with lazy key validation & proper user-agent headers
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("La API Key de Gemini (GEMINI_API_KEY) no está configurada en los Secretos.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Security Helper to sanitize potential injection scripts or SQL codes from requests
function detectAttackAttempt(payload: string): { detected: boolean; type: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } {
  const lower = payload.toLowerCase();
  if (lower.includes("<script") || lower.includes("javascript:") || lower.includes("onload=")) {
    return { detected: true, type: "XSS_FILTER", severity: "HIGH" };
  }
  if (
    lower.includes("select *") || 
    lower.includes("union select") || 
    lower.includes("or '1'='1") || 
    lower.includes("drop table") ||
    lower.includes("--") ||
    lower.includes("cast(")
  ) {
    return { detected: true, type: "INJECTION_ATTEMPT", severity: "CRITICAL" };
  }
  return { detected: false, type: "", severity: "LOW" };
}

// Default Seed Data
const DEFAULT_STATE = {
  sedes: [
    { id: "s1", name: "Sede Medellín - El Poblado", address: "Carrera 43A #10-25", phone: "+57 4 3215544", licenseStatus: "ACTIVE", licenseExpiry: "2027-12-31", monthlyFee: 150, lastPaymentDate: "2026-06-01" },
    { id: "s2", name: "Sede Bogotá - Chapinero", address: "Calle 63 #7-12", phone: "+57 1 8854411", licenseStatus: "ACTIVE", licenseExpiry: "2026-10-15", monthlyFee: 150, lastPaymentDate: "2026-06-15" },
    { id: "s3", name: "Sede Cali - Granada", address: "Avenida 9N #15-32", phone: "+57 2 4412233", licenseStatus: "PENDING_PAYMENT", licenseExpiry: "2026-07-01", monthlyFee: 150, lastPaymentDate: "2026-05-30" }
  ],
  users: [
    { id: "u1", name: "Carlos Mendoza", email: "carlos@restaurante.com", role: "ADMIN", sedeId: "s1", active: true, twoFactorEnabled: true, twoFactorSecret: "JBSWY3DPEHPK3PXP", backupCodes: ["887412", "993514", "104958", "672951"] },
    { id: "u2", name: "Isabella Gómez", email: "isabella@restaurante.com", role: "SUPPORT", sedeId: "s1", active: true, twoFactorEnabled: false },
    { id: "u3", name: "Mateo Pérez", email: "mateo@restaurante.com", role: "CASHIER", sedeId: "s1", active: true, twoFactorEnabled: false },
    { id: "u4", name: "Sofia Castro", email: "sofia@restaurante.com", role: "WAITER", sedeId: "s1", active: true, twoFactorEnabled: false },
    { id: "u5", name: "Juan David", email: "juan@restaurante.com", role: "CHEF", sedeId: "s1", active: true, twoFactorEnabled: false }
  ],
  whitelistedUsers: [
    { id: "w1", email: "soporte@aurora.com", role: "SUPPORT", sedeId: "s1", tempKey: "AURORA_SEC_99", createdTime: "2026-01-01T00:00:00Z" },
    { id: "w2", email: "gerente.bogota@restaurante.com", role: "ADMIN", sedeId: "s2", tempKey: "BOGOTA_992", createdTime: "2026-06-01T12:00:00Z" },
    { id: "w3", email: "repartidor1@repartos.com", role: "WAITER", sedeId: "s1", tempKey: "REP_482", createdTime: "2026-07-01T12:00:00Z" }
  ],
  insumos: [
    { id: "i1", name: "Solomito de Res Premium (Kg)", sku: "RAW-BEEF-01", unit: "Kg", category: "Carnes", stock: 12.5, minStock: 25.0, costPrice: 32000, supplierId: "sup1", sedeId: "s1" },
    { id: "i2", name: "Arroz Blanco Parbolizado (Kg)", sku: "RAW-RICE-02", unit: "Kg", category: "Granos", stock: 85.0, minStock: 40.0, costPrice: 4200, supplierId: "sup2", sedeId: "s1" },
    { id: "i3", name: "Papas Francesas Pre-fritas (Kg)", sku: "RAW-POTATO-03", unit: "Kg", category: "Congelados", stock: 50.0, minStock: 30.0, costPrice: 8500, supplierId: "sup1", sedeId: "s1" },
    { id: "i4", name: "Queso Doble Crema Bloque (Kg)", sku: "RAW-CHEESE-04", unit: "Kg", category: "Lácteos", stock: 4.2, minStock: 10.0, costPrice: 18000, supplierId: "sup2", sedeId: "s1" },
    { id: "i5", name: "Aguacate Hass Maduro (Und)", sku: "RAW-AVO-05", unit: "Und", category: "Verduras", stock: 60.0, minStock: 20.0, costPrice: 2500, supplierId: "sup2", sedeId: "s1" }
  ],
  suppliers: [
    { id: "sup1", name: "Distribuidora de Carnes El Corral", phone: "+57 4 5551234", email: "ventas@elcorral.com", category: "Carnes y Congelados" },
    { id: "sup2", name: "Fruver La Huerta del Pueblo", phone: "+57 1 7776543", email: "pedidos@lahuerta.com", category: "Granos y Verduras" }
  ],
  menuItems: [
    {
        "id": "m-01",
        "name": "POLLO ASADO",
        "price": 45000,
        "category": "PLATOS_FUERTES",
        "description": "POLLO ASADO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-01",
        "name": "POLLO ASADO",
        "price": 45000,
        "category": "PLATOS_FUERTES",
        "description": "POLLO ASADO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-01",
        "name": "POLLO ASADO",
        "price": 45000,
        "category": "PLATOS_FUERTES",
        "description": "POLLO ASADO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-02",
        "name": "1/2 POLLO ASADO",
        "price": 25000,
        "category": "PLATOS_FUERTES",
        "description": "1/2 POLLO ASADO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-02",
        "name": "1/2 POLLO ASADO",
        "price": 25000,
        "category": "PLATOS_FUERTES",
        "description": "1/2 POLLO ASADO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-02",
        "name": "1/2 POLLO ASADO",
        "price": 25000,
        "category": "PLATOS_FUERTES",
        "description": "1/2 POLLO ASADO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-03",
        "name": "1/4 POLLO ASADO",
        "price": 14500,
        "category": "PLATOS_FUERTES",
        "description": "1/4 POLLO ASADO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-03",
        "name": "1/4 POLLO ASADO",
        "price": 14500,
        "category": "PLATOS_FUERTES",
        "description": "1/4 POLLO ASADO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-03",
        "name": "1/4 POLLO ASADO",
        "price": 14500,
        "category": "PLATOS_FUERTES",
        "description": "1/4 POLLO ASADO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-04",
        "name": "POLLO BROASTER",
        "price": 47000,
        "category": "PLATOS_FUERTES",
        "description": "POLLO BROASTER con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-04",
        "name": "POLLO BROASTER",
        "price": 47000,
        "category": "PLATOS_FUERTES",
        "description": "POLLO BROASTER con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-04",
        "name": "POLLO BROASTER",
        "price": 47000,
        "category": "PLATOS_FUERTES",
        "description": "POLLO BROASTER con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-05",
        "name": "1/2 POLLO BROASTER",
        "price": 27000,
        "category": "PLATOS_FUERTES",
        "description": "1/2 POLLO BROASTER con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-05",
        "name": "1/2 POLLO BROASTER",
        "price": 27000,
        "category": "PLATOS_FUERTES",
        "description": "1/2 POLLO BROASTER con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-05",
        "name": "1/2 POLLO BROASTER",
        "price": 27000,
        "category": "PLATOS_FUERTES",
        "description": "1/2 POLLO BROASTER con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-06",
        "name": "1/4 POLLO BROASTER",
        "price": 15500,
        "category": "PLATOS_FUERTES",
        "description": "1/4 POLLO BROASTER con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-06",
        "name": "1/4 POLLO BROASTER",
        "price": 15500,
        "category": "PLATOS_FUERTES",
        "description": "1/4 POLLO BROASTER con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-06",
        "name": "1/4 POLLO BROASTER",
        "price": 15500,
        "category": "PLATOS_FUERTES",
        "description": "1/4 POLLO BROASTER con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-07",
        "name": "PAPA FRANCESA",
        "price": 10000,
        "category": "ENTRADAS",
        "description": "PAPA FRANCESA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-07",
        "name": "PAPA FRANCESA",
        "price": 10000,
        "category": "ENTRADAS",
        "description": "PAPA FRANCESA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-07",
        "name": "PAPA FRANCESA",
        "price": 10000,
        "category": "ENTRADAS",
        "description": "PAPA FRANCESA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-08",
        "name": "PORCION DE YUCA",
        "price": 10000,
        "category": "ENTRADAS",
        "description": "PORCION DE YUCA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-08",
        "name": "PORCION DE YUCA",
        "price": 10000,
        "category": "ENTRADAS",
        "description": "PORCION DE YUCA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-08",
        "name": "PORCION DE YUCA",
        "price": 10000,
        "category": "ENTRADAS",
        "description": "PORCION DE YUCA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-09",
        "name": "PORCION PAPA SALADA",
        "price": 7500,
        "category": "ENTRADAS",
        "description": "PORCION PAPA SALADA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-09",
        "name": "PORCION PAPA SALADA",
        "price": 7500,
        "category": "ENTRADAS",
        "description": "PORCION PAPA SALADA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-09",
        "name": "PORCION PAPA SALADA",
        "price": 7500,
        "category": "ENTRADAS",
        "description": "PORCION PAPA SALADA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-10",
        "name": "PORCION PATACON",
        "price": 10000,
        "category": "ENTRADAS",
        "description": "PORCION PATACON con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-10",
        "name": "PORCION PATACON",
        "price": 10000,
        "category": "ENTRADAS",
        "description": "PORCION PATACON con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-10",
        "name": "PORCION PATACON",
        "price": 10000,
        "category": "ENTRADAS",
        "description": "PORCION PATACON con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-11",
        "name": "VIUDO DE CAPAZ",
        "price": 52000,
        "category": "PLATOS_FUERTES",
        "description": "VIUDO DE CAPAZ con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-11",
        "name": "VIUDO DE CAPAZ",
        "price": 52000,
        "category": "PLATOS_FUERTES",
        "description": "VIUDO DE CAPAZ con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-11",
        "name": "VIUDO DE CAPAZ",
        "price": 52000,
        "category": "PLATOS_FUERTES",
        "description": "VIUDO DE CAPAZ con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-12",
        "name": "PORCION ENSALADA",
        "price": 9000,
        "category": "ENTRADAS",
        "description": "PORCION ENSALADA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-12",
        "name": "PORCION ENSALADA",
        "price": 9000,
        "category": "ENTRADAS",
        "description": "PORCION ENSALADA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-12",
        "name": "PORCION ENSALADA",
        "price": 9000,
        "category": "ENTRADAS",
        "description": "PORCION ENSALADA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-13",
        "name": "PORCION ARROZ",
        "price": 7000,
        "category": "ENTRADAS",
        "description": "PORCION ARROZ con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-13",
        "name": "PORCION ARROZ",
        "price": 7000,
        "category": "ENTRADAS",
        "description": "PORCION ARROZ con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-13",
        "name": "PORCION ARROZ",
        "price": 7000,
        "category": "ENTRADAS",
        "description": "PORCION ARROZ con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-14",
        "name": "PORCION AREPA",
        "price": 5000,
        "category": "ENTRADAS",
        "description": "PORCION AREPA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-14",
        "name": "PORCION AREPA",
        "price": 5000,
        "category": "ENTRADAS",
        "description": "PORCION AREPA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-14",
        "name": "PORCION AREPA",
        "price": 5000,
        "category": "ENTRADAS",
        "description": "PORCION AREPA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-15",
        "name": "BANDEJA BROASTER",
        "price": 34000,
        "category": "PLATOS_FUERTES",
        "description": "BANDEJA BROASTER con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-15",
        "name": "BANDEJA BROASTER",
        "price": 34000,
        "category": "PLATOS_FUERTES",
        "description": "BANDEJA BROASTER con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-15",
        "name": "BANDEJA BROASTER",
        "price": 34000,
        "category": "PLATOS_FUERTES",
        "description": "BANDEJA BROASTER con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-16",
        "name": "CARNE ASADA",
        "price": 44000,
        "category": "PLATOS_FUERTES",
        "description": "CARNE ASADA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-16",
        "name": "CARNE ASADA",
        "price": 44000,
        "category": "PLATOS_FUERTES",
        "description": "CARNE ASADA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-16",
        "name": "CARNE ASADA",
        "price": 44000,
        "category": "PLATOS_FUERTES",
        "description": "CARNE ASADA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-17",
        "name": "PECHUGA A LA PLANCHA",
        "price": 45000,
        "category": "PLATOS_FUERTES",
        "description": "PECHUGA A LA PLANCHA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-17",
        "name": "PECHUGA A LA PLANCHA",
        "price": 45000,
        "category": "PLATOS_FUERTES",
        "description": "PECHUGA A LA PLANCHA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-17",
        "name": "PECHUGA A LA PLANCHA",
        "price": 45000,
        "category": "PLATOS_FUERTES",
        "description": "PECHUGA A LA PLANCHA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-18",
        "name": "BANDEJA CON POLLO ASADO",
        "price": 33000,
        "category": "PLATOS_FUERTES",
        "description": "BANDEJA CON POLLO ASADO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-18",
        "name": "BANDEJA CON POLLO ASADO",
        "price": 33000,
        "category": "PLATOS_FUERTES",
        "description": "BANDEJA CON POLLO ASADO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-18",
        "name": "BANDEJA CON POLLO ASADO",
        "price": 33000,
        "category": "PLATOS_FUERTES",
        "description": "BANDEJA CON POLLO ASADO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-19",
        "name": "ARROZ CON POLLO",
        "price": 36000,
        "category": "PLATOS_FUERTES",
        "description": "ARROZ CON POLLO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-19",
        "name": "ARROZ CON POLLO",
        "price": 36000,
        "category": "PLATOS_FUERTES",
        "description": "ARROZ CON POLLO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-19",
        "name": "ARROZ CON POLLO",
        "price": 36000,
        "category": "PLATOS_FUERTES",
        "description": "ARROZ CON POLLO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-20",
        "name": "MOJARRA",
        "price": 49000,
        "category": "PLATOS_FUERTES",
        "description": "MOJARRA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-20",
        "name": "MOJARRA",
        "price": 49000,
        "category": "PLATOS_FUERTES",
        "description": "MOJARRA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-20",
        "name": "MOJARRA",
        "price": 49000,
        "category": "PLATOS_FUERTES",
        "description": "MOJARRA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-21",
        "name": "BAGRE FRITO / SALSA",
        "price": 52000,
        "category": "PLATOS_FUERTES",
        "description": "BAGRE FRITO / SALSA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-21",
        "name": "BAGRE FRITO / SALSA",
        "price": 52000,
        "category": "PLATOS_FUERTES",
        "description": "BAGRE FRITO / SALSA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-21",
        "name": "BAGRE FRITO / SALSA",
        "price": 52000,
        "category": "PLATOS_FUERTES",
        "description": "BAGRE FRITO / SALSA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-22",
        "name": "CLUB COLOMBIA",
        "price": 7000,
        "category": "BEBIDAS",
        "description": "CLUB COLOMBIA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-22",
        "name": "CLUB COLOMBIA",
        "price": 7000,
        "category": "BEBIDAS",
        "description": "CLUB COLOMBIA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-22",
        "name": "CLUB COLOMBIA",
        "price": 7000,
        "category": "BEBIDAS",
        "description": "CLUB COLOMBIA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-23",
        "name": "SOPA MENUDENCIAS",
        "price": 13500,
        "category": "ENTRADAS",
        "description": "SOPA MENUDENCIAS con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-23",
        "name": "SOPA MENUDENCIAS",
        "price": 13500,
        "category": "ENTRADAS",
        "description": "SOPA MENUDENCIAS con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-23",
        "name": "SOPA MENUDENCIAS",
        "price": 13500,
        "category": "ENTRADAS",
        "description": "SOPA MENUDENCIAS con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-24",
        "name": "COLA Y POLA / MALTA",
        "price": 5000,
        "category": "BEBIDAS",
        "description": "COLA Y POLA / MALTA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-24",
        "name": "COLA Y POLA / MALTA",
        "price": 5000,
        "category": "BEBIDAS",
        "description": "COLA Y POLA / MALTA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-24",
        "name": "COLA Y POLA / MALTA",
        "price": 5000,
        "category": "BEBIDAS",
        "description": "COLA Y POLA / MALTA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-25",
        "name": "CERVEZA BOTELLA",
        "price": 6000,
        "category": "BEBIDAS",
        "description": "CERVEZA BOTELLA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-25",
        "name": "CERVEZA BOTELLA",
        "price": 6000,
        "category": "BEBIDAS",
        "description": "CERVEZA BOTELLA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-25",
        "name": "CERVEZA BOTELLA",
        "price": 6000,
        "category": "BEBIDAS",
        "description": "CERVEZA BOTELLA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-26",
        "name": "PIEDRITAS PICANTES",
        "price": 15000,
        "category": "ENTRADAS",
        "description": "PIEDRITAS PICANTES con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-26",
        "name": "PIEDRITAS PICANTES",
        "price": 15000,
        "category": "ENTRADAS",
        "description": "PIEDRITAS PICANTES con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-26",
        "name": "PIEDRITAS PICANTES",
        "price": 15000,
        "category": "ENTRADAS",
        "description": "PIEDRITAS PICANTES con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-27",
        "name": "GASEOSA 350 ML",
        "price": 5000,
        "category": "BEBIDAS",
        "description": "GASEOSA 350 ML con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-27",
        "name": "GASEOSA 350 ML",
        "price": 5000,
        "category": "BEBIDAS",
        "description": "GASEOSA 350 ML con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-27",
        "name": "GASEOSA 350 ML",
        "price": 5000,
        "category": "BEBIDAS",
        "description": "GASEOSA 350 ML con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-28",
        "name": "POSTRES",
        "price": 9500,
        "category": "POSTRES",
        "description": "POSTRES con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-28",
        "name": "POSTRES",
        "price": 9500,
        "category": "POSTRES",
        "description": "POSTRES con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-28",
        "name": "POSTRES",
        "price": 9500,
        "category": "POSTRES",
        "description": "POSTRES con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-29",
        "name": "CHURRASCO",
        "price": 50000,
        "category": "PLATOS_FUERTES",
        "description": "CHURRASCO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-29",
        "name": "CHURRASCO",
        "price": 50000,
        "category": "PLATOS_FUERTES",
        "description": "CHURRASCO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-29",
        "name": "CHURRASCO",
        "price": 50000,
        "category": "PLATOS_FUERTES",
        "description": "CHURRASCO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-30",
        "name": "GASEOSA 2.5 LTS",
        "price": 13500,
        "category": "BEBIDAS",
        "description": "GASEOSA 2.5 LTS con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-30",
        "name": "GASEOSA 2.5 LTS",
        "price": 13500,
        "category": "BEBIDAS",
        "description": "GASEOSA 2.5 LTS con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-30",
        "name": "GASEOSA 2.5 LTS",
        "price": 13500,
        "category": "BEBIDAS",
        "description": "GASEOSA 2.5 LTS con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-31",
        "name": "LIMONADA NATURAL",
        "price": 7000,
        "category": "BEBIDAS",
        "description": "LIMONADA NATURAL con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-31",
        "name": "LIMONADA NATURAL",
        "price": 7000,
        "category": "BEBIDAS",
        "description": "LIMONADA NATURAL con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-31",
        "name": "LIMONADA NATURAL",
        "price": 7000,
        "category": "BEBIDAS",
        "description": "LIMONADA NATURAL con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-32",
        "name": "GASEOSA 1.65 LTS",
        "price": 9500,
        "category": "BEBIDAS",
        "description": "GASEOSA 1.65 LTS con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-32",
        "name": "GASEOSA 1.65 LTS",
        "price": 9500,
        "category": "BEBIDAS",
        "description": "GASEOSA 1.65 LTS con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-32",
        "name": "GASEOSA 1.65 LTS",
        "price": 9500,
        "category": "BEBIDAS",
        "description": "GASEOSA 1.65 LTS con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-33",
        "name": "AGUA BOTELLA",
        "price": 5500,
        "category": "BEBIDAS",
        "description": "AGUA BOTELLA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-33",
        "name": "AGUA BOTELLA",
        "price": 5500,
        "category": "BEBIDAS",
        "description": "AGUA BOTELLA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-33",
        "name": "AGUA BOTELLA",
        "price": 5500,
        "category": "BEBIDAS",
        "description": "AGUA BOTELLA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-34",
        "name": "1/2 SOPA DE MENUDENCIA",
        "price": 9500,
        "category": "ENTRADAS",
        "description": "1/2 SOPA DE MENUDENCIA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-34",
        "name": "1/2 SOPA DE MENUDENCIA",
        "price": 9500,
        "category": "ENTRADAS",
        "description": "1/2 SOPA DE MENUDENCIA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-34",
        "name": "1/2 SOPA DE MENUDENCIA",
        "price": 9500,
        "category": "ENTRADAS",
        "description": "1/2 SOPA DE MENUDENCIA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-35",
        "name": "1/2 SOPA DE ARROZ",
        "price": 9500,
        "category": "ENTRADAS",
        "description": "1/2 SOPA DE ARROZ con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-35",
        "name": "1/2 SOPA DE ARROZ",
        "price": 9500,
        "category": "ENTRADAS",
        "description": "1/2 SOPA DE ARROZ con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-35",
        "name": "1/2 SOPA DE ARROZ",
        "price": 9500,
        "category": "ENTRADAS",
        "description": "1/2 SOPA DE ARROZ con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-36",
        "name": "SOPA MENUDENCIA LLEVAR",
        "price": 14500,
        "category": "ENTRADAS",
        "description": "SOPA MENUDENCIA LLEVAR con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-36",
        "name": "SOPA MENUDENCIA LLEVAR",
        "price": 14500,
        "category": "ENTRADAS",
        "description": "SOPA MENUDENCIA LLEVAR con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-36",
        "name": "SOPA MENUDENCIA LLEVAR",
        "price": 14500,
        "category": "ENTRADAS",
        "description": "SOPA MENUDENCIA LLEVAR con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-37",
        "name": "SOPA ARROZ CON CALLO LLEVAR",
        "price": 14500,
        "category": "ENTRADAS",
        "description": "SOPA ARROZ CON CALLO LLEVAR con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-37",
        "name": "SOPA ARROZ CON CALLO LLEVAR",
        "price": 14500,
        "category": "ENTRADAS",
        "description": "SOPA ARROZ CON CALLO LLEVAR con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-37",
        "name": "SOPA ARROZ CON CALLO LLEVAR",
        "price": 14500,
        "category": "ENTRADAS",
        "description": "SOPA ARROZ CON CALLO LLEVAR con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-38",
        "name": "MADURO",
        "price": 10000,
        "category": "ENTRADAS",
        "description": "MADURO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-38",
        "name": "MADURO",
        "price": 10000,
        "category": "ENTRADAS",
        "description": "MADURO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-38",
        "name": "MADURO",
        "price": 10000,
        "category": "ENTRADAS",
        "description": "MADURO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-39",
        "name": "ALITAS PICANTES",
        "price": 18000,
        "category": "PLATOS_FUERTES",
        "description": "ALITAS PICANTES con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-39",
        "name": "ALITAS PICANTES",
        "price": 18000,
        "category": "PLATOS_FUERTES",
        "description": "ALITAS PICANTES con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-39",
        "name": "ALITAS PICANTES",
        "price": 18000,
        "category": "PLATOS_FUERTES",
        "description": "ALITAS PICANTES con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-40",
        "name": "COMBO 1",
        "price": 63000,
        "category": "COMBOS",
        "description": "COMBO 1 con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-40",
        "name": "COMBO 1",
        "price": 63000,
        "category": "COMBOS",
        "description": "COMBO 1 con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-40",
        "name": "COMBO 1",
        "price": 63000,
        "category": "COMBOS",
        "description": "COMBO 1 con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-41",
        "name": "COMBO 2",
        "price": 65000,
        "category": "COMBOS",
        "description": "COMBO 2 con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-41",
        "name": "COMBO 2",
        "price": 65000,
        "category": "COMBOS",
        "description": "COMBO 2 con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-41",
        "name": "COMBO 2",
        "price": 65000,
        "category": "COMBOS",
        "description": "COMBO 2 con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-42",
        "name": "SOPA DE ARROZ CON CALLO",
        "price": 13500,
        "category": "ENTRADAS",
        "description": "SOPA DE ARROZ CON CALLO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-42",
        "name": "SOPA DE ARROZ CON CALLO",
        "price": 13500,
        "category": "ENTRADAS",
        "description": "SOPA DE ARROZ CON CALLO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-42",
        "name": "SOPA DE ARROZ CON CALLO",
        "price": 13500,
        "category": "ENTRADAS",
        "description": "SOPA DE ARROZ CON CALLO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-43",
        "name": "JUGO EN AGUA",
        "price": 9000,
        "category": "BEBIDAS",
        "description": "JUGO EN AGUA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-43",
        "name": "JUGO EN AGUA",
        "price": 9000,
        "category": "BEBIDAS",
        "description": "JUGO EN AGUA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-43",
        "name": "JUGO EN AGUA",
        "price": 9000,
        "category": "BEBIDAS",
        "description": "JUGO EN AGUA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-44",
        "name": "JUGO EN LECHE",
        "price": 10000,
        "category": "BEBIDAS",
        "description": "JUGO EN LECHE con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-44",
        "name": "JUGO EN LECHE",
        "price": 10000,
        "category": "BEBIDAS",
        "description": "JUGO EN LECHE con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-44",
        "name": "JUGO EN LECHE",
        "price": 10000,
        "category": "BEBIDAS",
        "description": "JUGO EN LECHE con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-45",
        "name": "TE",
        "price": 5500,
        "category": "BEBIDAS",
        "description": "TE con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-45",
        "name": "TE",
        "price": 5500,
        "category": "BEBIDAS",
        "description": "TE con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-45",
        "name": "TE",
        "price": 5500,
        "category": "BEBIDAS",
        "description": "TE con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-46",
        "name": "GASEOSA FLEXI 400 ML",
        "price": 5500,
        "category": "BEBIDAS",
        "description": "GASEOSA FLEXI 400 ML con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-46",
        "name": "GASEOSA FLEXI 400 ML",
        "price": 5500,
        "category": "BEBIDAS",
        "description": "GASEOSA FLEXI 400 ML con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-46",
        "name": "GASEOSA FLEXI 400 ML",
        "price": 5500,
        "category": "BEBIDAS",
        "description": "GASEOSA FLEXI 400 ML con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-47",
        "name": "SOBREBARRIGA",
        "price": 47000,
        "category": "PLATOS_FUERTES",
        "description": "SOBREBARRIGA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-47",
        "name": "SOBREBARRIGA",
        "price": 47000,
        "category": "PLATOS_FUERTES",
        "description": "SOBREBARRIGA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-47",
        "name": "SOBREBARRIGA",
        "price": 47000,
        "category": "PLATOS_FUERTES",
        "description": "SOBREBARRIGA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-48",
        "name": "JUGO DEL VALLE",
        "price": 5500,
        "category": "BEBIDAS",
        "description": "JUGO DEL VALLE con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-48",
        "name": "JUGO DEL VALLE",
        "price": 5500,
        "category": "BEBIDAS",
        "description": "JUGO DEL VALLE con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-48",
        "name": "JUGO DEL VALLE",
        "price": 5500,
        "category": "BEBIDAS",
        "description": "JUGO DEL VALLE con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-49",
        "name": "COMBO MIXTO",
        "price": 65000,
        "category": "COMBOS",
        "description": "COMBO MIXTO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-49",
        "name": "COMBO MIXTO",
        "price": 65000,
        "category": "COMBOS",
        "description": "COMBO MIXTO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-49",
        "name": "COMBO MIXTO",
        "price": 65000,
        "category": "COMBOS",
        "description": "COMBO MIXTO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-50",
        "name": "PUNTA DE ANCA",
        "price": 50000,
        "category": "PLATOS_FUERTES",
        "description": "PUNTA DE ANCA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-50",
        "name": "PUNTA DE ANCA",
        "price": 50000,
        "category": "PLATOS_FUERTES",
        "description": "PUNTA DE ANCA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-50",
        "name": "PUNTA DE ANCA",
        "price": 50000,
        "category": "PLATOS_FUERTES",
        "description": "PUNTA DE ANCA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-51",
        "name": "COSTILLAS DE CERDO",
        "price": 47000,
        "category": "PLATOS_FUERTES",
        "description": "COSTILLAS DE CERDO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-51",
        "name": "COSTILLAS DE CERDO",
        "price": 47000,
        "category": "PLATOS_FUERTES",
        "description": "COSTILLAS DE CERDO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-51",
        "name": "COSTILLAS DE CERDO",
        "price": 47000,
        "category": "PLATOS_FUERTES",
        "description": "COSTILLAS DE CERDO con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-52",
        "name": "AGUILA LIGTH",
        "price": 6000,
        "category": "BEBIDAS",
        "description": "AGUILA LIGTH con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-52",
        "name": "AGUILA LIGTH",
        "price": 6000,
        "category": "BEBIDAS",
        "description": "AGUILA LIGTH con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-52",
        "name": "AGUILA LIGTH",
        "price": 6000,
        "category": "BEBIDAS",
        "description": "AGUILA LIGTH con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-53",
        "name": "TRUCHA",
        "price": 45000,
        "category": "PLATOS_FUERTES",
        "description": "TRUCHA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-53",
        "name": "TRUCHA",
        "price": 45000,
        "category": "PLATOS_FUERTES",
        "description": "TRUCHA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-53",
        "name": "TRUCHA",
        "price": 45000,
        "category": "PLATOS_FUERTES",
        "description": "TRUCHA con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    },
    {
        "id": "m-54",
        "name": "CAZUELA DE MARISCOS",
        "price": 60000,
        "category": "PLATOS_FUERTES",
        "description": "CAZUELA DE MARISCOS con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s1"
    },
    {
        "id": "m-s2-54",
        "name": "CAZUELA DE MARISCOS",
        "price": 60000,
        "category": "PLATOS_FUERTES",
        "description": "CAZUELA DE MARISCOS con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s2"
    },
    {
        "id": "m-s3-54",
        "name": "CAZUELA DE MARISCOS",
        "price": 60000,
        "category": "PLATOS_FUERTES",
        "description": "CAZUELA DE MARISCOS con la mejor preparación y sazón tradicional de la casa.",
        "ingredients": [],
        "available": true,
        "sedeId": "s3"
    }
],
  comandas: [
    {
      id: "com-01",
      sedeId: "s1",
      tableNumber: "Mesa 4",
      items: [
        { menuItemId: "m1", name: "Steak Pimienta Gourmet", price: 48900, qty: 1, notes: "Término tres cuartos" },
        { menuItemId: "m4", name: "Limonada de Coco Imperial", price: 9500, qty: 1 }
      ],
      status: "ENTREGADO",
      timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
      waiterId: "u4",
      subtotal: 58400,
      tax: 4672,
      total: 63072
    },
    {
      id: "com-02",
      sedeId: "s1",
      tableNumber: "Mesa 10",
      items: [
        { menuItemId: "m2", name: "Bowl de Pollo y Aguacate Hass", price: 29900, qty: 2, notes: "Sin cebolla" },
        { menuItemId: "m3", name: "Empanaditas de Queso Hilado (4 Uds)", price: 14500, qty: 1 }
      ],
      status: "COCINANDO",
      timestamp: new Date().toISOString(),
      waiterId: "u4",
      subtotal: 74300,
      tax: 5944,
      total: 80244
    }
  ],
  domicilios: [
    {
      id: "dom-101",
      sedeId: "s1",
      customerName: "Juan Sebastian Tobón",
      customerPhone: "+57 311 4452123",
      customerAddress: "Calle 10 sur #35-15, Apt 502, Medellín",
      items: [
        { menuItemId: "m1", name: "Steak Pimienta Gourmet", price: 48900, qty: 2 }
      ],
      deliveryCost: 5500,
      total: 103300,
      status: "DESPACHADO",
      repartidorId: "u4",
      gpsCoordinates: { lat: 6.2085, lng: -75.5670 },
      routeProgress: 65,
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      notes: "Portería principal"
    },
    {
      id: "dom-102",
      sedeId: "s1",
      customerName: "Adriana Maria Restrepo",
      customerPhone: "+57 315 8894125",
      customerAddress: "Transversal 39 #74B-44, Medellín",
      items: [
        { menuItemId: "m2", name: "Bowl de Pollo y Aguacate Hass", price: 29900, qty: 1 },
        { menuItemId: "m4", name: "Limonada de Coco Imperial", price: 9500, qty: 1 }
      ],
      deliveryCost: 4000,
      total: 43400,
      status: "PREPARANDO",
      timestamp: new Date().toISOString(),
      notes: "Tocar el timbre del portón blanco"
    }
  ],
  reservas: [
    { id: "res-01", sedeId: "s1", customerName: "Felipe Calderón", customerPhone: "+57 322 8854125", date: "2026-07-06", time: "19:30", guests: 4, tableNumber: "Mesa 12", status: "RESERVADO" },
    { id: "res-02", sedeId: "s1", customerName: "Camila Velez", customerPhone: "+57 301 9965412", date: "2026-07-06", time: "20:00", guests: 2, tableNumber: "Mesa 2", status: "RESERVADO" }
  ],
  gastos: [
    { id: "gas-01", sedeId: "s1", description: "Compra de empaques biodegradables para domicilios", category: "MATERIA_PRIMA", amount: 450000, timestamp: new Date(Date.now() - 86400000).toISOString(), receiptNumber: "FAC-9914" },
    { id: "gas-02", sedeId: "s1", description: "Pago mensual internet fibra óptica Claro", category: "SERVICIOS", amount: 189000, timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), receiptNumber: "SERV-8821" }
  ],
  invoices: [
    {
      id: "inv-2001",
      invoiceNumber: "FE-DIAN-00001",
      sedeId: "s1",
      orderId: "com-01",
      customerName: "Juan Sebastian Tobón",
      customerDocument: "1035412855",
      items: [
        { name: "Steak Pimienta Gourmet", qty: 1, price: 48900, subtotal: 48900 },
        { name: "Limonada de Coco Imperial", qty: 1, price: 9500, subtotal: 9500 }
      ],
      subtotal: 58400,
      tax: 4672,
      tip: 6000,
      total: 69072,
      payments: [{ method: "TARJETA_DEBITO", amount: 69072 }],
      electronicResolution: "Resolución DIAN 187640251 del 2026-01-01 (Rango FE-01 a FE-99999)",
      xmlHash: "7b4ca2f6a9e10dcf2547b93816ee34db95c252cb778ea1f4",
      qrCodeData: "https://factura.dian.gov.co/validador?cufe=7b4ca2f6a9e10dcf25&total=69072&resol=187640251",
      timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString(),
      status: "VALIDADO_DIAN"
    }
  ],
  waiterBitacoras: [
    { id: "bit-01", waiterId: "u4", waiterName: "Sofia Castro", sedeId: "s1", date: "2026-07-05", shift: "DIURNO", tipsCollected: 120000, incidents: "Sin novedades en el servicio, excelente rotación de mesas.", rating: 5 },
    { id: "bit-02", waiterId: "u4", waiterName: "Sofia Castro", sedeId: "s1", date: "2026-07-06", shift: "DIURNO", tipsCollected: 95000, incidents: "Mesa 5 derramó una bebida de coco, se limpió de inmediato.", rating: 4 }
  ],
  hrColaboradores: [
    { id: "hr-01", name: "Sofia Castro", role: "Mesera Profesional", salary: 1400000, contractType: "INDEFINIDO", startDate: "2025-02-15", kpiRating: 4.8, attendancePct: 98.5, payrollStatus: "PAGADO" },
    { id: "hr-02", name: "Juan David", role: "Chef Ejecutivo de Cocina", salary: 2800000, contractType: "INDEFINIDO", startDate: "2024-11-01", kpiRating: 4.6, attendancePct: 95.0, payrollStatus: "PAGADO" },
    { id: "hr-03", name: "Mateo Pérez", role: "Cajero de Sede", salary: 1350000, contractType: "TERMINO_FIJO", startDate: "2025-05-10", kpiRating: 4.5, attendancePct: 100.0, payrollStatus: "PENDING" }
  ],
  securityLogs: [
    { id: "sec-01", timestamp: new Date(Date.now() - 7200000).toISOString(), ip: "190.143.15.22", emailAttempted: "admin_malicioso@aurora.com", sedeId: "s1", type: "FAILED_LOGIN", details: "Intento fallido de login - Contraseña errónea. Bloqueo temporal de IP por 15 minutos activado.", severity: "MEDIUM" },
    { id: "sec-02", timestamp: new Date(Date.now() - 3600000).toISOString(), ip: "181.44.112.55", emailAttempted: "unknown@gmail.com", sedeId: "s2", type: "XSS_FILTER", details: "Ataque XSS sanitizado con éxito en campo 'búsqueda'. Detectado tag <script> bloqueado inmediatamente.", severity: "HIGH" }
  ],
  cierreCajas: [
    { id: "z-01", sedeId: "s1", date: "2026-07-05", openedBy: "Mateo Pérez", closedBy: "Carlos Mendoza", openingCash: 150000, expectedCash: 752000, actualCash: 752000, cardSales: 890000, transferSales: 420000, totalExpenses: 150000, difference: 0, totalSales: 2062000, timestamp: new Date(Date.now() - 86400000).toISOString(), reportZCode: "Z-20260705-S1-A92" }
  ],
  cushion: {
    retainedEarnings: 12500000, // COP 12.5M as reserve buffer
    cushionTarget: 25000000, // COP 25M
    activeBufferAmount: 12500000,
    cushionHistory: [
      { id: "ch-01", timestamp: new Date(Date.now() - 86400000 * 5).toISOString(), action: "INYECCION_RESERVA", amount: 1500000, description: "Aporte del 15% de utilidad libre del periodo de Junio", balanceAfter: 12500000 }
    ]
  }
};

// Database Read/Write Helpers
let memoryState: any = null;

async function loadState(): Promise<any> {
  // If PostgreSQL is available, fetch state from database
  if (pool) {
    try {
      const res = await pool.query("SELECT data FROM aurora_state WHERE id = 'main'");
      if (res.rows.length > 0) {
        memoryState = res.rows[0].data;
        return memoryState;
      }
      // Seeding database with initial default/local state
      console.log("No se encontró estado en PostgreSQL, buscando copia local de respaldo...");
      let initialState = DEFAULT_STATE;
      if (fs.existsSync(DB_FILE)) {
        try {
          initialState = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
        } catch (e) {
          console.error("Copia local dañada, usando DEFAULT_STATE:", e);
        }
      }
      await pool.query(
        "INSERT INTO aurora_state (id, data) VALUES ('main', $1) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data",
        [initialState]
      );
      memoryState = initialState;
      return memoryState;
    } catch (err) {
      console.error("Error al cargar estado de PostgreSQL, usando respaldo local:", err);
    }
  }

  // Fallback to reading local JSON database
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      memoryState = JSON.parse(raw);
      return memoryState;
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_STATE, null, 2), "utf-8");
    memoryState = DEFAULT_STATE;
    return memoryState;
  } catch (err) {
    console.error("No se pudo leer la base de datos local, usando por defecto:", err);
    return memoryState || DEFAULT_STATE;
  }
}

async function saveState(state: any): Promise<void> {
  memoryState = state;

  // Asynchronously save to PostgreSQL if available
  if (pool) {
    pool.query(
      "INSERT INTO aurora_state (id, data) VALUES ('main', $1) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()",
      [state]
    ).catch((err: any) => {
      console.error("Error asíncrono al guardar estado en PostgreSQL:", err);
    });
  }

  // Local JSON database file fallback backup
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("No se pudo escribir la base de datos local:", err);
  }
}

// Security Check Middleware
app.use(async (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    const stringified = JSON.stringify(req.body);
    const attack = detectAttackAttempt(stringified);
    if (attack.detected) {
      const state = await loadState();
      const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
      const newLog = {
        id: `sec-attack-${Date.now()}`,
        timestamp: new Date().toISOString(),
        ip: Array.isArray(ip) ? ip[0] : String(ip),
        type: attack.type as any,
        details: `Ciberseguridad Aurora Shield: Bloqueado payload malicioso con firma ${attack.type}. Body: ${stringified.substring(0, 150)}...`,
        severity: attack.severity
      };
      state.securityLogs.unshift(newLog);
      await saveState(state);
      
      return res.status(403).json({
        error: "Bloqueado por Aurora Shield v4.5 (Filtro de inyección activa detectado)",
        logId: newLog.id
      });
    }
  }
  next();
});

// API Routes
// Proxy requests to Python FastAPI server on port 8001
app.all("/api/python/*", async (req, res) => {
  const targetUrl = `http://127.0.0.1:8001${req.originalUrl.replace("/api/python", "")}`;
  try {
    const hasBody = !["GET", "HEAD"].includes(req.method);
    const fetchOptions: any = {
      method: req.method,
      headers: {
        "Content-Type": "application/json"
      }
    };
    if (hasBody) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get("content-type") || "";

    // Forward headers
    if (contentType) {
      res.setHeader("content-type", contentType);
    }
    const contentDisposition = response.headers.get("content-disposition");
    if (contentDisposition) {
      res.setHeader("content-disposition", contentDisposition);
    }

    // Check if it is binary file or text
    if (contentType.includes("application/octet-stream") || contentType.includes("application/pdf") || contentType.includes("sheet") || contentType.includes("excel")) {
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } else {
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        res.status(response.status).json(json);
      } catch (e) {
        res.status(response.status).send(text);
      }
    }
  } catch (err: any) {
    console.error("Proxy error to Python server:", err);
    res.status(502).json({
      error: "Servidor backend de Python desconectado",
      details: "No se pudo conectar con el servidor de Python en el puerto 8001. Asegúrate de que el módulo de FastAPI de Grocer OS esté iniciado.",
      message: err.message
    });
  }
});

app.get("/api/state", async (req, res) => {
  const state = await loadState();
  res.json(state);
});

// Expose ticket list
app.get("/api/printed-tickets", (req, res) => {
  const sedeId = req.query.sedeId as string;
  if (!sedeId) {
    return res.json(printedTickets);
  }
  res.json(printedTickets.filter(t => t.sedeId === sedeId));
});

// Clear printed tickets endpoint for convenience
app.post("/api/printed-tickets/clear", (req, res) => {
  const { sedeId } = req.body;
  if (sedeId) {
    printedTickets = printedTickets.filter(t => t.sedeId !== sedeId);
  } else {
    printedTickets = [];
  }
  res.json({ success: true });
});

// Universal Action endpoint for state mutations
app.post("/api/action", async (req, res) => {
  const { action, payload } = req.body;
  if (!action) {
    return res.status(400).json({ error: "No action specified" });
  }

  const state = await loadState();

  try {
    switch (action) {
      case "LOGIN": {
        const { email, password } = payload;
        if (email === "admin@aurora.com" && password === "admin") {
          return res.json({
            user: {
              id: "u1",
              name: "Carlos Mendoza",
              email: "admin@aurora.com",
              role: "ADMIN",
              sedeId: "s1",
              active: true,
              twoFactorEnabled: true
            }
          });
        }
        const matchedUser = state.users.find((u: any) => u.email === email);
        if (matchedUser && password === "admin") {
          return res.json({
            user: matchedUser
          });
        }
        return res.status(401).json({ error: "Credenciales inválidas" });
      }
      case "REGISTER_USER": {
        const { email, password, tempKey } = payload;
        const whitelistMatch = state.whitelistedUsers.find((w: any) => w.tempKey === tempKey);
        if (!whitelistMatch) {
          return res.status(400).json({ error: "Clave de Lista Blanca inválida." });
        }
        const newUser = {
          id: `u-${Date.now()}`,
          name: email.split("@")[0],
          email,
          role: whitelistMatch.role,
          sedeId: whitelistMatch.sedeId,
          active: true,
          twoFactorEnabled: false
        };
        state.users.push(newUser);
        await saveState(state);
        return res.json({ success: true, user: newUser });
      }
      case "RECORD_FAILED_LOGIN": {
        const ip = req.ip || "190.142.10.85";
        state.securityLogs.unshift({
          id: `sec-fail-${Date.now()}`,
          timestamp: new Date().toISOString(),
          ip: Array.isArray(ip) ? ip[0] : String(ip),
          emailAttempted: payload.email,
          sedeId: "s1",
          type: "FAILED_LOGIN",
          details: `Intento de login fallido para: ${payload.email}. Motivo: ${payload.details || 'Contraseña errónea'}.`,
          severity: "MEDIUM"
        });
        await saveState(state);
        break;
      }
      case "ADD_USER": {
        state.users.push(payload);
        break;
      }
      case "EDIT_USER": {
        state.users = state.users.map((u: any) => u.id === payload.id ? { ...u, ...payload } : u);
        break;
      }
      case "ADD_WHITELIST": {
        state.whitelistedUsers.push(payload);
        break;
      }
      case "REMOVE_WHITELIST": {
        state.whitelistedUsers = state.whitelistedUsers.filter((w: any) => w.id !== payload.id);
        break;
      }
      case "ADD_SEDE": {
        state.sedes.push(payload);
        break;
      }
      case "EDIT_SEDE_LICENSE": {
        state.sedes = state.sedes.map((s: any) => s.id === payload.id ? { ...s, licenseStatus: payload.licenseStatus, licenseExpiry: payload.licenseExpiry } : s);
        break;
      }
      case "RECORD_BAD_LOGIN": {
        const ip = req.ip || "127.0.0.1";
        state.securityLogs.unshift({
          id: `sec-fail-${Date.now()}`,
          timestamp: new Date().toISOString(),
          ip: Array.isArray(ip) ? ip[0] : String(ip),
          emailAttempted: payload.email,
          sedeId: payload.sedeId,
          type: "FAILED_LOGIN",
          details: `Intento de inicio de sesión sospechoso. Origen: ${payload.origin || 'Fuerza bruta simulada'}.`,
          severity: "MEDIUM"
        });
        break;
      }
      case "LOG_SECURITY_EVENT": {
        state.securityLogs.unshift(payload);
        break;
      }
      case "CREATE_COMANDA": {
        // Deplete inventory stocks automatically!
        payload.items.forEach((ordered: any) => {
          const menuId = ordered.menuItemId;
          const menuObj = state.menuItems.find((m: any) => m.id === menuId);
          if (menuObj && menuObj.ingredients) {
            menuObj.ingredients.forEach((ing: any) => {
              const insumo = state.insumos.find((i: any) => i.id === ing.insumoId);
              if (insumo) {
                insumo.stock = Math.max(0, parseFloat((insumo.stock - (ing.qty * ordered.qty)).toFixed(2)));
              }
            });
          }
        });
        state.comandas.push(payload);
        break;
      }
      case "UPDATE_COMANDA": {
        state.comandas = state.comandas.map((c: any) => {
          if (c.id === payload.id) {
            return {
              ...c,
              items: payload.items,
              subtotal: payload.subtotal,
              tax: payload.tax,
              total: payload.total,
              status: payload.status || c.status
            };
          }
          return c;
        });
        break;
      }
      case "UPDATE_COMANDA_STATUS": {
        state.comandas = state.comandas.map((c: any) => c.id === payload.id ? { ...c, status: payload.status } : c);
        break;
      }
      case "CREATE_DOMICILIO": {
        state.domicilios.push(payload);
        break;
      }
      case "UPDATE_DOMICILIO_STATUS": {
        state.domicilios = state.domicilios.map((d: any) => {
          if (d.id === payload.id) {
            return { ...d, ...payload };
          }
          return d;
        });
        break;
      }
      case "CREATE_RESERVA": {
        state.reservas.push(payload);
        break;
      }
      case "UPDATE_RESERVA_STATUS": {
        state.reservas = state.reservas.map((r: any) => r.id === payload.id ? { ...r, status: payload.status } : r);
        break;
      }
      case "ADD_INSUMO": {
        state.insumos.push(payload);
        break;
      }
      case "UPDATE_INSUMO_STOCK": {
        state.insumos = state.insumos.map((i: any) => i.id === payload.id ? { ...i, stock: payload.stock } : i);
        break;
      }
      case "BULK_UPDATE_INSUMOS": {
        // Excel/paste bulk synchronization
        payload.forEach((item: any) => {
          const idx = state.insumos.findIndex((i: any) => i.sku === item.sku);
          if (idx >= 0) {
            state.insumos[idx].stock = item.stock;
            state.insumos[idx].costPrice = item.costPrice;
          } else {
            // Create brand new insumo in database
            state.insumos.push({
              id: `ins-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              ...item
            });
          }
        });
        break;
      }
      case "ADD_GASTO": {
        state.gastos.push(payload);
        break;
      }
      case "RECORD_INVOICE": {
        state.invoices.push(payload);
        break;
      }
      case "UPDATE_CUSHION": {
        // Aurora Cushion transfer
        state.cushion.retainedEarnings = payload.retainedEarnings;
        state.cushion.activeBufferAmount = payload.retainedEarnings;
        state.cushion.cushionHistory.unshift(payload.historyItem);
        break;
      }
      case "RECORD_WAITER_BITACORA": {
        state.waiterBitacoras.push(payload);
        break;
      }
      case "RECORD_HR_PAYROLL": {
        state.hrColaboradores = state.hrColaboradores.map((col: any) => col.id === payload.id ? { ...col, payrollStatus: payload.payrollStatus } : col);
        break;
      }
      case "RECORD_CIERRE_CAJA": {
        state.cierreCajas.push(payload);
        // Clear completed orders/domicilios to simulate day cycle reset but keep histories
        break;
      }
      default:
        return res.status(400).json({ error: `Acción desconocida: ${action}` });
    }

    await saveState(state);

    // Real-Time WebSockets Orchestration & Thermal Printing
    if (action === "CREATE_COMANDA") {
      const waiter = state.users.find((u: any) => u.id === payload.waiterId);
      const waiterName = waiter ? waiter.name : (payload.waiterName || "Mesero");
      
      // Generate Thermal Ticket Content
      const ticketContent = generateThermalTicket(payload, waiterName);
      const ticketObj = {
        id: `tkt-${Date.now()}`,
        comandaId: payload.id,
        sedeId: payload.sedeId,
        content: ticketContent,
        timestamp: new Date().toISOString()
      };
      printedTickets.unshift(ticketObj);
      
      // Broadcast events to all clients in the same Sede
      broadcastToSede(payload.sedeId, {
        type: "NEW_COMANDA",
        comanda: payload,
        ticket: ticketObj
      });
    } else if (action === "UPDATE_COMANDA_STATUS") {
      const com = state.comandas.find((c: any) => c.id === payload.id);
      if (com) {
        // Broadcast comanda update
        broadcastToSede(com.sedeId, {
          type: "COMANDA_STATUS_UPDATED",
          id: com.id,
          status: payload.status,
          tableNumber: com.tableNumber,
          waiterId: com.waiterId
        });
        
        // If status became LISTO, alert the waiter
        if (payload.status === "LISTO") {
          broadcastToSede(com.sedeId, {
            type: "ORDER_READY",
            id: com.id,
            tableNumber: com.tableNumber,
            waiterId: com.waiterId
          });
        }
      }
    }

    res.json({ success: true, message: `Acción ${action} ejecutada exitosamente` });
  } catch (error: any) {
    console.error("Error al mutar el estado de Aurora:", error);
    res.status(500).json({ error: error.message || "Error interno de Aurora Server" });
  }
});

// Gemini Assistant endpoint for complex calculations & predictions
app.post("/api/ai/command", async (req, res) => {
  const { command, context } = req.body;
  if (!command) {
    return res.status(400).json({ error: "Debe proveer un comando para Cero Command Assistant" });
  }

  try {
    const ai = getGeminiClient();
    const systemInstruction = `
      Eres el motor inteligente "Cero Command" integrado en Aurora OS, un sistema operativo gastronómico para restaurantes.
      Cuentas con toda la información en tiempo real de inventarios, ventas, seguridad de red y colaboradores.
      
      Debes actuar con alta precisión técnica de analista financiero de restaurantes y experto en seguridad informática.
      
      Estructura tu respuesta en tres secciones claras usando Markdown con elegantes títulos e íconos:
      1. 🧠 ANÁLISIS PREDICTIVO (Predice anomalías de inventario de acuerdo al stock actual y simula la demanda para las próximas sedes)
      2. 🛡️ RECOMENDACIONES DE CIBERSEGURIDAD (Revisa intentos de ataque previos o vulnerabilidades que detectes en el contexto del sistema)
      3. 📈 SALUD FINANCIERA (Opina brevemente sobre el uso del "Colchón Contable de Aurora OS" - el fondo de reserva)

      Sé conciso pero muy detallado con números ficticios, y exprésate en español latino elegante y profesional.
    `;

    const prompt = `
      Comando del Usuario: "${command}"
      
      Contexto de Datos de Aurora OS:
      - Insumos de Inventario: ${JSON.stringify(context.insumos || [])}
      - Historial de Auditoría de Ciberseguridad: ${JSON.stringify(context.securityLogs || [])}
      - Colchón Contable: ${JSON.stringify(context.cushion || {})}
      - Ventas Recientes (Comandas): ${JSON.stringify(context.comandas || [])}
      - Sedes Registradas: ${JSON.stringify(context.sedes || [])}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ text: response.text });
  } catch (err: any) {
    console.error("Gemini Assistant Error:", err);
    // Return high-fidelity fallback reply if API key is not present or error occurs
    const fallbackAnswers = `
### 🧠 ANÁLISIS PREDICTIVO (Cero Command - Modo Offline Seguro)
*Nota: No se detectó una API key activa de Gemini, ejecutando simulación heurística de precisión de Aurora OS.*

1. **Predicción de Ruptura de Stock**:
   - **i1 (Solomito de Res Premium)** está en stock de **12.5 Kg** (Mínimo requerido: **25 Kg**). Se prevé desabastecimiento en **Sede Medellín** en las próximas **24 horas** debido al alto flujo de cenas.
   - **i4 (Queso Doble Crema)** está en stock crítico de **4.2 Kg** (Mínimo requerido: **10 Kg**).
2. **Predicción de Demanda para Mañana**:
   - Se anticipa un incremento del **18%** en platos fuertes cárnicos por el partido de eliminatorias. Recomendación de compras: Adquirir de inmediato **30 Kg** de solomito a *Distribuidora de Carnes El Corral*.

---

### 🛡️ RECOMENDACIONES DE CIBERSEGURIDAD
1. **Auditoría de Logs**:
   - Se detectó un intento fallido de login desde la IP \`190.143.15.22\` el cual fue bloqueado por nuestro escudo de **Rate Limiting**.
   - Se sanitizó una entrada maliciosa tipo **XSS** de forma segura en la sucursal de Bogotá.
2. **Plan de Blindaje Preventivo**:
   - Active la autenticación de doble factor (**2FA**) obligatoria para cajeros y administradores.
   - Restringir inicios de sesión fuera del rango geográfico IP de la sede asignada.

---

### 📈 SALUD FINANCIERA Y COLCHÓN DE AURORA OS
1. **Estado del Colchón Contable**:
   - Saldo de reserva actual: **$12,500,000 COP**.
   - Estado de amortiguación: **Estable**. Este colchón es suficiente para mitigar pérdidas por ausentismo laboral o fluctuaciones de precio de insumos de hasta un **14%** mensual.
2. **Recomendación Contable**:
   - Dado el superávit operativo del POS de hoy, se sugiere desviar **$350,000 COP** adicionales al colchón de reserva para acelerar la meta de **$25,000,000 COP**.
    `;
    res.json({ text: fallbackAnswers, note: "Generado vía módulo heurístico seguro integrado." });
  }
});

// Create HTTP server of Node
const server = http.createServer(app);

// WebSocket Server upgrade handling
server.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;
  if (pathname === "/ws") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  }
});

wss.on("connection", (ws: WebSocket) => {
  console.log("WebSocket client connected");
  
  let registeredInfo: { userId?: string; role?: string; sedeId?: string } = {};

  ws.on("message", (messageStr: string) => {
    try {
      const msg = JSON.parse(messageStr);
      if (msg.type === "REGISTER") {
        registeredInfo = {
          userId: msg.userId,
          role: msg.role,
          sedeId: msg.sedeId
        };
        // Add or update in active clients list
        activeClients = activeClients.filter(c => c.ws !== ws);
        activeClients.push({
          ws,
          ...registeredInfo
        });
        console.log(`Client registered: User ${msg.userId}, Role ${msg.role}, Sede ${msg.sedeId}`);
        // Send confirmation back
        ws.send(JSON.stringify({ type: "REGISTER_CONFIRMED", userId: msg.userId }));
      } else if (msg.type === "PING") {
        ws.send(JSON.stringify({ type: "PONG" }));
      }
    } catch (err) {
      console.error("Error processing websocket message:", err);
    }
  });

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
    activeClients = activeClients.filter(c => c.ws !== ws);
  });
});

// Initialize PostgreSQL schema table
async function initDatabaseSchema() {
  if (!pool) return;
  try {
    console.log("Verificando tabla aurora_state en base de datos PostgreSQL (Supabase)...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS aurora_state (
        id VARCHAR(50) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Tabla aurora_state verificada o creada con éxito.");
  } catch (err) {
    console.error("Error al inicializar el esquema de la base de datos PostgreSQL:", err);
  }
}

// Configure Vite middleware in development environment, serve static assets in production
async function startServer() {
  // Initialize PostgreSQL schema if configured
  await initDatabaseSchema();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Spawn Python FastAPI server as background child process
  try {
    const { spawn } = await import("child_process");
    console.log("Iniciando subproceso del backend de Python FastAPI (Grocer OS)...");
    const pythonProcess = spawn("python3", ["backend_python/inventario_cierre_app.py"], {
      stdio: "inherit",
      shell: true
    });
    pythonProcess.on("error", (err) => {
      console.error("Fallo al iniciar el servidor de Python:", err);
    });
    pythonProcess.on("close", (code) => {
      console.log(`El proceso de Python terminó con código: ${code}`);
    });
  } catch (err) {
    console.error("Error al spawnear el proceso de Python:", err);
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Aurora OS Server con WebSockets ejecutándose de forma segura en el puerto ${PORT}`);
  });
}

startServer();
