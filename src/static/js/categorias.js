let categorias = [];

// Cargar categorías
async function loadCategorias() {
    try {
        categorias = await fetchAPIAuth('/categorias');
        renderCategorias(categorias);
    } catch (error) {
        console.error('Error cargando categorías:', error);
        document.getElementById('categorias-tbody').innerHTML = `
            <tr>
                <td colspan="4" class="alert alert-danger">
                    Error al cargar categorías
                </td>
            </tr>
        `;
    }
}

// Renderizar categorías
function renderCategorias(data) {
    const tbody = document.getElementById('categorias-tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    No hay categorías registradas
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.map(cat => `
        <tr>
            <td>${cat.id_categoria}</td>
            <td><strong>${esc(cat.nombre)}</strong></td>
            <td>${esc(cat.descripcion) || '-'}</td>
            <td>
                <button class="btn btn-info btn-sm" onclick="editCategoria(${cat.id_categoria})">
                    ✏️ Editar
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteCategoria(${cat.id_categoria})">
                    🗑️ Eliminar
                </button>
            </td>
        </tr>
    `).join('');
}

// Buscar categorías
function searchCategorias() {
    const searchTerm = document.getElementById('search-categoria').value.toLowerCase();
    const filtered = categorias.filter(cat => 
        cat.nombre.toLowerCase().includes(searchTerm) ||
        (cat.descripcion && cat.descripcion.toLowerCase().includes(searchTerm))
    );
    renderCategorias(filtered);
}

// Abrir modal para nueva categoría
function openCategoriaModal() {
    document.getElementById('categoria-modal-title').textContent = 'Nueva Categoría';
    document.getElementById('categoria-form').reset();
    document.getElementById('categoria-id').value = '';
    openModal('categoria-modal');
}

// Editar categoría
async function editCategoria(id) {
    try {
        const categoria = await fetchAPIAuth(`/categorias/${id}`);

        document.getElementById('categoria-modal-title').textContent = 'Editar Categoría';
        document.getElementById('categoria-id').value = categoria.id_categoria;
        document.getElementById('categoria-nombre').value = categoria.nombre;
        document.getElementById('categoria-descripcion').value = categoria.descripcion || '';

        openModal('categoria-modal');
    } catch (error) {
        console.error('Error cargando categoría:', error);
        showNotification('Error al cargar la categoría', 'error');
    }
}

// Guardar categoría
async function saveCategoria() {
    const id = document.getElementById('categoria-id').value;
    const nombre = document.getElementById('categoria-nombre').value.trim();
    const descripcion = document.getElementById('categoria-descripcion').value.trim();
    
    if (!nombre) {
        showNotification('El nombre es obligatorio', 'warning');
        return;
    }
    
    try {
        const data = { nombre, descripcion };
        let result;

        if (id) {
            result = await fetchAPIAuth(`/categorias/${id}`, {
                method: 'PUT',
                body: data
            });
            showNotification('Categoría actualizada exitosamente', 'success');
        } else {
            result = await fetchAPIAuth('/categorias', {
                method: 'POST',
                body: data
            });
            showNotification('Categoría creada exitosamente', 'success');
        }

        closeModal('categoria-modal');
        await loadCategorias();

    } catch (error) {
        console.error('Error guardando categoría:', error);
        showNotification('Error al guardar la categoría', 'error');
    }
}

// Eliminar categoría
async function deleteCategoria(id) {
    if (!confirm('¿Está seguro de eliminar esta categoría?')) {
        return;
    }
    
    try {
        await fetchAPIAuth(`/categorias/${id}`, {
            method: 'DELETE'
        });

        showNotification('Categoría eliminada exitosamente', 'success');
        await loadCategorias();

    } catch (error) {
        console.error('Error eliminando categoría:', error);
        showNotification('Error al eliminar la categoría', 'error');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadCategorias();
    
    document.getElementById('search-categoria').addEventListener('input', searchCategorias);
});