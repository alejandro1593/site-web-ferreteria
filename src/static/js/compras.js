let compras = [];
let productosCompra = []; // productos agregados a la compra actual
let catalogoProductos = [];

// Cargar compras
async function loadCompras() {
    try {
        compras = await fetchAPIAuth('/compras');
        renderCompras(compras);
    } catch (error) {
        console.error('Error cargando compras:', error);
        document.getElementById('compras-tbody').innerHTML = `
            <tr><td colspan="7" class="alert alert-danger">Error al cargar compras</td></tr>
        `;
    }
}

// Renderizar lista de compras
function renderCompras(data) {
    const tbody = document.getElementById('compras-tbody');

    if (data.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="7" class="empty-state">No hay compras registradas</td></tr>
        `;
        return;
    }

    tbody.innerHTML = data.map(c => `
        <tr>
            <td>#${c.id_compra}</td>
            <td>${new Date(c.fecha).toLocaleDateString()}</td>
            <td><strong>${esc(c.proveedor_nombre)}</strong></td>
            <td>$${parseFloat(c.total).toFixed(2)}</td>
            <td>
                <span class="status-badge ${c.estado === 'completada' ? 'status-active' : 'status-inactive'}">
                    ${esc(c.estado)}
                </span>
            </td>
            <td>${esc(c.usuario_username) || '-'}</td>
            <td>
                <button class="btn btn-info btn-sm" onclick="verDetalleCompra(${c.id_compra})">👁️</button>
                ${c.estado === 'completada' ? `
                    <button class="btn btn-danger btn-sm" onclick="anularCompra(${c.id_compra})" title="Anular y descontar stock">🚫</button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

// Abrir modal de nueva compra
async function openCompraModal() {
    document.getElementById('compra-form').reset();
    productosCompra = [];

    try {
        const [proveedores, productos] = await Promise.all([
            fetchAPIAuth('/proveedores'),
            fetchAPIAuth('/productos')
        ]);
        catalogoProductos = productos;

        const provSelect = document.getElementById('compra-proveedor');
        provSelect.innerHTML = '<option value="">Seleccionar proveedor...</option>' +
            proveedores.map(p => `<option value="${p.id_proveedor}">${esc(p.nombre)}</option>`).join('');

        const prodSelect = document.getElementById('compra-producto');
        prodSelect.innerHTML = '<option value="">Seleccionar producto...</option>' +
            productos.map(p => `<option value="${p.id_producto}" data-costo="${p.precio_compra || 0}">${esc(p.nombre)}</option>`).join('');

        prodSelect.onchange = function () {
            const opt = this.options[this.selectedIndex];
            if (opt && opt.dataset.costo !== undefined) {
                document.getElementById('compra-costo').value = opt.dataset.costo;
            }
        };

        renderItemsCompra();
        openModal('compra-modal');
    } catch (error) {
        showNotification('Error al cargar datos para la compra', 'error');
    }
}

// Agregar producto a la compra en curso
function agregarProductoCompra() {
    const prodSelect = document.getElementById('compra-producto');
    const idProducto = Number(prodSelect.value);
    const cantidad = Number(document.getElementById('compra-cantidad').value);
    const costo = Number(document.getElementById('compra-costo').value);

    if (!idProducto || cantidad <= 0 || costo < 0 || !costo) {
        showNotification('Seleccione producto, cantidad y costo válidos', 'error');
        return;
    }

    const producto = catalogoProductos.find(p => p.id_producto === idProducto);
    const existente = productosCompra.find(i => i.id_producto === idProducto);

    if (existente) {
        existente.cantidad += cantidad;
        existente.precio_costo = costo; // último costo ingresado
    } else {
        productosCompra.push({ id_producto: idProducto, nombre: producto ? producto.nombre : 'Producto', cantidad, precio_costo: costo });
    }

    renderItemsCompra();
}

// Quitar producto de la compra en curso
function quitarProductoCompra(index) {
    productosCompra.splice(index, 1);
    renderItemsCompra();
}

// Renderizar tabla de items
function renderItemsCompra() {
    const tbody = document.getElementById('compra-items-tbody');

    if (productosCompra.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Agregue productos a la compra</td></tr>';
        document.getElementById('compra-total').textContent = '0.00';
        return;
    }

    let total = 0;
    tbody.innerHTML = productosCompra.map((item, i) => {
        const subtotal = item.cantidad * item.precio_costo;
        total += subtotal;
        return `
            <tr>
                <td>${esc(item.nombre)}</td>
                <td>${item.cantidad}</td>
                <td>$${item.precio_costo.toFixed(2)}</td>
                <td>$${subtotal.toFixed(2)}</td>
                <td><button type="button" class="btn btn-danger btn-sm" onclick="quitarProductoCompra(${i})">🗑️</button></td>
            </tr>
        `;
    }).join('');

    document.getElementById('compra-total').textContent = total.toFixed(2);
}

// Guardar compra
async function saveCompra() {
    const idProveedor = Number(document.getElementById('compra-proveedor').value);
    const observaciones = document.getElementById('compra-observaciones').value.trim();

    if (!idProveedor) {
        showNotification('Seleccione un proveedor', 'error');
        return;
    }
    if (productosCompra.length === 0) {
        showNotification('Agregue al menos un producto', 'error');
        return;
    }

    try {
        await fetchAPIAuth('/compras', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_proveedor: idProveedor,
                observaciones,
                productos: productosCompra.map(({ id_producto, cantidad, precio_costo }) => ({ id_producto, cantidad, precio_costo }))
            })
        });
        showNotification('✅ Compra registrada. Stock actualizado', 'success');
        closeModal('compra-modal');
        loadCompras();
    } catch (error) {
        showNotification(error.message || 'Error al registrar la compra', 'error');
    }
}

// Ver detalle de una compra
async function verDetalleCompra(id) {
    try {
        const compra = await fetchAPIAuth(`/compras/${id}`);
        document.getElementById('detalle-modal-title').textContent = `Compra #${compra.id_compra} - ${compra.proveedor_nombre}`;

        const detallesHTML = compra.detalles.map(d => `
            <tr>
                <td>${esc(d.producto_nombre)}</td>
                <td>${d.cantidad}</td>
                <td>$${parseFloat(d.precio_costo).toFixed(2)}</td>
                <td>$${parseFloat(d.subtotal).toFixed(2)}</td>
            </tr>
        `).join('');

        document.getElementById('detalle-compra-content').innerHTML = `
            <p><strong>Fecha:</strong> ${new Date(compra.fecha).toLocaleString()}</p>
            <p><strong>Estado:</strong> ${esc(compra.estado)}</p>
            ${compra.observaciones ? `<p><strong>Observaciones:</strong> ${esc(compra.observaciones)}</p>` : ''}
            <table style="width:100%;">
                <thead><tr><th>Producto</th><th>Cant.</th><th>Costo</th><th>Subtotal</th></tr></thead>
                <tbody>${detallesHTML}</tbody>
                <tfoot><tr><td colspan="3" style="text-align:right;"><strong>Total:</strong></td><td><strong>$${parseFloat(compra.total).toFixed(2)}</strong></td></tr></tfoot>
            </table>
        `;
        openModal('detalle-modal');
    } catch (error) {
        showNotification('Error al cargar el detalle', 'error');
    }
}

// Anular compra con confirmación
async function anularCompra(id) {
    if (!confirm('¿Anular esta compra? El stock será descontado.')) return;

    try {
        await fetchAPIAuth(`/compras/${id}/anular`, { method: 'PUT' });
        showNotification('Compra anulada exitosamente', 'success');
        loadCompras();
    } catch (error) {
        showNotification(error.message || 'Error al anular la compra', 'error');
    }
}
