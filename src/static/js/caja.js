let cajaAbierta = null;
let usuarios = [];

async function verificarEstadoCaja() {
    try {
        const usuario = getCurrentUser();
        if (!usuario) {
            mostrarCajaCerrada();
            return;
        }
        usuarios = [usuario];
        const caja = await fetchAPIAuth('/caja/abierta');
        if (caja) {
            cajaAbierta = caja;
            mostrarCajaAbierta(caja);
            cargarResumenCaja(caja.id_caja);
        } else {
            mostrarCajaCerrada();
        }
    } catch (error) {
        mostrarCajaCerrada();
    }
}

async function cargarUsuarios() {
    const usuario = getCurrentUser();
    if (!usuario) return;
    usuarios = [usuario];
    const option = `<option value="${usuario.id_usuario}">${esc(usuario.nombre)} (${esc(usuario.rol)})</option>`;
    document.getElementById('cajero-select').innerHTML = option;
    document.getElementById('cajero-cierre-select').innerHTML = option;
}

function mostrarCajaCerrada() {
    document.getElementById('caja-cerrada').style.display = 'block';
    document.getElementById('caja-abierta').style.display = 'none';
    document.getElementById('resumen-caja-section').style.display = 'none';
    cajaAbierta = null;
}

function mostrarCajaAbierta(caja) {
    document.getElementById('caja-cerrada').style.display = 'none';
    document.getElementById('caja-abierta').style.display = 'block';
    document.getElementById('resumen-caja-section').style.display = 'block';
    
    const usuario = usuarios.find(u => u.id_usuario === caja.id_usuario);
    if (usuario) {
        document.getElementById('cajero-select').value = usuario.id_usuario;
        document.getElementById('cajero-select').disabled = true;
    }
}

async function abrirCaja() {
    const usuario = getCurrentUser();
    const password = document.getElementById('password-cajero').value;
    const montoApertura = parseFloat(document.getElementById('monto-apertura').value) || 0;
    const observaciones = document.getElementById('observaciones-apertura').value;

    if (!usuario) {
        showNotification('Sesión no válida', 'error');
        return;
    }
    
    if (!password) {
        showNotification('Por favor ingrese el password del cajero', 'error');
        return;
    }
    
    try {
        await fetchAPIAuth('/caja/abrir', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password,
                monto_apertura: montoApertura,
                observaciones
            })
        });
        
        showNotification('Caja abierta exitosamente', 'success');
        document.getElementById('password-cajero').value = '';
        document.getElementById('monto-apertura').value = 0;
        document.getElementById('observaciones-apertura').value = '';
        
        verificarEstadoCaja();
        loadCajas();
        
    } catch (error) {
        console.error('❌ Error abriendo caja:', error);
        console.error('❌ Error message:', error.message);
        showNotification(`Error al abrir la caja: ${error.message}`, 'error');
    }
}

async function mostrarModalCierre() {
    if (!cajaAbierta) {
        showNotification('No hay caja abierta', 'error');
        return;
    }
    
    try {
        const resumen = await fetchAPIAuth(`/caja/${cajaAbierta.id_caja}/resumen`);
        console.log('📊 Resumen de caja recibido:', resumen);
        console.log('📊 resumen.resumen:', resumen.resumen);
        console.log('📊 total_ventas:', resumen.resumen?.total_ventas);
        console.log('📊 total_devoluciones:', resumen.resumen?.total_devoluciones);
        
        const montoApertura = parseFloat(cajaAbierta.monto_apertura) || 0;
        const totalVentas = parseFloat(resumen.resumen?.total_ventas) || 0;
        const totalAbonos = parseFloat(resumen.resumen?.total_abonos) || 0;
        const totalDevoluciones = parseFloat(resumen.resumen?.total_devoluciones) || 0;
        const montoEsperado = montoApertura + totalVentas + totalAbonos - totalDevoluciones;
        
        document.getElementById('monto-esperado').textContent = formatCurrency(montoEsperado);
        document.getElementById('previo-cierre').style.display = 'block';
        
        const usuario = usuarios.find(u => u.id_usuario === cajaAbierta.id_usuario);
        if (usuario) {
            document.getElementById('cajero-cierre-select').value = usuario.id_usuario;
        }
        
        openModal('modal-cierre-caja');
        
    } catch (error) {
        console.error('Error obteniendo resumen:', error);
        showNotification('Error al obtener resumen de caja', 'error');
    }
}

