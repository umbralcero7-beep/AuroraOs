from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from .models import OrderStatusEnum, InvoiceStatusEnum, PaymentMethodEnum

class AddressBase(BaseModel):
    address_text: str
    delivery_notes: Optional[str] = None
    is_last_used: bool = False

class AddressCreate(AddressBase):
    pass

class AddressResponse(AddressBase):
    id: int
    client_id: int

    class Config:
        from_attributes = True


class ClientBase(BaseModel):
    phone: str
    name: str
    document: Optional[str] = None

class ClientCreate(ClientBase):
    addresses: List[AddressCreate] = []

class ClientResponse(ClientBase):
    id: int
    created_at: datetime
    addresses: List[AddressResponse] = []

    class Config:
        from_attributes = True


class OrderItemBase(BaseModel):
    menu_item_id: int
    qty: int
    price_at_sale: float

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemResponse(OrderItemBase):
    id: int
    order_id: int

    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    client_phone: str
    client_name: str
    client_document: Optional[str] = None
    address_text: str
    delivery_notes: Optional[str] = None
    items: List[OrderItemCreate]
    delivery_cost: float = 4000.0
    payment_method: PaymentMethodEnum = PaymentMethodEnum.EFECTIVO
    payment_received_with: Optional[float] = None
    require_invoice: bool = False
    comments: Optional[str] = None

class OrderResponse(BaseModel):
    id: int
    client_id: int
    address_id: int
    sede_id: str
    repartidor_id: Optional[str] = None
    delivery_cost: float
    subtotal: float
    total: float
    payment_method: PaymentMethodEnum
    payment_received_with: Optional[float]
    payment_confirmed_method: Optional[str]
    route_priority: Optional[int]
    route_progress: float
    current_lat: Optional[float]
    current_lng: Optional[float]
    status: OrderStatusEnum
    comments: Optional[str]
    require_invoice: bool
    invoice_status: InvoiceStatusEnum
    cufe_hash: Optional[str]
    dian_xml_url: Optional[str]
    timestamp: datetime
    items: List[OrderItemResponse] = []

    class Config:
        from_attributes = True


class DriverLocationUpdate(BaseModel):
    lat: float
    lng: float


class RouteAssignRequest(BaseModel):
    repartidor_id: str
    order_ids: List[int] # Sorted in sequential delivery order


class StreetCheckoutRequest(BaseModel):
    confirmed_payment_method: PaymentMethodEnum
