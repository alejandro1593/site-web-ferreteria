let productos = [];
let categorias = [];
let proveedores = [];

// Cargar categorías y proveedores para los select
async function loadCategoriasYProveedores() {
    try {
        categorias = await fetchAPIAuth('/categorias');
        proveedores = await fetchAPIAuth('/proveedores');

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
    console.log('🔄 Cargando productos...');
    try {
        console.log('📡 Llamando a API:', endpoint);
        productos = await fetchAPIAuth(endpoint);
        console.log('✅ Productos recibidos:', productos.length, 'productos');
        console.log('📊 Primer producto:', productos[0]);
        renderProductos(productos);
    } catch (error) {
        console.error('❌ Error cargando productos:', error);
        document.getElementById('productos-container').innerHTML = `
            <div class="alert alert-danger">
                Error al cargar productos: ${error.message}
            </div>
        `;
    }
}

// Renderizar productos
function renderProductos(data) {
    console.log('🎨 Renderizando productos:', data.length, 'productos');
    const container = document.getElementById('productos-container');
    
    if (!container) {
        console.error('❌ Contenedor #productos-container no encontrado');
        return;
    }
    
    if (data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i>📦</i>
                <h3>No hay productos disponibles</h3>
            </div>
        `;
        return;
    }
    
    console.log('🖼️ Generando HTML para productos...');
    const html = data.map(producto => {
        const stockClass = producto.stock_actual <= producto.stock_minimo ? 'stock-low' : 'stock-ok';
        const stockText = producto.stock_actual <= producto.stock_minimo ? 'Stock bajo' : 'Stock OK';
        
        console.log('🖼️ Procesando producto:', producto.nombre, '- Imagen:', producto.imagen);
        
        return `
            <div class="product-card">
                <div style="width: 100%; height: 200px; overflow: hidden; background: #f5f5f5; display: flex; align-items: center; justify-content: center;">
                    <img src="${esc(producto.imagen)}" 
                         alt="${esc(producto.nombre)}" 
                         class="product-image" 
                         style="display: block; max-width: 100%; max-height: 100%; object-fit: contain;"
                         onerror="console.log('❌ Error cargando imagen:', this.src); this.src='https://via.placeholder.com/400?text=No+Image'; this.onerror=null;">
                </div>
                <div class="product-info">
                    <h4>${esc(producto.nombre)}</h4>
                    <p><small>Código: ${esc(producto.codigo)}</small></p>
                    <p><small>${esc(producto.categoria_nombre)}</small></p>
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
    
    console.log('💾 Insertando HTML en contenedor...');
    container.innerHTML = html;
    console.log('✅ Productos renderizados exitosamente');
    
    // Forzar recarga de imágenes
    setTimeout(() => {
        const images = container.querySelectorAll('img.product-image');
        console.log('🖼️ Imágenes en el DOM:', images.length);
        images.forEach((img, index) => {
            console.log(`🖼️ Imagen ${index}:`, img.src);
        });
    }, 100);
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
    document.getElementById('producto-imagen-url').value = '';
    document.getElementById('producto-imagen-archivo').value = '';
    document.getElementById('image-preview-container').style.display = 'none';
    document.getElementById('file-info').style.display = 'none';
    
    // Resetear a URL por defecto
    document.getElementById('tipo-url').checked = true;
    document.getElementById('url-imagen-group').style.display = 'block';
    document.getElementById('archivo-imagen-group').style.display = 'none';
    
    openModal('producto-modal');
}

// Previsualizar imagen
function previewImage() {
    const tipoImagen = document.querySelector('input[name="tipo-imagen"]:checked').value;
    const imagenUrl = document.getElementById('producto-imagen-url').value.trim();
    const imagenArchivo = document.getElementById('producto-imagen-archivo');
    const previewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const fileInfo = document.getElementById('file-info');
    
    if (tipoImagen === 'url') {
        // Previsualizar URL externa
        if (imagenUrl) {
            previewContainer.style.display = 'block';
            imagePreview.src = imagenUrl;
            imagePreview.onerror = function() {
                this.src = 'https://via.placeholder.com/400?text=URL+Inválida';
            };
            fileInfo.style.display = 'none';
        } else {
            previewContainer.style.display = 'none';
            fileInfo.style.display = 'none';
        }
    } else if (tipoImagen === 'archivo') {
        // Previsualizar archivo subido
        if (imagenArchivo.files && imagenArchivo.files[0]) {
            const file = imagenArchivo.files[0];
            
            // Validar tamaño del archivo (máximo 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showNotification('El archivo supera el límite de 5MB', 'error');
                imagenArchivo.value = '';
                previewContainer.style.display = 'none';
                return;
            }
            
            // Validar tipo de archivo
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                showNotification('Tipo de archivo no permitido', 'error');
                imagenArchivo.value = '';
                previewContainer.style.display = 'none';
                return;
            }
            
            // Mostrar nombre del archivo
            const fileName = file.name;
            fileInfo.innerHTML = `Se guardará como: <span id="nombre-archivo">${fileName}</span>`;
            fileInfo.style.display = 'block';
            
            // Leer archivo y previsualizar
            const reader = new FileReader();
            reader.onload = function(e) {
                const dataUrl = e.target.result;
                previewContainer.style.display = 'block';
                imagePreview.src = dataUrl;
                imagePreview.onerror = null;
            };
            reader.readAsDataURL(file);
        } else {
            previewContainer.style.display = 'none';
            fileInfo.style.display = 'none';
        }
    } else {
        previewContainer.style.display = 'none';
        fileInfo.style.display = 'none';
    }
}

