const API_BASE_URL = 'http://localhost:3000/api';

async function fetchAPI(endpoint, options = {}) {
    let url = endpoint;
    
    // Si url no empieza con http://, agregar API_BASE_URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `${API_BASE_URL}${endpoint}`;
    }
    
    console.log(`🌐 fetchAPI: ${url}`);
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const finalOptions = { ...options };

    if (options.body && typeof options.body === 'object') {
        finalOptions.body = JSON.stringify(options.body);
    }

    finalOptions.headers = { ...defaultOptions.headers, ...options.headers };
    
    try {
        const response = await fetch(url, finalOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`✅ fetchAPI respuesta (${url}):`, Array.isArray(data) ? `${data.length} items` : 'objeto');
        return data;
    } catch (error) {
        console.error(`❌ Error fetching ${url}:`, error);
        throw error;
    }
}

// Función para hacer peticiones API con autenticación
async function fetchAPIAuth(endpoint, options = {}) {
    let url = endpoint;

    // Si url no empieza con http://, agregar API_BASE_URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `${API_BASE_URL}${endpoint}`;
    }

    console.log(`🔐 fetchAPIAuth: ${url}`);

    // Agregar token a los headers
    if (!options.headers) {
        options.headers = {};
    }

    const token = localStorage.getItem('token');
    console.log(`🔑 Token existe: ${!!token}`);
    if (token) {
        console.log(`🔑 Token (primeros 50): ${token.substring(0, 50)}...`);
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const finalOptions = { ...options };

    if (options.body && typeof options.body === 'object') {
        console.log(`📦 Body antes de stringify:`, options.body);
        finalOptions.body = JSON.stringify(options.body);
        console.log(`📦 Body después de stringify:`, finalOptions.body.substring(0, 200) + '...');
    } else if (options.body) {
        console.log(`📦 Body es string u otro tipo, usando directamente:`, typeof options.body);
        finalOptions.body = options.body;
    }

    finalOptions.headers = { ...defaultOptions.headers, ...options.headers };

    try {
        console.log(`📡 Enviando petición a ${url}...`);
        const response = await fetch(url, finalOptions);

        console.log(`📡 Response status: ${response.status}`);
        console.log(`📡 Response ok: ${response.ok}`);
        console.log(`📡 Response statusText: ${response.statusText}`);

        // Si el token expiró o es inválido (401)
        if (response.status === 401) {
            const errorText = await response.text();
            console.log('❌ Error 401 - Respuesta del servidor:', errorText);
            
            if (typeof logout === 'function') {
                logout();
            } else {
                localStorage.removeItem('token');
                localStorage.removeItem('usuario');
                window.location.href = '/login.html';
            }
            throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente');
        }

        if (!response.ok) {
            const status = response.status;
            const statusText = response.statusText || 'Unknown Error';
            console.log(`❌ Response not ok. Status: ${status}, StatusText: ${statusText}`);
            const contentType = response.headers.get('content-type');
            console.log('❌ Content-Type:', contentType);

            try {
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    console.log('❌ Error data from server:', errorData);
                    let errorMessage = errorData.error || errorData.message || '';
                    if (errorData.details) {
                        errorMessage += ` (${errorData.details})`;
                    }
                    if (!errorMessage) {
                        errorMessage = `HTTP error! status: ${status} - ${statusText}`;
                    }
                    throw new Error(errorMessage);
                } else {
                    const errorText = await response.text();
                    console.log('❌ Error text from server:', errorText);
                    throw new Error(`HTTP error! status: ${status} - ${errorText || statusText}`);
                }
            } catch (jsonError) {
                console.log('❌ Error parsing response:', jsonError);
                throw new Error(`HTTP error! status: ${status} - ${statusText}`);
            }
        }

        const data = await response.json();
        console.log(`✅ fetchAPIAuth respuesta (${url}):`, Array.isArray(data) ? `${data.length} items` : 'objeto');
        return data;
    } catch (error) {
        console.error(`❌ Error fetching auth ${url}:`, error);
        console.error(`❌ Error name: ${error.name}`);
        console.error(`❌ Error message: ${error.message}`);
        console.error(`❌ Error stack:`, error.stack);
        throw error;
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${type === 'success' ? '✓' : '✕'}</span>
            <span class="notification-message">${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function showModal(title, content, onSave = null) {
    const existingModal = document.getElementById('dynamic-modal');
    if (existingModal) {
        document.body.removeChild(existingModal);
    }

    const modal = document.createElement('div');
    modal.id = 'dynamic-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="modal-close" onclick="closeModal('dynamic-modal')">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            ${onSave ? `
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal('dynamic-modal')">Cancelar</button>
                <button class="btn btn-primary" onclick="${onSave}">Guardar</button>
            </div>
            ` : ''}
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);

    if (modalId === 'dynamic-modal') {
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                if (modal.parentNode) {
                    document.body.removeChild(modal);
                }
            }, 300);
        }
    } else {
        if (modal) {
            modal.classList.remove('show');
        }
    }
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^[0-9]{10}$/;
    return re.test(phone);
}

function validateDNI(dni) {
    const re = /^[0-9]{8}$/;
    return re.test(dni);
}

function navigateTo(page) {
    window.location.href = page;
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

function clearError(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = '';
        element.style.display = 'none';
    }
}

function clearForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
        const errorElements = form.querySelectorAll('.error-message');
        errorElements.forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });
    }
}

function getStatusBadge(status) {
    const badges = {
        'activo': 'active',
        'inactivo': 'inactive',
        'completada': 'completed',
        'pendiente': 'pending',
        'anulada': 'cancelled',
        'active': 'active',
        'inactive': 'inactive',
        'completed': 'completed',
        'pending': 'pending',
        'cancelled': 'cancelled'
    };
    
    const badgeClass = badges[status] || 'default';
    const labels = {
        'activo': 'Activo',
        'inactivo': 'Inactivo',
        'completada': 'Completada',
        'pendiente': 'Pendiente',
        'anulada': 'Anulada',
        'active': 'Activo',
        'inactive': 'Inactivo',
        'completed': 'Completada',
        'pending': 'Pendiente',
        'cancelled': 'Anulada'
    };
    
    const label = labels[status] || status;
    
    return `<span class="status-badge ${badgeClass}">${label}</span>`;
}

function getPaymentMethodBadge(method) {
    const methods = {
        'efectivo': '💵 Efectivo',
        'tarjeta': '💳 Tarjeta',
        'transferencia': '🏦 Transferencia',
        'cheque': '📄 Cheque'
    };
    
    return methods[method] || method;
}

function confirmAction(message, onConfirm) {
    if (confirm(message)) {
        onConfirm();
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function createTablePagination(total, currentPage, itemsPerPage, onPageChange) {
    const totalPages = Math.ceil(total / itemsPerPage);
    
    let paginationHTML = '<div class="pagination">';
    
    if (totalPages > 1) {
        if (currentPage > 1) {
            paginationHTML += `
                <button class="pagination-btn" onclick="${onPageChange}(${currentPage - 1})">
                    ← Anterior
                </button>
            `;
        }
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                paginationHTML += `
                    <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                            onclick="${onPageChange}(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                paginationHTML += '<span class="pagination-ellipsis">...</span>';
            }
        }
        
        if (currentPage < totalPages) {
            paginationHTML += `
                <button class="pagination-btn" onclick="${onPageChange}(${currentPage + 1})">
                    Siguiente →
                </button>
            `;
        }
    }
    
    paginationHTML += '</div>';
    
    return paginationHTML;
}

function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<tr><td colspan="100%" class="loading-spinner">Cargando...</td></tr>';
    }
}

function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '';
    }
}

function exportTableToCSV(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const rows = table.querySelectorAll('tr');
    const csv = [];
    
    rows.forEach(row => {
        const rowData = [];
        const cells = row.querySelectorAll('td, th');
        
        cells.forEach(cell => {
            let text = cell.textContent.trim();
            text = text.replace(/"/g, '""');
            rowData.push(`"${text}"`);
        });
        
        csv.push(rowData.join(','));
    });
    
    const csvString = csv.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, filename);
    } else {
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Abrir modal por ID
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
    }
}

function generateReport(reportData) {
    const reportId = Date.now();
    const filename = `reporte_${reportId}.txt`;
    
    const reportContent = `
        ===== REPORTE DEL SISTEMA DE FERRETERÍA =====
        Fecha: ${new Date().toLocaleString('es-MX')}
        ============================================
        
        ${reportData}
        
        ============================================
        Fin del Reporte
        ============================================
    `;
    
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Sistema de Ferretería - Frontend cargado');
    console.log('📦 API_BASE_URL:', API_BASE_URL);
    
    document.querySelectorAll('.menu-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('active');
        });
    });
});
