let ventas = [];
let ventaSeleccionada = null;

async function loadDevolucionesStats() {
    console.log('📊 Iniciando carga de estadísticas...');
    try {
        console.log('📊 Haciendo petición a /devoluciones/resumen...');
        const resumen = await fetchAPIAuth('/devoluciones/resumen');
        console.log('📊 Resumen recibido:', resumen);
        
        const totalDevoluciones = resumen.total_devoluciones || 0;
        const totalReembolsado = parseFloat(resumen.total_reembolsado) || 0;
        const totalProductos = resumen.total_productos_devueltos || 0;
        
        console.log('📊 Valores parseados:', {
            totalDevoluciones,
            totalReembolsado,
            totalProductos
        });
        
        const statsHTML = `
            <div class="stat-card">
                <h3>↩️ Total Devoluciones</h3>
                <div class="value">${totalDevoluciones}</div>
                <div class="trend">
                    Devoluciones registradas
                </div>
            </div>
            <div class="stat-card">
                <h3>💰 Total Reembolsado</h3>
                <div class="value">${formatCurrency(totalReembolsado)}</div>
                <div class="trend">
                    Monto devuelto
                </div>
            </div>
            <div class="stat-card">
                <h3>📦 Productos Devueltos</h3>
                <div class="value">${totalProductos}</div>
                <div class="trend">
                    Unidades devueltas
                </div>
            </div>
        `;
        
        console.log('📊 Actualizando HTML...');
        document.getElementById('devoluciones-stats').innerHTML = statsHTML;
        console.log('📊 Estadísticas cargadas correctamente');
        
    } catch (error) {
        console.error('❌ Error cargando estadísticas:', error);
        console.error('❌ Detalle del error:', error.message);
        console.error('❌ Stack:', error.stack);
        document.getElementById('devoluciones-stats').innerHTML = `
            <div class="alert alert-danger">
                Error al cargar estadísticas: ${error.message}
            </div>
        `;
    }
}

async function loadVentas() {
    try {
        ventas = await fetchAPIAuth('/ventas');
        
        const select = document.getElementById('venta-select');
        select.innerHTML = '<option value="">Seleccionar venta...</option>' +
            ventas.map(venta => `
                <option value="${venta.id_venta}">#${venta.id_venta} - ${esc(venta.cliente_nombre) || 'Sin cliente'} (${formatDate(venta.fecha)})</option>
            `).join('');
        
    } catch (error) {
        console.error('Error cargando ventas:', error);
        showNotification('Error al cargar ventas', 'error');
    }
}

async function cargarDetallesVenta() {
    const idVenta = document.getElementById('venta-select').value;
    const productoSelect = document.getElementById('producto-select');
    
    if (!idVenta) {
        productoSelect.innerHTML = '<option value="">Seleccionar producto...</option>';
        ventaSeleccionada = null;
        return;
    }
    
    try {
        const detalles = await fetchAPIAuth(`/ventas/${idVenta}/detalles`);
        ventaSeleccionada = ventas.find(v => v.id_venta === parseInt(idVenta));
        
        productoSelect.innerHTML = '<option value="">Seleccionar producto...</option>' +
            detalles.map(detalle => `
                <option value="${detalle.id_producto}" data-precio="${detalle.precio_unitario}" data-max="${detalle.cantidad}">
                    ${esc(detalle.producto_nombre)} (Stock: ${detalle.cantidad} | Precio: ${formatCurrency(detalle.precio_unitario)})
                </option>
            `).join('');
        
    } catch (error) {
        console.error('Error cargando detalles:', error);
        showNotification('Error al cargar detalles de la venta', 'error');
    }
}

async function calcularReembolso() {
    const productoSelect = document.getElementById('producto-select');
    const cantidad = parseInt(document.getElementById('cantidad').value);
    
    if (!productoSelect.value || !cantidad) {
        document.getElementById('reembolso-info').style.display = 'none';
        return;
    }
    
    const selectedOption = productoSelect.selectedOptions[0];
    const precio = parseFloat(selectedOption.dataset.precio) || 0;
    const montoReembolso = precio * cantidad;
    
    document.getElementById('monto-reembolso').textContent = formatCurrency(montoReembolso);
    document.getElementById('reembolso-info').style.display = 'block';
}