async function cerrarCaja() {
    const usuario = getCurrentUser();
    const password = document.getElementById('password-cierre').value;
    const montoCierre = parseFloat(document.getElementById('monto-cierre').value);
    const observaciones = document.getElementById('observaciones-cierre').value;

    if (!usuario) {
        showNotification('Sesión no válida', 'error');
        return;
    }
    
    if (!password) {
        showNotification('Por favor ingrese el password del cajero', 'error');
        return;
    }
    
    if (isNaN(montoCierre) || montoCierre < 0) {
        showNotification('Por favor ingrese un monto válido', 'error');
        return;
    }
    
    try {
        console.log('📤 Enviando petición POST /caja/cerrar...');
        await fetchAPIAuth('/caja/cerrar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password,
                monto_cierre: montoCierre,
                observaciones
            })
        });
        
        console.log('✅ Caja cerrada exitosamente');
        showNotification('Caja cerrada exitosamente', 'success');
        closeModal('modal-cierre-caja');
        document.getElementById('password-cierre').value = '';
        document.getElementById('monto-cierre').value = '';
        document.getElementById('observaciones-cierre').value = '';
        document.getElementById('previo-cierre').style.display = 'none';
        
        document.getElementById('cajero-select').disabled = false;
        
        verificarEstadoCaja();
        loadCajas();
        
    } catch (error) {
        console.error('❌ Error cerrando caja:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        showNotification(`Error al cerrar la caja: ${error.message}`, 'error');
    }
}

async function cargarResumenCaja(idCaja) {
    try {
        const resumen = await fetchAPIAuth(`/caja/${idCaja}/resumen`);
        
        const statsHTML = `
            <div class="stat-card">
                <h3>💵 Ventas del Turno</h3>
                <div class="value">${formatCurrency(resumen.resumen?.total_ventas || 0)}</div>
                <div class="trend">
                    ${resumen.resumen?.total_ventas_count || 0} ventas
                </div>
            </div>
            <div class="stat-card">
                <h3>↩️ Devoluciones</h3>
                <div class="value">${formatCurrency(resumen.resumen?.total_devoluciones || 0)}</div>
                <div class="trend">
                    Reembolsos del turno
                </div>
            </div>
            <div class="stat-card">
                <h3>💰 Ingreso Neto</h3>
                <div class="value">${formatCurrency((resumen.resumen?.total_ventas || 0) + (resumen.resumen?.total_abonos || 0) - (resumen.resumen?.total_devoluciones || 0))}</div>
                <div class="trend">
                    Ventas - Devoluciones
                </div>
            </div>
            <div class="stat-card">
                <h3>⏰ Tiempo Abierta</h3>
                <div class="value">${calcularTiempoAbierta(resumen.fecha_apertura, resumen.fecha_cierre)}</div>
                <div class="trend">
                    Duración del turno
                </div>
            </div>
        `;
        
        document.getElementById('caja-stats').innerHTML = statsHTML;
        
        const detallesHTML = `
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                <div>
                    <h4>Información General</h4>
                    <div style="margin-top: 10px;">
                        <p><strong>Usuario:</strong> ${esc(resumen.usuario_nombre)}</p>
                        <p><strong>Fecha Apertura:</strong> ${formatDateTime(resumen.fecha_apertura)}</p>
                        <p><strong>Fecha Cierre:</strong> ${resumen.fecha_cierre ? formatDateTime(resumen.fecha_cierre) : 'En curso'}</p>
                        <p><strong>Monto Apertura:</strong> ${formatCurrency(resumen.monto_apertura || 0)}</p>
                        <p><strong>Estado:</strong> ${esc(resumen.estado)}</p>
                    </div>
                </div>
                <div>
                    <h4>Resumen Financiero</h4>
                    <div style="margin-top: 10px;">
                        <p><strong>Ventas:</strong> ${formatCurrency(resumen.resumen?.total_ventas || 0)}</p>
                        <p><strong>Devoluciones:</strong> ${formatCurrency(resumen.resumen?.total_devoluciones || 0)}</p>
                        <p><strong>Ingreso Neto:</strong> ${formatCurrency((resumen.resumen?.total_ventas || 0) + (resumen.resumen?.total_abonos || 0) - (resumen.resumen?.total_devoluciones || 0))}</p>
                        ${resumen.fecha_cierre ? `
                            <p><strong>Monto Cierre:</strong> ${formatCurrency(resumen.monto_cierre || 0)}</p>
                            <p><strong>Diferencia:</strong> <span style="color: ${resumen.diferencia >= 0 ? 'green' : 'red'}">${formatCurrency(resumen.diferencia || 0)}</span></p>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('resumen-detalles').innerHTML = detallesHTML;
        
    } catch (error) {
        console.error('Error cargando resumen de caja:', error);
        document.getElementById('caja-stats').innerHTML = `
            <div class="alert alert-danger">
                Error al cargar estadísticas de caja
            </div>
        `;
    }
}

