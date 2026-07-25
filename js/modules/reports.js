class ReportsManager {
    constructor(inventoryManager, salesManager, cashManager, expensesManager) {
        this.inventory = inventoryManager;
        this.sales = salesManager;
        this.cash = cashManager;
        this.expenses = expensesManager;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.generateSalesReport();
        this.loadTopProductsReport();
        this.loadFinancialSummary();
        this.loadGeneralBalance();
    }

    setupEventListeners() {
        document.getElementById('report-period').addEventListener('change', () => {
            this.generateSalesReport();
        });
    }

    async generateSalesReport() {
        const period = document.getElementById('report-period')?.value || 'monthly';
        const container = document.getElementById('sales-report-content');
        
        let startDate, endDate;
        const now = new Date();
        
        switch(period) {
            case 'daily':
                startDate = Utils.getTodayDate();
                endDate = startDate;
                break;
            case 'weekly':
                const weekRange = Utils.getDateRange(7);
                startDate = weekRange.start.split('T')[0];
                endDate = weekRange.end.split('T')[0];
                break;
            case 'monthly':
                const monthRange = Utils.getMonthRange();
                startDate = monthRange.start.split('T')[0];
                endDate = monthRange.end.split('T')[0];
                break;
            case 'yearly':
                startDate = `${now.getFullYear()}-01-01`;
                endDate = `${now.getFullYear()}-12-31`;
                break;
        }

        // Filtrar ventas por período
        const periodSales = this.sales.sales.filter(s => 
            s.date >= startDate && s.date <= endDate + 'T23:59:59'
        );

        // Calcular estadísticas
        const totalSales = periodSales.reduce((sum, s) => sum + s.total, 0);
        const totalProfit = periodSales.reduce((sum, s) => sum + s.profit, 0);
        const totalTransactions = periodSales.length;
        const avgTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0;
        
        // Ventas por día
        const salesByDay = {};
        periodSales.forEach(sale => {
            const day = sale.date.split('T')[0];
            if (!salesByDay[day]) {
                salesByDay[day] = { total: 0, count: 0, profit: 0 };
            }
            salesByDay[day].total += sale.total;
            salesByDay[day].count++;
            salesByDay[day].profit += sale.profit;
        });

        // Métodos de pago
        const paymentMethods = {};
        periodSales.forEach(sale => {
            const method = sale.paymentMethod || 'efectivo';
            if (!paymentMethods[method]) {
                paymentMethods[method] = { total: 0, count: 0 };
            }
            paymentMethods[method].total += sale.total;
            paymentMethods[method].count++;
        });

        container.innerHTML = `
            <div style="padding: 20px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                    <div style="background: #F9FAFB; padding: 20px; border-radius: 8px;">
                        <h4 style="color: #6B7280; margin-bottom: 10px;">Total Ventas</h4>
                        <p style="font-size: 1.5rem; font-weight: 700;">${Utils.formatCurrency(totalSales)}</p>
                    </div>
                    <div style="background: #F9FAFB; padding: 20px; border-radius: 8px;">
                        <h4 style="color: #6B7280; margin-bottom: 10px;">Ganancia Total</h4>
                        <p style="font-size: 1.5rem; font-weight: 700; color: var(--success-color);">${Utils.formatCurrency(totalProfit)}</p>
                    </div>
                    <div style="background: #F9FAFB; padding: 20px; border-radius: 8px;">
                        <h4 style="color: #6B7280; margin-bottom: 10px;">Transacciones</h4>
                        <p style="font-size: 1.5rem; font-weight: 700;">${totalTransactions}</p>
                    </div>
                    <div style="background: #F9FAFB; padding: 20px; border-radius: 8px;">
                        <h4 style="color: #6B7280; margin-bottom: 10px;">Ticket Promedio</h4>
                        <p style="font-size: 1.5rem; font-weight: 700;">${Utils.formatCurrency(avgTicket)}</p>
                    </div>
                </div>

                <div style="margin-bottom: 30px;">
                    <h4 style="margin-bottom: 15px;">Ventas por Día</h4>
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Ventas</th>
                                <th>Transacciones</th>
                                <th>Ganancia</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(salesByDay)
                                .sort(([a], [b]) => b.localeCompare(a))
                                .map(([day, data]) => `
                                    <tr>
                                        <td>${Utils.formatDate(day)}</td>
                                        <td>${Utils.formatCurrency(data.total)}</td>
                                        <td>${data.count}</td>
                                        <td style="color: var(--success-color);">${Utils.formatCurrency(data.profit)}</td>
                                    </tr>
                                `).join('')}
                        </tbody>
                    </table>
                </div>

                <div>
                    <h4 style="margin-bottom: 15px;">Métodos de Pago</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                        ${Object.entries(paymentMethods).map(([method, data]) => `
                            <div style="background: #F9FAFB; padding: 15px; border-radius: 8px; text-align: center;">
                                <p style="font-weight: 600; text-transform: capitalize;">${method}</p>
                                <p style="font-size: 1.25rem; font-weight: 700;">${Utils.formatCurrency(data.total)}</p>
                                <p style="color: #6B7280; font-size: 0.875rem;">${data.count} transacciones</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    async loadTopProductsReport() {
        const container = document.getElementById('top-products-report');
        
        // Calcular productos más vendidos
        const productSales = {};
        this.sales.sales.forEach(sale => {
            if (sale.items) {
                sale.items.forEach(item => {
                    if (!productSales[item.productId]) {
                        productSales[item.productId] = {
                            name: item.productName,
                            code: item.productCode,
                            quantity: 0,
                            total: 0,
                            profit: 0
                        };
                    }
                    productSales[item.productId].quantity += item.quantity;
                    productSales[item.productId].total += item.subtotal;
                    productSales[item.productId].profit += item.profit;
                });
            }
        });

        const topProducts = Object.values(productSales)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        if (topProducts.length === 0) {
            container.innerHTML = '<p style="padding: 20px; text-align: center; color: #9CA3AF;">No hay datos de ventas</p>';
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Total Vendido</th>
                        <th>Ganancia</th>
                    </tr>
                </thead>
                <tbody>
                    ${topProducts.map((product, index) => `
                        <tr>
                            <td><strong>#${index + 1}</strong></td>
                            <td>
                                <strong>${product.name}</strong>
                                ${product.code ? `<br><code>${product.code}</code>` : ''}
                            </td>
                            <td><strong>${product.quantity}</strong></td>
                            <td>${Utils.formatCurrency(product.total)}</td>
                            <td style="color: var(--success-color);">${Utils.formatCurrency(product.profit)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async loadFinancialSummary() {
        const container = document.getElementById('financial-summary');
        const monthRange = Utils.getMonthRange();
        
        // Ventas del mes
        const monthlySales = this.sales.sales.filter(s => 
            s.date >= monthRange.start && s.date <= monthRange.end
        );
        const totalSales = monthlySales.reduce((sum, s) => sum + s.total, 0);
        const totalProfit = monthlySales.reduce((sum, s) => sum + s.profit, 0);
        
        // Gastos del mes
        const monthlyExpenses = this.expenses.expenses.filter(e => 
            e.date >= monthRange.start.split('T')[0] && 
            e.date <= monthRange.end.split('T')[0]
        );
        const totalExpenses = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
        
        // Balance
        const balance = totalProfit - totalExpenses;
        const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

        container.innerHTML = `
            <div style="padding: 20px;">
                <div style="display: grid; gap: 15px;">
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #E5E7EB;">
                        <span>Ingresos por Ventas</span>
                        <span style="font-weight: 600;">${Utils.formatCurrency(totalSales)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #E5E7EB;">
                        <span>Costo de Ventas</span>
                        <span style="font-weight: 600; color: var(--danger-color);">${Utils.formatCurrency(totalSales - totalProfit)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #E5E7EB;">
                        <span>Ganancia Bruta</span>
                        <span style="font-weight: 600; color: var(--success-color);">${Utils.formatCurrency(totalProfit)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #E5E7EB;">
                        <span>Gastos Operativos</span>
                        <span style="font-weight: 600; color: var(--danger-color);">${Utils.formatCurrency(totalExpenses)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 15px 0; background: #F9FAFB; margin: 0 -20px; padding-left: 20px; padding-right: 20px;">
                        <span style="font-weight: 700;">Balance Neto</span>
                        <span style="font-weight: 700; font-size: 1.25rem; color: ${balance >= 0 ? 'var(--success-color)' : 'var(--danger-color)'};">
                            ${Utils.formatCurrency(balance)}
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px 0;">
                        <span>Margen de Ganancia</span>
                        <span style="font-weight: 600;">${profitMargin.toFixed(1)}%</span>
                    </div>
                </div>
            </div>
        `;
    }

    async loadGeneralBalance() {
        const container = document.getElementById('general-balance');
        
        // Obtener datos actuales
        const products = await db.getAll('products');
        const totalInventoryValue = products.reduce((sum, p) => sum + (p.cost * p.stock), 0);
        const potentialRevenue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
        const potentialProfit = potentialRevenue - totalInventoryValue;
        
        // Caja actual
        const cashBalance = this.cash.currentBalance;
        
        // Ventas totales
        const totalSalesAllTime = this.sales.sales.reduce((sum, s) => sum + s.total, 0);
        const totalProfitAllTime = this.sales.sales.reduce((sum, s) => sum + s.profit, 0);
        
        // Gastos totales
        const totalExpensesAllTime = this.expenses.expenses.reduce((sum, e) => sum + e.amount, 0);

        container.innerHTML = `
            <div style="padding: 20px;">
                <h4 style="margin-bottom: 15px;">Balance General</h4>
                <div style="display: grid; gap: 15px;">
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #E5E7EB;">
                        <span>Efectivo en Caja</span>
                        <span style="font-weight: 600;">${Utils.formatCurrency(cashBalance)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #E5E7EB;">
                        <span>Valor de Inventario</span>
                        <span style="font-weight: 600;">${Utils.formatCurrency(totalInventoryValue)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #E5E7EB;">
                        <span>Ingresos Potenciales</span>
                        <span style="font-weight: 600; color: var(--success-color);">${Utils.formatCurrency(potentialRevenue)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #E5E7EB;">
                        <span>Ventas Totales</span>
                        <span style="font-weight: 600;">${Utils.formatCurrency(totalSalesAllTime)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #E5E7EB;">
                        <span>Ganancias Totales</span>
                        <span style="font-weight: 600; color: var(--success-color);">${Utils.formatCurrency(totalProfitAllTime)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px 0;">
                        <span>Gastos Totales</span>
                        <span style="font-weight: 600; color: var(--danger-color);">${Utils.formatCurrency(totalExpensesAllTime)}</span>
                    </div>
                </div>
                
                <div style="margin-top: 20px; padding: 15px; background: #F9FAFB; border-radius: 8px;">
                    <h4 style="margin-bottom: 10px;">Resumen</h4>
                    <p style="font-size: 0.875rem; color: #6B7280;">
                        <strong>${products.length}</strong> productos en inventario |
                        <strong>${products.filter(p => p.stock <= p.minStock).length}</strong> con stock bajo |
                        <strong>${products.filter(p => p.stock === 0).length}</strong> agotados
                    </p>
                </div>
            </div>
        `;
    }

    async exportReport(type) {
        switch(type) {
            case 'sales':
                const salesReport = this.sales.sales.map(s => ({
                    Fecha: Utils.formatDateTime(s.date),
                    Cliente: s.customer,
                    Productos: s.itemsCount,
                    Total: s.total,
                    Ganancia: s.profit,
                    Método: s.paymentMethod
                }));
                Utils.exportToCSV(salesReport, 'reporte-ventas');
                break;
                
            case 'expenses':
                const expensesReport = this.expenses.expenses.map(e => ({
                    Fecha: e.date,
                    Categoría: e.category,
                    Descripción: e.description,
                    Monto: e.amount,
                    Tipo: e.isFixed ? 'Fijo' : 'Variable',
                    Factura: e.receipt
                }));
                Utils.exportToCSV(expensesReport, 'reporte-gastos');
                break;
                
            case 'inventory':
                const inventoryReport = this.inventory.products.map(p => ({
                    Código: p.code,
                    Nombre: p.name,
                    Categoría: p.category,
                    Stock: p.stock,
                    'Precio Compra': p.cost,
                    'Precio Venta': p.price,
                    Ganancia: p.profit,
                    Estado: p.status
                }));
                Utils.exportToCSV(inventoryReport, 'reporte-inventario');
                break;
        }
        
        Utils.showToast('Reporte exportado exitosamente', 'success');
    }
}