async function procesarDevolucion() {
    const idVenta = document.getElementById('venta-select').value;
    const idProducto = document.getElementById('producto-select').value;
    const cantidad = parseInt(document.getElementById('cantidad').value);
    const metodoReembolso = document.getElementById('metodo-reembolso').value;
    const motivo = document.getElementById('motivo').value;
    
    if (!idVenta || !idProducto || !cantidad) {
        showNotification('Por favor complete todos los campos requeridos', 'error');
        return;
    }
    
    const productoSelect = document.getElementById('producto-select');
    const maxCantidad = parseInt(productoSelect.selectedOptions[0].dataset.max);
    
    if (cantidad > maxCantidad) {
        showNotification(`La cantidad máxima a devolver es ${maxCantidad}`, 'error');
        return;
    }
    
    const userInfo = JSON.parse(localStorage.getItem('usuario') || '{}');
    
    try {
        const response = await fetchAPIAuth('/devoluciones', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id_venta: parseInt(idVenta),
                id_producto: parseInt(idProducto),
                cantidad,
                motivo,
                metodo_reembolso: metodoReembolso,
                id_usuario: userInfo.id_usuario
            })
        });
        
        showNotification('Devolución procesada exitosamente', 'success');
        
        limpiarFormulario();
        loadDevolucionesStats();
        loadDevoluciones();
        
    } catch (error) {
        console.error('Error procesando devolución:', error);
        showNotification('Error al procesar la devolución', 'error');
    }
}

function limpiarFormulario() {
    document.getElementById('venta-select').value = '';
    document.getElementById('producto-select').innerHTML = '<option value="">Seleccionar producto...</option>';
    document.getElementById('cantidad').value = 1;
    document.getElementById('motivo').value = '';
    document.getElementById('reembolso-info').style.display = 'none';
    ventaSeleccionada = null;
}

async function loadDevoluciones() {
    try {
        const devoluciones = await fetchAPIAuth('/devoluciones');
        console.log('📋 Devoluciones recibidas:', devoluciones);
        console.log('📋 Cantidad de devoluciones:', devoluciones.length);
        
        if (!devoluciones || devoluciones.length === 0) {
            document.getElementById('devoluciones-tbody').innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        No hay devoluciones registradas
                    </td>
                </tr>
            `;
            return;
        }
        
        const tbody = document.getElementById('devoluciones-tbody');
        tbody.innerHTML = devoluciones.map(devolucion => {
            const monto = parseFloat(devolucion.monto_reembolso) || 0;
            console.log('💰 Monto devolución:', devolucion.id_devolucion, monto);
            return `
            <tr>
                <td>#${devolucion.id_devolucion}</td>
                <td>${formatDate(devolucion.fecha)}</td>
                <td>#${devolucion.id_venta}</td>
                <td>${devolucion.id_cliente ? '#' + devolucion.id_cliente : ''} ${esc(devolucion.cliente_nombre) || 'Sin cliente'}</td>
                <td>${esc(devolucion.producto_nombre)}</td>
                <td>${devolucion.cantidad}</td>
                <td><strong>${formatCurrency(monto)}</strong></td>
                <td>${esc(devolucion.metodo_reembolso)}</td>
                <td>${esc(devolucion.motivo) || '-'}</td>
            </tr>
        `;
        }).join('');
        
    } catch (error) {
        console.error('Error cargando devoluciones:', error);
        document.getElementById('devoluciones-tbody').innerHTML = `
            <tr>
                <td colspan="9" class="alert alert-danger">
                    Error al cargar devoluciones: ${esc(error.message)}
                </td>
            </tr>
        `;
    }
}

document.getElementById('producto-select').addEventListener('change', calcularReembolso);
document.getElementById('cantidad').addEventListener('input', calcularReembolso);

document.addEventListener('DOMContentLoaded', () => {
    loadDevolucionesStats();
    loadVentas();
    loadDevoluciones();
});
