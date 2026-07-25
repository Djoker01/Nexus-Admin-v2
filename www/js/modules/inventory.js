class InventoryManager {
    constructor() {
        this.products = [];
        this.categories = [];
        this.defaultCategories = [
            'Electrónicos', 'Ropa', 'Alimentos', 'Bebidas',
            'Hogar', 'Oficina', 'Deportes', 'Juguetes', 'Salud', 'Otros'
        ];
    }

    async init() {
        try {
            await this.loadCategories();
            await this.loadProducts();
            this.setupEventListeners();
            this.renderProducts();
            this.updateCategorySelects();
            console.log('✅ InventoryManager inicializado');
        } catch (error) {
            console.error('Error inicializando InventoryManager:', error);
        }
    }

    async loadCategories() {
        try {
            this.categories = await window.db.getAll('categories');
            if (this.categories.length === 0) {
                for (const catName of this.defaultCategories) {
                    await window.db.add('categories', { name: catName });
                }
                this.categories = await window.db.getAll('categories');
            }
        } catch (error) {
            console.error('Error cargando categorías:', error);
            this.categories = this.defaultCategories.map(name => ({ name }));
        }
    }

    async loadProducts() {
        try {
            this.products = await window.db.getAll('products');
            console.log(`${this.products.length} productos cargados`);
        } catch (error) {
            console.error('Error cargando productos:', error);
            this.products = [];
        }
    }

    setupEventListeners() {
        const productForm = document.getElementById('product-form');
        if (productForm) {
            productForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveProduct();
            });
        }

        const searchInput = document.getElementById('inventory-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.renderProducts();
            });
        }

        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.renderProducts());
        }

        const stockFilter = document.getElementById('stock-filter');
        if (stockFilter) {
            stockFilter.addEventListener('change', () => this.renderProducts());
        }
    }

    updateCategorySelects() {
        const categorySelect = document.getElementById('product-category');
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">Seleccionar categoría</option>' +
                this.categories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('');
        }

        const filterSelect = document.getElementById('category-filter');
        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">Todas las categorías</option>' +
                this.categories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('');
        }
    }

    async saveProduct() {
        const nameInput = document.getElementById('product-name');
        const costInput = document.getElementById('product-cost');
        const priceInput = document.getElementById('product-price');
        const stockInput = document.getElementById('product-stock');
        const categoryInput = document.getElementById('product-category');
        const codeInput = document.getElementById('product-code');
        const minStockInput = document.getElementById('product-min-stock');
        const idInput = document.getElementById('product-id');

        if (!nameInput || !costInput || !priceInput || !stockInput) {
            Utils.showToast('Faltan campos requeridos', 'warning');
            return;
        }

        const productData = {
            name: nameInput.value,
            code: codeInput?.value || `PROD-${Date.now()}`,
            category: categoryInput?.value || 'Otros',
            cost: parseFloat(costInput.value),
            price: parseFloat(priceInput.value),
            stock: parseInt(stockInput.value),
            minStock: parseInt(minStockInput?.value || 5),
            status: 'active',
            profit: parseFloat(priceInput.value) - parseFloat(costInput.value)
        };

        try {
            const id = idInput?.value;
            if (id) {
                await window.db.update('products', { ...productData, id: parseInt(id) });
                Utils.showToast('Producto actualizado', 'success');
            } else {
                await window.db.add('products', productData);
                Utils.showToast('Producto creado', 'success');
            }

            await this.loadProducts();
            this.renderProducts();
            this.closeProductModal();
            
            // Actualizar dashboard
            if (typeof dashboardManager !== 'undefined' && dashboardManager) {
                dashboardManager.refresh();
            }
        } catch (error) {
            console.error('Error guardando producto:', error);
            Utils.showToast('Error al guardar producto', 'error');
        }
    }

    // MÉTODO IMPORTANTE: Actualizar stock
    async updateStock(productId, quantity, isAddition = false) {
        const product = this.products.find(p => p.id === productId);
        if (!product) {
            console.error('Producto no encontrado:', productId);
            return false;
        }

        if (isAddition) {
            product.stock += quantity;
        } else {
            if (product.stock < quantity) {
                console.error('Stock insuficiente');
                return false;
            }
            product.stock -= quantity;
        }

        try {
            await window.db.update('products', product);
            await this.loadProducts();
            this.renderProducts();
            return true;
        } catch (error) {
            console.error('Error actualizando stock:', error);
            return false;
        }
    }

    // MÉTODO IMPORTANTE: Obtener producto por ID
    getProductById(id) {
        return this.products.find(p => p.id === id);
    }

    // MÉTODO IMPORTANTE: Obtener productos con stock bajo
    async getLowStockProducts() {
        return this.products.filter(p => p.stock <= p.minStock && p.status === 'active');
    }

    openProductModal() {
        const modal = document.getElementById('product-modal');
        const title = document.getElementById('product-modal-title');
        const form = document.getElementById('product-form');
        
        if (modal && title) {
            title.textContent = 'Nuevo Producto';
            if (form) form.reset();
            const idInput = document.getElementById('product-id');
            if (idInput) idInput.value = '';
            modal.style.display = 'block';
        }
    }

    closeProductModal() {
        const modal = document.getElementById('product-modal');
        const form = document.getElementById('product-form');
        if (modal) {
            modal.style.display = 'none';
            if (form) form.reset();
        }
    }

    async editProduct(id) {
        const product = this.products.find(p => p.id === id);
        if (!product) return;

        document.getElementById('product-modal-title').textContent = 'Editar Producto';
        document.getElementById('product-id').value = product.id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-code').value = product.code || '';
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-cost').value = product.cost;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-stock').value = product.stock;
        document.getElementById('product-min-stock').value = product.minStock || 5;

        document.getElementById('product-modal').style.display = 'block';
    }

    async deleteProduct(id) {
        if (!confirm('¿Eliminar este producto?')) return;

        try {
            await window.db.delete('products', id);
            await this.loadProducts();
            this.renderProducts();
            Utils.showToast('Producto eliminado', 'success');
        } catch (error) {
            console.error('Error eliminando producto:', error);
            Utils.showToast('Error al eliminar', 'error');
        }
    }

    renderProducts() {
        const container = document.getElementById('inventory-table');
        if (!container) return;

        const searchTerm = document.getElementById('inventory-search')?.value.toLowerCase() || '';
        const categoryFilter = document.getElementById('category-filter')?.value || '';
        const stockFilter = document.getElementById('stock-filter')?.value || '';

        let filtered = this.products.filter(p => {
            const matchSearch = !searchTerm || 
                p.name.toLowerCase().includes(searchTerm) ||
                (p.code && p.code.toLowerCase().includes(searchTerm));
            const matchCategory = !categoryFilter || p.category === categoryFilter;
            let matchStock = true;
            if (stockFilter === 'low') matchStock = p.stock <= p.minStock && p.stock > 0;
            else if (stockFilter === 'out') matchStock = p.stock === 0;
            else if (stockFilter === 'available') matchStock = p.stock > 0;
            return matchSearch && matchCategory && matchStock;
        });

        filtered.sort((a, b) => a.stock - b.stock);

        if (filtered.length === 0) {
            container.innerHTML = '<p style="text-align:center;padding:40px;color:#999;">No hay productos</p>';
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Producto</th>
                        <th>Categoría</th>
                        <th>Precio</th>
                        <th>Costo</th>
                        <th>Stock</th>
                        <th>Ganancia</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(p => {
                        const stockClass = p.stock === 0 ? 'danger' : p.stock <= p.minStock ? 'warning' : 'success';
                        return `
                        <tr>
                            <td><code>${p.code || 'N/A'}</code></td>
                            <td><strong>${p.name}</strong></td>
                            <td>${p.category || '-'}</td>
                            <td>${Utils.formatCurrency(p.price)}</td>
                            <td>${Utils.formatCurrency(p.cost)}</td>
                            <td><span class="status-badge ${stockClass}">${p.stock}</span></td>
                            <td>${Utils.formatCurrency(p.profit || (p.price - p.cost))}</td>
                            <td>
                                <button class="btn-icon" onclick="inventoryManager.editProduct(${p.id})">✏️</button>
                                <button class="btn-icon" onclick="inventoryManager.deleteProduct(${p.id})">🗑️</button>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        `;
    }
}
