let productos = [];
let clientes = [];
let carrito = [];

// Cargar clientes
async function loadClientes() {
    try {
        clientes = await fetchAPIAuth('/clientes');

        const clienteSelect = document.getElementById('cliente-select');
        clienteSelect.innerHTML = '<option value="">Sin cliente</option>' +
            clientes.map(cli =>
                `<option value="${cli.id_cliente}">
                    ${esc(cli.nombre)} ${esc(cli.apellido)} - ${esc(cli.dni)}
                </option>`
            ).join('');

    } catch (error) {
        console.error('Error cargando clientes:', error);
    }
}

// Cargar productos para POS
async function loadProductosPOS() {
    try {
        productos = await fetchAPIAuth('/productos');
        renderProductosPOS(productos);
    } catch (error) {
        console.error('Error cargando productos:', error);
        document.getElementById('productos-grid-pos').innerHTML = `
            <div class="alert alert-danger">
                Error al cargar productos
            </div>
        `;
    }
}

// Renderizar productos en grid para POS
function renderProductosPOS(data) {
    const container = document.getElementById('productos-grid-pos');
    
    if (data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i>📦</i>
                <p>No hay productos disponibles</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = data.map(producto => `
        <div class="product-option" onclick="agregarAlCarrito(${producto.id_producto})">
            <div class="product-option-name">${esc(producto.nombre)}</div>
            <div class="product-option-price">$${parseFloat(producto.precio_venta).toFixed(2)}</div>
            <div class="product-option-stock">
                Stock: ${producto.stock_actual}
            </div>
        </div>
    `).join('');
}

// Buscar productos en POS
function searchProductosPOS() {
    const searchTerm = document.getElementById('search-producto-pos').value.toLowerCase();
    const filtered = productos.filter(prod => 
        prod.nombre.toLowerCase().includes(searchTerm) ||
        prod.codigo.toLowerCase().includes(searchTerm)
    );
    renderProductosPOS(filtered);
}

// Escáner de código de barras: el lector escribe el código y presiona Enter
function initEscanerCodigoBarras() {
    const input = document.getElementById('codigo-barras');
    if (!input) return;

    input.addEventListener('keypress', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();

        const codigo = input.value.trim();
        if (!codigo) return;

        const producto = productos.find(p => p.codigo === codigo);

        if (!producto) {
            showNotification(`Código "${codigo}" no encontrado`, 'error');
        } else {
            agregarAlCarrito(producto.id_producto);
            showNotification(`➕ ${producto.nombre}`, 'success');
        }

        input.value = '';
        input.focus();
    });
}

// Agregar producto al carrito
function agregarAlCarrito(idProducto) {
    const productoExistente = carrito.find(item => item.id_producto === idProducto);
    
    if (productoExistente) {
        productoExistente.cantidad++;
    } else {
        const producto = productos.find(p => p.id_producto === idProducto);
        
        if (producto.stock_actual <= 0) {
            showNotification('Producto sin stock', 'warning');
            return;
        }
        
        carrito.push({
            id_producto: producto.id_producto,
            nombre: producto.nombre,
            precio_venta: parseFloat(producto.precio_venta),
            cantidad: 1,
            stock_disponible: producto.stock_actual
        });
    }
    
    renderCarrito();
}

// Eliminar del carrito
function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    renderCarrito();
}

// Actualizar cantidad en carrito
function actualizarCantidad(index, nuevaCantidad) {
    if (nuevaCantidad <= 0) {
        eliminarDelCarrito(index);
        return;
    }
    
    const item = carrito[index];
    if (nuevaCantidad > item.stock_disponible) {
        showNotification(`Solo hay ${item.stock_disponible} unidades disponibles`, 'warning');
        return;
    }
    
    item.cantidad = parseInt(nuevaCantidad);
    renderCarrito();
}

// Renderizar carrito
function renderCarrito() {
    const container = document.getElementById('cart-items');
    
    if (carrito.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 20px;">
                <i>🛒</i>
                <p>Carrito vacío</p>
            </div>
        `;
    } else {
        container.innerHTML = carrito.map((item, index) => `
            <div class="cart-item">
                <div class="cart-item-header">
                    <span class="cart-item-name">${esc(item.nombre)}</span>
                    <span class="cart-item-price">
                        $${(item.precio_venta * item.cantidad).toFixed(2)}
                    </span>
                </div>
                <div class="cart-controls">
                    <button class="btn btn-warning btn-sm" onclick="actualizarCantidad(${index}, ${item.cantidad - 1})">
                        -
                    </button>
                    <input type="number" class="quantity-input" 
                           value="${item.cantidad}" 
                           min="1" 
                           max="${item.stock_disponible}"
                           onchange="actualizarCantidad(${index}, this.value)">
                    <button class="btn btn-success btn-sm" onclick="actualizarCantidad(${index}, ${item.cantidad + 1})">
                        +
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarDelCarrito(${index})">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    calcularTotales();
}

// Calcular totales
function calcularTotales() {
    const subtotal = carrito.reduce((sum, item) => sum + (item.precio_venta * item.cantidad), 0);
    const iva = subtotal * 0.16;
    const descuento = parseFloat(document.getElementById('descuento').value) || 0;
    const total = subtotal + iva - descuento;
    
    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('iva').textContent = `$${iva.toFixed(2)}`;
    document.getElementById('descuento-display').textContent = `$${descuento.toFixed(2)}`;
    document.getElementById('total').textContent = `$${total.toFixed(2)}`;
}

// Procesar venta
async function procesarVenta() {
    if (carrito.length === 0) {
        showNotification('El carrito está vacío', 'warning');
        return;
    }
    
    const idCliente = document.getElementById('cliente-select').value;
    const metodoPago = document.getElementById('metodo-pago').value;
    const descuento = parseFloat(document.getElementById('descuento').value) || 0;

    // Las ventas a crédito requieren cliente registrado
    if (metodoPago === 'credito' && !idCliente) {
        showNotification('Las ventas a crédito requieren un cliente registrado', 'warning');
        return;
    }
    
    const subtotal = carrito.reduce((sum, item) => sum + (item.precio_venta * item.cantidad), 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva - descuento;
    
    const ventaData = {
        id_cliente: idCliente ? parseInt(idCliente) : null,
        metodo_pago: metodoPago,
        descuento: descuento,
        detalles: carrito.map(item => ({
            id_producto: item.id_producto,
            cantidad: item.cantidad
        }))
    };
    
    try {
        const venta = await fetchAPIAuth('/ventas', {
            method: 'POST',
            body: ventaData
        });

        const msgCredito = metodoPago === 'credito'
            ? ` Queda fiado por $${venta.saldo_pendiente.toFixed(2)}`
            : '';
        showNotification(`Venta procesada. Total: $${total.toFixed(2)}.${msgCredito}`, 'success');

        // Limpiar carrito
        carrito = [];
        renderCarrito();
        document.getElementById('cliente-select').value = '';
        document.getElementById('descuento').value = '0';

    } catch (error) {
        console.error('Error procesando venta:', error);
        showNotification('Error al procesar la venta', 'error');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadClientes();
    loadProductosPOS();
    initEscanerCodigoBarras();
});