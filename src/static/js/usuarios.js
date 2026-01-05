const API_BASE_URL = 'http://localhost:3000/api';

let usuarios = [];

// Cargar usuarios
async function loadUsuarios() {
    try {
        usuarios = await fetchAPI('/usuarios');
        renderUsuarios(usuarios);
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        document.getElementById('usuarios-tbody').innerHTML = `
            <tr>
                <td colspan="8" class="alert alert-danger">
                    Error al cargar usuarios
                </td>
            </tr>
        `;
    }
}

// Renderizar usuarios
function renderUsuarios(data) {
    const tbody = document.getElementById('usuarios-tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    No hay usuarios registrados
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.map(usu => `
        <tr>
            <td>${usu.id_usuario}</td>
            <td><strong>${usu.username}</strong></td>
            <td>${usu.nombre}</td>
            <td>${usu.email || '-'}</td>
            <td>
                <span class="status-badge ${usu.rol === 'admin' ? 'status-active' : 'status-pending'}">
                    ${usu.rol}
                </span>
            </td>
            <td>
                <span class="status-badge ${usu.activo ? 'status-active' : 'status-inactive'}">
                    ${usu.activo ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td>
                <button class="btn btn-info btn-sm" onclick="editUsuario(${usu.id_usuario})">
                    ✏️
                </button>
                <button class="btn btn-warning btn-sm" onclick="openPasswordModal(${usu.id_usuario})">
                    🔑
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteUsuario(${usu.id_usuario})">
                    🗑️
                </button>
            </td>
        </tr>
    `).join('');
}

// Abrir modal para nuevo usuario
function openUsuarioModal() {
    document.getElementById('usuario-modal-title').textContent = 'Nuevo Usuario';
    document.getElementById('usuario-form').reset();
    document.getElementById('usuario-id').value = '';
    document.getElementById('usuario-password').required = true;
    document.getElementById('password-hint').textContent = 'Mínimo 6 caracteres';
    openModal('usuario-modal');
}

// Editar usuario
async function editUsuario(id) {
    try {
        const usuario = await fetchAPI(`/usuarios/${id}`);
        
        document.getElementById('usuario-modal-title').textContent = 'Editar Usuario';
        document.getElementById('usuario-id').value = usuario.id_usuario;
        document.getElementById('usuario-username').value = usuario.username;
        document.getElementById('usuario-nombre').value = usuario.nombre;
        document.getElementById('usuario-email').value = usuario.email || '';
        document.getElementById('usuario-rol').value = usuario.rol;
        document.getElementById('usuario-activo').value = usuario.activo ? 'true' : 'false';
        document.getElementById('usuario-password').required = false;
        document.getElementById('usuario-password').value = '';
        document.getElementById('password-hint').textContent = 'Dejar en blanco para mantener el mismo';
        
        openModal('usuario-modal');
    } catch (error) {
        console.error('Error cargando usuario:', error);
        showAlert('Error al cargar el usuario', 'danger');
    }
}

// Guardar usuario
async function saveUsuario() {
    const id = document.getElementById('usuario-id').value;
    const username = document.getElementById('usuario-username').value.trim();
    const password = document.getElementById('usuario-password').value;
    const nombre = document.getElementById('usuario-nombre').value.trim();
    const email = document.getElementById('usuario-email').value.trim();
    const rol = document.getElementById('usuario-rol').value;
    const activo = document.getElementById('usuario-activo').value === 'true';
    
    if (!username || !nombre) {
        showAlert('Username y nombre son obligatorios', 'warning');
        return;
    }
    
    if (!id && password.length < 6) {
        showAlert('El password debe tener al menos 6 caracteres', 'warning');
        return;
    }
    
    try {
        const data = { username, nombre, email, rol, activo };
        if (password) {
            data.password = password;
        }
        
        let result;
        if (id) {
            result = await fetchAPI(`/usuarios/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            showAlert('Usuario actualizado exitosamente', 'success');
        } else {
            result = await fetchAPI('/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            showAlert('Usuario creado exitosamente', 'success');
        }
        
        closeModal('usuario-modal');
        await loadUsuarios();
        
    } catch (error) {
        console.error('Error guardando usuario:', error);
        showAlert('Error al guardar el usuario', 'danger');
    }
}

// Abrir modal para cambiar password
function openPasswordModal(id) {
    document.getElementById('password-usuario-id').value = id;
    document.getElementById('nuevo-password').value = '';
    openModal('password-modal');
}

// Cambiar password
async function cambiarPassword() {
    const id = document.getElementById('password-usuario-id').value;
    const nuevoPassword = document.getElementById('nuevo-password').value;
    
    if (!nuevoPassword || nuevoPassword.length < 6) {
        showAlert('El password debe tener al menos 6 caracteres', 'warning');
        return;
    }
    
    try {
        await fetchAPI(`/usuarios/${id}/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: nuevoPassword })
        });
        
        showAlert('Password actualizado exitosamente', 'success');
        closeModal('password-modal');
        
    } catch (error) {
        console.error('Error actualizando password:', error);
        showAlert('Error al actualizar el password', 'danger');
    }
}

// Eliminar usuario
async function deleteUsuario(id) {
    if (!confirm('¿Está seguro de eliminar este usuario?')) {
        return;
    }
    
    try {
        await fetchAPI(`/usuarios/${id}`, {
            method: 'DELETE'
        });
        
        showAlert('Usuario eliminado exitosamente', 'success');
        await loadUsuarios();
        
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        showAlert('Error al eliminar el usuario', 'danger');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadUsuarios();
});