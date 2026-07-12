import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
import enum

Base = declarative_base()

class SedeEnum(str, enum.Enum):
    MEDELLIN = "s1"
    BOGOTA = "s2"
    CALI = "s3"

class OrderStatusEnum(str, enum.Enum):
    PENDIENTE = "PENDIENTE"
    PREPARANDO = "PREPARANDO"
    LISTO = "LISTO"
    DESPACHADO = "DESPACHADO"
    ENTREGADO = "ENTREGADO"
    ANULADO = "ANULADO"

class InvoiceStatusEnum(str, enum.Enum):
    NO_REQUERIDO = "NO_REQUERIDO"
    ESPERA_CAJA = "ESPERA_CAJA"
    VALIDADO_DIAN = "VALIDADO_DIAN"
    RECHAZADO = "RECHAZADO"

class PaymentMethodEnum(str, enum.Enum):
    EFECTIVO = "EFECTIVO"
    DATAFONO = "TARJETA"
    TRANSFERENCIA = "TRANSFERENCIA"

class Client(Base):
    """
    Client table stores basic customer identification.
    Has a one-to-many relationship with multiple addresses.
    """
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    document = Column(String(20), unique=True, index=True, nullable=True) # Cedula/NIT for DIAN invoice
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    addresses = relationship("Address", back_populates="client", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="client")


class Address(Base):
    """
    Stores up to 5 historical addresses per client.
    """
    __tablename__ = "addresses"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    address_text = Column(String(255), nullable=False)
    delivery_notes = Column(String(255), nullable=True) # Custom notes like "Apt 502"
    is_last_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    client = relationship("Client", back_populates="addresses")


class MenuItem(Base):
    """
    Menu item database structure with search codes.
    """
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, index=True, nullable=False) # e.g. "101"
    name = Column(String(150), nullable=False)
    price = Column(Float, nullable=False)
    category = Column(String(50), nullable=False) # e.g. "PLATOS_FUERTES"
    available = Column(Boolean, default=True)


class Order(Base):
    """
    Order table carrying current delivery status, assignments, and DIAN billing status.
    """
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    address_id = Column(Integer, ForeignKey("addresses.id"), nullable=False)
    sede_id = Column(String(10), default="s1")
    repartidor_id = Column(String(50), nullable=True) # Active driver ID
    
    # Financial details
    delivery_cost = Column(Float, default=4000.0)
    subtotal = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    
    # Payment detail
    payment_method = Column(SQLEnum(PaymentMethodEnum), default=PaymentMethodEnum.EFECTIVO)
    payment_received_with = Column(Float, nullable=True) # For cash change calculation
    payment_confirmed_method = Column(String(50), nullable=True) # Final payment on street
    
    # Route sequencing
    route_priority = Column(Integer, nullable=True) # 1st, 2nd, 3rd stop
    route_progress = Column(Float, default=0.0) # 0 to 100%
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)
    
    # Kitchen & Delivery flow
    status = Column(SQLEnum(OrderStatusEnum), default=OrderStatusEnum.PENDIENTE)
    comments = Column(String(255), nullable=True) # Special comments
    
    # Colombian DIAN Electronic Resolution
    require_invoice = Column(Boolean, default=False)
    invoice_status = Column(SQLEnum(InvoiceStatusEnum), default=InvoiceStatusEnum.NO_REQUERIDO)
    cufe_hash = Column(String(100), nullable=True)
    dian_xml_url = Column(String(255), nullable=True)
    
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    client = relationship("Client", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    """
    Items belonging to a specific order.
    """
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False)
    qty = Column(Integer, default=1)
    price_at_sale = Column(Float, nullable=False)

    # Relationships
    order = relationship("Order", back_populates="items")


# SQLite Database Initialization helper
DATABASE_URL = "sqlite:///./aurora_delivery_system.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
