const API_BASE_URL = 'http://localhost:3000/api';

let productos = [];
let categorias = [];
let proveedores = [];

// Cargar categorías y proveedores para los select
async function loadCategoriasYProveedores() {
    try {
        categorias = await fetchAPI('/categorias');
        proveedores = await fetchAPI('/proveedores');
        
        // Llenar select de categorías
        const categoriaSelect = document.getElementById('producto-categoria');
        categoriaSelect.innerHTML = '<option value="">Seleccionar...</option>' + 
            categorias.map(cat => `<option value="${cat.id_categoria}">${cat.nombre}</option>`).join('');
        
        // Llenar select de categorías para filtro
        const filterCategoriaSelect = document.getElementById('filter-categoria');
        filterCategoriaSelect.innerHTML = '<option value="">Todas las categorías</option>' + 
            categorias.map(cat => `<option value="${cat.id_categoria}">${cat.nombre}</option>`).join('');
        
        // Llenar select de proveedores
        const proveedorSelect = document.getElementById('producto-proveedor');
        proveedorSelect.innerHTML = '<option value="">Seleccionar...</option>' + 
            proveedores.map(prov => `<option value="${prov.id_proveedor}">${prov.nombre}</option>`).join('');
        
    } catch (error) {
        console.error('Error cargando categorías y proveedores:', error);
    }
}

// Cargar productos
async function loadProductos(endpoint = '/productos') {
    try {
        productos = await fetchAPI(endpoint);
        renderProductos(productos);
    } catch (error) {
        console.error('Error cargando productos:', error);
        document.getElementById('productos-container').innerHTML = `
            <div class="alert alert-danger">
                Error al cargar productos
            </div>
        `;
    }
}

// Renderizar productos
function renderProductos(data) {
    const container = document.getElementById('productos-container');
    
    if (data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i>📦</i>
                <h3>No hay productos disponibles</h3>
            </div>
        `;
        return;
    }
    
    container.innerHTML = data.map(producto => {
        const stockClass = producto.stock_actual <= producto.stock_minimo ? 'stock-low' : 'stock-ok';
        const stockText = producto.stock_actual <= producto.stock_minimo ? 'Stock bajo' : 'Stock OK';
        
        return `
            <div class="product-card">
                <img src="${producto.imagen}" alt="${producto.nombre}" 
                     class="product-image" 
                     onerror="this.src='https://via.placeholder.com/400?text=No+Image'">
                <div class="product-info">
                    <h4>${producto.nombre}</h4>
                    <p><small>Código: ${producto.codigo}</small></p>
                    <p><small>${producto.categoria_nombre}</small></p>
                    <p class="price">$${parseFloat(producto.precio_venta).toFixed(2)}</p>
                    <p>Stock: ${producto.stock_actual}</p>
                    <span class="stock-indicator ${stockClass}">${stockText}</span>
                    <div style="margin-top: 10px; display: flex; gap: 5px;">
                        <button class="btn btn-info btn-sm" onclick="editProducto(${producto.id_producto})">
                            ✏️
                        </button>
                        <button class="btn btn-success btn-sm" onclick="updateStock(${producto.id_producto})">
                            📊
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteProducto(${producto.id_producto})">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Buscar productos
function searchProductos() {
    const searchTerm = document.getElementById('search-producto').value.toLowerCase();
    const filtered = productos.filter(prod => 
        prod.nombre.toLowerCase().includes(searchTerm) ||
        (prod.descripcion && prod.descripcion.toLowerCase().includes(searchTerm)) ||
        prod.codigo.toLowerCase().includes(searchTerm)
    );
    renderProductos(filtered);
}

// Filtrar por categoría
async function filterProductos() {
    const categoriaId = document.getElementById('filter-categoria').value;
    
    if (categoriaId) {
        await loadProductos(`/productos/categoria/${categoriaId}`);
    } else {
        await loadProductos();
    }
}

// Cargar productos con stock bajo
async function loadLowStock() {
    await loadProductos('/productos/lowstock');
}

// Abrir modal para nuevo producto
function openProductoModal() {
    document.getElementById('producto-modal-title').textContent = 'Nuevo Producto';
    document.getElementById('producto-form').reset();
    document.getElementById('producto-id').value = '';
    document.getElementById('producto-activo').value = 'true';
    openModal('producto-modal');
}

// Editar producto
async function editProducto(id) {
    try {
        const producto = await fetchAPI(`/productos/${id}`);
        
        document.getElementById('producto-modal-title').textContent = 'Editar Producto';
        document.getElementById('producto-id').value = producto.id_producto;
        document.getElementById('producto-nombre').value = producto.nombre;
        document.getElementById('producto-codigo').value = producto.codigo;
        document.getElementById('producto-descripcion').value = producto.descripcion || '';
        document.getElementById('producto-precio-compra').value = producto.precio_compra;
        document.getElementById('producto-precio-venta').value = producto.precio_venta;
        document.getElementById('producto-stock-actual').value = producto.stock_actual;
        document.getElementById('producto-stock-minimo').value = producto.stock_minimo;
        document.getElementById('producto-categoria').value = producto.id_categoria || '';
        document.getElementById('producto-proveedor').value = producto.id_proveedor || '';
        document.getElementById('producto-activo').value = producto.activo ? 'true' : 'false';
        
        openModal('producto-modal');
    } catch (error) {
        console.error('Error cargando producto:', error);
        showAlert('Error al cargar el producto', 'danger');
    }
}

// Actualizar stock
async function updateStock(id) {
    const nuevoStock = prompt('Ingrese el nuevo stock:');
    
    if (nuevoStock === null || nuevoStock.trim() === '') {
        return;
    }
    
    try {
        await fetchAPI(`/productos/${id}/stock`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cantidad: parseInt(nuevoStock) })
        });
        
        showAlert('Stock actualizado exitosamente', 'success');
        await loadProductos();
        
    } catch (error) {
        console.error('Error actualizando stock:', error);
        showAlert('Error al actualizar el stock', 'danger');
    }
}

