# -*- coding: utf-8 -*-
"""
Grocer OS - Módulo de Inventario, Ventas por Canal y Cierre de Caja con Notificaciones
Desarrollado para: Pruebas de Envío de Reportes Diarios (Excel y PDF)
Stack: FastAPI, SQLAlchemy, SQLite, ReportLab (PDF), Pandas/OpenPyXL (Excel)
Autor: Arquitecto de Software Full-Stack Senior
"""

import os
import sys
import smtplib
import sqlite3
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker, Session

# =====================================================================
# 1. CONFIGURACIÓN DE BASE DE DATOS SQLITE Y ORM (SQLAlchemy)
# =====================================================================
DATABASE_URL = "sqlite:///./grocer_os_inventory.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Producto(Base):
    """
    Tabla de Productos. Distingue productos Críticos (control de stock estricto)
    de Acompañamientos Estadísticos (no restan stock, solo acumulan ventas).
    """
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(10), unique=True, index=True, nullable=False)
    nombre = Column(String(150), nullable=False)
    precio = Column(Float, nullable=False)
    es_critico = Column(Boolean, default=True)  # True = Proteína/Bebida, False = Acompañamiento
    categoria = Column(String(50), nullable=False)  # PROTEINAS, BEBIDAS, ACOMPANAMIENTOS, SOPAS
    stock_inicial = Column(Float, default=100.0)
    stock_actual = Column(Float, default=100.0)

    ventas = relationship("VentaDiaria", back_populates="producto")


class ConfiguracionNotificaciones(Base):
    """
    Guarda las credenciales y canales de destino (email y teléfono de prueba).
    """
    __tablename__ = "configuracion_notificaciones"

    id = Column(Integer, primary_key=True, index=True)
    email_destino = Column(String(150), nullable=False, default="prueba_gerente@grocer.com")
    telefono_destino = Column(String(20), nullable=False, default="+573001234567")
    smtp_server = Column(String(100), default="smtp.gmail.com")
    smtp_port = Column(Integer, default=587)
    smtp_user = Column(String(100), default="reportes@grocer.com")
    smtp_password = Column(String(100), default="contraseña_segura_smtp")


class VentaDiaria(Base):
    """
    Registra las ventas diarias diferenciando el origen (Salón vs Domicilio).
    """
    __tablename__ = "ventas_diarias"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id", ondelete="CASCADE"), nullable=False)
    cantidad_salon = Column(Integer, default=0)
    cantidad_domicilio = Column(Integer, default=0)
    fecha = Column(Date, default=datetime.utcnow().date)

    producto = relationship("Producto", back_populates="ventas")


