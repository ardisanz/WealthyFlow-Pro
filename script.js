/* WEALTHYFLOW - CORE LOGIC */

// --- PURE JS LOGIC ---
const FinanceLogic = {
    sanitizeTx: function(transactions) {
        if (!Array.isArray(transactions)) return [];
        return transactions.map(t => {
            let d = new Date(t.date);
            if (isNaN(d.getTime())) {
                if (typeof t.date === 'string') {
                    let parts = t.date.split(/[\/\-]/);
                    if (parts.length === 3) {
                        if (parts[2].length === 4) {
                            d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`);
                        }
                    }
                }
                if (isNaN(d.getTime()) && t.id) {
                    let td = new Date(Number(t.id));
                    if (!isNaN(td.getTime())) d = td;
                }
                if (isNaN(d.getTime())) d = new Date();
            }
            return {
                ...t,
                amount: Number(t.amount) || 0,
                date: d.toISOString()
            };
        });
    },
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
        if (totalIncome === 0) return { score: 0, status: 'N/A', explanation: 'No income to analyze yet.', breakdown: { savingsRate: 0, wantsLevel: 'Low', consistency: 'Stable' } };
        
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
        
        let status = score <= 40 ? 'Overspending' : (score <= 70 ? 'Fair' : 'Healthy');
        let explanation = "";
        
        // Provide actionable, specific insights instead of generic text
        if (savingRate < 0.1) {
            explanation = "Your savings rate is below 10%. Try identifying one non-essential subscription to pause this month to build your safety net.";
        } else if (wantsRatio > 0.4) {
            explanation = "You're spending heavily on 'Wants'. Consider holding off on non-essential purchases this week to boost your score.";
        } else if (needsRatio > 0.6) {
            explanation = "Fixed expenses are eating up your income. Look for ways to optimize utility bills or recurring costs.";
        } else if (score >= 80) {
            explanation = "Great financial discipline! You're optimizing your budget perfectly. Consider moving excess cash to an investment.";
        } else {
            explanation = "Your spending is relatively stable. Try to reduce 'Wants' by 5% to hit the next tier of financial health.";
        }

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
    calculateSafeToSpend: function (currentBalance, recurringTransactions, monthlyIncome, monthlySavingsTarget, monthlyExpenses) {
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

        let budgetLeft = monthlyIncome - monthlySavingsTarget - monthlyExpenses - upcomingBills;
        let safeAmount = budgetLeft / daysLeft;
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
                msgKey: 'balance_run_out',
                days: projection.negativeDay
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
                    msgKey: 'rapid_drop'
                });
            }
        }

        return alerts;
    },
    buildChartData: function (transactions, budgets) {
        let pie = { Needs: 0, Wants: 0, Savings: 0 };
        let lineMap = new Map();
        let weekly = {};
        let balance = 0;
        let sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
        sorted.forEach(t => {
            let amt = Number(t.amount) || 0;
            if (t.type === 'income') balance += amt;
            else balance -= amt;
            
            // Group by day for the line chart (take the latest balance for that day)
            let d = new Date(t.date);
            if (isNaN(d.getTime())) return;
            
            let dateKey = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
            lineMap.set(dateKey, { x: t.date, y: balance });
            
            if (t.type === 'expense') {
                const now = new Date();
                if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
                    let type = (budgets[t.category] && budgets[t.category].type) ? budgets[t.category].type : 'Needs';
                    if (pie[type] !== undefined) pie[type] += amt;
                }
                // Better weekly key: Year-WeekNumber
                let weekStr = d.getFullYear() + '-W' + this.getWeekNumber(d);
                weekly[weekStr] = (weekly[weekStr] || 0) + amt;
            }
        });
        
        let line = Array.from(lineMap.values());
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
        activeTab: 'dashboard',
        isLoading: true,
        isSaving: false,
        
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

        // calculators & charts
        showCalc: false,
        calcDisplay: '0',
        calcExpression: '',

        // Settings
        darkMode: false,
        accentColor: '#000000',
        fontSize: 14,
        showLanguage: false,
        language: 'id',
        accentColors: [
            { value: '#000000', label: 'Slate' },
            { value: '#1a56db', label: 'Blue' },
            { value: '#1a6b3a', label: 'Green' },
            { value: '#0e7490', label: 'Teal' },
            { value: '#be123c', label: 'Rose' },
            { value: '#db2777', label: 'Pink' },
            { value: '#7c3aed', label: 'Violet' }
        ],

        getGreeting() {
            const hour = new Date().getHours();
            if (this.language === 'id') {
                if (hour < 12) return 'Selamat Pagi';
                if (hour < 18) return 'Selamat Siang';
                return 'Selamat Malam';
            } else if (this.language === 'my') {
                if (hour < 12) return 'Selamat Pagi';
                if (hour < 18) return 'Selamat Petang';
                return 'Selamat Malam';
            } else { // sg (English)
                if (hour < 12) return 'Good Morning';
                if (hour < 18) return 'Good Afternoon';
                return 'Good Evening';
            }
        },

        t(key) {
            const dict = {
                id: {
                    // Bottom Nav
                    dashboard: "Dasbor",
                    cashflow: "Arus Kas",
                    savings: "Tabungan",
                    settings: "Pengaturan",
                    // Header & General
                    weekly_overview: "Ikhtisar Mingguan",
                    cashflow_momentum: "Momentum Arus Kas",
                    total_income: "Total Pemasukan",
                    total_expenses: "Total Pengeluaran",
                    new_entry: "Tambah Transaksi",
                    recent_history: "Riwayat Terkini",
                    quick_allocation: "Alokasi Cepat",
                    spending_trend: "Tren Pengeluaran",
                    view_all: "Lihat Semua Transaksi →",
                    no_transactions: "Belum ada transaksi",
                    tap_new_entry: "Ketuk Tambah Transaksi",
                    save: "Simpan",
                    // Cashflow Tab
                    safe_to_spend: "Aman Dibelanjakan Hari Ini",
                    remaining_days: "Sisa Hari",
                    eom_goal: "Target Akhir Bulan",
                    monthly_income: "Pemasukan Bulanan",
                    total_balance: "Total Saldo",
                    cashflow_proj: "Proyeksi Arus Kas",
                    balance_over_time: "Saldo dari Waktu ke Waktu",
                    expense_dist: "Distribusi Pengeluaran",
                    // Savings Tab
                    auto_saving: "Sistem Tabungan Otomatis",
                    budget_ratio: "Rasio Anggaran (%)",
                    financial_health: "Kesehatan Keuangan",
                    recurring_bills: "Tagihan Rutin",
                    limit: "Batas",
                    used: "terpakai",
                    // Settings Tab
                    appearance: "Tampilan",
                    dark_mode: "Mode Gelap",
                    accent_color: "Warna Aksen",
                    font_size: "Ukuran Huruf",
                    security_privacy: "Keamanan & Privasi",
                    backup_restore: "Cadangkan & Pulihkan",
                    export_data: "Ekspor Data (JSON)",
                    clear_data: "Hapus Semua Data",
                    general_settings: "Pengaturan Umum",
                    language: "Bahasa",
                    manage_categories: "Kelola Kategori",
                    about: "Tentang WealthyFlow",
                    help_faq: "Bantuan & FAQ",
                    feedback_bug: "Umpan Balik / Lapor Bug",
                    // Sheets & Forms
                    new_entry_title: "Entri Baru",
                    edit_entry_title: "Ubah Transaksi",
                    amount: "Jumlah",
                    category: "Kategori",
                    source: "Sumber",
                    income: "Pemasukan",
                    expense: "Pengeluaran",
                    save_tx: "Simpan Transaksi",
                    update_tx: "Perbarui Transaksi",
                    cancel: "Batal",
                    select_category: "Pilih kategori",
                    history_title: "Riwayat Transaksi",
                    clear_all: "Hapus Semua",
                    clear_filter: "Hapus filter untuk melihat semua",
                    select_language: "Pilih Bahasa",
                    latest: "Terbaru",
                    status_risk: "🔴 Berisiko",
                    status_caution: "⚠ Waspada",
                    status_safe: "✓ Aman",
                    balance_run_out: "Saldo mungkin habis dalam {days} hari!",
                    rapid_drop: "Penurunan saldo yang cepat terdeteksi baru-baru ini."
                },
                sg: {
                    dashboard: "Dashboard",
                    cashflow: "Cashflow",
                    savings: "Savings",
                    settings: "Settings",
                    weekly_overview: "Weekly Overview",
                    cashflow_momentum: "Cashflow Momentum",
                    total_income: "Total Income",
                    total_expenses: "Total Expenses",
                    new_entry: "Add New Transaction",
                    recent_history: "Recent History",
                    quick_allocation: "Quick Allocation",
                    spending_trend: "Spending Trend",
                    view_all: "View All Transactions →",
                    no_transactions: "No transactions yet",
                    tap_new_entry: "Tap New Entry to get started",
                    save: "Save",
                    safe_to_spend: "Safe to Spend Today",
                    remaining_days: "Remaining Days",
                    eom_goal: "End of Month Goal",
                    monthly_income: "Monthly Income",
                    total_balance: "Total Balance",
                    cashflow_proj: "Cashflow Projection",
                    balance_over_time: "Balance Over Time",
                    expense_dist: "Expense Distribution",
                    auto_saving: "Auto-Saving System",
                    budget_ratio: "Budget Ratio (%)",
                    financial_health: "Financial Health",
                    recurring_bills: "Recurring Bills",
                    limit: "Limit",
                    used: "used",
                    appearance: "Appearance",
                    dark_mode: "Dark Mode",
                    accent_color: "Accent Color",
                    font_size: "Font Size",
                    security_privacy: "Security & Privacy",
                    backup_restore: "Backup & Restore",
                    export_data: "Export Data (JSON)",
                    clear_data: "Clear All Data",
                    general_settings: "General Settings",
                    language: "Language",
                    manage_categories: "Manage Categories",
                    about: "About WealthyFlow",
                    help_faq: "Help & FAQ",
                    feedback_bug: "Feedback / Report Bug",
                    new_entry_title: "New Entry",
                    edit_entry_title: "Edit Transaction",
                    amount: "Amount",
                    category: "Category",
                    source: "Source",
                    income: "Income",
                    expense: "Expense",
                    save_tx: "Save Transaction",
                    update_tx: "Update Transaction",
                    cancel: "Cancel",
                    select_category: "Select category",
                    history_title: "Transaction History",
                    clear_all: "Clear All",
                    clear_filter: "Clear filter to see all transactions",
                    select_language: "Select Language",
                    latest: "Latest",
                    status_risk: "🔴 Risk",
                    status_caution: "⚠ Caution",
                    status_safe: "✓ Safe to go",
                    balance_run_out: "Balance may run out in {days} days!",
                    rapid_drop: "Rapid balance drop detected recently."
                },
                my: {
                    dashboard: "Papan Pemuka",
                    cashflow: "Aliran Tunai",
                    savings: "Simpanan",
                    settings: "Tetapan",
                    weekly_overview: "Ringkasan Mingguan",
                    cashflow_momentum: "Momentum Aliran Tunai",
                    total_income: "Jumlah Pendapatan",
                    total_expenses: "Jumlah Perbelanjaan",
                    new_entry: "Tambah Transaksi Baru",
                    recent_history: "Sejarah Terkini",
                    quick_allocation: "Peruntukan Cepat",
                    spending_trend: "Trend Perbelanjaan",
                    view_all: "Lihat Semua Transaksi →",
                    no_transactions: "Belum ada transaksi",
                    tap_new_entry: "Ketik Tambah Transaksi",
                    save: "Simpan",
                    safe_to_spend: "Selamat untuk Dibelanjakan Hari Ini",
                    remaining_days: "Baki Hari",
                    eom_goal: "Matlamat Akhir Bulan",
                    monthly_income: "Pendapatan Bulanan",
                    total_balance: "Jumlah Baki",
                    cashflow_proj: "Unjuran Aliran Tunai",
                    balance_over_time: "Baki dari Semasa ke Semasa",
                    expense_dist: "Agihan Perbelanjaan",
                    auto_saving: "Sistem Simpanan Automatik",
                    budget_ratio: "Nisbah Belanjawan (%)",
                    financial_health: "Kesihatan Kewangan",
                    recurring_bills: "Bil Berulang",
                    limit: "Had",
                    used: "digunakan",
                    appearance: "Rupa Bentuk",
                    dark_mode: "Mod Gelap",
                    accent_color: "Warna Aksen",
                    font_size: "Saiz Tulisan",
                    security_privacy: "Keselamatan & Privasi",
                    backup_restore: "Sandaran & Pulihkan",
                    export_data: "Eksport Data (JSON)",
                    clear_data: "Padam Semua Data",
                    general_settings: "Tetapan Umum",
                    language: "Bahasa",
                    manage_categories: "Urus Kategori",
                    about: "Mengenai WealthyFlow",
                    help_faq: "Bantuan & Soalan Lazim",
                    feedback_bug: "Maklum Balas / Lapor Ralat",
                    new_entry_title: "Entri Baru",
                    edit_entry_title: "Sunting Transaksi",
                    amount: "Jumlah",
                    category: "Kategori",
                    source: "Sumber",
                    income: "Pendapatan",
                    expense: "Perbelanjaan",
                    save_tx: "Simpan Transaksi",
                    update_tx: "Kemas Kini Transaksi",
                    cancel: "Batal",
                    select_category: "Pilih kategori",
                    history_title: "Sejarah Transaksi",
                    clear_all: "Padam Semua",
                    clear_filter: "Padam tapisan untuk melihat semua",
                    select_language: "Pilih Bahasa",
                    latest: "Terkini",
                    status_risk: "🔴 Berisiko",
                    status_caution: "⚠ Berjaga-jaga",
                    status_safe: "✓ Selamat dibelanja",
                    balance_run_out: "Baki mungkin habis dalam masa {days} hari!",
                    rapid_drop: "Penurunan baki mendadak dikesan baru-baru ini."
                }
            };
            return dict[this.language]?.[key] || dict['sg'][key] || key;
        },


        // --- INITIALIZATION ---
        init() {
            this.isLoading = true;
            
            // Native feel haptic feedback setup
            window.haptic = async (duration = 15) => {
                if (window.Capacitor && window.Capacitor.Plugins.Haptics) {
                    try { await window.Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' }); } catch(e){}
                } else if (navigator.vibrate) {
                    try { navigator.vibrate(duration); } catch(e){}
                }
            };
            
            if (window.Capacitor && window.Capacitor.Plugins.SplashScreen) {
                setTimeout(() => {
                    window.Capacitor.Plugins.SplashScreen.hide();
                }, 500);
            }

            setTimeout(() => {
                document.querySelectorAll('button, .touch-target').forEach(btn => {
                    btn.addEventListener('click', () => window.haptic(15));
                });
            }, 800);

            // Load settings
            this.darkMode = JSON.parse(localStorage.getItem('pro_darkMode')) || false;
            this.accentColor = localStorage.getItem('pro_accentColor') || '#000000';
            this.fontSize = JSON.parse(localStorage.getItem('pro_fontSize')) || 14;
            this.language = localStorage.getItem('pro_language') || 'id';
            this.applyTheme();
            this.applyFontSize();

            this.budgets = JSON.parse(localStorage.getItem('pro_budgets')) || {
                "Housing": { type: "Needs" },
                "Utilities": { type: "Needs" },
                "Groceries": { type: "Needs" },
                "Transport": { type: "Needs" },
                "Dining Out": { type: "Wants" },
                "Entertainment": { type: "Wants" },
                "Investments": { type: "Savings" },
                "Emergency Fund": { type: "Savings" }
            };

            let defaultTx = [];
            let now = new Date();
            let d1 = new Date(now); d1.setDate(1); // 1st of month
            let d2 = new Date(now); d2.setDate(2);
            let d3 = new Date(now); d3.setDate(3);
            let d4 = new Date(now); d4.setDate(5);
            let d5 = new Date(now); d5.setDate(8);
            
            if (!localStorage.getItem('pro_history')) {
                defaultTx = [
                    { id: '1', date: d1.toISOString(), type: 'income', amount: 15000000, source: 'Salary' },
                    { id: '2', date: d1.toISOString(), type: 'expense', amount: 3500000, category: 'Housing' },
                    { id: '3', date: d2.toISOString(), type: 'expense', amount: 1200000, category: 'Groceries' },
                    { id: '4', date: d3.toISOString(), type: 'expense', amount: 800000, category: 'Utilities' },
                    { id: '5', date: d4.toISOString(), type: 'expense', amount: 3000000, category: 'Investments' },
                    { id: '6', date: d5.toISOString(), type: 'expense', amount: 600000, category: 'Dining Out' }
                ];
            }
            
            let loadedTx = JSON.parse(localStorage.getItem('pro_history')) || defaultTx;
            this.transactions = FinanceLogic.sanitizeTx(loadedTx);
            let loadedRec = JSON.parse(localStorage.getItem('pro_recurring')) || [];
            this.recurringTransactions = FinanceLogic.sanitizeTx(loadedRec);
            this.ratios = JSON.parse(localStorage.getItem('pro_ratios')) || { Needs: 50, Wants: 30, Savings: 20 };

            this.tempRatios = { ...this.ratios };
            this.newCategory = Object.keys(this.budgets)[0] || '';

            this.updateAllDerived(); // Ensure all states are synced before showing UI

            if (FinanceLogic.processRecurring(this.transactions, this.recurringTransactions)) {
                this.saveData();
                this.pushNote('Recurring transactions auto-processed!');
            }

            // Simulate loading for realistic UX
            setTimeout(() => {
                this.isLoading = false;
                this.$nextTick(() => {
                    if (this.activeTab === 'dashboard') this.renderCharts();
                });
            }, 600);

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
                
                const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

                if (isMobile && !isStandalone) {
                    this.showInstallPrompt = true;
                }
            });

            window.addEventListener('appinstalled', () => {
                console.log('[PWA] App was installed');
                this.showInstallPrompt = false;
            });

            window.addEventListener('online', () => {
                this.isOnline = true;
                this.pushNote('You are back online');
            });
            window.addEventListener('offline', () => {
                this.isOnline = false;
            });

            this.$watch('transactions', () => {
                this.updateAllDerived();
                this.$nextTick(() => this.renderCharts());
            });
            this.$watch('recurringTransactions', () => {
                this.updateProjection();
            });


            // Re-render charts when switching to chart tabs
            this.$watch('activeTab', (tab) => {
                if (tab === 'cashflow' || tab === 'dashboard') {
                    // Android WebView needs extra time for DOM layout after display toggle
                    this.$nextTick(() => {
                        setTimeout(() => this.renderCharts(), 150);
                        setTimeout(() => this.renderCharts(), 500);
                    });
                }
            });
        },

        updateAllDerived() {
            this.checkSuggestions();
            this.updateAlerts();
            this.updateHealthScore();
            this.updateProjection();
            this.updateSafeToSpend();
        },

        updateSafeToSpend() {
            let monthlySavTarget = this.getAutoBudgetLimit('Savings');
            const now = new Date();
            let monthlyExpenses = this.transactions.filter(t => {
                let d = new Date(t.date);
                return t.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).reduce((s,t) => s + t.amount, 0);
            
            this.safeToSpend = FinanceLogic.calculateSafeToSpend(
                this.totalSaldo, 
                this.recurringTransactions,
                this.monthlyIncome,
                monthlySavTarget,
                monthlyExpenses
            );
            
            if (this.alerts && this.alerts.some(a => a.raw && a.raw.msgKey === 'rapid_drop')) {
                if (this.safeToSpend.status === 'safe') {
                    this.safeToSpend.status = 'caution';
                }
            }
        },

        updateAlerts() {
            let currentProj = FinanceLogic.calculateProjection(this.totalSaldo, this.recurringTransactions, 30);
            let rawAlerts = FinanceLogic.detectWarnings(this.totalSaldo, currentProj, this.transactions);
            this.alerts = rawAlerts.map(a => {
                if (a.msgKey === 'balance_run_out') {
                    return { type: a.type, msg: this.t('balance_run_out').replace('{days}', a.days), raw: a };
                }
                if (a.msgKey === 'rapid_drop') {
                    return { type: a.type, msg: this.t('rapid_drop'), raw: a };
                }
                return { ...a, raw: a };
            });
        },


        // --- DATA SAFETY ---
        async exportData() {
            const data = {
                transactions: this.transactions,
                recurringTransactions: this.recurringTransactions,
                budgets: this.budgets,
                ratios: this.ratios
            };
            const jsonStr = JSON.stringify(data, null, 2);
            const fileName = `wealthyflow_backup_${new Date().toISOString().split('T')[0]}.json`;

            // Check if running on native Android (Capacitor)
            if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                try {
                    const { Filesystem, Directory, Encoding } = window.Capacitor.Plugins || {};
                    if (Filesystem) {
                        await Filesystem.writeFile({
                            path: fileName,
                            data: jsonStr,
                            directory: 'DOCUMENTS',
                            encoding: 'utf8'
                        });
                        this.pushNote('File tersimpan di Documents/' + fileName);
                    } else {
                        this.pushNote('Plugin Filesystem tidak tersedia');
                    }
                } catch (err) {
                    console.error('Export error:', err);
                    this.pushNote('Gagal menyimpan: ' + (err.message || err));
                }
            } else {
                // Fallback for web browser
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(url);
                this.pushNote('Data exported successfully!');
            }
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
                    if (data.transactions) {
                        this.transactions = FinanceLogic.sanitizeTx(data.transactions);
                    }
                    if (data.recurringTransactions) {
                        this.recurringTransactions = FinanceLogic.sanitizeTx(data.recurringTransactions);
                    }
                    if (data.budgets) {
                        // Jika budget dari versi lama dan tidak punya property type
                        let importedBudgets = {};
                        for (let k in data.budgets) {
                            if (typeof data.budgets[k] === 'string') {
                                importedBudgets[k] = { type: data.budgets[k] };
                            } else {
                                importedBudgets[k] = data.budgets[k];
                            }
                        }
                        this.budgets = importedBudgets;
                    }
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
                this.projection.warning = this.t('balance_run_out').replace('{days}', proj30.negativeDay);
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
                this.ratioError = 'Total ratio must be 100%';
                return;
            }
            this.ratioError = '';
            this.isSaving = true;
            setTimeout(() => {
                this.ratios = { Needs: n, Wants: w, Savings: s };
                this.saveData();
                this.showRatioSettings = false;
                this.pushNote('Ratios updated successfully!');
                this.updateAllDerived();
                this.renderCharts();
                this.isSaving = false;
            }, 600);
        },

        getAutoBudgetLimit(type) {
            let allocations = FinanceLogic.calculateAllocations(this.monthlyIncome, this.ratios);
            return allocations[type] || 0;
        },

        getTypeSpending(type) {
            const now = new Date();
            return this.transactions
                .filter(t => {
                    let d = new Date(t.date);
                    return t.type === 'expense' && 
                           this.budgets[t.category]?.type === type &&
                           d.getMonth() === now.getMonth() && 
                           d.getFullYear() === now.getFullYear();
                })
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
            this.pushNote('Ratios adjusted!');
            this.updateAllDerived();
            this.renderCharts();
        },

        ignoreSuggestion() {
            this.suggestions = [];
        },

        updateHealthScore() {
            const now = new Date();
            const monthlyTransactions = this.transactions.filter(t => {
                let d = new Date(t.date);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });

            let expensesByType = {
                Needs: this.getTypeSpending('Needs'),
                Wants: this.getTypeSpending('Wants'),
                Savings: this.getTypeSpending('Savings')
            };
            let monthlySav = monthlyTransactions.filter(t => t.type === 'expense' && this.budgets[t.category]?.type === 'Savings').reduce((s, t) => s + t.amount, 0);
            this.healthScore = FinanceLogic.calculateHealthScore(this.monthlyIncome, monthlySav, expensesByType, monthlyTransactions);
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
                return new Date(iso).toLocaleDateString('en-US', {
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
            if (this.transactionType === 'expense' && !this.newCategory) {
                this.pushNote('Please select a category');
                return;
            }
            if (this.transactionType === 'income' && !this.incomeSource) {
                this.incomeSource = 'Income';
            }
            this.isSaving = true;

            setTimeout(() => {
                if (this.editingId) {
                    // Update existing
                    let t = this.transactions.find(x => x.id === this.editingId);
                    if (t) {
                        t.amount = this.newAmount;
                        t.category = this.transactionType === 'income' ? (this.incomeSource || 'Income') : this.newCategory;
                        t.type = this.transactionType;
                    }
                    this.editingId = null;
                    this.pushNote('Transaction Updated!');
                } else {
                    // Add new
                    this.transactions.unshift({
                        id: Date.now(),
                        amount: this.newAmount,
                        category: this.transactionType === 'income' ? (this.incomeSource || 'Income') : this.newCategory,
                        type: this.transactionType,
                        date: new Date().toISOString(),
                        isRecurring: false
                    });
                    this.pushNote('Transaction Successful!');
                }

                this.newAmount = 0;
                this.displayAmount = '';
                this.incomeSource = '';
                this.showQuickAdd = false;
                this.saveData();
                this.isSaving = false;
            }, 600);
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
            this.isSaving = true;

            setTimeout(() => {
                this.recurringTransactions.push({
                    id: Date.now(),
                    name: this.newRecName,
                    amount: this.newRecAmount,
                    type: this.newRecType,
                    nextDate: new Date(this.newRecDate).toISOString()
                });
                this.saveData();
                this.pushNote('Recurring Added!');
                this.newRecName = '';
                this.newRecAmount = 0;
                this.newRecDisplay = '';
                this.showRecurring = false;
                this.isSaving = false;
            }, 600);
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
            this.pushNote('Category Added!');
        },

        deleteCategory(key) {
            if (confirm(`Delete category ${key}?`)) {
                delete this.budgets[key];
                this.budgets = { ...this.budgets };
                this.saveData();
            }
        },

        getCategoryIcon(catName) {
            let n = catName.toLowerCase();
            const svgAttrs = 'width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
            
            if (n.includes('makan') || n.includes('food') || n.includes('groceries') || n.includes('dining')) 
                return `<svg ${svgAttrs}><path d="M12 2C8.686 2 6 4.686 6 8v1h12V8c0-3.314-2.686-6-6-6Z"/><path d="M4 11h16v2H4z"/><path d="M5 15h14l-1 6H6l-1-6Z"/></svg>`; // Burger-ish/Food
            if (n.includes('transport') || n.includes('mobil') || n.includes('car')) 
                return `<svg ${svgAttrs}><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`; // Car
            if (n.includes('bill') || n.includes('tagihan') || n.includes('listrik') || n.includes('utilit')) 
                return `<svg ${svgAttrs}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>`; // File/Bill
            if (n.includes('hiburan') || n.includes('main') || n.includes('netflix') || n.includes('entertain')) 
                return `<svg ${svgAttrs}><rect width="20" height="20" x="2" y="2" rx="2.18" ry="2.18"/><line x1="7" x2="7" y1="2" y2="22"/><line x1="17" x2="17" y1="2" y2="22"/><line x1="2" x2="22" y1="12" y2="12"/><line x1="2" x2="7" y1="7" y2="7"/><line x1="2" x2="7" y1="17" y2="17"/><line x1="17" x2="22" y1="17" y2="17"/><line x1="17" x2="22" y1="7" y2="7"/></svg>`; // Film
            if (n.includes('gaji') || n.includes('income') || n.includes('salary')) 
                return `<svg ${svgAttrs}><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`; // Credit Card / Money
            if (n.includes('invest')) 
                return `<svg ${svgAttrs}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`; // Trending Up
            if (n.includes('hous') || n.includes('rent')) 
                return `<svg ${svgAttrs}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`; // Home
            
            return `<svg ${svgAttrs}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`; // Default
        },

        saveData() {
            localStorage.setItem('pro_budgets', JSON.stringify(this.budgets));
            localStorage.setItem('pro_history', JSON.stringify(this.transactions));
            localStorage.setItem('pro_ratios', JSON.stringify(this.ratios));
            localStorage.setItem('pro_recurring', JSON.stringify(this.recurringTransactions));
        },

        // Safely destroy all chart instances to prevent "Canvas already in use" errors
        safeDestroyCharts() {
            if (!window.appCharts) return;
            ['pie', 'line', 'bar'].forEach(key => {
                try {
                    if (window.appCharts[key]) {
                        window.appCharts[key].destroy();
                        window.appCharts[key] = null;
                    }
                } catch(e) {}
            });
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
                msg: 'Hapus semua riwayat transaksi? Tindakan ini tidak bisa dibatalkan.',
                onConfirm: () => {
                    // 1. Hapus semua chart dulu sebelum data direset
                    this.safeDestroyCharts();
                    // 2. Reset data
                    this.transactions = [];
                    this.recurringTransactions = [];
                    this.saveData();
                    // 3. Reset semua state turunan
                    this.updateAllDerived();
                    this.pushNote('Semua data berhasil dihapus!');
                    this.confirmModal.show = false;
                    // 4. Render ulang grafik setelah DOM update
                    this.$nextTick(() => {
                        setTimeout(() => this.renderCharts(), 200);
                    });
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

        // --- SETTINGS ---
        setLanguage(lang) {
            this.language = lang;
            localStorage.setItem('pro_language', lang);
            this.pushNote('Language preference saved!');
            // In a real application, you would load translations here
        },

        toggleDarkMode() {
            this.darkMode = !this.darkMode;
            localStorage.setItem('pro_darkMode', JSON.stringify(this.darkMode));
            this.applyTheme();
            this.pushNote(this.darkMode ? 'Dark mode enabled' : 'Light mode enabled');
            // Re-render charts with new theme colors
            this.$nextTick(() => this.renderCharts());
        },

        applyTheme() {
            const root = document.documentElement;
            if (this.darkMode) {
                root.style.setProperty('--bg', '#0D0D0D');
                root.style.setProperty('--surface-0', '#1A1A1A');
                root.style.setProperty('--surface-1', '#222222');
                root.style.setProperty('--surface-2', '#2A2A2A');
                root.style.setProperty('--surface-3', '#333333');
                root.style.setProperty('--on-surface', '#EAEAEA');
                root.style.setProperty('--on-surface-2', '#AAAAAA');
                root.style.setProperty('--outline', '#666666');
                root.style.setProperty('--outline-2', '#333333');
                root.style.setProperty('--primary-container', '#1E293B');
                root.style.setProperty('--on-primary-container', '#94A3B8');
                root.style.setProperty('--on-primary', '#FFFFFF');
                root.style.setProperty('--secondary', '#94A3B8');
                root.style.setProperty('--secondary-container', '#1E293B');
                root.style.setProperty('--on-secondary-container', '#CBD5E1');
                root.style.setProperty('--error-container', '#3B1212');
                root.style.setProperty('--success-bg', '#0D2818');
                root.style.setProperty('--accent-bg', '#172554');
                root.style.setProperty('--warning-bg', '#2A1800');
                root.setAttribute('data-theme', 'dark');
            } else {
                root.style.setProperty('--bg', '#f7f9fb');
                root.style.setProperty('--surface-0', '#ffffff');
                root.style.setProperty('--surface-1', '#f2f4f6');
                root.style.setProperty('--surface-2', '#eceef0');
                root.style.setProperty('--surface-3', '#e6e8ea');
                root.style.setProperty('--on-surface', '#191c1e');
                root.style.setProperty('--on-surface-2', '#45464d');
                root.style.setProperty('--outline', '#76777d');
                root.style.setProperty('--outline-2', '#c6c6cd');
                root.style.setProperty('--primary-container', '#131b2e');
                root.style.setProperty('--on-primary-container', '#7c839b');
                root.style.setProperty('--on-primary', '#ffffff');
                root.style.setProperty('--secondary', '#505f76');
                root.style.setProperty('--secondary-container', '#d0e1fb');
                root.style.setProperty('--on-secondary-container', '#54647a');
                root.style.setProperty('--error-container', '#ffdad6');
                root.style.setProperty('--success-bg', '#d6f0e0');
                root.style.setProperty('--accent-bg', '#dbeafe');
                root.style.setProperty('--warning-bg', '#fef3c7');
                root.removeAttribute('data-theme');
            }
            // Apply accent color after theme
            this.applyAccentColor();
        },

        setAccentColor(color) {
            this.accentColor = color;
            localStorage.setItem('pro_accentColor', color);
            this.applyAccentColor();
            this.pushNote('Accent color updated');
        },

        applyAccentColor() {
            const root = document.documentElement;
            root.style.setProperty('--primary', this.accentColor);
            root.style.setProperty('--accent', this.accentColor); // Update accent as well

            // Generate a lighter tint for backgrounds/buttons
            const hex = this.accentColor.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            
            // On-primary stays white for dark colors, black for light
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            const onPrimary = luminance > 0.5 ? '#000000' : '#ffffff';
            const onPrimaryMuted = luminance > 0.5 ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)';
            
            root.style.setProperty('--on-primary', onPrimary);
            
            // Also update the container cards so they fully reflect the accent color!
            root.style.setProperty('--primary-container', this.accentColor);
            root.style.setProperty('--on-primary-container', onPrimaryMuted);
            
            // Re-render charts so they use the new accent color
            this.$nextTick(() => this.renderCharts());
        },

        setFontSize(size) {
            this.fontSize = Number(size);
            localStorage.setItem('pro_fontSize', JSON.stringify(this.fontSize));
            this.applyFontSize();
        },

        applyFontSize() {
            const root = document.documentElement;
            const scale = this.fontSize / 14; // 14px is the base
            [9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28].forEach(size => {
                root.style.setProperty(`--font-${size}`, `calc(${size}px * ${scale})`);
            });
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
            const data = FinanceLogic.buildChartData(this.transactions, this.budgets);
            const rootStyle = getComputedStyle(document.documentElement);
            const accentHex = (rootStyle.getPropertyValue('--accent') || '').trim() || '#1a56db';
            const primaryColor = (rootStyle.getPropertyValue('--primary') || '').trim() || '#1a56db';
            const surfaceColor = (rootStyle.getPropertyValue('--surface-0') || '').trim() || '#ffffff';
            const outlineColor = (rootStyle.getPropertyValue('--outline-2') || '').trim() || '#c6c6cd';

            // Parse accent to rgb for gradient
            let r = 26, g = 86, b = 219;
            if (accentHex.startsWith('#') && accentHex.length === 7) {
                r = parseInt(accentHex.slice(1, 3), 16);
                g = parseInt(accentHex.slice(3, 5), 16);
                b = parseInt(accentHex.slice(5, 7), 16);
            }

            // Helper: format large numbers for Y axis ticks
            const fmtAxis = (val) => {
                if (val >= 1000000) return (val / 1000000).toFixed(1) + 'jt';
                if (val >= 1000) return (val / 1000).toFixed(0) + 'rb';
                return val;
            };

            // Destroy all previous chart instances first to avoid "Canvas already in use"
            this.safeDestroyCharts();
            window.appCharts = { pie: null, line: null, bar: null };

            // ── PIE / DOUGHNUT CHART ─────────────────────────────────────────
            const ctxPie = document.getElementById('pieChart');
            if (ctxPie) {
                const pieTotal = data.pie.Needs + data.pie.Wants + data.pie.Savings;
                const pieData = pieTotal > 0
                    ? [data.pie.Needs, data.pie.Wants, data.pie.Savings]
                    : [1, 1, 1];
                const pieColors = pieTotal > 0
                    ? [accentHex, '#b45309', '#1a6b3a']
                    : ['#e0e0e0', '#eeeeee', '#f5f5f5'];

                window.appCharts.pie = new Chart(ctxPie, {
                    type: 'doughnut',
                    data: {
                        labels: ['Kebutuhan', 'Keinginan', 'Tabungan'],
                        datasets: [{
                            data: pieData,
                            backgroundColor: pieColors,
                            borderWidth: pieTotal > 0 ? 2 : 0,
                            borderColor: surfaceColor,
                            hoverOffset: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '60%',
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    color: '#45464d',
                                    font: { size: 11, family: 'Plus Jakarta Sans' },
                                    padding: 12,
                                    boxWidth: 12
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: (ctx) => {
                                        if (!pieTotal) return ' Belum ada data';
                                        const val = ctx.raw;
                                        const pct = ((val / pieTotal) * 100).toFixed(1);
                                        return ' ' + ctx.label + ': ' + fmtAxis(val) + ' (' + pct + '%)';
                                    }
                                }
                            }
                        }
                    }
                });
            }

            // ── LINE CHART (Balance Over Time) ───────────────────────────────
            const ctxLine = document.getElementById('lineChart');
            if (ctxLine) {
                if (data.line.length > 0) {
                    const chartH = ctxLine.clientHeight || 130;
                    const ctx2d = ctxLine.getContext('2d');
                    let gradient = ctx2d.createLinearGradient(0, 0, 0, chartH);
                    gradient.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',0.25)');
                    gradient.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0.0)');

                    window.appCharts.line = new Chart(ctxLine, {
                        type: 'line',
                        data: {
                            labels: data.line.map(d => this.formatDate(d.x)),
                            datasets: [{
                                label: 'Saldo',
                                data: data.line.map(d => d.y),
                                borderColor: accentHex,
                                borderWidth: 2,
                                tension: 0.4,
                                fill: true,
                                backgroundColor: gradient,
                                pointBackgroundColor: accentHex,
                                pointBorderColor: '#fff',
                                pointRadius: data.line.length <= 2 ? 5 : 3,
                                pointHoverRadius: 6,
                                pointHoverBackgroundColor: '#fff',
                                pointHoverBorderColor: accentHex
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            animation: { duration: 600 },
                            plugins: { legend: { display: false } },
                            scales: {
                                x: {
                                    ticks: {
                                        color: '#76777d',
                                        font: { size: 9, family: 'Plus Jakarta Sans' },
                                        maxTicksLimit: 5,
                                        maxRotation: 0
                                    },
                                    grid: { color: '#f0f0f2' }
                                },
                                y: {
                                    ticks: {
                                        color: '#76777d',
                                        font: { size: 9, family: 'Plus Jakarta Sans' },
                                        callback: (val) => fmtAxis(val)
                                    },
                                    grid: { color: '#f0f0f2' }
                                }
                            }
                        }
                    });
                }
            }

            // ── BAR CHART (Spending Trend) ───────────────────────────────────
            const ctxBar = document.getElementById('barChart');
            if (ctxBar) {
                let weeks = Object.keys(data.weekly).sort();
                let weekVals = weeks.map(w => data.weekly[w]);

                if (weeks.length === 0) {
                    weeks = ['Minggu Ini'];
                    weekVals = [0];
                }

                const maxVal = Math.max(...weekVals);
                const barColors = weekVals.map(v =>
                    (maxVal > 0 && v === maxVal) ? primaryColor : outlineColor
                );

                window.appCharts.bar = new Chart(ctxBar, {
                    type: 'bar',
                    data: {
                        labels: weeks,
                        datasets: [{
                            label: 'Pengeluaran/Minggu',
                            data: weekVals,
                            backgroundColor: barColors,
                            borderRadius: 5,
                            borderSkipped: false
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: { duration: 600 },
                        plugins: { legend: { display: false } },
                        scales: {
                            x: {
                                ticks: {
                                    color: '#76777d',
                                    font: { size: 9, family: 'Plus Jakarta Sans' },
                                    maxRotation: 0
                                },
                                grid: { display: false }
                            },
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    color: '#76777d',
                                    font: { size: 9, family: 'Plus Jakarta Sans' },
                                    callback: (val) => fmtAxis(val)
                                },
                                grid: { color: '#f0f0f2' }
                            }
                        }
                    }
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