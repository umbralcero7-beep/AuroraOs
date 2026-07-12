import json
import uuid
import asyncio
from typing import Dict, List, Set
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .models import (
    SessionLocal, init_db, Client, Address, Order, OrderItem, MenuItem,
    OrderStatusEnum, InvoiceStatusEnum, PaymentMethodEnum
)
from .schemas import (
    OrderCreate, OrderResponse, RouteAssignRequest, DriverLocationUpdate,
    StreetCheckoutRequest
)

app = FastAPI(title="Aurora OS - Delivery Management Core (Umbral Cero)")

# Add CORS Middleware for tablet client communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Database on startup
@app.on_event("startup")
def startup():
    init_db()

# DB Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- REAL-TIME WEBSOCKET CONNECTION MANAGER ---
class ConnectionManager:
    def __init__(self):
        # Maps user session or client role to their websocket connection
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast_json(self, data: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception:
                # Connection might have died
                pass

ws_manager = ConnectionManager()

@app.websocket("/ws/delivery")
async def delivery_websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Maintain connection alive and listen for client events (e.g. driver GPS pings)
            data_str = await websocket.receive_text()
            data = json.loads(data_str)
            
            # Broadcast client messages (e.g. live GPS coords) to all receptionist dashboards
            await ws_manager.broadcast_json({
                "type": "CLIENT_MESSAGE",
                "payload": data
            })
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


# --- BACKGROUND DIAN ELECTRONIC BILLING QUEUE ---
async def simulate_dian_xml_validation(order_id: int):
    """
    Simulates sending XML data to DIAN (Colombia tax authority),
    generating CUFE and updating invoice status asynchronously.
    """
    await asyncio.sleep(4.5) # Simulates network validation latency
    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if order:
            cufe = uuid.uuid4().hex
            order.invoice_status = InvoiceStatusEnum.VALIDADO_DIAN
            order.cufe_hash = cufe
            order.dian_xml_url = f"https://catalogo.dian.gov.co/document/validation?cufe={cufe}"
            db.commit()
            
            # Broadcast the electronic invoice validation event in real time!
            await ws_manager.broadcast_json({
                "type": "INVOICE_VALIDATED_DIAN",
                "order_id": order_id,
                "cufe": cufe,
                "timestamp": str(order.timestamp)
            })
    except Exception as e:
        print(f"Error validating with DIAN: {e}")
    finally:
        db.close()


# --- REST API ENDPOINTS ---

@app.post("/api/orders", response_model=OrderResponse)
async def create_delivery_order(
    payload: OrderCreate, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    """
    Formulario de Pedido Flash: Autocompleta clientes, gestiona direcciones múltiples,
    processes payments and electronic invoicing (DIAN) in background queues.
    """
    # 1. Locate or create Client
    client = db.query(Client).filter(Client.phone == payload.client_phone.strip()).first()
    if not client:
        client = Client(
            phone=payload.client_phone.strip(),
            name=payload.client_name.strip(),
            document=payload.client_document
        )
        db.add(client)
        db.commit()
        db.refresh(client)
    else:
        # Update name or document if changed
        client.name = payload.client_name.strip()
        if payload.client_document:
            client.document = payload.client_document
        db.commit()

    # 2. Check address history (Max 5 addresses)
    address = db.query(Address).filter(
        Address.client_id == client.id, 
        Address.address_text == payload.address_text.strip()
    ).first()

    # Reset former last_used flags
    db.query(Address).filter(Address.client_id == client.id).update({"is_last_used": False})

    if not address:
        # Check current address count
        addr_count = db.query(Address).filter(Address.client_id == client.id).count()
        if addr_count >= 5:
            # Delete oldest address to remain at max 5 addresses (No screen clutter)
            oldest = db.query(Address).filter(Address.client_id == client.id).order_by(Address.created_at.asc()).first()
            if oldest:
                db.delete(oldest)
        
        address = Address(
            client_id=client.id,
            address_text=payload.address_text.strip(),
            delivery_notes=payload.delivery_notes,
            is_last_used=True
        )
        db.add(address)
        db.commit()
        db.refresh(address)
    else:
        address.is_last_used = True
        if payload.delivery_notes:
            address.delivery_notes = payload.delivery_notes
        db.commit()

    # 3. Create the Order
    subtotal = sum(item.qty * item.price_at_sale for item in payload.items)
    total = subtotal + payload.delivery_cost

    # Decide initial state based on Colombian DIAN Billing requirement
    initial_status = OrderStatusEnum.PREPARANDO
    invoice_status = InvoiceStatusEnum.NO_REQUERIDO

    if payload.require_invoice:
        initial_status = OrderStatusEnum.PENDIENTE # Placed in "Espera en Caja" queue
        invoice_status = InvoiceStatusEnum.ESPERA_CAJA

    order = Order(
        client_id=client.id,
        address_id=address.id,
        sede_id="s1",
        delivery_cost=payload.delivery_cost,
        subtotal=subtotal,
        total=total,
        payment_method=payload.payment_method,
        payment_received_with=payload.payment_received_with,
        comments=payload.comments,
        status=initial_status,
        require_invoice=payload.require_invoice,
        invoice_status=invoice_status
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    # 4. Record Items
    for item_payload in payload.items:
        item = OrderItem(
            order_id=order.id,
            menu_item_id=item_payload.menu_item_id,
            qty=item_payload.qty,
            price_at_sale=item_payload.price_at_sale
        )
        db.add(item)
    db.commit()
    db.refresh(order)

    # 5. DIAN Async Queue task if required
    if payload.require_invoice:
        background_tasks.add_task(simulate_dian_xml_validation, order.id)

    # 6. Broadcast order creation to WebSocket subscribers
    asyncio.create_task(ws_manager.broadcast_json({
        "type": "ORDER_CREATED",
        "order": {
            "id": order.id,
            "status": order.status.value,
            "total": order.total,
            "customer": client.name
        }
    }))

    return order


@app.post("/api/routes/assign")
async def assign_multi_stop_route(payload: RouteAssignRequest, db: Session = Depends(get_db)):
    """
    Creador de Rutas Secuencial (Multi-pedido)
    Repartidor assigns multiple orders to themselves, defining sequential order of stops (1st, 2nd, 3rd)
    """
    for index, order_id in enumerate(payload.order_ids):
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail=f"Order #{order_id} not found")
        
        order.repartidor_id = payload.repartidor_id
        order.status = OrderStatusEnum.DESPACHADO # Shifted to En Camino
        order.route_priority = index + 1 # 1st stop, 2nd stop, 3rd stop
        order.route_progress = 0.0
    
    db.commit()

    # Broadcast live status sync: "Repartidor Sofia entregando pedido 2 de 3; tu pedido es el 3"
    await ws_manager.broadcast_json({
        "type": "ROUTE_ASSIGNED",
        "repartidor_id": payload.repartidor_id,
        "total_stops": len(payload.order_ids)
    })
    
    return {"status": "success", "message": f"Route assigned to driver {payload.repartidor_id}"}


@app.post("/api/orders/{order_id}/gps")
async def update_gps_coordinates(order_id: int, coords: DriverLocationUpdate, db: Session = Depends(get_db)):
    """
    Receives GPS coordinate pings from driver mobile and broadcasts to central receptionist map every 30s
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.current_lat = coords.lat
    order.current_lng = coords.lng
    db.commit()

    # Broadcast to receptionist map instantly
    await ws_manager.broadcast_json({
        "type": "DRIVER_LOCATION_PING",
        "order_id": order_id,
        "repartidor_id": order.repartidor_id,
        "coords": {"lat": coords.lat, "lng": coords.lng}
    })
    return {"status": "success"}


@app.post("/api/orders/{order_id}/emergency-reassign")
async def emergency_reassign(order_id: int, new_repartidor_id: str, db: Session = Depends(get_db)):
    """
    Protocolo de Emergencia:
    In case of delay or crash, reassigns pending orders of a driver to another one with a single click.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    old_repartidor = order.repartidor_id
    order.repartidor_id = new_repartidor_id
    order.route_priority = 1 # Assigned as urgent top priority stop
    order.route_progress = 0.0
    db.commit()

    await ws_manager.broadcast_json({
        "type": "EMERGENCY_REASSIGNMENT",
        "order_id": order_id,
        "old_repartidor": old_repartidor,
        "new_repartidor": new_repartidor_id
    })
    return {"status": "success", "message": f"Reassigned successfully to driver {new_repartidor_id}"}


@app.post("/api/orders/{order_id}/checkout")
async def street_checkout(order_id: int, payload: StreetCheckoutRequest, db: Session = Depends(get_db)):
    """
    Cierre de Caja en Calle:
    Driver confirms real payment method received at door step for automatic cash balance audits.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.status = OrderStatusEnum.ENTREGADO
    order.payment_confirmed_method = payload.confirmed_payment_method.value
    order.route_progress = 100.0
    db.commit()

    await ws_manager.broadcast_json({
        "type": "ORDER_COMPLETED",
        "order_id": order_id,
        "payment_method": payload.confirmed_payment_method.value,
        "total": order.total
    })
    return {"status": "success"}