class CierreCaja(Base):
    """
    Almacena los totales calculados por cada cierre de caja diario.
    """
    __tablename__ = "cierres_caja"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, default=datetime.utcnow().date, unique=True)
    total_recaudado = Column(Float, default=0.0)
    total_salon = Column(Float, default=0.0)
    total_domicilio = Column(Float, default=0.0)
    reporte_excel_path = Column(String(255), nullable=True)
    reporte_pdf_path = Column(String(255), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Inyectar la configuración de notificaciones por defecto si no existe
        if db.query(ConfiguracionNotificaciones).count() == 0:
            config = ConfiguracionNotificaciones(
                email_destino="test_manager@restaurant.com",
                telefono_destino="+573159998877"
            )
            db.add(config)
            db.commit()

        # Inyectar los 54 productos reales con precios reales si la tabla está vacía
        if db.query(Producto).count() == 0:
            productos_iniciales = [
                # Código, Nombre, Precio, Es Crítico (Proteína/Bebida), Categoría
                ("01", "POLLO ASADO", 45000.0, True, "PROTEINAS"),
                ("02", "1/2 POLLO ASADO", 25000.0, True, "PROTEINAS"),
                ("03", "1/4 POLLO ASADO", 14500.0, True, "PROTEINAS"),
                ("04", "POLLO BROASTER", 47000.0, True, "PROTEINAS"),
                ("05", "1/2 POLLO BROASTER", 27000.0, True, "PROTEINAS"),
                ("06", "1/4 POLLO BROASTER", 15500.0, True, "PROTEINAS"),
                ("07", "PAPA FRANCESA", 10000.0, False, "ACOMPANAMIENTOS"),
                ("08", "PORCION DE YUCA", 10000.0, False, "ACOMPANAMIENTOS"),
                ("09", "PORCION PAPA SALADA", 7500.0, False, "ACOMPANAMIENTOS"),
                ("10", "PORCION PATACON", 10000.0, False, "ACOMPANAMIENTOS"),
                ("11", "VIUDO DE CAPAZ", 52000.0, True, "PROTEINAS"),
                ("12", "PORCION ENSALADA", 9000.0, False, "ACOMPANAMIENTOS"),
                ("13", "PORCION ARROZ", 7000.0, False, "ACOMPANAMIENTOS"),
                ("14", "PORCION AREPA", 5000.0, False, "ACOMPANAMIENTOS"),
                ("15", "BANDEJA BROASTER", 34000.0, True, "PROTEINAS"),
                ("16", "CARNE ASADA", 44000.0, True, "PROTEINAS"),
                ("17", "PECHUGA A LA PLANCHA", 45000.0, True, "PROTEINAS"),
                ("18", "BANDEJA CON POLLO ASADO", 33000.0, True, "PROTEINAS"),
                ("19", "ARROZ CON POLLO", 36000.0, True, "PROTEINAS"),
                ("20", "MOJARRA", 49000.0, True, "PROTEINAS"),
                ("21", "BAGRE FRITO / SALSA", 52000.0, True, "PROTEINAS"),
                ("22", "CLUB COLOMBIA", 7000.0, True, "BEBIDAS"),
                ("23", "SOPA MENUDENCIAS", 13500.0, False, "SOPAS"),
                ("24", "COLA Y POLA / MALTA", 5000.0, True, "BEBIDAS"),
                ("25", "CERVEZA BOTELLA", 6000.0, True, "BEBIDAS"),
                ("26", "PIEDRITAS PICANTES", 15000.0, False, "ACOMPANAMIENTOS"),
                ("27", "GASEOSA 350 ML", 5000.0, True, "BEBIDAS"),
                ("28", "POSTRES", 9500.0, False, "ACOMPANAMIENTOS"),
                ("29", "CHURRASCO", 50000.0, True, "PROTEINAS"),
                ("30", "GASEOSA 2.5 LTS", 13500.0, True, "BEBIDAS"),
                ("31", "LIMONADA NATURAL", 7000.0, True, "BEBIDAS"),
                ("32", "GASEOSA 1.65 LTS", 9500.0, True, "BEBIDAS"),
                ("33", "AGUA BOTELLA", 5500.0, True, "BEBIDAS"),
                ("34", "1/2 SOPA DE MENUDENCIA", 9500.0, False, "SOPAS"),
                ("35", "1/2 SOPA DE ARROZ", 9500.0, False, "SOPAS"),
                ("36", "SOPA MENUDENCIA LLEVAR", 14500.0, False, "SOPAS"),
                ("37", "SOPA ARROZ CON CALLO LLEVAR", 14500.0, False, "SOPAS"),
                ("38", "MADURO", 10000.0, False, "ACOMPANAMIENTOS"),
                ("39", "ALITAS PICANTES", 18000.0, True, "PROTEINAS"),
                ("40", "COMBO 1", 63000.0, True, "PROTEINAS"),
                ("41", "COMBO 2", 65000.0, True, "PROTEINAS"),
                ("42", "SOPA DE ARROZ CON CALLO", 13500.0, False, "SOPAS"),
                ("43", "JUGO EN AGUA", 9000.0, True, "BEBIDAS"),
                ("44", "JUGO EN LECHE", 10000.0, True, "BEBIDAS"),
                ("45", "TE", 5500.0, True, "BEBIDAS"),
                ("46", "GASEOSA FLEXI 400 ML", 5500.0, True, "BEBIDAS"),
                ("47", "SOBREBARRIGA", 47000.0, True, "PROTEINAS"),
                ("48", "JUGO DEL VALLE", 5500.0, True, "BEBIDAS"),
                ("49", "COMBO MIXTO", 65000.0, True, "PROTEINAS"),
                ("50", "PUNTA DE ANCA", 50000.0, True, "PROTEINAS"),
                ("51", "COSTILLAS DE CERDO", 47000.0, True, "PROTEINAS"),
                ("52", "AGUILA LIGTH", 6000.0, True, "BEBIDAS"),
                ("53", "TRUCHA", 45000.0, True, "PROTEINAS"),
                ("54", "CAZUELA DE MARISCOS", 60000.0, True, "PROTEINAS")
            ]

            for cod, nom, pre, crit, cat in productos_iniciales:
                prod = Producto(
                    codigo=cod,
                    nombre=nom,
                    precio=pre,
                    es_critico=crit,
                    categoria=cat,
                    stock_inicial=150.0 if crit else 0.0,
                    stock_actual=150.0 if crit else 0.0
                )
                db.add(prod)
            db.commit()
            print("[DB] 54 Productos cargados exitosamente.")
    finally:
        db.close()


# =====================================================================
# 2. ESQUEMAS DE VALIDACIÓN PYDANTIC (FastAPI)
# =====================================================================
class ConfigNotifRequest(BaseModel):
    email_destino: str = Field(..., example="gerente@grocer.com")
    telefono_destino: str = Field(..., example="+573155556677")
    smtp_server: Optional[str] = "smtp.gmail.com"
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = "notificaciones@grocer.com"
    smtp_password: Optional[str] = "password"

class VentaPruebaRequest(BaseModel):
    codigo_producto: str = Field(..., example="01")
    cantidad_salon: int = Field(default=0, ge=0)
    cantidad_domicilio: int = Field(default=0, ge=0)
    fecha: Optional[str] = None  # Formato YYYY-MM-DD, por defecto hoy

class CierreFisicoItem(BaseModel):
    codigo_producto: str
    conteo_fisico: float

class CierreCajaRequest(BaseModel):
    conteos_fisicos: List[CierreFisicoItem] = Field(
        default=[], 
        description="Lista opcional de conteos físicos de productos críticos para calcular mermas."
    )
    forzar_envio_smtp: bool = Field(
        default=False, 
        description="Indica si se debe intentar realizar un envío SMTP real (fallará con placeholders si no se configuran)."
    )


# =====================================================================
# 3. FASTAPI INSTANCIA & CONFIGURACIÓN
# =====================================================================
app = FastAPI(
    title="Grocer OS - Backend Core de Inventario y Cierre de Caja",
    description="Motor central de cálculo de mermas, inventario crítico, segmentación por canal y cierres diarios."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =====================================================================
# 4. FUNCIONES DE GENERACIÓN DE REPORTES (Tolerancia a fallas)
# =====================================================================

def generar_excel_cierre(datos_inventario: List[dict], datos_ventas: List[dict], fecha_str: str) -> str:
    """
    Genera el reporte de cierre en Excel. Usa pandas/openpyxl si está instalado;
    de lo contrario, genera un archivo CSV estructurado con codificación compatible.
    """
    filename = f"cierre_inventario_{fecha_str}.xlsx"
    
    # Intentar usar Pandas
    try:
        import pandas as pd
        
        # Hojas de Datos
        df_inv = pd.DataFrame(datos_inventario)
        df_ventas = pd.DataFrame(datos_ventas)
        
        with pd.ExcelWriter(filename, engine='openpyxl') as writer:
            df_inv.to_excel(writer, sheet_name="Control de Inventario", index=False)
            df_ventas.to_excel(writer, sheet_name="Ventas Diarias", index=False)
            
        print(f"[REPORTE] Excel real generado: {filename}")
        return filename
    except ImportError:
        # Fallback a un archivo CSV estructurado que se abre directamente en Excel como pestaña
        fallback_filename = f"cierre_inventario_{fecha_str}.csv"
        try:
            import csv
            with open(fallback_filename, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f, delimiter=";")
                # Sección de Inventario
                writer.writerow(["=== SECCIÓN 1: CONTROL DE INVENTARIO (PRODUCTOS CRÍTICOS) ==="])
                writer.writerow(["Código", "Nombre", "Categoría", "Stock Inicial", "Ventas Totales", "Stock Teórico", "Conteo Físico", "Diferencia/Merma", "Crítico"])
                for row in datos_inventario:
                    writer.writerow([
                        row.get("codigo"), row.get("nombre"), row.get("categoria"),
                        row.get("stock_inicial"), row.get("ventas_totales"), row.get("stock_teorico"),
                        row.get("conteo_fisico"), row.get("diferencia"), row.get("es_critico")
                    ])
                
                writer.writerow([])
                writer.writerow(["=== SECCIÓN 2: VENTAS DIARIAS POR CANAL (HISTÓRICO) ==="])
                writer.writerow(["Código", "Nombre", "Precio Unitario", "Ventas Salón", "Ventas Domicilio", "Unidades Totales", "Total Recaudado (COP)"])
                for row in datos_ventas:
                    writer.writerow([
                        row.get("codigo"), row.get("nombre"), row.get("precio"),
                        row.get("ventas_salon"), row.get("ventas_domicilio"), row.get("total_vendido"),
                        row.get("recaudado")
                    ])
            print(f"[REPORTE] CSV Fallback de Excel generado: {fallback_filename}")
            return fallback_filename
        except Exception as e:
            print(f"Error generando fallback de Excel: {e}")
            # Si todo falla, escribir archivo plano
            with open(fallback_filename, "w") as f:
                f.write(f"Cierre de Caja {fecha_str}\nTotal Recaudado: {sum(x['recaudado'] for x in datos_ventas)}")
            return fallback_filename


def generar_pdf_cierre(datos_inventario: List[dict], datos_ventas: List[dict], resumen: dict, fecha_str: str) -> str:
    """
    Genera un reporte PDF impecable. Usa ReportLab/FPDF si están instalados;
    de lo contrario, genera un reporte plano estructurado de ticket (.txt) que sirve de simulación.
    """
    filename = f"cierre_inventario_{fecha_str}.pdf"
    
    # 1. Intentar con ReportLab
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        
        doc = SimpleDocTemplate(filename, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
        story = []
        styles = getSampleStyleSheet()
        
        # Estilos Personalizados
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=12
        )
        subtitle_style = ParagraphStyle(
            'CustomSubTitle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#475569'),
            spaceAfter=20
        )
        section_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=12,
            textColor=colors.HexColor('#1e3a8a'),
            spaceBefore=15,
            spaceAfter=8
        )
        normal_style = styles['Normal']
        
        # Encabezado
        story.append(Paragraph(f"<b>GROCER OS - REPORTE DE INVENTARIO Y CIERRE DIARIO</b>", title_style))
        story.append(Paragraph(f"Fecha del Reporte: {fecha_str} | Generado: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", subtitle_style))
        story.append(Spacer(1, 10))
        
        # Resumen Financiero
        resumen_html = f"""
        <b>RESUMEN FINANCIERO DE CAJA:</b><br/>
        • <b>Total Recaudado:</b> ${resumen['total_recaudado']:,.2f} COP<br/>
        • <b>Ventas por Salón:</b> ${resumen['total_salon']:,.2f} COP ({resumen['cant_salon_unidades']} unidades)<br/>
        • <b>Ventas por Domicilio:</b> ${resumen['total_domicilio']:,.2f} COP ({resumen['cant_domi_unidades']} unidades)<br/>
        • <b>Canal de Notificación de Envío:</b> {resumen['email_destino']}<br/>
        """
        story.append(Paragraph(resumen_html, normal_style))
        story.append(Spacer(1, 15))
        
        # Tabla de Inventario Crítico
        story.append(Paragraph("<b>CONTROL DE INVENTARIO CRÍTICO (Proteínas y Bebidas)</b>", section_style))
        inv_data = [["Código", "Producto", "Inicial", "Ventas", "Teórico", "Físico", "Merma"]]
        for item in datos_inventario:
            if item["es_critico"]:
                inv_data.append([
                    item["codigo"],
                    item["nombre"][:20],
                    str(item["stock_inicial"]),
                    str(item["ventas_totales"]),
                    str(item["stock_teorico"]),
                    str(item["conteo_fisico"]),
                    str(item["diferencia"])
                ])
                
        t_inv = Table(inv_data, colWidths=[40, 150, 50, 50, 55, 55, 50])
        t_inv.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')])
        ]))
        story.append(t_inv)
        story.append(Spacer(1, 15))
        
        # Tabla de Ventas Principales (Top 10)
        story.append(Paragraph("<b>VENTAS DE PRODUCTOS POR CANAL (Top 10 Productos con Mayor Recaudación)</b>", section_style))
        ventas_ordenadas = sorted(datos_ventas, key=lambda x: x["recaudado"], reverse=True)[:10]
        ventas_data = [["Código", "Producto", "P. Unitario", "Salón", "Domi", "Total Cant", "Recaudado"]]
        for v in ventas_ordenadas:
            ventas_data.append([
                v["codigo"],
                v["nombre"][:20],
                f"${v['precio']:,.0f}",
                str(v["ventas_salon"]),
                str(v["ventas_domicilio"]),
                str(v["total_sold"]),
                f"${v['recaudado']:,.0f}"
            ])
            
        t_vta = Table(ventas_data, colWidths=[40, 150, 60, 45, 45, 55, 65])
        t_vta.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')])
        ]))
        story.append(t_vta)
        
        doc.build(story)
        print(f"[REPORTE] PDF Real generado con ReportLab: {filename}")
        return filename
    except ImportError:
        # Intentar FPDF si ReportLab no está
        try:
            from fpdf import FPDF
            pdf = FPDF()
            pdf.add_page()
            pdf.set_font("Arial", size=11)
            pdf.cell(200, 10, txt="GROCER OS - REPORTE DE INVENTARIO Y CIERRE DIARIO", ln=1, align="C")
            pdf.cell(200, 10, txt=f"Fecha: {fecha_str}", ln=2)
            pdf.cell(200, 10, txt=f"Total Recaudado: ${resumen['total_recaudado']:,.2f} COP", ln=2)
            pdf.output(filename)
            print(f"[REPORTE] PDF Real generado con FPDF: {filename}")
            return filename
        except ImportError:
            # Fallback robusto a un archivo de ticket .txt renombrado a .pdf.txt o simulado
            fallback_pdf_path = f"cierre_inventario_{fecha_str}.pdf.txt"
            with open(fallback_pdf_path, "w", encoding="utf-8") as f:
                f.write(f"========================================================\n")
                f.write(f"      GROCER OS - REPORTE DE INVENTARIO Y CIERRE DIARIO  \n")
                f.write(f"========================================================\n")
                f.write(f"FECHA: {fecha_str}\n")
                f.write(f"IMPRESIÓN: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"--------------------------------------------------------\n")
                f.write(f"RESUMEN DE CIERRE DE CAJA:\n")
                f.write(f"  - TOTAL RECAUDADO:     ${resumen['total_recaudado']:,.2f} COP\n")
                f.write(f"  - VENTAS EN SALÓN:     ${resumen['total_salon']:,.2f} COP ({resumen['cant_salon_unidades']} u)\n")
                f.write(f"  - VENTAS EN DOMICILIO: ${resumen['total_domicilio']:,.2f} COP ({resumen['cant_domi_unidades']} u)\n")
                f.write(f"--------------------------------------------------------\n")
                f.write(f"CONTROL DE PRODUCTOS CRÍTICOS (Proteínas y Bebidas):\n")
                f.write(f"COD   PRODUCTO             INICIAL  VENTAS  TEORICO  FISICO   MERMA\n")
                for item in datos_inventario:
                    if item["es_critico"]:
                        f.write(f"{item['codigo'].ljust(5)}{item['nombre'][:19].ljust(21)}{str(item['stock_inicial']).rjust(7)}{str(item['ventas_totales']).rjust(8)}{str(item['stock_teorico']).rjust(9)}{str(item['conteo_fisico']).rjust(8)}{str(item['diferencia']).rjust(8)}\n")
                f.write(f"--------------------------------------------------------\n")
                f.write(f"ACOMPAÑAMIENTOS ESTADÍSTICOS (Sin Control de Stock):\n")
                f.write(f"COD   PRODUCTO             UNIDADES VENDIDAS\n")
                for item in datos_inventario:
                    if not item["es_critico"] and item["ventas_totales"] > 0:
                        f.write(f"{item['codigo'].ljust(5)}{item['nombre'][:19].ljust(21)}{str(item['ventas_totales']).rjust(10)}\n")
                f.write(f"========================================================\n")
            print(f"[REPORTE] Fallback de PDF (formato ticket TXT) generado: {fallback_pdf_path}")
            return fallback_pdf_path


# =====================================================================
# 5. SISTEMA DE ENVÍO DE PRUEBA (MOCK Y SMTP DETALLADO)
# =====================================================================

def enviar_reporte_email_smtp(
    config: ConfiguracionNotificaciones, 
    excel_path: str, 
    pdf_path: str, 
    fecha_str: str, 
    resumen_text: str,
    forzar: bool = False
) -> dict:
    """
    Intenta enviar un correo electrónico SMTP real si se fuerza y hay configuración válida.
    De lo contrario, simula el envío detallado imprimiendo los logs a consola / respuesta.
    """
    resultado = {
        "metodo": "SMTP_EMAIL",
        "enviado_real": False,
        "correo_destino": config.email_destino,
        "error": None,
        "log_simulacion": ""
    }

    cuerpo_correo = f"""
    Estimado Gerente,

    Adjunto encontrará el Reporte Diario de Cierre de Caja e Inventario para el día {fecha_str}.

    RESUMEN DE LA JORNADA:
    {resumen_text}

    Se adjuntan los siguientes documentos de control:
    1. Reporte de Inventario Crítico e Historial de Ventas (Formato Excel: {excel_path})
    2. Documento de Firma de Cierre Digital (Formato PDF: {pdf_path})

    Atentamente,
    Sistema Automático Grocer OS
    """

    if forzar and config.smtp_user != "reportes@grocer.com" and config.smtp_password != "contraseña_segura_smtp":
        try:
            # Crear Mensaje
            msg = MIMEMultipart()
            msg['From'] = config.smtp_user
            msg['To'] = config.email_destino
            msg['Subject'] = f"Grocer OS: Reporte de Cierre de Caja e Inventario - {fecha_str}"
            msg.attach(MIMEText(cuerpo_correo, 'plain'))

            # Adjuntar Excel
            if os.path.exists(excel_path):
                with open(excel_path, "rb") as attachment:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(attachment.read())
                    encoders.encode_base64(part)
                    part.add_header('Content-Disposition', f"attachment; filename= {os.path.basename(excel_path)}")
                    msg.attach(part)

            # Adjuntar PDF
            if os.path.exists(pdf_path):
                with open(pdf_path, "rb") as attachment:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(attachment.read())
                    encoders.encode_base64(part)
                    part.add_header('Content-Disposition', f"attachment; filename= {os.path.basename(pdf_path)}")
                    msg.attach(part)

            # Enviar por servidor SMTP
            server = smtplib.SMTP(config.smtp_server, config.smtp_port)
            server.starttls()
            server.login(config.smtp_user, config.smtp_password)
            server.sendmail(config.smtp_user, config.email_destino, msg.as_string())
            server.quit()

            resultado["enviado_real"] = True
            resultado["log_simulacion"] = "Correo electrónico real despachado exitosamente mediante SMTP TLS."
            print(f"[ENVÍO] Correo real enviado a {config.email_destino}")
        except Exception as e:
            resultado["error"] = str(e)
            resultado["log_simulacion"] = f"Fallo al enviar correo real (revisar credenciales SMTP). Detalle: {e}"
            print(f"[ENVÍO] Error en correo real: {e}")
    else:
        # Simulación Impecable
        sim_log = f"""
        *** SIMULACIÓN DE ENVÍO DE CORREO SMTP (PLACEHOLDER MOCK) ***
        [SMTP Server] {config.smtp_server}:{config.smtp_port}
        [Remitente Autenticado] {config.smtp_user}
        [Destinatario] {config.email_destino}
        [Asunto] Grocer OS: Reporte de Cierre de Caja e Inventario - {fecha_str}
        [Adjuntos Detectados] 
          - Excel: {excel_path} (Existe: {os.path.exists(excel_path)})
          - PDF: {pdf_path} (Existe: {os.path.exists(pdf_path)})
        [Status] El sistema emuló el canal de correo SMTP de manera exitosa para pruebas de software.
        """
        resultado["log_simulacion"] = sim_log.strip()
        print(resultado["log_simulacion"])

    return resultado


def enviar_notificacion_telefono(config: ConfiguracionNotificaciones, fecha_str: str, resumen_text: str) -> dict:
    """
    Simula de forma detallada el envío de una notificación push, SMS o de WhatsApp de la API de Twilio,
    enviando el resumen financiero e inventario directo al teléfono del administrador.
    """
    resultado = {
        "metodo": "TELEFONO_SMS_WHATSAPP",
        "telefono_destino": config.telefono_destino,
        "plataforma": "Twilio / WhatsApp Business API",
        "contenido_enviado": "",
        "log_simulacion": ""
    }

    mensaje = (
        f"📊 *Grocer OS - CIERRE DIARIO* ({fecha_str})\n"
        f"----------------------------------------\n"
        f"{resumen_text.strip()}\n"
        f"----------------------------------------\n"
        f"📂 Los reportes completos (Excel/PDF) han sido enviados a su correo electrónico.\n"
        f"🔑 ID de Cierre de Seguridad: #CR-{int(datetime.utcnow().timestamp())}"
    )

    resultado["contenido_enviado"] = mensaje
    
    # Simulación detallada de Request HTTP hacia Twilio
    sim_log = f"""
    *** SIMULACIÓN DE NOTIFICACIÓN TELEFÓNICA (MOCK SMS/WHATSAPP) ***
    [API Endpoint] https://api.twilio.com/2010-04-01/Accounts/AC_MOCK_SID/Messages.json
    [Teléfono Destino] {config.telefono_destino}
    [Remitente API] GrocerOS-NoReply
    [Payload de Mensaje Enviado]:
    {mensaje}
    [Status] Petición HTTP POST 201 CREATED simulada de forma exitosa. Mensaje enviado en cola para entrega inmediata.
    """
    resultado["log_simulacion"] = sim_log.strip()
    print(resultado["log_simulacion"])

    return resultado


# =====================================================================
# 6. RUTAS DE FASTAPI (ENDPOINTS)
# =====================================================================

@app.post("/configurar-notificaciones", status_code=status.HTTP_200_OK)
def configurar_notificaciones(payload: ConfigNotifRequest, db: Session = Depends(get_db)):
    """
    Permite guardar o actualizar la dirección de correo y número de teléfono de destino de prueba.
    """
    config = db.query(ConfiguracionNotificaciones).first()
    if not config:
        config = ConfiguracionNotificaciones()
        db.add(config)
    
    config.email_destino = payload.email_destino
    config.telefono_destino = payload.telefono_destino
    config.smtp_server = payload.smtp_server
    config.smtp_port = payload.smtp_port
    config.smtp_user = payload.smtp_user
    config.smtp_password = payload.smtp_password
    
    db.commit()
    db.refresh(config)
    
    return {
        "success": True, 
        "message": "Configuración de notificaciones de prueba actualizada correctamente.",
        "data": {
            "email_destino": config.email_destino,
            "telefono_destino": config.telefono_destino,
            "smtp_server": config.smtp_server
        }
    }


@app.get("/notificaciones-configuradas")
def obtener_configuracion_notificaciones(db: Session = Depends(get_db)):
    """
    Obtiene los destinatarios de prueba configurados actualmente.
    """
    config = db.query(ConfiguracionNotificaciones).first()
    if not config:
        return {"email_destino": "no_configurado@gmail.com", "telefono_destino": "+500000"}
    return {
        "email_destino": config.email_destino,
        "telefono_destino": config.telefono_destino,
        "smtp_server": config.smtp_server,
        "smtp_user": config.smtp_user
    }


@app.get("/productos")
def listar_productos(db: Session = Depends(get_db)):
    """
    Obtiene la lista completa de los 54 productos en la base de datos con su stock.
    """
    return db.query(Producto).all()


@app.post("/registrar-venta-prueba", status_code=status.HTTP_201_CREATED)
def registrar_venta_prueba(payload: VentaPruebaRequest, db: Session = Depends(get_db)):
    """
    Inyecta datos de venta de prueba rápidos para simular la operación comercial del día.
    Registra por separado las unidades consumidas en Salón y en Domicilio.
    Si el producto es crítico (proteína o bebida), descuenta el stock teórico en tiempo real.
    """
    producto = db.query(Producto).filter(Producto.codigo == payload.codigo_producto).first()
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Producto con código {payload.codigo_producto} no encontrado."
        )
    
    # Resolver fecha de venta
    fecha_venta = datetime.utcnow().date()
    if payload.fecha:
        try:
            fecha_venta = datetime.strptime(payload.fecha, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha inválido. Usar YYYY-MM-DD")

    # Guardar/Actualizar venta del día
    venta = db.query(VentaDiaria).filter(
        VentaDiaria.producto_id == producto.id, 
        VentaDiaria.fecha == fecha_venta
    ).first()

    if not venta:
        venta = VentaDiaria(
            producto_id=producto.id,
            cantidad_salon=payload.cantidad_salon,
            cantidad_domicilio=payload.cantidad_domicilio,
            fecha=fecha_venta
        )
        db.add(venta)
    else:
        venta.cantidad_salon += payload.cantidad_salon
        venta.cantidad_domicilio += payload.cantidad_domicilio

    # Si es producto crítico, descontar del stock físico teórico de la base de datos
    if producto.es_critico:
        total_descuento = payload.cantidad_salon + payload.cantidad_domicilio
        producto.stock_actual = max(0.0, producto.stock_actual - total_descuento)

    db.commit()
    db.refresh(venta)
    db.refresh(producto)

    return {
        "success": True,
        "message": f"Venta registrada para {producto.nombre}. Origen: Salón ({payload.cantidad_salon}) | Domicilio ({payload.cantidad_domicilio})",
        "stock_restante_critico": producto.stock_actual if producto.es_critico else "No aplica (Estadístico)"
    }


@app.post("/ejecutar-cierre", status_code=status.HTTP_200_OK)
def ejecutar_cierre_diario(payload: CierreCajaRequest, db: Session = Depends(get_db)):
    """
    El endpoint maestro del Cierre de Caja e Inventario:
    1. Calcula el total de ventas de la fecha actual por canal (Salón vs Domicilio).
    2. Calcula el recaudo financiero en dinero (COP).
    3. Construye el arqueo de stock teórico de los Productos Críticos.
    4. Integra el conteo físico de control (mermas/diferencias) enviado opcionalmente por el usuario.
    5. Genera de forma dinámica el archivo Excel (.xlsx) y el archivo PDF (.pdf).
    6. Despacha en tiempo real simulado (o real si se configura) los reportes por correo SMTP y SMS/WhatsApp.
    """
    hoy = datetime.utcnow().date()
    hoy_str = hoy.strftime("%Y-%m-%d")

    # Consultar configuración de destino
    config = db.query(ConfiguracionNotificaciones).first()
    if not config:
        config = ConfiguracionNotificaciones()

    # Mapear conteos físicos enviados en el body
    conteos_map = {item.codigo_producto: item.conteo_fisico for item in payload.conteos_fisicos}

    # Obtener todas las ventas del día
    ventas_del_dia = db.query(VentaDiaria).filter(VentaDiaria.fecha == hoy).all()
    ventas_map = {v.producto_id: v for v in ventas_del_dia}

    # Obtener todos los productos para consolidar
    todos_productos = db.query(Producto).all()

    datos_inventario = []
    datos_ventas = []

    total_recaudado = 0.0
    total_salon = 0.0
    total_domicilio = 0.0

    cant_salon_unidades = 0
    cant_domi_unidades = 0

    for prod in todos_productos:
        # Ventas registradas hoy para este producto
        v_hoy = ventas_map.get(prod.id)
        cant_salon = v_hoy.cantidad_salon if v_hoy else 0
        cant_domicilio = v_hoy.cantidad_domicilio if v_hoy else 0
        total_vendido = cant_salon + cant_domicilio

        cant_salon_unidades += cant_salon
        cant_domi_unidades += cant_domicilio

        # Cálculos de dinero recaudado
        recaudo_prod = total_vendido * prod.price
        recaudo_salon = cant_salon * prod.price
        recaudo_domicilio = cant_domicilio * prod.price

        total_recaudado += recaudo_prod
        total_salon += recaudo_salon
        total_domicilio += recaudo_domicilio

        # Cálculos de Inventario Crítico
        stock_teorico = prod.stock_inicial - total_vendido if prod.es_critico else 0.0
        
        # Conteo físico enviado de forma manual
        conteo_fisico = conteos_map.get(prod.codigo, stock_teorico) if prod.es_critico else 0.0
        diferencia_merma = conteo_fisico - stock_teorico if prod.es_critico else 0.0

        # Consolidar objeto de inventario
        datos_inventario.append({
            "codigo": prod.codigo,
            "nombre": prod.nombre,
            "categoria": prod.categoria,
            "stock_inicial": prod.stock_inicial if prod.es_critico else "N/A",
            "ventas_totales": total_vendido,
            "stock_teorico": stock_teorico if prod.es_critico else "N/A",
            "conteo_fisico": conteo_fisico if prod.es_critico else "N/A",
            "diferencia": diferencia_merma if prod.es_critico else "N/A",
            "es_critico": prod.es_critico
        })

        # Consolidar objeto de ventas
        datos_ventas.append({
            "codigo": prod.codigo,
            "nombre": prod.nombre,
            "precio": prod.price,
            "ventas_salon": cant_salon,
            "ventas_domicilio": cant_domicilio,
            "total_sold": total_vendido,
            "recaudado": recaudo_prod
        })

    # Guardar/Actualizar el registro del cierre de hoy en la BD
    cierre_db = db.query(CierreCaja).filter(CierreCaja.fecha == hoy).first()
    if not cierre_db:
        cierre_db = CierreCaja(fecha=hoy)
        db.add(cierre_db)

    cierre_db.total_recaudado = total_recaudado
    cierre_db.total_salon = total_salon
    cierre_db.total_domicilio = total_domicilio
    db.commit()

    # Formatear el Resumen de Texto Detallado
    resumen_text = (
        f"💰 TOTAL RECAUDADO: ${total_recaudado:,.2f} COP\n"
        f"🏛️ Venta Salón:     ${total_salon:,.2f} COP ({cant_salon_unidades} unidades)\n"
        f"🛵 Venta Domicilio: ${total_domicilio:,.2f} COP ({cant_domi_unidades} unidades)\n"
        f"📈 Productos Vendidos en Total: {sum(x['total_sold'] for x in datos_ventas)} unidades"
    )

    resumen_metadata = {
        "total_recaudado": total_recaudado,
        "total_salon": total_salon,
        "total_domicilio": total_domicilio,
        "cant_salon_unidades": cant_salon_unidades,
        "cant_domi_unidades": cant_domi_unidades,
        "email_destino": config.email_destino,
        "telefono_destino": config.telefono_destino
    }

    # Generación de archivos dinámicos
    excel_file = generar_excel_cierre(datos_inventario, datos_ventas, hoy_str)
    pdf_file = generar_pdf_cierre(datos_inventario, datos_ventas, resumen_metadata, hoy_str)

    # Actualizar rutas de reportes en la base de datos
    cierre_db.reporte_excel_path = excel_file
    cierre_db.reporte_pdf_path = pdf_file
    db.commit()

    # Despachar notificaciones
    notif_email = enviar_reporte_email_smtp(
        config, excel_file, pdf_file, hoy_str, resumen_text, payload.forzar_envio_smtp
    )
    notif_telf = enviar_notificacion_telefono(config, hoy_str, resumen_text)

    return {
        "success": True,
        "fecha_cierre": hoy_str,
        "total_recaudado_cop": total_recaudado,
        "resumen_financiero": {
            "salon": total_salon,
            "domicilio": total_domicilio,
            "unidades_salon": cant_salon_unidades,
            "unidades_domicilio": cant_domi_unidades
        },
        "reportes_generados": {
            "excel": excel_file,
            "pdf": pdf_file
        },
        "resultado_envios_prueba": {
            "email_smtp": notif_email,
            "telefono_push": notif_telf
        }
    }


# =====================================================================
# 7. INYECCIÓN AUTOMÁTICA DE DATOS DE PRUEBA COMPLETA AL INICIAR
# =====================================================================
def sembrar_ventas_diarias_simuladas():
    """
    Simula las ventas para el día de hoy, inyectando un mix de consumo de platos.
    """
    db = SessionLocal()
    try:
        # Verificar si hay ventas registradas hoy, si no, agregar simulación
        hoy = datetime.utcnow().date()
        if db.query(VentaDiaria).filter(VentaDiaria.fecha == hoy).count() == 0:
            ventas_ejemplo = [
                # Código, Cantidad Salón, Cantidad Domicilio
                ("01", 10, 5),   # Pollo Asado
                ("02", 8, 4),    # 1/2 Pollo Asado
                ("04", 12, 8),   # Pollo Broaster
                ("07", 20, 15),  # Papa Francesa (Estadístico)
                ("09", 15, 10),  # Porción Papa Salada (Estadístico)
                ("22", 25, 5),   # Club Colombia (Crítico)
                ("27", 30, 20),  # Gaseosa 350ml (Crítico)
                ("30", 5, 12),   # Gaseosa 2.5 lts (Crítico)
                ("31", 18, 2),   # Limonada Natural (Crítico)
                ("11", 4, 1),    # Viudo de Capaz
                ("16", 14, 3),   # Carne Asada
                ("20", 7, 2),    # Mojarra
                ("40", 5, 10),   # Combo 1
                ("51", 9, 4),    # Costillas de cerdo
                ("54", 6, 1)     # Cazuela de mariscos
            ]
            
            for cod, cant_s, cant_d in ventas_ejemplo:
                prod = db.query(Producto).filter(Producto.codigo == cod).first()
                if prod:
                    venta = VentaDiaria(
                        producto_id=prod.id,
                        cantidad_salon=cant_s,
                        cantidad_domicilio=cant_d,
                        fecha=hoy
                    )
                    db.add(venta)
                    
                    # Descontar stock inicial si es crítico
                    if prod.es_critico:
                        prod.stock_actual = max(0.0, prod.stock_actual - (cant_s + cant_d))
            
            db.commit()
            print("[DB] Semilla de ventas diarias inyectada exitosamente para pruebas de cierre.")
    finally:
        db.close()

# Ejecutar siembra rápida de datos iniciales para agilizar pruebas
try:
    sembrar_ventas_diarias_simuladas()
except Exception as e:
    print(f"Error sembrando ventas: {e}")

# Ejecución directa del servidor en puerto alternativo para pruebas
if __name__ == "__main__":
    import uvicorn
    print("Iniciando Grocer OS Core Backend de Inventario en puerto 8001...")
    uvicorn.run(app, host="0.0.0.0", port=8001)
