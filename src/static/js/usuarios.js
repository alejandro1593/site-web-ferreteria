let usuarios = [];

// Cargar usuarios
async function loadUsuarios() {
    try {
        usuarios = await fetchAPIAuth('/usuarios');
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
            <td><strong>${esc(usu.username)}</strong></td>
            <td>${esc(usu.nombre)}</td>
            <td>${esc(usu.email) || '-'}</td>
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
        const usuario = await fetchAPIAuth(`/usuarios/${id}`);

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
        showNotification('Error al cargar el usuario', 'error');
    }
}

// Guardar usuario
async function saveUsuario() {
    console.log('🔍 Obteniendo elementos del formulario...');

    const idElement = document.getElementById('usuario-id');
    const usernameElement = document.getElementById('usuario-username');
    const passwordElement = document.getElementById('usuario-password');
    const nombreElement = document.getElementById('usuario-nombre');
    const emailElement = document.getElementById('usuario-email');
    const rolElement = document.getElementById('usuario-rol');
    const activoElement = document.getElementById('usuario-activo');

    console.log('🔍 Elementos encontrados:', {
        idElement: !!idElement,
        usernameElement: !!usernameElement,
        passwordElement: !!passwordElement,
        nombreElement: !!nombreElement,
        emailElement: !!emailElement,
        rolElement: !!rolElement,
        activoElement: !!activoElement
    });

    if (!usernameElement || !nombreElement) {
        console.error('❌ No se encontraron elementos del formulario');
        showNotification('Error: No se encontraron elementos del formulario', 'error');
        return;
    }

    const id = idElement ? idElement.value : '';
    const username = usernameElement.value.trim();
    const password = passwordElement ? passwordElement.value : '';
    const nombre = nombreElement.value.trim();
    const email = emailElement ? emailElement.value.trim() : '';
    const rol = rolElement ? rolElement.value : '';
    const activoStr = activoElement ? activoElement.value : 'true';
    const activo = activoStr === 'true';

    console.log('💾 Guardando usuario:', {
        id,
        username,
        nombre,
        email,
        rol,
        activoStr,
        activo,
        activoType: typeof activo,
        hasPassword: !!password
    });

    if (!username || !nombre) {
        showNotification('Username y nombre son obligatorios', 'warning');
        return;
    }

    if (!id && password.length < 6) {
        showNotification('El password debe tener al menos 6 caracteres', 'warning');
        return;
    }

    try {
        const data = {
            username,
            nombre,
            email,
            rol,
            activo
        };
        if (password) {
            data.password = password;
        }

        console.log('📤 Datos a enviar:', data);
        console.log('📤 Tipo de activo en data:', typeof data.activo);

        let result;
        if (id) {
            console.log('🔄 Actualizando usuario ID:', id);
            result = await fetchAPIAuth(`/usuarios/${id}`, {
                method: 'PUT',
                body: data
            });
            console.log('✅ Usuario actualizado:', result);
            showNotification('Usuario actualizado exitosamente', 'success');
        } else {
            console.log('🔄 Creando nuevo usuario');
            result = await fetchAPIAuth('/usuarios', {
                method: 'POST',
                body: data
            });
            console.log('✅ Usuario creado:', result);
            showNotification('Usuario creado exitosamente', 'success');
        }

        closeModal('usuario-modal');
        await loadUsuarios();

    } catch (error) {
        console.error('❌ Error guardando usuario:', error);
        console.error('❌ Error name:', error.name);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        showNotification(error.message || 'Error al guardar el usuario', 'error');
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
        showNotification('El password debe tener al menos 6 caracteres', 'warning');
        return;
    }

    try {
        await fetchAPIAuth(`/usuarios/${id}/password`, {
            method: 'PUT',
            body: { password: nuevoPassword }
        });

        showNotification('Password actualizado exitosamente', 'success');
        closeModal('password-modal');

    } catch (error) {
        console.error('Error actualizando password:', error);
        showNotification('Error al actualizar el password', 'error');
    }
}

// Eliminar usuario
async function deleteUsuario(id) {
    if (!confirm('¿Está seguro de eliminar este usuario?')) {
        return;
    }

    try {
        await fetchAPIAuth(`/usuarios/${id}`, {
            method: 'DELETE'
        });

        showNotification('Usuario eliminado exitosamente', 'success');
        await loadUsuarios();

    } catch (error) {
        console.error('Error eliminando usuario:', error);
        showNotification('Error al eliminar el usuario', 'error');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadUsuarios();
});