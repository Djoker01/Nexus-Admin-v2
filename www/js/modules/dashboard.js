class DashboardManager {
    constructor() {
        this.weeklyChart = null;
        this.init();
    }

    async init() {
        await this.loadDashboardData();
        this.setupChart();
        this.startAutoRefresh();
    }

    async loadDashboardData() {
        try {
            await Promise.all([
                this.loadKPIs(),
                this.loadRecentSales(),
                this.loadTopProducts(),
                this.loadQuickIndicators()
            ]);
        } catch (error) {
            console.error('Error cargando dashboard:', error);
            Utils.showToast('Error al cargar datos del dashboard', 'error');
        }
    }

    async loadKPIs() {
        const today = Utils.getTodayDate();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // Obtener ventas del día
        const todaySales = await db.getByIndex('sales', 'date', today);
        const yesterdaySales = await db.getByIndex('sales', 'date', yesterdayStr);

        // Calcular totales
        const todayTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0);
        const yesterdayTotal = yesterdaySales.reduce((sum, sale) => sum + sale.total, 0);
        const salesChange = Utils.calculatePercentage(todayTotal, yesterdayTotal);

        // Calcular ganancias
        const todayProfit = todaySales.reduce((sum, sale) => sum + sale.profit, 0);
        const yesterdayProfit = yesterdaySales.reduce((sum, sale) => sum + sale.profit, 0);
        const profitChange = Utils.calculatePercentage(todayProfit, yesterdayProfit);

        // Estado de caja
        const cashMovements = await db.getAll('cashMovements');
        const cashBalance = cashMovements.reduce((balance, mov) => {
            return mov.type === 'ingreso' ? balance + mov.amount : balance - mov.amount;
        }, 0);

        // Stock bajo
        const products = await db.getAll('products');
        const lowStock = products.filter(p => p.stock <= p.minStock).length;

        // Actualizar KPIs
        document.getElementById('kpi-daily-sales').textContent = Utils.formatCurrency(todayTotal);
        document.getElementById('kpi-sales-change').textContent = 
            `${salesChange >= 0 ? '+' : ''}${salesChange.toFixed(1)}% vs ayer`;
        document.getElementById('kpi-sales-change').className = 
            `kpi-change ${salesChange >= 0 ? 'positive' : 'negative'}`;

        document.getElementById('kpi-net-profit').textContent = Utils.formatCurrency(todayProfit);
        document.getElementById('kpi-profit-change').textContent = 
            `${profitChange >= 0 ? '+' : ''}${profitChange.toFixed(1)}% vs ayer`;
        document.getElementById('kpi-profit-change').className = 
            `kpi-change ${profitChange >= 0 ? 'positive' : 'negative'}`;

        document.getElementById('kpi-cash-balance').textContent = Utils.formatCurrency(cashBalance);
        document.getElementById('kpi-low-stock').textContent = lowStock;

        // Notificaciones
        document.getElementById('notification-badge').textContent = lowStock;
        document.getElementById('notification-badge').style.display = lowStock > 0 ? 'flex' : 'none';
    }

    async loadRecentSales() {
        const sales = await db.getAll('sales');
        const recentSales = sales
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        const container = document.getElementById('recent-sales');
        
        if (recentSales.length === 0) {
            container.innerHTML = '<p style="padding: 20px; text-align: center; color: #9CA3AF;">No hay ventas recientes</p>';
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Hora</th>
                        <th>Cliente</th>
                        <th>Productos</th>
                        <th>Total</th>
                        <th>Método</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentSales.map(sale => `
                        <tr>
                            <td>${Utils.formatTime(sale.date)}</td>
                            <td>${sale.customer || 'General'}</td>
                            <td>${sale.itemsCount || 1}</td>
                            <td><strong>${Utils.formatCurrency(sale.total)}</strong></td>
                            <td>
                                <span class="status-badge success">
                                    ${sale.paymentMethod || 'Efectivo'}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async loadTopProducts() {
        const sales = await db.getAll('sales');
        const productSales = {};

        sales.forEach(sale => {
            if (sale.items) {
                sale.items.forEach(item => {
                    if (!productSales[item.productId]) {
                        productSales[item.productId] = {
                            name: item.productName,
                            quantity: 0,
                            total: 0
                        };
                    }
                    productSales[item.productId].quantity += item.quantity;
                    productSales[item.productId].total += item.subtotal;
                });
            }
        });

        const topProducts = Object.values(productSales)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

        const container = document.getElementById('top-products-dashboard');
        
        if (topProducts.length === 0) {
            container.innerHTML = '<p style="padding: 20px; text-align: center; color: #9CA3AF;">No hay datos disponibles</p>';
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Total Vendido</th>
                    </tr>
                </thead>
                <tbody>
                    ${topProducts.map(product => `
                        <tr>
                            <td>${product.name}</td>
                            <td><strong>${product.quantity}</strong></td>
                            <td>${Utils.formatCurrency(product.total)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async loadQuickIndicators() {
        const today = Utils.getTodayDate();
        const todaySales = await db.getByIndex('sales', 'date', today);
        const monthRange = Utils.getMonthRange();
        const monthlySales = await db.getByDateRange('sales', 'date', monthRange.start, monthRange.end);
        const expenses = await db.getAll('expenses');
        const monthlyExpenses = expenses.filter(e => {
            const expenseDate = new Date(e.date);
            const now = new Date();
            return expenseDate.getMonth() === now.getMonth() && 
                   expenseDate.getFullYear() === now.getFullYear();
        });

        const indicators = [
            {
                label: 'Transacciones Hoy',
                value: todaySales.length,
                type: 'neutral'
            },
            {
                label: 'Ticket Promedio',
                value: Utils.formatCurrency(
                    todaySales.length > 0 
                        ? todaySales.reduce((sum, s) => sum + s.total, 0) / todaySales.length 
                        : 0
                ),
                type: 'neutral'
            },
            {
                label: 'Margen de Ganancia',
                value: (() => {
                    const totalSales = monthlySales.reduce((sum, s) => sum + s.total, 0);
                    const totalProfit = monthlySales.reduce((sum, s) => sum + s.profit, 0);
                    return totalSales > 0 
                        ? `${((totalProfit / totalSales) * 100).toFixed(1)}%` 
                        : '0%';
                })(),
                type: 'positive'
            },
            {
                label: 'Gastos del Mes',
                value: Utils.formatCurrency(
                    monthlyExpenses.reduce((sum, e) => sum + e.amount, 0)
                ),
                type: 'negative'
            },
            {
                label: 'Productos Activos',
                value: (await db.getAll('products')).filter(p => p.status === 'active').length,
                type: 'neutral'
            },
            {
                label: 'Clientes del Día',
                value: new Set(todaySales.map(s => s.customer).filter(Boolean)).size,
                type: 'neutral'
            }
        ];

        const container = document.getElementById('quick-indicators');
        container.innerHTML = indicators.map(ind => `
            <div class="indicator-item">
                <span class="indicator-label">${ind.label}</span>
                <span class="indicator-value ${ind.type}">${ind.value}</span>
            </div>
        `).join('');
    }

    setupChart() {
        const ctx = document.getElementById('weekly-sales-chart')?.getContext('2d');
        if (!ctx) return;

        this.loadWeeklyChartData(ctx);
    }

    async loadWeeklyChartData(ctx) {
        const dates = [];
        const salesData = [];
        const profitData = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            dates.push(new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(date));
            
            const daySales = await db.getByIndex('sales', 'date', dateStr);
            const total = daySales.reduce((sum, sale) => sum + sale.total, 0);
            const profit = daySales.reduce((sum, sale) => sum + sale.profit, 0);
            
            salesData.push(total);
            profitData.push(profit);
        }

        if (this.weeklyChart) {
            this.weeklyChart.destroy();
        }

        this.weeklyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Ventas',
                        data: salesData,
                        backgroundColor: '#111827',
                        borderRadius: 6,
                    },
                    {
                        label: 'Ganancias',
                        data: profitData,
                        backgroundColor: '#10B981',
                        borderRadius: 6,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    startAutoRefresh() {
        // Actualizar dashboard cada 5 minutos
        setInterval(() => {
            this.loadDashboardData();
            this.loadWeeklyChartData(
                document.getElementById('weekly-sales-chart')?.getContext('2d')
            );
        }, 300000);
    }

    refresh() {
        this.loadDashboardData();
        if (this.weeklyChart) {
            this.loadWeeklyChartData(
                document.getElementById('weekly-sales-chart')?.getContext('2d')
            );
        }
        Utils.showToast('Dashboard actualizado', 'success');
    }
}
