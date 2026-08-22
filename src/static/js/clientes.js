let clientes = [];

// Cargar clientes
async function loadClientes() {
    try {
        clientes = await fetchAPIAuth('/clientes');
        renderClientes(clientes);
    } catch (error) {
        console.error('Error cargando clientes:', error);
        document.getElementById('clientes-tbody').innerHTML = `
            <tr>
                <td colspan="8" class="alert alert-danger">
                    Error al cargar clientes
                </td>
            </tr>
        `;
    }
}

// Renderizar clientes
function renderClientes(data) {
    const tbody = document.getElementById('clientes-tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    No hay clientes registrados
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.map(cli => `
        <tr>
            <td>${cli.id_cliente}</td>
            <td><strong>${esc(cli.nombre)}</strong></td>
            <td>${esc(cli.apellido) || '-'}</td>
            <td>${esc(cli.dni) || '-'}</td>
            <td>${esc(cli.telefono) || '-'}</td>
            <td>${esc(cli.email) || '-'}</td>
            <td>
                <button class="btn btn-success btn-sm" onclick="verHistorialCliente(${cli.id_cliente})" title="Ver historial de compras">
                    🛒 Historial
                </button>
                <button class="btn btn-info btn-sm" onclick="editCliente(${cli.id_cliente})" title="Editar">
                    ✏️
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteCliente(${cli.id_cliente})" title="Eliminar">
                    🗑️
                </button>
            </td>
        </tr>
    `).join('');
}

// Buscar clientes
function searchClientes() {
    const searchTerm = document.getElementById('search-cliente').value.toLowerCase();
    const filtered = clientes.filter(cli => 
        cli.nombre.toLowerCase().includes(searchTerm) ||
        (cli.apellido && cli.apellido.toLowerCase().includes(searchTerm)) ||
        (cli.dni && cli.dni.includes(searchTerm)) ||
        (cli.email && cli.email.toLowerCase().includes(searchTerm))
    );
    renderClientes(filtered);
}

// Abrir modal para nuevo cliente
function openClienteModal() {
    document.getElementById('cliente-modal-title').textContent = 'Nuevo Cliente';
    document.getElementById('cliente-form').reset();
    document.getElementById('cliente-id').value = '';
    openModal('cliente-modal');
}

// Editar cliente
async function editCliente(id) {
    try {
        const cliente = await fetchAPIAuth(`/clientes/${id}`);

        document.getElementById('cliente-modal-title').textContent = 'Editar Cliente';
        document.getElementById('cliente-id').value = cliente.id_cliente;
        document.getElementById('cliente-nombre').value = cliente.nombre;
        document.getElementById('cliente-apellido').value = cliente.apellido || '';
        document.getElementById('cliente-dni').value = cliente.dni || '';
        document.getElementById('cliente-telefono').value = cliente.telefono || '';
        document.getElementById('cliente-email').value = cliente.email || '';
        document.getElementById('cliente-direccion').value = cliente.direccion || '';

        openModal('cliente-modal');
    } catch (error) {
        console.error('Error cargando cliente:', error);
        showNotification('Error al cargar el cliente', 'error');
    }
}

// Guardar cliente
async function saveCliente() {
    const id = document.getElementById('cliente-id').value;
    const nombre = document.getElementById('cliente-nombre').value.trim();
    const apellido = document.getElementById('cliente-apellido').value.trim();
    const dni = document.getElementById('cliente-dni').value.trim();
    const telefono = document.getElementById('cliente-telefono').value.trim();
    const email = document.getElementById('cliente-email').value.trim();
    const direccion = document.getElementById('cliente-direccion').value.trim();
    
    if (!nombre) {
        showNotification('El nombre es obligatorio', 'warning');
        return;
    }
    
    try {
        const data = { nombre, apellido, dni, telefono, email, direccion };
        let result;

        if (id) {
            result = await fetchAPIAuth(`/clientes/${id}`, {
                method: 'PUT',
                body: data
            });
            showNotification('Cliente actualizado exitosamente', 'success');
        } else {
            result = await fetchAPIAuth('/clientes', {
                method: 'POST',
                body: data
            });
            showNotification('Cliente creado exitosamente', 'success');
        }

        closeModal('cliente-modal');
        await loadClientes();

    } catch (error) {
        console.error('Error guardando cliente:', error);
        showNotification('Error al guardar el cliente', 'error');
    }
}

// Eliminar cliente
async function deleteCliente(id) {
    if (!confirm('¿Está seguro de eliminar este cliente?')) {
        return;
    }
    
    try {
        await fetchAPIAuth(`/clientes/${id}`, {
            method: 'DELETE'
        });

        showNotification('Cliente eliminado exitosamente', 'success');
        await loadClientes();

    } catch (error) {
        console.error('Error eliminando cliente:', error);
        showNotification('Error al eliminar el cliente', 'error');
    }
}

// Ver historial de compras del cliente
function verHistorialCliente(idCliente) {
    const currentYear = new Date().getFullYear();
    window.location.href = `/historial-clientes.html?cliente=${idCliente}&anio=${currentYear}`;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadClientes();
    
    document.getElementById('search-cliente').addEventListener('input', searchClientes);
});