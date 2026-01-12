let usuarios = [];

async function cargarUsuarios() {
    try {
        usuarios = await fetchAPIAuth('/usuarios');
        
        const selectHTML = '<option value="">Todos</option>' +
            usuarios.map(usuario => `
                <option value="${usuario.id_usuario}">${usuario.nombre} (${usuario.rol})</option>
            `).join('');
        
        document.getElementById('usuario-filter').innerHTML = selectHTML;
        
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        showNotification('Error al cargar usuarios', 'error');
    }
}

async function loadCajasCerradas() {
    const idUsuario = document.getElementById('usuario-filter').value;
    const fechaInicio = document.getElementById('fecha-inicio').value;
    const fechaFin = document.getElementById('fecha-fin').value;
    
    let url = '/caja/cerradas';
    const params = [];
    
    if (idUsuario) {
        params.push(`id_usuario=${idUsuario}`);
    }
    
    if (fechaInicio && fechaFin) {
        params.push(`fecha_inicio=${fechaInicio}`);
        params.push(`fecha_fin=${fechaFin}`);
    }
    
    if (params.length > 0) {
        url += '?' + params.join('&');
    }
    
    try {
        const cajas = await fetchAPIAuth(url);
        
        if (!cajas || cajas.length === 0) {
            document.getElementById('cajas-cerradas-tbody').innerHTML = `
                <tr>
                    <td colspan="10" class="empty-state">
                        No hay cajas cerradas
                    </td>
                </tr>
            `;
            return;
        }
        
        const tbody = document.getElementById('cajas-cerradas-tbody');
        tbody.innerHTML = cajas.map(caja => {
            const diferencia = caja.diferencia || 0;
            const diferenciaColor = diferencia > 0 ? 'green' : (diferencia < 0 ? 'red' : 'gray');
            
            return `
                <tr>
                    <td>#${caja.id_caja}</td>
                    <td>
                        <strong>${caja.usuario_nombre}</strong><br>
                        <small>ID: ${caja.id_usuario}</small>
                    </td>
                    <td>${formatDateTime(caja.fecha_apertura)}</td>
                    <td>${formatDateTime(caja.fecha_cierre)}</td>
                    <td>${formatCurrency(caja.monto_apertura || 0)}</td>
                    <td>${formatCurrency(caja.monto_cierre || 0)}</td>
                    <td>${formatCurrency(caja.total_ventas || 0)}</td>
                    <td style="color: ${diferenciaColor}; font-weight: bold;">${formatCurrency(diferencia)}</td>
                    <td>
                        <span class="status-badge status-active">
                            ${caja.estado}
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
        console.error('Error cargando cajas cerradas:', error);
        document.getElementById('cajas-cerradas-tbody').innerHTML = `
            <tr>
                <td colspan="10" class="alert alert-danger">
                    Error al cargar cajas cerradas
                </td>
            </tr>
        `;
    }
}

async function verDetallesCaja(idCaja) {
    try {
        const resumen = await fetchAPIAuth(`/caja/${idCaja}/resumen`);
        
        const usuario = usuarios.find(u => u.id_usuario === resumen.id_usuario);
        const nombreUsuario = usuario ? usuario.nombre : 'Desconocido';
        
        const detallesHTML = `
            <div style="margin-bottom: 20px;">
                <h4>📊 Detalles de Caja #${resumen.id_caja}</h4>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 20px;">
                    <div>
                        <h5>Información General</h5>
                        <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; margin-top: 10px;">
                            <p><strong>ID:</strong> #${resumen.id_caja}</p>
                            <p><strong>Usuario:</strong> ${nombreUsuario}</p>
                            <p><strong>ID Usuario:</strong> ${resumen.id_usuario}</p>
                            <p><strong>Estado:</strong> ${resumen.estado}</p>
                            <p><strong>Fecha Apertura:</strong> ${formatDateTime(resumen.fecha_apertura)}</p>
                            <p><strong>Fecha Cierre:</strong> ${formatDateTime(resumen.fecha_cierre)}</p>
                            <p><strong>Observaciones:</strong> ${resumen.observaciones || 'Sin observaciones'}</p>
                        </div>
                    </div>
                    <div>
                        <h5>Resumen Financiero</h5>
                        <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; margin-top: 10px;">
                            <p><strong>Monto Apertura:</strong> ${formatCurrency(resumen.monto_apertura || 0)}</p>
                            <p><strong>Ventas Totales:</strong> ${formatCurrency(resumen.resumen?.total_ventas || 0)}</p>
                            <p><strong>Devoluciones:</strong> ${formatCurrency(resumen.resumen?.total_devoluciones || 0)}</p>
                            <p><strong>Monto Esperado:</strong> ${formatCurrency(resumen.monto_esperado || 0)}</p>
                            <p><strong>Monto Cierre:</strong> ${formatCurrency(resumen.monto_cierre || 0)}</p>
                            <p><strong>Diferencia:</strong> 
                                <span style="color: ${resumen.diferencia > 0 ? 'green' : (resumen.diferencia < 0 ? 'red' : 'gray')}; font-weight: bold;">
                                    ${formatCurrency(resumen.diferencia || 0)}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 20px;">
                    <h5>Duración del Turno</h5>
                    <div style="background: #f0f0f0; padding: 15px; border-radius: 5px;">
                        <p><strong>Tiempo Abierta:</strong> ${calcularTiempoAbierta(resumen.fecha_apertura, resumen.fecha_cierre)}</p>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('caja-detalles-content').innerHTML = detallesHTML;
        openModal('caja-detalles-modal');
        
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

async function exportarCSV() {
    const idUsuario = document.getElementById('usuario-filter').value;
    const fechaInicio = document.getElementById('fecha-inicio').value;
    const fechaFin = document.getElementById('fecha-fin').value;
    
    let url = '/caja/cerradas';
    const params = [];
    
    if (idUsuario) {
        params.push(`id_usuario=${idUsuario}`);
    }
    
    if (fechaInicio && fechaFin) {
        params.push(`fecha_inicio=${fechaInicio}`);
        params.push(`fecha_fin=${fechaFin}`);
    }
    
    if (params.length > 0) {
        url += '?' + params.join('&');
    }
    
    try {
        const cajas = await fetchAPIAuth(url);
        
        let csv = 'ID,ID Usuario,Usuario,Fecha Apertura,Fecha Cierre,Monto Apertura,Monto Cierre,Ventas Totales,Diferencia,Estado,Observaciones\n';
        cajas.forEach(caja => {
            csv += `${caja.id_caja},${caja.id_usuario},"${caja.usuario_nombre}",${formatDateTime(caja.fecha_apertura)},${formatDateTime(caja.fecha_cierre)},${caja.monto_apertura || 0},${caja.monto_cierre || 0},${caja.total_ventas || 0},${caja.diferencia || 0},${caja.estado},"${caja.observaciones || ''}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const urlFile = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlFile;
        a.download = `cajas_cerradas_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(urlFile);
        
        showNotification('Cajas exportadas exitosamente', 'success');
        
    } catch (error) {
        console.error('Error exportando cajas:', error);
        showNotification('Error al exportar las cajas', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    cargarUsuarios();
    loadCajasCerradas();
});