// Guardar producto
async function saveProducto() {
    const id = document.getElementById('producto-id').value;
    const nombre = document.getElementById('producto-nombre').value.trim();
    const codigo = document.getElementById('producto-codigo').value.trim();
    const descripcion = document.getElementById('producto-descripcion').value.trim();
    const precioCompra = document.getElementById('producto-precio-compra').value;
    const precioVenta = document.getElementById('producto-precio-venta').value;
    const stockActual = document.getElementById('producto-stock-actual').value;
    const stockMinimo = document.getElementById('producto-stock-minimo').value;
    const categoria = document.getElementById('producto-categoria').value;
    const proveedor = document.getElementById('producto-proveedor').value;
    const activo = document.getElementById('producto-activo').value === 'true';
    
    if (!nombre || !precioVenta) {
        showAlert('Nombre y precio de venta son obligatorios', 'warning');
        return;
    }
    
    try {
        const data = {
            nombre,
            descripcion,
            codigo,
            precio_compra: parseFloat(precioCompra) || null,
            precio_venta: parseFloat(precioVenta),
            stock_actual: parseInt(stockActual) || 0,
            stock_minimo: parseInt(stockMinimo) || 0,
            id_categoria: categoria ? parseInt(categoria) : null,
            id_proveedor: proveedor ? parseInt(proveedor) : null,
            activo
        };
        
        if (id) {
            await fetchAPI(`/productos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            showAlert('Producto actualizado exitosamente', 'success');
        } else {
            await fetchAPI('/productos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            showAlert('Producto creado exitosamente', 'success');
        }
        
        closeModal('producto-modal');
        await loadProductos();
        
    } catch (error) {
        console.error('Error guardando producto:', error);
        showAlert('Error al guardar el producto', 'danger');
    }
}

// Eliminar producto
async function deleteProducto(id) {
    if (!confirm('¿Está seguro de eliminar este producto?')) {
        return;
    }
    
    try {
        await fetchAPI(`/productos/${id}`, {
            method: 'DELETE'
        });
        
        showAlert('Producto eliminado exitosamente', 'success');
        await loadProductos();
        
    } catch (error) {
        console.error('Error eliminando producto:', error);
        showAlert('Error al eliminar el producto', 'danger');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadCategoriasYProveedores();
    loadProductos();
});