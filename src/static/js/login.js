// Manejar login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('login-btn');
    const loginAlert = document.getElementById('login-alert');

    // Validar campos
    if (!username || !password) {
        loginAlert.style.display = 'block';
        loginAlert.className = 'alert alert-danger';
        loginAlert.textContent = 'Por favor, completa todos los campos';
        return;
    }

    // Deshabilitar botón y mostrar carga
    loginBtn.disabled = true;
    loginBtn.innerHTML = '⏳ Cargando...';
    loginAlert.style.display = 'none';

    try {
        // Llamar a función de login
        await login(username, password);

        // El redireccionamiento se maneja en la función login
    } catch (error) {
        // Mostrar error
        loginAlert.style.display = 'block';
        loginAlert.className = 'alert alert-danger';
        loginAlert.textContent = error.message || 'Error al iniciar sesión';
        
        // Habilitar botón nuevamente
        loginBtn.disabled = false;
        loginBtn.innerHTML = '🔐 Iniciar Sesión';
    }
});

// Enter para enviar form
document.getElementById('password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('login-form').dispatchEvent(new Event('submit'));
    }
});
