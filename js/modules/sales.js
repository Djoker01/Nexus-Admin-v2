class SalesManager {
    constructor(inventoryManager) {
        this.inventory = inventoryManager;
        this.sales = [];
    }

    async init() {
        await this.loadSales();
        this.setupEventListeners();
        this.renderSalesHistory();
        console.log('✅ SalesManager inicializado');
    }

    async loadSales() {
        try {
            this.sales = await window.db.getAll('sales');
            console.log(`${this.sales.length} ventas cargadas`);
        } catch (error) {
            console.error('Error cargando ventas:', error);
            this.sales = [];
        }
    }

    setupEventListeners() {
        const saleForm = document.getElementById('sale-form');
        if (saleForm) {
            saleForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.registerSale();
            });
        }
    }

    openSaleModal() {
        const modal = document.getElementById('sale-modal');
        if (!modal) return;

        // Limpiar items anteriores
        const saleItems = document.getElementById('sale-items');
        if (saleItems) {
            saleItems.innerHTML = '';
            this.addSaleItem();
        }

        // Resetear formulario
        document.getElementById('sale-customer').value = '';
        document.getElementById('sale-grand-total').textContent = '$0.00';

        modal.style.display = 'block';
    }

    closeSaleModal() {
        const modal = document.getElementById('sale-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    addSaleItem() {
        const container = document.getElementById('sale-items');
        if (!container) return;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'sale-item';
        itemDiv.style.cssText = 'margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;';
        
        // Obtener productos disponibles (con stock)
        const availableProducts = this.inventory.products.filter(p => p.stock > 0 && p.status === 'active');
        
        itemDiv.innerHTML = `
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 10px; align-items: end;">
                <div>
                    <label>Producto</label>
                    <select class="sale-product-select" style="width:100%;" onchange="salesManager.updateSaleTotals()">
                        <option value="">Seleccionar producto...</option>
                        ${availableProducts.map(p => 
                            `<option value="${p.id}" data-price="${p.price}" data-stock="${p.stock}">
                                ${p.name} - $${p.price} (Stock: ${p.stock})
                            </option>`
                        ).join('')}
                    </select>
                </div>
                <div>
                    <label>Cantidad</label>
                    <input type="number" class="sale-quantity" value="1" min="1" style="width:100%;" onchange="salesManager.updateSaleTotals()">
                </div>
                <div>
                    <label>Subtotal</label>
                    <input type="text" class="sale-subtotal" readonly style="width:100%; background:#f5f5f5;" value="$0.00">
                </div>
                <div>
                    <label>&nbsp;</label>
                    <button type="button" onclick="this.closest('.sale-item').remove(); salesManager.updateSaleTotals();" 
                            style="background:#ef4444;color:white;border:none;padding:8px;border-radius:5px;cursor:pointer;">
                        ✕
                    </button>
                </div>
            </div>
        `;

        container.appendChild(itemDiv);
    }

    updateSaleTotals() {
        const items = document.querySelectorAll('.sale-item');
        let grandTotal = 0;

        items.forEach(item => {
            const select = item.querySelector('.sale-product-select');
            const quantityInput = item.querySelector('.sale-quantity');
            const subtotalInput = item.querySelector('.sale-subtotal');

            if (select && quantityInput && subtotalInput) {
                const selectedOption = select.options[select.selectedIndex];
                const price = selectedOption ? parseFloat(selectedOption.dataset.price) : 0;
                const quantity = parseInt(quantityInput.value) || 1;
                const subtotal = price * quantity;
                
                subtotalInput.value = Utils.formatCurrency(subtotal);
                grandTotal += subtotal;
            }
        });

        document.getElementById('sale-grand-total').textContent = Utils.formatCurrency(grandTotal);
    }

    async registerSale() {
        const items = [];
        let total = 0;
        let totalCost = 0;
        let totalProfit = 0;

        const saleItemElements = document.querySelectorAll('.sale-item');

        // Validar que haya al menos un producto
        if (saleItemElements.length === 0) {
            Utils.showToast('Agrega al menos un producto', 'warning');
            return;
        }

        for (const itemDiv of saleItemElements) {
            const select = itemDiv.querySelector('.sale-product-select');
            const quantityInput = itemDiv.querySelector('.sale-quantity');

            if (!select || !quantityInput) continue;

            const productId = parseInt(select.value);
            const quantity = parseInt(quantityInput.value);

            if (!productId || !quantity || quantity < 1) continue;

            const product = this.inventory.getProductById(productId);
            if (!product) {
                Utils.showToast('Producto no encontrado', 'error');
                return;
            }

            if (product.stock < quantity) {
                Utils.showToast(`Stock insuficiente para "${product.name}". Disponible: ${product.stock}`, 'error');
                return;
            }

            const price = product.price;
            const cost = product.cost;
            const subtotal = price * quantity;
            const profit = (price - cost) * quantity;

            items.push({
                productId: product.id,
                productName: product.name,
                quantity: quantity,
                price: price,
                cost: cost,
                subtotal: subtotal,
                profit: profit
            });

            total += subtotal;
            totalCost += cost * quantity;
            totalProfit += profit;

            // ACTUALIZAR STOCK - Esta es la llamada importante
            await this.inventory.updateStock(productId, quantity, false);
        }

        if (items.length === 0) {
            Utils.showToast('Selecciona al menos un producto válido', 'warning');
            return;
        }

        const customer = document.getElementById('sale-customer')?.value || 'Cliente General';
        const paymentMethod = document.getElementById('sale-payment-method')?.value || 'efectivo';

        const sale = {
            date: new Date().toISOString(),
            customer: customer,
            paymentMethod: paymentMethod,
            items: items,
            itemsCount: items.reduce((sum, item) => sum + item.quantity, 0),
            total: total,
            cost: totalCost,
            profit: totalProfit,
            status: 'completed'
        };

        try {
            // Guardar venta
            await window.db.add('sales', sale);

            // Registrar en caja si es efectivo
            if (paymentMethod === 'efectivo') {
                await window.db.add('cashMovements', {
                    date: sale.date,
                    type: 'ingreso',
                    amount: total,
                    concept: `Venta - ${customer}`,
                    description: `Venta de ${sale.itemsCount} productos`,
                    balanceAfter: 0
                });
            }

            await this.loadSales();
            this.renderSalesHistory();
            this.closeSaleModal();

            Utils.showToast(`Venta registrada - Total: ${Utils.formatCurrency(total)}`, 'success');

            // Actualizar otros módulos
            if (typeof dashboardManager !== 'undefined') dashboardManager.refresh();
            if (typeof cashManager !== 'undefined') {
                await cashManager.loadMovements();
                cashManager.renderCashSummary();
                cashManager.renderMovements();
            }
        } catch (error) {
            console.error('Error registrando venta:', error);
            Utils.showToast('Error al registrar la venta', 'error');
        }
    }

    renderSalesHistory() {
        const container = document.getElementById('sales-table');
        if (!container) return;

        const recentSales = [...this.sales]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 20);

        if (recentSales.length === 0) {
            container.innerHTML = '<p style="text-align:center;padding:40px;color:#999;">No hay ventas registradas</p>';
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th>Productos</th>
                        <th>Total</th>
                        <th>Ganancia</th>
                        <th>Método</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentSales.map(sale => `
                        <tr>
                            <td>${Utils.formatDateTime(sale.date)}</td>
                            <td>${sale.customer}</td>
                            <td>${sale.itemsCount || 1}</td>
                            <td><strong>${Utils.formatCurrency(sale.total)}</strong></td>
                            <td style="color:green;">${Utils.formatCurrency(sale.profit || 0)}</td>
                            <td><span class="status-badge success">${sale.paymentMethod}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    // Métodos de estadísticas simplificados
    async renderSalesStats() {
        // Implementación básica
        const todaySales = this.sales.filter(s => s.date.startsWith(Utils.getTodayDate()));
        const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);

        const todayElement = document.getElementById('stat-sales-today');
        if (todayElement) todayElement.textContent = Utils.formatCurrency(todayTotal);

        const transactionsElement = document.getElementById('stat-transactions-today');
        if (transactionsElement) transactionsElement.textContent = todaySales.length;
    }
}