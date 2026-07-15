# Arquitectura de Domicilios Aurora (Marca: Umbral Cero)
Este directorio contiene la implementación de referencia en **Python (FastAPI + SQLAlchemy + SQLite)** para el sistema reestructurado de gestión de domicilios de alta demanda.

## 📁 Estructura de Archivos del Proyecto
*   `models.py`: Modelos SQLAlchemy para SQLite. Define la relación de un cliente con múltiples direcciones históricas (límite de 5 para evitar sobrecarga táctil), relación de comandas con ítems de platos y estados para la facturación electrónica DIAN Colombia (CUFE hashes, XMLs, colas de espera en caja).
*   `schemas.py`: Esquemas de validación de datos Pydantic para el tipado de entradas y salidas de la API.
*   `main.py`: Endpoints clave y gestor de WebSocket en tiempo real que sincroniza la tablet de recepción y la app móvil de despacho de manera inmediata.

---

## 🛠️ Principios de Diseño Backend

### 1. Gestión de Direcciones de Cliente Inteligente (Límite de 5)
El modelo `Client` se relaciona uno-a-muchos con `Address`. Para mitigar la sobrecarga de información y el "bloat" visual en pantallas táctiles de Tablet, el backend:
*   Mantiene un máximo de **5 direcciones históricas** por cliente.
*   Si se registra una sexta dirección, elimina automáticamente la más antigua (`created_at.asc()`), asegurando que solo las direcciones vigentes estén disponibles como botones rápidos (tags).
*   Preselecciona la última dirección utilizada (`is_last_used`) por defecto.

### 2. Facturación Electrónica DIAN en Cola (Espera en Caja)
Cuando un pedido requiere Factura Electrónica (`require_invoice = True`):
1.  El pedido se registra en estado `PENDIENTE` ("Espera en Caja").
2.  La API de recepción no se bloquea; delega la validación XML/CUFE a una **cola exclusiva de fondo** mediante `BackgroundTasks` de FastAPI.
3.  El cajero procesa/valida el XML y el backend emite una alerta WebSocket (`INVOICE_VALIDATED_DIAN`) que actualiza la tablet del recepcionista de forma reactiva, permitiendo un flujo de llamadas continuo en hora pico.

### 3. Creador de Rutas Secuencial Multi-pedido
Permite a los repartidores asignar múltiples domicilios listos a su nombre, especificando un orden estricto de entrega (`route_priority`: 1, 2, 3...). El backend calcula el progreso y asocia el estado del repartidor para informar a la recepcionista: *"Sofia Castro entregando pedido 2 de 3; tu pedido es el 3"*.

### 4. Protocolo de Emergencia
En caso de fallos del repartidor, el mapa centralizado permite reasignar órdenes pendientes con un solo clic. La API actualiza la asignación y reestablece las prioridades de entrega a la cabeza del nuevo domiciliario.

---

## 🚀 Cómo Ejecutar Este Backend de Referencia

1. Instalar dependencias requeridas:
   ```bash
   pip install fastapi uvicorn sqlalchemy pydantic
   ```
2. Iniciar el servidor FastAPI:
   ```bash
   uvicorn backend_python.main:app --reload --port 8000
   ```
3. La documentación de la API interactiva estará disponible de inmediato en: `http://localhost:8000/docs`.