// Función para alternar entre URL y archivo
function toggleImageType(tipo) {
    const urlGroup = document.getElementById('url-imagen-group');
    const archivoGroup = document.getElementById('archivo-imagen-group');
    const urlInput = document.getElementById('producto-imagen-url');
    const archivoInput = document.getElementById('producto-imagen-archivo');
    
    if (tipo === 'url') {
        urlGroup.style.display = 'block';
        archivoGroup.style.display = 'none';
        urlInput.value = '';
        archivoInput.value = '';
    } else {
        urlGroup.style.display = 'none';
        archivoGroup.style.display = 'block';
        archivoInput.value = '';
        archivoInput.value = '';
    }
}

// Editar producto
async function editProducto(id) {
    try {
        const producto = await fetchAPIAuth(`/productos/${id}`);

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

        // Determinar tipo de imagen actual
        let tipoImagen = 'url';
        let imagenUrl = '';

        if (producto.imagen) {
            if (producto.imagen.startsWith('/uploads/')) {
                // Es un archivo subido
                tipoImagen = 'archivo';
                imagenUrl = producto.imagen;
            } else {
                // Es una URL externa
                tipoImagen = 'url';
                imagenUrl = producto.imagen;
            }
        }
        
        // Configurar radio buttons según tipo
        document.getElementById('tipo-url').checked = (tipoImagen === 'url');
        document.getElementById('tipo-archivo').checked = (tipoImagen === 'archivo');
        
        // Mostrar campos apropiados
        document.getElementById('url-imagen-group').style.display = (tipoImagen === 'url') ? 'block' : 'none';
        document.getElementById('archivo-imagen-group').style.display = (tipoImagen === 'archivo') ? 'block' : 'none';
        
        // Previsualizar imagen
        if (imagenUrl) {
            const previewContainer = document.getElementById('image-preview-container');
            const imagePreview = document.getElementById('image-preview');
            previewContainer.style.display = 'block';
            imagePreview.src = imagenUrl;
            imagePreview.onerror = function() {
                this.src = 'https://via.placeholder.com/400?text=URL+Inválida';
            };
            document.getElementById('file-info').style.display = 'none';
        } else {
            document.getElementById('image-preview-container').style.display = 'none';
            document.getElementById('file-info').style.display = 'none';
        }
        
        openModal('producto-modal');
    } catch (error) {
        console.error('Error cargando producto:', error);
        showNotification('Error al cargar el producto', 'error');
    }
}

// Actualizar stock
async function updateStock(id) {
    const nuevoStock = prompt('Ingrese el nuevo stock:');

    if (nuevoStock === null || nuevoStock.trim() === '') {
        return;
    }

    try {
        await fetchAPIAuth(`/productos/${id}/stock`, {
            method: 'PUT',
            body: { cantidad: parseInt(nuevoStock) }
        });

        showNotification('Stock actualizado exitosamente', 'success');
        await loadProductos();

    } catch (error) {
        console.error('Error actualizando stock:', error);
        showNotification('Error al actualizar el stock', 'error');
    }
}

