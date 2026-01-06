// Manejo de autenticación en el frontend

// Función para iniciar sesión
async function login(username, password) {
    try {
        console.log('Intentando login con username:', username);

        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        console.log('Respuesta del servidor:', response.status);

        const data = await response.json();
        console.log('Datos recibidos:', data);

        if (!response.ok) {
            throw new Error(data.error || 'Error en el login');
        }

        // Guardar token en localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));

        console.log('Token y usuario guardados en localStorage');

        showNotification('Login exitoso', 'success');
        
        // Mostrar mensaje de bienvenida según el rol
        showWelcomeMessage();

        // Redirigir al dashboard
        setTimeout(() => {
            window.location.href = '/dashboard.html';
        }, 1000);

        return data;
    } catch (error) {
        console.error('Error en login:', error);
        throw error;
    }
}

// Función para cerrar sesión
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    showNotification('Sesión cerrada', 'success');
    window.location.href = '/login.html';
}

// Verificar si el usuario está autenticado
function isAuthenticated() {
    const token = localStorage.getItem('token');
    return !!token;
}

// Obtener el usuario actual
function getCurrentUser() {
    const usuarioStr = localStorage.getItem('usuario');
    return usuarioStr ? JSON.parse(usuarioStr) : null;
}

// Verificar si el usuario tiene un rol específico
function hasRole(roles) {
    const usuario = getCurrentUser();
    if (!usuario) return false;
    return Array.isArray(roles) ? roles.includes(usuario.rol) : usuario.rol === roles;
}

// Verificar token en el servidor
async function verifyToken() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            return false;
        }

        const response = await fetch('/api/auth/verify', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        return data.valid;
    } catch (error) {
        console.error('Error verificando token:', error);
        return false;
    }
}

// Wrapper para fetch con autenticación
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');

    if (!options.headers) {
        options.headers = {};
    }

    // Agregar token a los headers
    options.headers['Authorization'] = `Bearer ${token}`;

    try {
        const response = await fetch(url, options);

        // Si el token expiró o es inválido (401)
        if (response.status === 401) {
            logout();
            throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente');
        }

        return response;
    } catch (error) {
        console.error('Error en petición autenticada:', error);
        throw error;
    }
}

// Middleware de protección de rutas en el frontend
function protectRoute(redirectUrl = '/login.html') {
    if (!isAuthenticated()) {
        window.location.href = redirectUrl;
        return false;
    }
    return true;
}

// Función para cambiar contraseña
async function changePassword(oldPassword, newPassword) {
    try {
        const response = await fetchWithAuth('/api/auth/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ oldPassword, newPassword })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error al cambiar contraseña');
        }

        showNotification('Contraseña actualizada exitosamente', 'success');
        return data;
    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        throw error;
    }
}

// Mostrar información del usuario en el sidebar
function displayUserInfo() {
    const usuario = getCurrentUser();
    if (usuario) {
        // Crear o actualizar elemento de usuario en el sidebar
        let userInfoElement = document.getElementById('user-info');
        
        if (!userInfoElement) {
            userInfoElement = document.createElement('div');
            userInfoElement.id = 'user-info';
            userInfoElement.className = 'user-info';
            
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                sidebar.appendChild(userInfoElement);
            }
        }

        // Obtener nombre y color del rol
        const rolInfo = getRolInfo(usuario.rol);
        
        userInfoElement.innerHTML = `
            <div class="user-info-content">
                <div class="user-avatar ${rolInfo.className}">
                    ${usuario.nombre.charAt(0).toUpperCase()}
                </div>
                <div class="user-details">
                    <div class="user-name">${usuario.nombre}</div>
                    <div class="user-role-badge ${rolInfo.className}">
                        <span class="role-icon">${rolInfo.icon}</span>
                        <span class="role-text">${rolInfo.nombre}</span>
                    </div>
                </div>
                <button class="btn-logout" onclick="logout()" title="Cerrar sesión">
                    🚪
                </button>
            </div>
        `;
    }
}

// Obtener información detallada del rol
function getRolInfo(rol) {
    const roles = {
        'admin': {
            nombre: 'Administrador',
            icon: '👑',
            className: 'role-admin',
            color: '#e74c3c'
        },
        'gerente': {
            nombre: 'Gerente',
            icon: '👔',
            className: 'role-gerente',
            color: '#3498db'
        },
        'supervisor': {
            nombre: 'Supervisor',
            icon: '👔',
            className: 'role-supervisor',
            color: '#27ae60'
        },
        'vendedor': {
            nombre: 'Vendedor',
            icon: '👤',
            className: 'role-vendedor',
            color: '#95a5a6'
        },
        'cajero': {
            nombre: 'Cajero',
            icon: '💰',
            className: 'role-cajero',
            color: '#f39c12'
        },
        'almacen': {
            nombre: 'Almacén',
            icon: '📦',
            className: 'role-almacen',
            color: '#8e44ad'
        }
    };

    return roles[rol] || roles['vendedor'];
}

// Mostrar mensaje de bienvenida según el rol
function showWelcomeMessage() {
    const usuario = getCurrentUser();
    if (!usuario) return;

    const rolInfo = getRolInfo(usuario.rol);
    const welcomeMessages = {
        'admin': `¡Bienvenido Administrador! Tienes control total del sistema.`,
        'gerente': `¡Hola ${usuario.nombre}! Bienvenido al panel de gestión.`,
        'supervisor': `¡Hola ${usuario.nombre}! Supervisa las operaciones del sistema.`,
        'vendedor': `¡Hola ${usuario.nombre}! Realiza ventas y gestiona el inventario.`,
        'cajero': `¡Hola ${usuario.nombre}! Gestiona las ventas y caja.`,
        'almacen': `¡Hola ${usuario.nombre}! Gestiona el inventario y almacén.`
    };

    const message = welcomeMessages[usuario.rol] || welcomeMessages['vendedor'];

    showNotification(message, 'success');
}

// Verificar autenticación al cargar la página
function checkAuthentication() {
    // Si estamos en login.html, no verificar
    if (window.location.pathname.includes('login.html')) {
        // Si ya está autenticado, redirigir al dashboard
        if (isAuthenticated()) {
            window.location.href = '/dashboard.html';
        }
        return;
    }

    // En otras páginas, verificar si está autenticado
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
    }
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    displayUserInfo();
});
