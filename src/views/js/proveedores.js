const API_BASE_URL = 'http://localhost:3000/api';

let proveedores = [];

async function loadProveedores() {
    try {
        proveedores = await fetchAPI('/proveedores');
        renderProveedores(proveedores);
    } catch (error) {
        console.error('Error cargando proveedores:', error);
        document.getElementById('proveedores-tbody').innerHTML = `
            <tr>
                <td colspan="8" class="alert alert-danger">
                    Error al cargar proveedores
                </td>
            </tr>
        `;
    }
}

function renderProveedores(data) {
    const tbody = document.getElementById('proveedores-tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    No hay proveedores registrados
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.map(prov => `
        <tr>
            <td>${prov.id_proveedor}</td>
            <td><strong>${prov.nombre}</strong></td>
            <td>${prov.contacto || '-'}</td>
            <td>${prov.telefono || '-'}</td>
            <td>${prov.email || '-'}</td>
            <td>
                <button class="btn btn-info btn-sm" onclick="editProveedor(${prov.id_proveedor})">
                    ✏️ Editar
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteProveedor(${prov.id_proveedor})">
                    🗑️ Eliminar
                </button>
            </td>
        </tr>
    `).join('');
}

function searchProveedores() {
    const searchTerm = document.getElementById('search-proveedor').value.toLowerCase();
    const filtered = proveedores.filter(prov => 
        prov.nombre.toLowerCase().includes(searchTerm) ||
        (prov.contacto && prov.contacto.toLowerCase().includes(searchTerm)) ||
        (prov.email && prov.email.toLowerCase().includes(searchTerm))
    );
    renderProveedores(filtered);
}

function openProveedorModal() {
    document.getElementById('proveedor-modal-title').textContent = 'Nuevo Proveedor';
    document.getElementById('proveedor-form').reset();
    document.getElementById('proveedor-id').value = '';
    openModal('proveedor-modal');
}

async function editProveedor(id) {
    try {
        const proveedor = await fetchAPI(`/proveedores/${id}`);
        
        document.getElementById('proveedor-modal-title').textContent = 'Editar Proveedor';
        document.getElementById('proveedor-id').value = proveedor.id_proveedor;
        document.getElementById('proveedor-nombre').value = proveedor.nombre;
        document.getElementById('proveedor-contacto').value = proveedor.contacto || '';
        document.getElementById('proveedor-telefono').value = proveedor.telefono || '';
        document.getElementById('proveedor-email').value = proveedor.email || '';
        document.getElementById('proveedor-direccion').value = proveedor.direccion || '';
        
        openModal('proveedor-modal');
    } catch (error) {
        console.error('Error cargando proveedor:', error);
        showAlert('Error al cargar el proveedor', 'danger');
    }
}

async function saveProveedor() {
    const id = document.getElementById('proveedor-id').value;
    const nombre = document.getElementById('proveedor-nombre').value.trim();
    const contacto = document.getElementById('proveedor-contacto').value.trim();
    const telefono = document.getElementById('proveedor-telefono').value.trim();
    const email = document.getElementById('proveedor-email').value.trim();
    const direccion = document.getElementById('proveedor-direccion').value.trim();
    
    if (!nombre) {
        showAlert('El nombre es obligatorio', 'warning');
        return;
    }
    
    try {
        const data = { nombre, contacto, telefono, email, direccion };
        let result;
        
        if (id) {
            result = await fetchAPI(`/proveedores/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            showAlert('Proveedor actualizado exitosamente', 'success');
        } else {
            result = await fetchAPI('/proveedores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            showAlert('Proveedor creado exitosamente', 'success');
        }
        
        closeModal('proveedor-modal');
        await loadProveedores();
        
    } catch (error) {
        console.error('Error guardando proveedor:', error);
        showAlert('Error al guardar el proveedor', 'danger');
    }
}

async function deleteProveedor(id) {
    if (!confirm('¿Está seguro de eliminar este proveedor?')) {
        return;
    }
    
    try {
        await fetchAPI(`/proveedores/${id}`, {
            method: 'DELETE'
        });
        
        showAlert('Proveedor eliminado exitosamente', 'success');
        await loadProveedores();
        
    } catch (error) {
        console.error('Error eliminando proveedor:', error);
        showAlert('Error al eliminar el proveedor', 'danger');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadProveedores();
    
    document.getElementById('search-proveedor').addEventListener('input', searchProveedores);
});