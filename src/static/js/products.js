let allProducts = [];
let categories = [];

// Colores para las categorías
const categoryColors = {
    1: '#4CAF50',    // Herramientas manuales
    2: '#2196F3',    // Herramientas eléctricas
    3: '#FF9800',    // Materiales de construcción
    4: '#9C27B0',    // Plomería
    5: '#FFC107',    // Electricidad
    6: '#E91E63',    // Pinturas
    7: '#00BCD4',    // Tornillería
    8: '#8D6E63',    // Maderas
    9: '#607D8B'     // Metales
};

const categoryNames = {
    1: 'Herramientas manuales',
    2: 'Herramientas eléctricas',
    3: 'Materiales de construcción',
    4: 'Plomería',
    5: 'Electricidad',
    6: 'Pinturas',
    7: 'Tornillería',
    8: 'Maderas',
    9: 'Metales'
};

// Cargar categorías
async function loadCategories() {
    try {
        categories = await fetchAPIAuth('/categorias');
        createFilterButtons();
    } catch (error) {
        console.error('Error cargando categorías:', error);
    }
}

// Crear botones de filtro
function createFilterButtons() {
    const filterButtonsContainer = document.getElementById('filter-buttons');
    filterButtonsContainer.innerHTML = '<button class="filter-btn active" data-category="all">Todos</button>';

    categories.forEach(cat => {
        const button = document.createElement('button');
        button.className = 'filter-btn';
        button.textContent = cat.nombre;
        button.dataset.category = cat.id_categoria;
        button.addEventListener('click', () => filterByCategory(cat.id_categoria));
        filterButtonsContainer.appendChild(button);
    });

    // Agregar event listener al botón "Todos"
    document.querySelector('[data-category="all"]').addEventListener('click', showAllProducts);
}

// Cargar productos
async function loadProducts() {
    try {
        allProducts = await fetchAPIAuth('/productos');

        document.getElementById('total-products').textContent = allProducts.length;
        displayProducts(allProducts);
    } catch (error) {
        console.error('Error cargando productos:', error);
        document.getElementById('loading').innerHTML = '❌ Error cargando productos';
    }
}

// Mostrar productos
function displayProducts(products) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';
    
    if (products.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: #666;">No hay productos disponibles</p>';
        return;
    }
    
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        const stockClass = product.stock_actual <= product.stock_minimo ? 'stock-low' : '';
        const categoryColor = categoryColors[product.id_categoria] || '#667eea';
        const categoryName = categoryNames[product.id_categoria] || 'Otra';
        
        card.innerHTML = `
            <img src="${esc(product.imagen)}" alt="${esc(product.nombre)}" class="product-image" onerror="this.src='https://via.placeholder.com/400?text=No+Image'">
            <div class="product-info">
                <span class="category-badge" style="background: ${categoryColor}">${categoryName}</span>
                <h3 class="product-name">${esc(product.nombre)}</h3>
                <div class="product-code">Código: ${esc(product.codigo)}</div>
                <div class="product-price">$${parseFloat(product.precio_venta).toFixed(2)}</div>
                <div class="product-stock ${stockClass}">
                    Stock: ${product.stock_actual} unidades
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
    
    document.getElementById('loading').style.display = 'none';
}

// Filtrar por categoría
function filterByCategory(categoryId) {
    const filteredProducts = allProducts.filter(p => p.id_categoria === categoryId);
    displayProducts(filteredProducts);
    
    // Actualizar botones activos
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.category) === categoryId) {
            btn.classList.add('active');
        }
    });
}

// Mostrar todos los productos
function showAllProducts() {
    displayProducts(allProducts);
    
    // Actualizar botones activos
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === 'all') {
            btn.classList.add('active');
        }
    });
}

// Inicializar
async function init() {
    await loadCategories();
    await loadProducts();
}

// Cargar al inicio
document.addEventListener('DOMContentLoaded', init);