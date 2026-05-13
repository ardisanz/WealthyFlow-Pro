/* WEALTHYFLOW PRO - CORE LOGIC 
   Paste kode ini di dalam tag <script> di file HTML lo
*/

// --- PURE JS LOGIC ---
const FinanceLogic = {
    calculateAllocations: function(income, ratios) {
        return {
            Needs: Math.round(income * (ratios.Needs / 100)),
            Wants: Math.round(income * (ratios.Wants / 100)),
            Savings: Math.round(income * (ratios.Savings / 100))
        };
    },
    evaluateSpending: function(expensesByType, allocations, ratios) {
        let suggestions = [];
        if (allocations.Wants > 0 && expensesByType.Wants > allocations.Wants * 1.2) {
            let percentExceeded = Math.round(((expensesByType.Wants - allocations.Wants) / allocations.Wants) * 100);
            let newWants = Math.max(10, ratios.Wants - 5);
            if (newWants < ratios.Wants) {
                let diff = ratios.Wants - newWants;
                let newSavings = ratios.Savings + diff;
                suggestions.push({
                    message: `Reason: You exceeded Wants by ${percentExceeded}%. Suggestion: Reduce Wants by ${diff}% and Increase Savings by ${diff}%.`,
                    newRatios: { Needs: ratios.Needs, Wants: newWants, Savings: newSavings }
                });
            }
        }
        return suggestions;
    },
    processRecurring: function(transactions, recurringList) {
        let now = new Date();
        let changed = false;
        recurringList.forEach(req => {
            let nextDate = new Date(req.nextDate);
            while (nextDate <= now) {
                transactions.unshift({
                    id: Date.now() + Math.random(),
                    amount: req.amount,
                    category: req.name,
                    type: req.type, // 'income' or 'expense'
                    date: nextDate.toISOString(),
                    isRecurring: true
                });
                // Increment month
                nextDate.setMonth(nextDate.getMonth() + 1);
                req.nextDate = nextDate.toISOString();
                changed = true;
            }
        });
        return changed;
    },
    calculateHealthScore: function(totalIncome, totalSavings, expensesByType) {
        if (totalIncome === 0) return { score: 0, status: 'Boros', explanation: 'No income to analyze yet.' };
        
        let score = 0;
        
        // 1. Saving Rate (Max 40 points) -> Ideal >= 20%
        let savingRate = totalSavings / totalIncome;
        score += Math.min(40, (savingRate / 0.2) * 40);
        
        // 2. Spending Behavior (Max 40 points) -> Ideal: Wants <= 30% of income
        let wantsRatio = expensesByType.Wants / totalIncome;
        if (wantsRatio <= 0.3) score += 40;
        else if (wantsRatio <= 0.5) score += 20;
        else score += 0;

        // 3. Consistency (Max 20 points) -> Simplification: Needs covered reliably
        let needsRatio = expensesByType.Needs / totalIncome;
        if (needsRatio <= 0.5) score += 20;
        else if (needsRatio <= 0.7) score += 10;
        else score += 0;

        score = Math.round(score);
        if (score > 100) score = 100;
        
        let status = score <= 40 ? 'Boros' : (score <= 70 ? 'Cukup' : 'Sehat');
        let explanation = "";
        if (savingRate < 0.1) explanation = "Your saving rate is dangerously low.";
        else if (wantsRatio > 0.4) explanation = "Your saving rate is okay, but spending on Wants is too high.";
        else explanation = "Great job! Your saving rate and spending are stable.";

        return { score, status, explanation };
    },
    buildChartData: function(transactions, budgets) {
        // Compute datasets for charts
        let pie = { Needs: 0, Wants: 0, Savings: 0 };
        let line = []; // Balance over time
        let weekly = {}; // Expenses per week
        
        let balance = 0;
        let sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        sorted.forEach(t => {
            // Line
            if (t.type === 'income') balance += t.amount;
            else balance -= t.amount;
            line.push({ x: t.date, y: balance });
            
            // Pie & Weekly
            if (t.type === 'expense') {
                let type = budgets[t.category]?.type || 'Needs';
                if (pie[type] !== undefined) pie[type] += t.amount;
                
                let d = new Date(t.date);
                let weekStr = d.getFullYear() + '-W' + Math.ceil(d.getDate() / 7);
                weekly[weekStr] = (weekly[weekStr] || 0) + t.amount;
            }
        });
        
        return { pie, line, weekly };
    }
};

