class ExpensesManager {
    constructor() {
        this.expenses = [];
        this.categories = [
            'servicios',
            'alquiler',
            'salarios',
            'insumos',
            'marketing',
            'transporte',
            'impuestos',
            'mantenimiento',
            'seguros',
            'otros'
        ];
        this.init();
    }

    async init() {
        await this.loadExpenses();
        this.setupEventListeners();
        this.renderExpensesSummary();
        this.renderExpenses();
    }

    async loadExpenses() {
        try {
            this.expenses = await db.getAll('expenses');
        } catch (error) {
            console.error('Error cargando gastos:', error);
            this.expenses = [];
        }
    }

    setupEventListeners() {
        document.getElementById('expense-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.registerExpense();
        });

        // Filtros
        document.getElementById('expense-category-filter').addEventListener('change', 
            () => this.renderExpenses()
        );
        
        document.getElementById('expense-date-filter').addEventListener('change', 
            () => this.renderExpenses()
        );
    }

    openExpenseModal() {
        document.getElementById('expense-modal').style.display = 'block';
        document.getElementById('expense-form').reset();
        
        // Establecer fecha actual
        document.getElementById('expense-date').value = Utils.getTodayDate();
    }

    closeExpenseModal() {
        document.getElementById('expense-modal').style.display = 'none';
        document.getElementById('expense-form').reset();
    }

    async registerExpense() {
        const expense = {
            category: document.getElementById('expense-category').value,
            amount: parseFloat(document.getElementById('expense-amount').value),
            date: document.getElementById('expense-date').value,
            description: document.getElementById('expense-description').value,
            receipt: document.getElementById('expense-receipt').value || '',
            notes: document.getElementById('expense-notes').value || '',
            isFixed: document.getElementById('expense-fixed').checked,
            status: 'completed'
        };

        if (!expense.category || !expense.amount || !expense.date || !expense.description) {
            Utils.showToast('Completa todos los campos requeridos', 'warning');
            return;
        }

        try {
            await db.add('expenses', expense);
            
            // Registrar egreso en caja automáticamente
            await db.add('cashMovements', {
                date: new Date(expense.date).toISOString(),
                type: 'egreso',
                amount: expense.amount,
                concept: `Gasto - ${expense.description}`,
                description: `Categoría: ${expense.category}${expense.receipt ? ' | Factura: ' + expense.receipt : ''}`,
                reference: `GASTO-${Date.now()}`,
                status: 'completed'
            });

            await this.loadExpenses();
            this.renderExpensesSummary();
            this.renderExpenses();
            this.closeExpenseModal();
            
            Utils.showToast('Gasto registrado exitosamente', 'success');
            this.updateDashboard();
            
            // Actualizar caja si está disponible
            if (typeof cashManager !== 'undefined') {
                await cashManager.loadMovements();
                cashManager.renderCashSummary();
                cashManager.renderMovements();
            }
        } catch (error) {
            console.error('Error registrando gasto:', error);
            Utils.showToast('Error al registrar el gasto', 'error');
        }
    }

    async renderExpensesSummary() {
        const monthRange = Utils.getMonthRange();
        
        // Gastos del mes
        const monthlyExpenses = this.expenses.filter(e => {
            const expenseDate = new Date(e.date);
            const now = new Date();
            return expenseDate.getMonth() === now.getMonth() && 
                   expenseDate.getFullYear() === now.getFullYear();
        });

        const monthlyTotal = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
        
        // Gastos fijos
        const fixedExpenses = this.expenses.filter(e => e.isFixed);
        const fixedTotal = fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
        
        // Gastos variables (no fijos)
        const variableExpenses = this.expenses.filter(e => !e.isFixed);
        const variableTotal = variableExpenses.reduce((sum, e) => sum + e.amount, 0);

        document.getElementById('expenses-monthly').textContent = Utils.formatCurrency(monthlyTotal);
        document.getElementById('expenses-fixed').textContent = Utils.formatCurrency(fixedTotal);
        document.getElementById('expenses-variable').textContent = Utils.formatCurrency(variableTotal);
    }

    async renderExpenses() {
        const categoryFilter = document.getElementById('expense-category-filter')?.value || '';
        const dateFilter = document.getElementById('expense-date-filter')?.value || '';

        let filteredExpenses = [...this.expenses];

        // Aplicar filtros
        if (categoryFilter) {
            filteredExpenses = filteredExpenses.filter(e => e.category === categoryFilter);
        }

        if (dateFilter) {
            filteredExpenses = filteredExpenses.filter(e => e.date.startsWith(dateFilter));
        }

        // Ordenar por fecha descendente
        filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));

        const container = document.getElementById('expenses-table');
        
        if (filteredExpenses.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #9CA3AF;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                    <p>No hay gastos registrados</p>
                </div>
            `;
            return;
        }

        // Agrupar por categoría para mostrar totales
        const categoryTotals = {};
        filteredExpenses.forEach(expense => {
            if (!categoryTotals[expense.category]) {
                categoryTotals[expense.category] = 0;
            }
            categoryTotals[expense.category] += expense.amount;
        });

        container.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h4 style="margin-bottom: 10px;">Totales por Categoría</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    ${Object.entries(categoryTotals).map(([category, total]) => `
                        <span class="status-badge warning">
                            ${category}: ${Utils.formatCurrency(total)}
                        </span>
                    `).join('')}
                </div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Categoría</th>
                        <th>Descripción</th>
                        <th>Monto</th>
                        <th>Tipo</th>
                        <th>Factura</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredExpenses.map(expense => `
                        <tr>
                            <td>${Utils.formatDate(expense.date)}</td>
                            <td>
                                <span class="status-badge info">${expense.category}</span>
                            </td>
                            <td>
                                <strong>${expense.description}</strong>
                                ${expense.notes ? `<br><small style="color: #9CA3AF;">${expense.notes}</small>` : ''}
                            </td>
                            <td style="color: var(--danger-color); font-weight: 600;">
                                ${Utils.formatCurrency(expense.amount)}
                            </td>
                            <td>
                                <span class="status-badge ${expense.isFixed ? 'success' : 'warning'}">
                                    ${expense.isFixed ? 'Fijo' : 'Variable'}
                                </span>
                            </td>
                            <td>
                                ${expense.receipt ? 
                                    `<code style="font-size: 0.75rem;">${expense.receipt}</code>` : 
                                    '<span style="color: #9CA3AF;">-</span>'}
                            </td>
                            <td>
                                <div style="display: flex; gap: 4px;">
                                    <button class="btn-icon" onclick="expensesManager.editExpense(${expense.id})" title="Editar">
                                        ✏️
                                    </button>
                                    <button class="btn-icon" onclick="expensesManager.deleteExpense(${expense.id})" title="Eliminar">
                                        🗑️
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr style="background: #F9FAFB; font-weight: 700;">
                        <td colspan="3">Total</td>
                        <td style="color: var(--danger-color);">
                            ${Utils.formatCurrency(filteredExpenses.reduce((sum, e) => sum + e.amount, 0))}
                        </td>
                        <td colspan="3"></td>
                    </tr>
                </tfoot>
            </table>
        `;
    }

    async editExpense(id) {
        const expense = this.expenses.find(e => e.id === id);
        if (!expense) return;

        document.getElementById('expense-category').value = expense.category;
        document.getElementById('expense-amount').value = expense.amount;
        document.getElementById('expense-date').value = expense.date.split('T')[0];
        document.getElementById('expense-description').value = expense.description;
        document.getElementById('expense-receipt').value = expense.receipt || '';
        document.getElementById('expense-notes').value = expense.notes || '';
        document.getElementById('expense-fixed').checked = expense.isFixed;

        // Cambiar el comportamiento del formulario para actualizar
        const form = document.getElementById('expense-form');
        const originalSubmit = form.onsubmit;
        
        form.onsubmit = async (e) => {
            e.preventDefault();
            
            const updatedExpense = {
                id: expense.id,
                category: document.getElementById('expense-category').value,
                amount: parseFloat(document.getElementById('expense-amount').value),
                date: document.getElementById('expense-date').value,
                description: document.getElementById('expense-description').value,
                receipt: document.getElementById('expense-receipt').value,
                notes: document.getElementById('expense-notes').value,
                isFixed: document.getElementById('expense-fixed').checked,
                status: expense.status,
                createdAt: expense.createdAt
            };

            try {
                await db.update('expenses', updatedExpense);
                await this.loadExpenses();
                this.renderExpensesSummary();
                this.renderExpenses();
                this.closeExpenseModal();
                Utils.showToast('Gasto actualizado exitosamente', 'success');
                
                // Restaurar comportamiento original
                form.onsubmit = originalSubmit;
            } catch (error) {
                console.error('Error actualizando gasto:', error);
                Utils.showToast('Error al actualizar el gasto', 'error');
            }
        };

        document.getElementById('expense-modal').style.display = 'block';
    }

    async deleteExpense(id) {
        const confirmed = await Utils.confirmAction(
            '¿Estás seguro de eliminar este gasto? También se eliminará el movimiento de caja asociado.'
        );
        
        if (!confirmed) return;

        try {
            await db.delete('expenses', id);
            await this.loadExpenses();
            this.renderExpensesSummary();
            this.renderExpenses();
            Utils.showToast('Gasto eliminado exitosamente', 'success');
            
            // Actualizar caja
            if (typeof cashManager !== 'undefined') {
                await cashManager.loadMovements();
                cashManager.renderCashSummary();
                cashManager.renderMovements();
            }
            
            this.updateDashboard();
        } catch (error) {
            console.error('Error eliminando gasto:', error);
            Utils.showToast('Error al eliminar el gasto', 'error');
        }
    }

    async getExpensesByCategory() {
        const categorySummary = {};
        
        this.expenses.forEach(expense => {
            if (!categorySummary[expense.category]) {
                categorySummary[expense.category] = {
                    total: 0,
                    count: 0,
                    fixed: 0,
                    variable: 0
                };
            }
            categorySummary[expense.category].total += expense.amount;
            categorySummary[expense.category].count++;
            
            if (expense.isFixed) {
                categorySummary[expense.category].fixed += expense.amount;
            } else {
                categorySummary[expense.category].variable += expense.amount;
            }
        });

        return categorySummary;
    }

    async getMonthlyExpenses() {
        const monthRange = Utils.getMonthRange();
        return this.expenses.filter(e => 
            e.date >= monthRange.start && e.date <= monthRange.end
        );
    }

    updateDashboard() {
        if (typeof dashboardManager !== 'undefined') {
            dashboardManager.refresh();
        }
    }
}
