/* WEALTHYFLOW PRO - CORE LOGIC */

// --- PURE JS LOGIC ---
const FinanceLogic = {
    calculateAllocations: function (income, ratios) {
        return {
            Needs: Math.round(income * (ratios.Needs / 100)),
            Wants: Math.round(income * (ratios.Wants / 100)),
            Savings: Math.round(income * (ratios.Savings / 100))
        };
    },
    evaluateSpending: function (expensesByType, allocations, ratios) {
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
    processRecurring: function (transactions, recurringList) {
        let now = new Date();
        let changed = false;
        recurringList.forEach(req => {
            let nextDate = new Date(req.nextDate);
            while (nextDate <= now) {
                transactions.unshift({
                    id: Date.now() + Math.random(),
                    amount: req.amount,
                    category: req.name,
                    type: req.type,
                    date: nextDate.toISOString(),
                    isRecurring: true
                });
                nextDate.setMonth(nextDate.getMonth() + 1);
                req.nextDate = nextDate.toISOString();
                changed = true;
            }
        });
        return changed;
    },
    calculateHealthScore: function (totalIncome, totalSavings, expensesByType, transactions) {
        if (totalIncome === 0) return { score: 0, status: 'Boros', explanation: 'No income to analyze yet.', breakdown: { savingsRate: 0, wantsLevel: 'Low', consistency: 'Stable' } };
        
        let score = 0;
        let savingRate = totalSavings / totalIncome;
        score += Math.min(40, (savingRate / 0.2) * 40);
        
        let wantsRatio = expensesByType.Wants / totalIncome;
        if (wantsRatio <= 0.3) score += 40;
        else if (wantsRatio <= 0.5) score += 20;
        
        let needsRatio = expensesByType.Needs / totalIncome;
        if (needsRatio <= 0.5) score += 20;
        else if (needsRatio <= 0.7) score += 10;
        
        score = Math.round(score);
        if (score > 100) score = 100;
        
        let status = score <= 40 ? 'Boros' : (score <= 70 ? 'Cukup' : 'Sehat');
        let explanation = "";
        if (savingRate < 0.1) explanation = "Your saving rate is dangerously low.";
        else if (wantsRatio > 0.4) explanation = "Your saving rate is okay, but spending on Wants is too high.";
        else explanation = "Great job! Your saving rate and spending are stable.";

        // Breakdown logic
        let wantsLevel = wantsRatio > 0.5 ? 'High' : (wantsRatio > 0.3 ? 'Normal' : 'Low');
        
        // Consistency: Check last 3 months/weeks variance (simplified to last 10 tx)
        let consistency = 'Stable';
        if (transactions.length > 5) {
            let last5 = transactions.filter(t => t.type === 'expense').slice(0, 5).map(t => t.amount);
            let avg = last5.reduce((a, b) => a + b, 0) / last5.length;
            let variance = last5.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / last5.length;
            if (Math.sqrt(variance) > avg * 0.5) consistency = 'Unstable';
        }

        return { 
            score, 
            status, 
            explanation, 
            breakdown: { 
                savingsRate: Math.round(savingRate * 100), 
                wantsLevel, 
                consistency 
            } 
        };
    },
    calculateSafeToSpend: function (currentBalance, recurringTransactions) {
        const now = new Date();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const daysLeft = Math.max(1, endOfMonth.getDate() - now.getDate());
        
        // Calculate upcoming bills for the rest of this month
        let upcomingBills = recurringTransactions.reduce((total, r) => {
            let nextDate = new Date(r.nextDate);
            if (r.type === 'expense' && nextDate >= now && nextDate <= endOfMonth) {
                return total + r.amount;
            }
            return total;
        }, 0);

        let safeAmount = (currentBalance - upcomingBills) / daysLeft;
        let status = 'safe';
        if (safeAmount < 0) status = 'risk';
        else if (safeAmount < 100000) status = 'caution'; // Arbitrary threshold for "low"

        return {
            amount: Math.max(0, Math.round(safeAmount)),
            daysLeft,
            status
        };
    },
    detectWarnings: function (currentBalance, projection, transactions) {
        let alerts = [];
        
        if (projection.willGoNegative) {
            alerts.push({
                type: 'critical',
                msg: `Balance may run out in ${projection.negativeDay} days!`
            });
        }

        // Rapid balance drop (e.g., spent > 30% of balance in last 3 days)
        if (transactions.length > 0) {
            let threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            let recentSpending = transactions
                .filter(t => t.type === 'expense' && new Date(t.date) > threeDaysAgo)
                .reduce((sum, t) => sum + t.amount, 0);
            
            if (recentSpending > currentBalance * 0.3 && currentBalance > 0) {
                alerts.push({
                    type: 'warning',
                    msg: 'Rapid balance drop detected recently.'
                });
            }
        }

        return alerts;
    },
    buildChartData: function (transactions, budgets) {
        let pie = { Needs: 0, Wants: 0, Savings: 0 };
        let line = [];
        let weekly = {};
        let balance = 0;
        let sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
        sorted.forEach(t => {
            if (t.type === 'income') balance += t.amount;
            else balance -= t.amount;
            line.push({ x: t.date, y: balance });
            if (t.type === 'expense') {
                let type = budgets[t.category]?.type || 'Needs';
                if (pie[type] !== undefined) pie[type] += t.amount;
                let d = new Date(t.date);
                // Better weekly key: Year-WeekNumber
                let weekStr = d.getFullYear() + '-W' + this.getWeekNumber(d);
                weekly[weekStr] = (weekly[weekStr] || 0) + t.amount;
            }
        });
        return { pie, line, weekly };
    },
    getWeekNumber: function(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return weekNo;
    },
    calculateProjection: function (currentBalance, recurringTransactions, days) {
        let projectedBalance = currentBalance;
        let now = new Date();
        now.setHours(0, 0, 0, 0);
        let end = new Date(now);
        end.setDate(end.getDate() + days);
        let willGoNegative = false;
        let negativeDay = null;

        let recs = recurringTransactions.map(r => ({ ...r, nextDate: new Date(r.nextDate) }));

        for (let d = new Date(now); d <= end; d.setDate(d.getDate() + 1)) {
            recs.forEach(r => {
                if (r.nextDate.getFullYear() === d.getFullYear() &&
                    r.nextDate.getMonth() === d.getMonth() &&
                    r.nextDate.getDate() === d.getDate()) {
                    if (r.type === 'income') projectedBalance += r.amount;
                    else projectedBalance -= r.amount;
                    r.nextDate.setMonth(r.nextDate.getMonth() + 1);
                }
            });
            if (projectedBalance < 0 && !willGoNegative) {
                willGoNegative = true;
                let diffTime = Math.abs(d - now);
                negativeDay = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
        }
        return { balance: projectedBalance, willGoNegative, negativeDay };
    }
};


function moneyApp() {
    return {
        // UI States
        showQuickAdd: false,
        isLoading: true,
        
        // PWA States
        showInstallPrompt: false,
        deferredPrompt: null,
        isOnline: navigator.onLine,

        // Transaction Form
        transactionType: 'expense',
        newAmount: 0,
        displayAmount: '',
        newCategory: '',
        incomeSource: '',
        editingId: null, // For click-to-edit feature

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

        // Advanced
        healthScore: { score: 0, status: '...', explanation: '...', breakdown: { savingsRate: 0, wantsLevel: '...', consistency: '...' } },
        projection: { days7: 0, days30: 0, warning: null },
        alerts: [],
        safeToSpend: { amount: 0, daysLeft: 0, status: 'safe' },

        // Recurring & UX
        confirmModal: { show: false, msg: '', onConfirm: null },
        chartType: 'weekly', // 'weekly' or 'monthly'
        categoryFilter: null,

        // Calculators & Charts
        showCalc: false,
        calcDisplay: '0',
        calcExpression: '',
        charts: { pie: null, line: null, bar: null },


        // --- INITIALIZATION ---
        init() {
            this.budgets = JSON.parse(localStorage.getItem('pro_budgets')) || {
                "Makan": { type: "Needs" },
                "SPP": { type: "Needs" },
                "Belanja": { type: "Wants" },
                "Netflix": { type: "Wants" }
            };
            this.transactions = JSON.parse(localStorage.getItem('pro_history')) || [];
            this.recurringTransactions = JSON.parse(localStorage.getItem('pro_recurring')) || [];
            this.ratios = JSON.parse(localStorage.getItem('pro_ratios')) || { Needs: 50, Wants: 30, Savings: 20 };

            this.tempRatios = { ...this.ratios };
            this.newCategory = Object.keys(this.budgets)[0] || '';

            if (FinanceLogic.processRecurring(this.transactions, this.recurringTransactions)) {
                this.saveData();
                this.pushNote('Recurring transactions auto-processed!');
            }

            // PWA Setup
            if ("serviceWorker" in navigator) {
                navigator.serviceWorker.register("./sw.js").then((reg) => {
                    console.log("[PWA] Service Worker Registered with scope:", reg.scope);
                }).catch(err => {
                    console.error("[PWA] Service Worker Registration Failed", err);
                });
            }

            window.addEventListener('beforeinstallprompt', (e) => {
                console.log("[PWA] beforeinstallprompt fired");
                e.preventDefault();
                this.deferredPrompt = e;
                this.showInstallPrompt = true;
            });

            window.addEventListener('online', () => {
                this.isOnline = true;
                this.pushNote('You are back online');
            });
            window.addEventListener('offline', () => {
                this.isOnline = false;
            });

            this.updateAllDerived();

            this.$watch('transactions', () => {
                this.updateAllDerived();
                this.$nextTick(() => this.renderCharts());
            });
            this.$watch('recurringTransactions', () => {
                this.updateProjection();
            });


            this.$nextTick(() => {
                this.renderCharts();
                setTimeout(() => { this.isLoading = false; }, 600); // Simulate loading skeleton
            });
        },

        updateAllDerived() {
            this.checkSuggestions();
            this.updateHealthScore();
            this.updateProjection();
            this.updateSafeToSpend();
            this.updateAlerts();
        },

        updateSafeToSpend() {
            this.safeToSpend = FinanceLogic.calculateSafeToSpend(this.totalSaldo, this.recurringTransactions);
        },

        updateAlerts() {
            let currentProj = FinanceLogic.calculateProjection(this.totalSaldo, this.recurringTransactions, 30);
            this.alerts = FinanceLogic.detectWarnings(this.totalSaldo, currentProj, this.transactions);
        },


        // --- DATA SAFETY ---
        exportData() {
            const data = {
                transactions: this.transactions,
                recurringTransactions: this.recurringTransactions,
                budgets: this.budgets,
                ratios: this.ratios
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `wealthyflow_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            this.pushNote('Data exported successfully!');
        },
        triggerImport() {
            document.getElementById('importFile').click();
        },
        importData(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.transactions) this.transactions = data.transactions;
                    if (data.recurringTransactions) this.recurringTransactions = data.recurringTransactions;
                    if (data.budgets) this.budgets = data.budgets;
                    if (data.ratios) this.ratios = data.ratios;
                    this.saveData();
                    this.updateAllDerived();
                    this.renderCharts();
                    this.pushNote('Data imported successfully!');
                } catch (err) {
                    alert('Invalid JSON format!');
                }
            };
            reader.readAsText(file);
            event.target.value = '';
        },

        // --- CASHFLOW PROJECTION ---
        updateProjection() {
            let current = this.totalSaldo;
            let proj7 = FinanceLogic.calculateProjection(current, this.recurringTransactions, 7);
            let proj30 = FinanceLogic.calculateProjection(current, this.recurringTransactions, 30);

            this.projection.days7 = proj7.balance;
            this.projection.days30 = proj30.balance;

            if (proj30.willGoNegative) {
                this.projection.warning = `Warning: Your balance may go negative in ${proj30.negativeDay} days!`;
            } else {
                this.projection.warning = null;
            }
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

        getAutoBudgetLimit(type) {
            let allocations = FinanceLogic.calculateAllocations(this.monthlyIncome, this.ratios);
            return allocations[type] || 0;
        },

        getTypeSpending(type) {
            return this.transactions
                .filter(t => t.type === 'expense' && this.budgets[t.category]?.type === type)
                .reduce((s, t) => s + t.amount, 0);
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

        updateHealthScore() {
            let expensesByType = {
                Needs: this.getTypeSpending('Needs'),
                Wants: this.getTypeSpending('Wants'),
                Savings: this.getTypeSpending('Savings')
            };
            let totalSav = this.transactions.filter(t => t.type === 'expense' && this.budgets[t.category]?.type === 'Savings').reduce((s, t) => s + t.amount, 0);
            this.healthScore = FinanceLogic.calculateHealthScore(this.totalIncome, totalSav, expensesByType, this.transactions);
        },


        handleFormat(el, targetObj, targetProp) {
            let val = el.value.replace(/[^0-9]/g, '');
            let num = parseInt(val) || 0;
            if (targetObj) targetObj[targetProp] = num;
            else this.newAmount = num;

            let formatted = val ? new Intl.NumberFormat('id-ID').format(num) : '';
            el.value = formatted;
            if (!targetObj) this.displayAmount = formatted;
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
            let days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            if (days < 0) return 'text-rose-500 font-bold';
            if (days <= 3) return 'text-amber-500 font-bold';
            return 'text-slate-500';
        },

        getDueText(isoDate) {
            let diff = new Date(isoDate) - new Date();
            let days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            if (days < 0) return 'Overdue';
            if (days === 0) return 'Due today';
            if (days === 1) return 'Due tomorrow';
            return `Due in ${days} days`;
        },

        get sortedRecurring() {
            return [...this.recurringTransactions].sort((a, b) => new Date(a.nextDate) - new Date(b.nextDate));
        },


        // --- TRANSACTION LOGIC ---
        addTransaction() {
            if (this.newAmount <= 0) return;

            if (this.editingId) {
                // Update existing
                let t = this.transactions.find(x => x.id === this.editingId);
                if (t) {
                    t.amount = this.newAmount;
                    t.category = this.transactionType === 'income' ? (this.incomeSource || 'Pemasukan') : this.newCategory;
                    t.type = this.transactionType;
                }
                this.editingId = null;
                this.pushNote('Transaksi Diperbarui!');
            } else {
                // Add new
                this.transactions.unshift({
                    id: Date.now(),
                    amount: this.newAmount,
                    category: this.transactionType === 'income' ? (this.incomeSource || 'Pemasukan') : this.newCategory,
                    type: this.transactionType,
                    date: new Date().toISOString(),
                    isRecurring: false
                });
                this.pushNote('Transaksi Berhasil!');
            }

            this.newAmount = 0;
            this.displayAmount = '';
            this.incomeSource = '';
            this.showQuickAdd = false;

            this.saveData();
        },

        editTransaction(t) {
            this.editingId = t.id;
            this.transactionType = t.type;
            this.newAmount = t.amount;
            this.displayAmount = new Intl.NumberFormat('id-ID').format(t.amount);
            if (t.type === 'income') {
                this.incomeSource = t.category;
            } else {
                this.newCategory = t.category;
            }
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll up to form
        },

        deleteTransaction(id) {
            this.confirmModal = {
                show: true,
                msg: 'Are you sure you want to delete this transaction?',
                onConfirm: () => {
                    this.transactions = this.transactions.filter(t => t.id !== id);
                    this.saveData();
                    this.pushNote('Transaction Deleted!');
                    this.confirmModal.show = false;
                }
            };
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

        // --- GETTERS ---
        get totalIncome() { return this.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0); },
        get totalExpense() { return this.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0); },
        get totalSaldo() { return this.totalIncome - this.totalExpense; },
        get monthlyIncome() {
            const now = new Date();
            return this.transactions
                .filter(t => {
                    let d = new Date(t.date);
                    return t.type === 'income' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                })
                .reduce((s, t) => s + t.amount, 0);
        },

        addCategory() {
            if (!this.newCatName.trim()) return;
            this.budgets[this.newCatName.trim()] = { type: this.newCatType };
            this.budgets = { ...this.budgets };
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
            if (n.includes('makan') || n.includes('food')) return '🍔';
            if (n.includes('transport') || n.includes('mobil')) return '🚌';
            if (n.includes('bill') || n.includes('tagihan') || n.includes('listrik')) return '🧾';
            if (n.includes('hiburan') || n.includes('main') || n.includes('netflix')) return '🎬';
            if (n.includes('gaji') || n.includes('income')) return '💰';
            return '🏷️';
        },

        saveData() {
            localStorage.setItem('pro_budgets', JSON.stringify(this.budgets));
            localStorage.setItem('pro_history', JSON.stringify(this.transactions));
            localStorage.setItem('pro_ratios', JSON.stringify(this.ratios));
            localStorage.setItem('pro_recurring', JSON.stringify(this.recurringTransactions));
        },

        setCategoryFilter(cat) {
            if (this.categoryFilter === cat) this.categoryFilter = null;
            else this.categoryFilter = cat;
        },

        get filteredTransactions() {
            if (!this.categoryFilter) return this.transactions;
            return this.transactions.filter(t => t.category === this.categoryFilter);
        },


        clearHistory() {
            this.confirmModal = {
                show: true,
                msg: 'Clear all transaction history? This cannot be undone.',
                onConfirm: () => {
                    this.transactions = [];
                    this.saveData();
                    this.pushNote('History Cleared!');
                    this.confirmModal.show = false;
                }
            };
        },


        pushNote(msg) {
            const id = Date.now();
            this.notifications.push({ id, msg });
            setTimeout(() => {
                this.notifications = this.notifications.filter(n => n.id !== id);
            }, 2500);
        },

        installPWA() {
            if (this.deferredPrompt) {
                this.deferredPrompt.prompt();
                this.deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the install prompt');
                    } else {
                        console.log('User dismissed the install prompt');
                    }
                    this.deferredPrompt = null;
                    this.showInstallPrompt = false;
                });
            }
        },

        renderCharts() {
            let data = FinanceLogic.buildChartData(this.transactions, this.budgets);

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
                            borderColor: '#1e293b'
                        }]
                    },
                    options: { 
                        responsive: true, 
                        maintainAspectRatio: false, 
                        plugins: { 
                            legend: { position: 'bottom', labels: { color: '#cbd5e1' } } 
                        },
                        onClick: (evt, elements) => {
                            if (elements.length > 0) {
                                const index = elements[0].index;
                                const label = this.charts.pie.data.labels[index];
                                // Map Needs/Wants/Savings to a more useful filter or show category list
                                this.pushNote(`Filter by type: ${label}`);
                            }
                        }
                    }
                });
            }


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
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#94a3b8' } }, y: { ticks: { color: '#94a3b8' } } } }
                });
            }

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
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#94a3b8' } }, y: { ticks: { color: '#94a3b8' } } } }
                });
            }
        },

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