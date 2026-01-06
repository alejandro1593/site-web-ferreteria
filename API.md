# API Sistema de Ferretería

## Endpoints Disponibles

### Categorías
- `GET /api/categorias` - Obtener todas las categorías
- `GET /api/categorias/:id` - Obtener una categoría por ID
- `POST /api/categorias` - Crear nueva categoría
  - Body: `{ nombre, descripcion }`
- `PUT /api/categorias/:id` - Actualizar categoría
- `DELETE /api/categorias/:id` - Eliminar categoría

### Proveedores
- `GET /api/proveedores` - Obtener todos los proveedores
- `GET /api/proveedores/:id` - Obtener proveedor por ID
- `GET /api/proveedores/search?nombre=xxx` - Buscar proveedor por nombre
- `POST /api/proveedores` - Crear nuevo proveedor
  - Body: `{ nombre, contacto, telefono, email, direccion }`
- `PUT /api/proveedores/:id` - Actualizar proveedor
- `DELETE /api/proveedores/:id` - Eliminar proveedor

### Clientes
- `GET /api/clientes` - Obtener todos los clientes
- `GET /api/clientes/:id` - Obtener cliente por ID
- `GET /api/clientes/search?termino=xxx` - Buscar cliente por nombre, apellido o DNI
- `GET /api/clientes/dni/:dni` - Obtener cliente por DNI
- `POST /api/clientes` - Crear nuevo cliente
  - Body: `{ nombre, apellido, dni, telefono, email, direccion }`
- `PUT /api/clientes/:id` - Actualizar cliente
- `DELETE /api/clientes/:id` - Eliminar cliente

### Usuarios
- `GET /api/usuarios` - Obtener todos los usuarios (sin password)
- `GET /api/usuarios/:id` - Obtener usuario por ID
- `POST /api/usuarios` - Crear nuevo usuario
  - Body: `{ username, password, nombre, email, rol, activo }`
- `PUT /api/usuarios/:id` - Actualizar usuario
- `DELETE /api/usuarios/:id` - Eliminar usuario
- `PUT /api/usuarios/:id/desactivar` - Desactivar usuario
- `PUT /api/usuarios/:id/activar` - Activar usuario
- `PUT /api/usuarios/:id/password` - Cambiar password
  - Body: `{ password }`

### Productos
- `GET /api/productos` - Obtener todos los productos
- `GET /api/productos/:id` - Obtener producto por ID
- `GET /api/productos/categoria/:idCategoria` - Obtener productos por categoría
- `GET /api/productos/search?termino=xxx` - Buscar productos
- `GET /api/productos/lowstock` - Obtener productos con stock bajo
- `GET /api/productos/codigo/:codigo` - Obtener producto por código
- `POST /api/productos` - Crear nuevo producto
  - Body: `{ nombre, descripcion, codigo, precio_compra, precio_venta, stock_actual, stock_minimo, id_categoria, id_proveedor, imagen, activo }`
- `PUT /api/productos/:id` - Actualizar producto
- `DELETE /api/productos/:id` - Eliminar producto (soft delete)
- `PUT /api/productos/:id/stock` - Actualizar stock
  - Body: `{ cantidad }`

### Ventas
- `GET /api/ventas` - Obtener todas las ventas
- `GET /api/ventas/:id` - Obtener venta con detalles
- `GET /api/ventas/fecha?fechaInicio=xxx&fechaFin=xxx` - Obtener ventas por fecha
- `GET /api/ventas/cliente/:idCliente` - Obtener ventas por cliente
- `GET /api/ventas/today` - Obtener ventas del día
- `GET /api/ventas/summary?fechaInicio=xxx&fechaFin=xxx` - Obtener resumen de ventas
- `POST /api/ventas` - Crear nueva venta
  - Body: `{ id_cliente, detalles: [{ id_producto, cantidad }], metodo_pago, descuento }`
- `DELETE /api/ventas/:id` - Eliminar venta

### Detalles de Venta
- `GET /api/venta-detalles/:idVenta` - Obtener detalles de una venta
- `GET /api/venta-detalles/producto/:idProducto` - Obtener historial de ventas de un producto
- `GET /api/venta-detalles/top?limit=10` - Obtener productos más vendidos

## Ejemplo de Uso

### Crear una venta completa:
```bash
POST /api/ventas
{
  "id_cliente": 1,
  "metodo_pago": "efectivo",
  "descuento": 0,
  "detalles": [
    { "id_producto": 1, "cantidad": 2 },
    { "id_producto": 3, "cantidad": 1 }
  ]
}
```

### Crear usuario administrador:
```bash
POST /api/usuarios
{
  "username": "admin",
  "password": "admin123",
  "nombre": "Administrador",
  "email": "admin@ferreteria.com",
  "rol": "admin",
  "activo": true
}
```

## Notas
- Los ID de las ventas se generan automáticamente
- Al crear una venta, el stock se actualiza automáticamente
- Los passwords se encriptan automáticamente usando bcrypt
- Los productos eliminados usan soft delete (se marcan como inactivos)
- Las relaciones entre tablas están configuradas con foreign keys