async function loadCajas() {
    try {
        const cajas = await fetchAPIAuth('/caja');
        
        if (cajas.length === 0) {
            document.getElementById('cajas-tbody').innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        No hay cajas registradas
                    </td>
                </tr>
            `;
            return;
        }
        
        const tbody = document.getElementById('cajas-tbody');
        tbody.innerHTML = cajas.map(caja => {
            const diferencia = caja.diferencia || 0;
            const diferenciaColor = diferencia > 0 ? 'green' : (diferencia < 0 ? 'red' : 'gray');
            
            return `
                <tr>
                    <td>#${caja.id_caja}</td>
                    <td>${esc(caja.usuario_nombre)}</td>
                    <td>${formatDateTime(caja.fecha_apertura)}</td>
                    <td>${caja.fecha_cierre ? formatDateTime(caja.fecha_cierre) : 'En curso'}</td>
                    <td>${formatCurrency(caja.monto_apertura || 0)}</td>
                    <td>${formatCurrency(caja.monto_cierre || 0)}</td>
                    <td style="color: ${diferenciaColor}; font-weight: bold;">${formatCurrency(diferencia)}</td>
                    <td>
                        <span class="status-badge status-${caja.estado === 'abierta' ? 'active' : 'pending'}">
                            ${esc(caja.estado)}
                        </span>
                    </td>
                    <td class="text-center">
                        <button class="btn btn-primary btn-sm" onclick="verDetallesCaja(${caja.id_caja})">
                            👁️
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error cargando cajas:', error);
        document.getElementById('cajas-tbody').innerHTML = `
            <tr>
                <td colspan="9" class="alert alert-danger">
                    Error al cargar cajas
                </td>
            </tr>
        `;
    }
}

async function verDetallesCaja(idCaja) {
    try {
        const resumen = await fetchAPIAuth(`/caja/${idCaja}/resumen`);
        
        const detallesHTML = `
            <div style="margin-bottom: 20px;">
                <h4>📊 Resumen de Caja #${resumen.id_caja}</h4>
                <div style="margin-top: 10px; padding: 15px; background: #f0f0f0; border-radius: 5px;">
                    <p><strong>Usuario:</strong> ${esc(resumen.usuario_nombre)}</p>
                    <p><strong>Apertura:</strong> ${formatDateTime(resumen.fecha_apertura)}</p>
                    <p><strong>Cierre:</strong> ${resumen.fecha_cierre ? formatDateTime(resumen.fecha_cierre) : 'En curso'}</p>
                    <p><strong>Estado:</strong> ${esc(resumen.estado)}</p>
                    <p><strong>Ventas:</strong> ${formatCurrency(resumen.resumen?.total_ventas || 0)}</p>
                    <p><strong>Devoluciones:</strong> ${formatCurrency(resumen.resumen?.total_devoluciones || 0)}</p>
                    <p><strong>Monto Apertura:</strong> ${formatCurrency(resumen.monto_apertura || 0)}</p>
                    ${resumen.fecha_cierre ? `
                        <p><strong>Monto Cierre:</strong> ${formatCurrency(resumen.monto_cierre || 0)}</p>
                        <p><strong>Diferencia:</strong> <span style="color: ${resumen.diferencia >= 0 ? 'green' : 'red'}">${formatCurrency(resumen.diferencia || 0)}</span></p>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.getElementById('resumen-detalles').innerHTML = detallesHTML;
        document.getElementById('resumen-caja-section').style.display = 'block';
        
    } catch (error) {
        console.error('Error cargando detalles de caja:', error);
        showNotification('Error al cargar detalles de caja', 'error');
    }
}

function calcularTiempoAbierta(fechaApertura, fechaCierre) {
    const inicio = new Date(fechaApertura);
    const fin = fechaCierre ? new Date(fechaCierre) : new Date();
    const diff = fin - inicio;
    
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (horas > 24) {
        const dias = Math.floor(horas / 24);
        const horasRestantes = horas % 24;
        return `${dias}d ${horasRestantes}h ${minutos}m`;
    }
    
    return `${horas}h ${minutos}m`;
}

document.getElementById('cajero-select').addEventListener('change', verificarEstadoCaja);

document.addEventListener('DOMContentLoaded', () => {
    cargarUsuarios();
    verificarEstadoCaja();
    loadCajas();
});