function moneyApp() {
    return {
        // UI States
        darkMode: false,
        showQuickAdd: false,
        
        // Transaction Form
        transactionType: 'expense',
        newAmount: 0,
        displayAmount: '',
        newCategory: '',
        incomeSource: '',
        
        // Categories
        showAddCategory: false,
        newCatName: '',
        newCatType: 'Needs',
        budgets: {},
        
        // Data
        transactions: [],
        recurringTransactions: [],
        notifications: [],
        
        // Auto-Saving
        ratios: { Needs: 50, Wants: 30, Savings: 20 },
        showRatioSettings: false,
        tempRatios: { Needs: 50, Wants: 30, Savings: 20 },
        ratioError: '',
        suggestions: [],
        
        // Recurring Form
        showRecurring: false,
        newRecName: '',
        newRecAmount: 0,
        newRecDisplay: '',
        newRecType: 'expense',
        newRecDate: '',
        
        // Health Score
        healthScore: { score: 0, status: '...', explanation: '...' },
        
        // Calculators & Charts
        showCalc: false,
        calcDisplay: '0',
        calcExpression: '',
        charts: { pie: null, line: null, bar: null },

        // --- INITIALIZATION ---
        init() {
            // Load LocalStorage
            this.darkMode = JSON.parse(localStorage.getItem('pro_dark')) || false;
            this.budgets = JSON.parse(localStorage.getItem('pro_budgets')) || {
                'Makan':     { type: 'Needs' },
                'Transport': { type: 'Needs' }
            };
            this.transactions = JSON.parse(localStorage.getItem('pro_history')) || [];
            this.recurringTransactions = JSON.parse(localStorage.getItem('pro_recurring')) || [];
            this.ratios = JSON.parse(localStorage.getItem('pro_ratios')) || { Needs: 50, Wants: 30, Savings: 20 };
            
            this.tempRatios = { ...this.ratios };
            this.newCategory  = Object.keys(this.budgets)[0] || '';
            
            // Process Recurring
            if (FinanceLogic.processRecurring(this.transactions, this.recurringTransactions)) {
                this.saveData();
                this.pushNote('Recurring transactions auto-processed!');
            }
            
            this.updateAllDerived();
            
            this.$watch('transactions', () => {
                this.updateAllDerived();
                this.$nextTick(() => this.renderCharts());
            });
            
            this.$watch('darkMode', (val) => {
                localStorage.setItem('pro_dark', JSON.stringify(val));
                this.renderCharts(); // Re-render to update text colors
            });
            
            this.$nextTick(() => {
                this.renderCharts();
            });
        },
        
        updateAllDerived() {
            this.checkSuggestions();
            this.updateHealthScore();
        },

        // --- RATIO SETTINGS ---
        saveRatios() {
            let n = Number(this.tempRatios.Needs);
            let w = Number(this.tempRatios.Wants);
            let s = Number(this.tempRatios.Savings);
            if (n + w + s !== 100) {
                this.ratioError = 'Total rasio harus 100%';
                return;
            }
            this.ratioError = '';
            this.ratios = { Needs: n, Wants: w, Savings: s };
            this.saveData();
            this.showRatioSettings = false;
            this.pushNote('Rasio berhasil diperbarui!');
            this.updateAllDerived();
            this.renderCharts();
        },

        // --- AUTO BUDGET SYSTEM ---
        getAutoBudgetLimit(type) {
            let allocations = FinanceLogic.calculateAllocations(this.monthlyIncome, this.ratios);
            return allocations[type] || 0;
        },

        getTypeSpending(type) {
            return this.transactions
                .filter(t => t.type === 'expense' && this.budgets[t.category]?.type === type)
                .reduce((s,t) => s + t.amount, 0);
        },

        getTypePercent(type) {
            let limit = this.getAutoBudgetLimit(type);
            if (!limit) return 0;
            let p = Math.round((this.getTypeSpending(type) / limit) * 100);
            return p > 100 ? 100 : p;
        },

        checkSuggestions() {
            let expensesByType = {
                Needs: this.getTypeSpending('Needs'),
                Wants: this.getTypeSpending('Wants'),
                Savings: this.getTypeSpending('Savings')
            };
            let allocations = FinanceLogic.calculateAllocations(this.monthlyIncome, this.ratios);
            this.suggestions = FinanceLogic.evaluateSpending(expensesByType, allocations, this.ratios);
        },

        applySuggestion(newRatios) {
            this.ratios = { ...newRatios };
            this.tempRatios = { ...newRatios };
            this.saveData();
            this.suggestions = [];
            this.pushNote('Rasio disesuaikan!');
            this.updateAllDerived();
            this.renderCharts();
        },

        ignoreSuggestion() {
            this.suggestions = [];
        },
        
        // --- HEALTH SCORE ---
        updateHealthScore() {
            let expensesByType = {
                Needs: this.getTypeSpending('Needs'),
                Wants: this.getTypeSpending('Wants'),
                Savings: this.getTypeSpending('Savings')
            };
            let totalSav = this.transactions.filter(t => t.type === 'expense' && this.budgets[t.category]?.type === 'Savings').reduce((s,t)=>s+t.amount, 0);
            this.healthScore = FinanceLogic.calculateHealthScore(this.totalIncome, totalSav, expensesByType);
        },

        // --- UI FORMATTING ---
        handleFormat(el, targetObj, targetProp) {
            let val = el.value.replace(/[^0-9]/g, '');
            let num = parseInt(val) || 0;
            if(targetObj) targetObj[targetProp] = num;
            else this.newAmount = num;
            
            let formatted = val ? new Intl.NumberFormat('id-ID').format(num) : '';
            el.value = formatted;
            if(!targetObj) this.displayAmount = formatted;
        },
        
        handleRecFormat(el) {
            let val = el.value.replace(/[^0-9]/g, '');
            this.newRecAmount = parseInt(val) || 0;
            this.newRecDisplay = val ? new Intl.NumberFormat('id-ID').format(this.newRecAmount) : '';
            el.value = this.newRecDisplay;
        },

        formatRupiah(num) {
            return 'Rp ' + new Intl.NumberFormat('id-ID').format(num || 0);
        },

        formatDate(iso) {
            try {
                return new Date(iso).toLocaleDateString('id-ID', {
                    day: '2-digit', month: 'short', year: 'numeric'
                });
            } catch { return iso; }
        },
        
        getDueDateStatus(isoDate) {
            let diff = new Date(isoDate) - new Date();
            let days = diff / (1000 * 60 * 60 * 24);
            if (days < 0) return 'text-rose-500 font-bold'; // Overdue
            if (days <= 3) return 'text-amber-500 font-bold'; // Due soon
            return 'text-slate-500'; // Upcoming
        },

        // --- TRANSACTION LOGIC ---
        addTransaction() {
            if (this.newAmount <= 0) return;
            
            this.transactions.unshift({
                id: Date.now(),
                amount:   this.newAmount,
                category: this.transactionType === 'income'
                    ? (this.incomeSource || 'Pemasukan')
                    : this.newCategory,
                type: this.transactionType,
                date: new Date().toISOString(),
                isRecurring: false
            });

            // Reset Form
            this.newAmount     = 0;
            this.displayAmount = '';
            this.incomeSource  = '';
            this.showQuickAdd  = false;
            
            this.saveData();
            this.pushNote('Transaksi Berhasil!');
        },
        
        addRecurring() {
            if (this.newRecAmount <= 0 || !this.newRecName || !this.newRecDate) return;
            this.recurringTransactions.push({
                id: Date.now(),
                name: this.newRecName,
                amount: this.newRecAmount,
                type: this.newRecType,
                nextDate: new Date(this.newRecDate).toISOString()
            });
            this.saveData();
            this.pushNote('Recurring ditambahkan!');
            this.newRecName = '';
            this.newRecAmount = 0;
            this.newRecDisplay = '';
        },
        
        deleteRecurring(id) {
            this.recurringTransactions = this.recurringTransactions.filter(r => r.id !== id);
            this.saveData();
        },

        // --- CORE FINANCE CALCULATIONS (GETTERS) ---
        get totalIncome() {
            return this.transactions.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
        },
        
        get totalExpense() {
            return this.transactions.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
        },
        
        get totalSaldo()  { 
            return this.totalIncome - this.totalExpense; 
        },
        
        get monthlyIncome() {
            const now = new Date();
            return this.transactions
                .filter(t => {
                    let d = new Date(t.date);
                    return t.type === 'income' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                })
                .reduce((s,t) => s + t.amount, 0);
        },

        // --- CATEGORY MANAGEMENT ---
        addCategory() {
            if (!this.newCatName.trim()) return;
            this.budgets[this.newCatName.trim()] = { type: this.newCatType };
            this.budgets = { ...this.budgets }; // Trigger reaktivitas
            this.saveData();
            this.showAddCategory = false;
            this.newCatName = '';
            this.pushNote('Kategori Ditambahkan!');
        },

        deleteCategory(key) {
            if (confirm(`Hapus kategori ${key}?`)) {
                delete this.budgets[key];
                this.budgets = { ...this.budgets };
                this.saveData();
            }
        },
        
        getCategoryIcon(catName) {
            let n = catName.toLowerCase();
            if(n.includes('makan') || n.includes('food')) return '🍔';
            if(n.includes('transport') || n.includes('mobil')) return '🚌';
            if(n.includes('bill') || n.includes('tagihan') || n.includes('listrik')) return '🧾';
            if(n.includes('hiburan') || n.includes('main') || n.includes('netflix')) return '🎬';
            if(n.includes('gaji') || n.includes('income')) return '💰';
            return '🏷️';
        },

        // --- DATA PERSISTENCE ---
        saveData() {
            localStorage.setItem('pro_budgets',  JSON.stringify(this.budgets));
            localStorage.setItem('pro_history',  JSON.stringify(this.transactions));
            localStorage.setItem('pro_ratios',   JSON.stringify(this.ratios));
            localStorage.setItem('pro_recurring', JSON.stringify(this.recurringTransactions));
        },

        clearHistory() {
            if (confirm('Yakin mau hapus semua data riwayat?')) {
                this.transactions = [];
                this.saveData();
            }
        },

        // --- NOTIFICATIONS ---
        pushNote(msg) {
            const id = Date.now();
            this.notifications.push({ id, msg });
            setTimeout(() => { 
                this.notifications = this.notifications.filter(n => n.id !== id); 
            }, 2500);
        },

        // --- CHART ENGINE ---
        renderCharts() {
            let data = FinanceLogic.buildChartData(this.transactions, this.budgets);
            
            // 1. Pie Chart
            const ctxPie = document.getElementById('pieChart');
            if (ctxPie) {
                if (this.charts.pie) this.charts.pie.destroy();
                this.charts.pie = new Chart(ctxPie, {
                    type: 'doughnut',
                    data: {
                        labels: ['Needs', 'Wants', 'Savings'],
                        datasets: [{
                            data: [data.pie.Needs, data.pie.Wants, data.pie.Savings],
                            backgroundColor: ['#7EACB5', '#fbbf24', '#34d399'],
                            borderWidth: 2,
                            borderColor: this.darkMode ? '#1e293b' : '#ffffff'
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: this.darkMode ? '#cbd5e1' : '#475569' } } } }
                });
            }
            
            // 2. Line Chart (Balance over time)
            const ctxLine = document.getElementById('lineChart');
            if (ctxLine && data.line.length > 0) {
                if (this.charts.line) this.charts.line.destroy();
                this.charts.line = new Chart(ctxLine, {
                    type: 'line',
                    data: {
                        labels: data.line.map(d => this.formatDate(d.x)),
                        datasets: [{
                            label: 'Balance',
                            data: data.line.map(d => d.y),
                            borderColor: '#BF4646',
                            tension: 0.3,
                            fill: true,
                            backgroundColor: 'rgba(191, 70, 70, 0.1)'
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: this.darkMode ? '#94a3b8' : '#64748b' } }, y: { ticks: { color: this.darkMode ? '#94a3b8' : '#64748b' } } } }
                });
            }
            
            // 3. Weekly Trend (Bar)
            const ctxBar = document.getElementById('barChart');
            if (ctxBar) {
                if (this.charts.bar) this.charts.bar.destroy();
                let weeks = Object.keys(data.weekly).sort();
                let weekVals = weeks.map(w => data.weekly[w]);
                this.charts.bar = new Chart(ctxBar, {
                    type: 'bar',
                    data: {
                        labels: weeks,
                        datasets: [{
                            label: 'Expenses/Week',
                            data: weekVals,
                            backgroundColor: '#7EACB5',
                            borderRadius: 4
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: this.darkMode ? '#94a3b8' : '#64748b' } }, y: { ticks: { color: this.darkMode ? '#94a3b8' : '#64748b' } } } }
                });
            }
        },

        // --- CALCULATOR ENGINE ---
        calcNum(n) {
            if (this.calcDisplay === '0') this.calcDisplay = n;
            else this.calcDisplay += n;
        },
        calcOp(op) { 
            this.calcExpression = this.calcDisplay + op; 
            this.calcDisplay = '0'; 
        },
        calcClear() { 
            this.calcDisplay = '0'; 
            this.calcExpression = ''; 
        },
        calcSolve() {
            try {
                this.calcDisplay = Function('"use strict";return (' + (this.calcExpression + this.calcDisplay) + ')')().toString();
                this.calcExpression = '';
            } catch { this.calcDisplay = 'Error'; }
        },
        useCalcResult() {
            const n = parseInt(this.calcDisplay) || 0;
            this.newAmount = n;
            this.displayAmount = n ? new Intl.NumberFormat('id-ID').format(n) : '';
        }
    }
}