// Guardar producto
async function saveProducto() {
    console.log('💾 Iniciando saveProducto()...');
    
    const idInput = document.getElementById('producto-id');
    const nombreInput = document.getElementById('producto-nombre');
    const codigoInput = document.getElementById('producto-codigo');
    const descripcionInput = document.getElementById('producto-descripcion');
    const precioCompraInput = document.getElementById('producto-precio-compra');
    const precioVentaInput = document.getElementById('producto-precio-venta');
    const stockActualInput = document.getElementById('producto-stock-actual');
    const stockMinimoInput = document.getElementById('producto-stock-minimo');
    const categoriaInput = document.getElementById('producto-categoria');
    const proveedorInput = document.getElementById('producto-proveedor');
    const activoInput = document.getElementById('producto-activo');
    
    console.log('🔍 Elementos del formulario:', {
        id: idInput?.value,
        nombre: nombreInput?.value,
        codigo: codigoInput?.value,
        descripcion: descripcionInput?.value,
        precioCompra: precioCompraInput?.value,
        precioVenta: precioVentaInput?.value,
        stockActual: stockActualInput?.value,
        stockMinimo: stockMinimoInput?.value,
        categoria: categoriaInput?.value,
        proveedor: proveedorInput?.value,
        activo: activoInput?.value
    });
    
    const id = idInput ? idInput.value : '';
    const nombre = nombreInput ? nombreInput.value.trim() : '';
    const codigo = codigoInput ? codigoInput.value.trim() : '';
    const descripcion = descripcionInput ? descripcionInput.value.trim() : '';
    const precioCompra = precioCompraInput ? precioCompraInput.value : '';
    const precioVenta = precioVentaInput ? precioVentaInput.value : '';
    const stockActual = stockActualInput ? stockActualInput.value : '';
    const stockMinimo = stockMinimoInput ? stockMinimoInput.value : '';
    const categoria = categoriaInput ? categoriaInput.value : '';
    const proveedor = proveedorInput ? proveedorInput.value : '';
    const activo = activoInput ? activoInput.value === 'true' : true;

    console.log('📋 Datos del formulario:', { id, nombre, codigo, descripcion, precioCompra, precioVenta, stockActual, stockMinimo, categoria, proveedor, activo });

    const tipoImagen = document.querySelector('input[name="tipo-imagen"]:checked').value;
    let imagen = document.getElementById('producto-imagen-url').value.trim();
    const imagenArchivo = document.getElementById('producto-imagen-archivo');

    if (!nombre || !precioVenta) {
        showNotification('Nombre y precio de venta son obligatorios', 'warning');
        return;
    }

    // Preparar datos
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

    console.log('📦 Datos preparados para enviar:', data);

    // Manejar imagen según el tipo seleccionado
    if (tipoImagen === 'archivo' && imagenArchivo.files && imagenArchivo.files[0]) {
        // Subir archivo y crear producto
        console.log('📤 Subiendo producto con archivo...');
        const formData = new FormData();
        formData.append('imagen', imagenArchivo.files[0]);
        formData.append('nombre', nombre);
        formData.append('codigo', codigo);
        formData.append('descripcion', descripcion);
        formData.append('precio_compra', precioCompra);
        formData.append('precio_venta', precioVenta);
        formData.append('stock_actual', stockActual);
        formData.append('stock_minimo', stockMinimo);
        formData.append('id_categoria', categoria);
        formData.append('id_proveedor', proveedor);
        formData.append('activo', activo);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/productos/upload', {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: formData
            });

            console.log('📡 Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || errorData.message || 'Error al crear producto');
            }

            const result = await response.json();

            showNotification(result.message || 'Producto creado exitosamente', 'success');
            closeModal('producto-modal');
            await loadProductos();

        } catch (error) {
            console.error('❌ Error creando producto con imagen:', error);
            showNotification(error.message || 'Error al crear el producto', 'error');
        }
    } else {
        try {
            // Usar URL externa
            console.log('📤 Enviando producto con URL de imagen...');
            if (imagen) {
                data.imagen = imagen;
            } else {
                // Usar imagen existente o placeholder
                const productoId = id || (productos.length > 0 ? productos[productos.length -1].id_producto : null);
                const productoExistente = productoId ? productos.find(p => p.id_producto === productoId) : null;
                data.imagen = productoExistente ? productoExistente.imagen : 'https://via.placeholder.com/400?text=Sin+Imagen';
            }

            console.log('📦 Enviando datos:', data);
            const url = id ? `/productos/${id}` : '/productos';
            const method = id ? 'PUT' : 'POST';

            console.log(`📡 Llamando a API: ${url}, Método: ${method}`);

            const result = await fetchAPIAuth(url, {
                method: method,
                body: data
            });

            showNotification(id ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente', 'success');
            closeModal('producto-modal');
            await loadProductos();
        } catch (error) {
            console.error('❌ Error guardando producto:', error);
            showNotification(error.message || 'Error al guardar el producto', 'error');
        }
    }
}

// Eliminar producto
async function deleteProducto(id) {
    if (!confirm('¿Está seguro de eliminar este producto?')) {
        return;
    }

    try {
        await fetchAPIAuth(`/productos/${id}`, {
            method: 'DELETE'
        });

        showNotification('Producto eliminado exitosamente', 'success');
        await loadProductos();

    } catch (error) {
        console.error('Error eliminando producto:', error);
        showNotification('Error al eliminar el producto', 'error');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadCategoriasYProveedores();
    loadProductos();

    // Prevenir envío del formulario por Enter
    const productoForm = document.getElementById('producto-form');
    if (productoForm) {
        productoForm.addEventListener('submit', (e) => {
            e.preventDefault();
        });
    }
});