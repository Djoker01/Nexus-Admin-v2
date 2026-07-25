class CashManager {
    constructor() {
        this.movements = [];
        this.currentBalance = 0;
        this.init();
    }

    async init() {
        await this.loadMovements();
        this.setupEventListeners();
        this.renderCashSummary();
        this.renderMovements();
    }

    async loadMovements() {
        try {
            this.movements = await db.getAll('cashMovements');
            this.calculateBalance();
        } catch (error) {
            console.error('Error cargando movimientos de caja:', error);
            this.movements = [];
        }
    }

    calculateBalance() {
        this.currentBalance = this.movements.reduce((balance, mov) => {
            return mov.type === 'ingreso' ? balance + mov.amount : balance - mov.amount;
        }, 0);
    }

    setupEventListeners() {
        document.getElementById('cash-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.registerMovement();
        });
    }

    openCashModal() {
        document.getElementById('cash-modal').style.display = 'block';
        document.getElementById('cash-form').reset();
        // Establecer fecha actual
        const dateField = document.querySelector('#cash-form input[type="date"]');
        if (dateField) {
            dateField.value = Utils.getTodayDate();
        }
    }

    closeCashModal() {
        document.getElementById('cash-modal').style.display = 'none';
        document.getElementById('cash-form').reset();
    }

    async registerMovement() {
        const type = document.getElementById('cash-type').value;
        const amount = parseFloat(document.getElementById('cash-amount').value);
        const concept = document.getElementById('cash-concept').value;
        const description = document.getElementById('cash-description').value;

        if (!type || !amount || !concept) {
            Utils.showToast('Completa todos los campos requeridos', 'warning');
            return;
        }

        // Validar que no haya egresos mayores al saldo
        if (type === 'egreso' && amount > this.currentBalance) {
            Utils.showToast('No hay suficiente saldo en caja para este egreso', 'error');
            return;
        }

        const movement = {
            date: new Date().toISOString(),
            type: type,
            amount: amount,
            concept: concept,
            description: description || '',
            balanceAfter: type === 'ingreso' ? 
                this.currentBalance + amount : 
                this.currentBalance - amount,
            status: 'completed'
        };

        try {
            await db.add('cashMovements', movement);
            await this.loadMovements();
            this.renderCashSummary();
            this.renderMovements();
            this.closeCashModal();
            
            Utils.showToast(
                `${type === 'ingreso' ? 'Ingreso' : 'Egreso'} registrado exitosamente`,
                'success'
            );
            
            this.updateDashboard();
        } catch (error) {
            console.error('Error registrando movimiento:', error);
            Utils.showToast('Error al registrar el movimiento', 'error');
        }
    }

    async renderCashSummary() {
        const today = Utils.getTodayDate();
        
        // Filtrar movimientos del día
        const todayMovements = this.movements.filter(m => m.date.startsWith(today));
        
        // Calcular ingresos y egresos del día
        const dailyIncome = todayMovements
            .filter(m => m.type === 'ingreso')
            .reduce((sum, m) => sum + m.amount, 0);
            
        const dailyExpense = todayMovements
            .filter(m => m.type === 'egreso')
            .reduce((sum, m) => sum + m.amount, 0);

        // Actualizar UI
        document.getElementById('cash-current-balance').textContent = 
            Utils.formatCurrency(this.currentBalance);
        document.getElementById('cash-daily-income').textContent = 
            Utils.formatCurrency(dailyIncome);
        document.getElementById('cash-daily-expense').textContent = 
            Utils.formatCurrency(dailyExpense);

        // Colorear saldo según estado
        const balanceElement = document.getElementById('cash-current-balance');
        if (this.currentBalance < 0) {
            balanceElement.style.color = 'var(--danger-color)';
        } else if (this.currentBalance < 1000) {
            balanceElement.style.color = 'var(--warning-color)';
        } else {
            balanceElement.style.color = 'var(--success-color)';
        }
    }

    async renderMovements() {
        // Ordenar por fecha descendente
        const sortedMovements = [...this.movements]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 50); // Últimos 50 movimientos

        const container = document.getElementById('cash-movements');
        
        if (sortedMovements.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #9CA3AF;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                        <line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                    <p>No hay movimientos de caja registrados</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Concepto</th>
                        <th>Monto</th>
                        <th>Saldo Posterior</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedMovements.map(movement => `
                        <tr>
                            <td>${Utils.formatDateTime(movement.date)}</td>
                            <td>
                                <span class="status-badge ${movement.type === 'ingreso' ? 'success' : 'danger'}">
                                    ${movement.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                                </span>
                            </td>
                            <td>
                                <strong>${movement.concept}</strong>
                                ${movement.description ? `<br><small style="color: #9CA3AF;">${movement.description}</small>` : ''}
                            </td>
                            <td>
                                <span style="color: ${movement.type === 'ingreso' ? 'var(--success-color)' : 'var(--danger-color)'}; font-weight: 600;">
                                    ${movement.type === 'ingreso' ? '+' : '-'} ${Utils.formatCurrency(movement.amount)}
                                </span>
                            </td>
                            <td>
                                <span style="font-weight: 600;">
                                    ${Utils.formatCurrency(movement.balanceAfter)}
                                </span>
                            </td>
                            <td>
                                <button class="btn-icon" onclick="cashManager.deleteMovement(${movement.id})" title="Eliminar">
                                    🗑️
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async deleteMovement(id) {
        const confirmed = await Utils.confirmAction(
            '¿Estás seguro de eliminar este movimiento? Esto afectará el saldo de caja.'
        );
        
        if (!confirmed) return;

        try {
            await db.delete('cashMovements', id);
            await this.loadMovements();
            this.renderCashSummary();
            this.renderMovements();
            Utils.showToast('Movimiento eliminado exitosamente', 'success');
            this.updateDashboard();
        } catch (error) {
            console.error('Error eliminando movimiento:', error);
            Utils.showToast('Error al eliminar el movimiento', 'error');
        }
    }

    async getDailySummary() {
        const today = Utils.getTodayDate();
        const todayMovements = this.movements.filter(m => m.date.startsWith(today));
        
        return {
            openingBalance: this.currentBalance - 
                todayMovements.reduce((sum, m) => 
                    m.type === 'ingreso' ? sum + m.amount : sum - m.amount, 0),
            income: todayMovements.filter(m => m.type === 'ingreso')
                .reduce((sum, m) => sum + m.amount, 0),
            expense: todayMovements.filter(m => m.type === 'egreso')
                .reduce((sum, m) => sum + m.amount, 0),
            currentBalance: this.currentBalance,
            transactionsCount: todayMovements.length
        };
    }

    async exportCashReport() {
        const report = this.movements.map(m => ({
            Fecha: Utils.formatDateTime(m.date),
            Tipo: m.type === 'ingreso' ? 'Ingreso' : 'Egreso',
            Concepto: m.concept,
            Descripción: m.description,
            Monto: m.amount,
            'Saldo Posterior': m.balanceAfter
        }));

        Utils.exportToCSV(report, `reporte-caja-${Utils.getTodayDate()}`);
        Utils.showToast('Reporte exportado exitosamente', 'success');
    }

    updateDashboard() {
        if (typeof dashboardManager !== 'undefined') {
            dashboardManager.refresh();
        }
    }
}