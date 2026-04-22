function moneyApp() {
    
    return {
        transactionType: 'expense',
        newAmount: 0,
        displayAmount: '',
        newCategory: '',
        incomeSource: '',
        showAddCategory: false,
        newCatName: '',
        newCatLimit: 0,
        newCatType: 'Needs',
        notifications: [],
        budgets: {},
        transactions: [],

        // calculator
        showCalc: false,
        calcDisplay: '0',
        calcExpression: '',

        // chart
        chart: null,

        init() {
            this.budgets = JSON.parse(localStorage.getItem('pro_budgets')) || {
                'Makan': { limit: 1000000, type: 'Needs' },
                'Transport': { limit: 500000, type: 'Needs' }
            };

            this.transactions = JSON.parse(localStorage.getItem('pro_history')) || [];
            this.newCategory = Object.keys(this.budgets)[0] || '';

            this.$nextTick(() => {
                this.renderChart();
            });
        },

        handleFormat(el) {
            let val = el.value.replace(/[^0-9]/g, '');
            this.newAmount = parseInt(val) || 0;
            this.displayAmount = val ? new Intl.NumberFormat('id-ID').format(this.newAmount) : '';
            el.value = this.displayAmount;
        },

        addTransaction() {
            if (this.newAmount <= 0) return;

            this.transactions.unshift({
                amount: this.newAmount,
                category: this.transactionType === 'income'
                    ? (this.incomeSource || 'Pemasukan')
                    : this.newCategory,
                type: this.transactionType,
                date: new Date().toISOString()
            });

            this.newAmount = 0;
            this.displayAmount = '';
            this.incomeSource = '';

            this.saveData();
            this.pushNote("Transaksi Berhasil!");

            this.renderChart();
        },

        // =========================
        // 🔥 CORE FINANCE
        // =========================

        get totalIncome() {
            return this.transactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);
        },

        get totalExpense() {
            return this.transactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);
        },

        get totalSaldo() {
            return this.totalIncome - this.totalExpense;
        },

        get monthlyIncome() {
            const now = new Date();

            return this.transactions
                .filter(t => {
                    let d = new Date(t.date);
                    return (
                        t.type === 'income' &&
                        d.getMonth() === now.getMonth() &&
                        d.getFullYear() === now.getFullYear()
                    );
                })
                .reduce((sum, t) => sum + t.amount, 0);
        },

        get expensePercent() {
            if (this.totalIncome === 0) return 0;
            return Math.round((this.totalExpense / this.totalIncome) * 100);
        },

        getFinanceStatus() {
            if (this.totalExpense > this.totalIncome) {
                return { icon: '🚨', message: 'Boros Parah' };
            }
            if (this.expensePercent > 80) {
                return { icon: '⚠️', message: 'Hampir Habis' };
            }
            if (this.expensePercent > 50) {
                return { icon: '😐', message: 'Cukup Aman' };
            }
            return { icon: '🔥', message: 'Sehat Banget' };
        },

        getInsightAdvanced() {
            if (this.totalIncome === 0) return "Belum ada pemasukan";

            if (this.totalExpense > this.totalIncome) {
                return "Pengeluaran lebih besar dari pemasukan. Kurangi pengeluaran!";
            }

            if (this.expensePercent > 80) {
                return "Uang hampir habis. Hati-hati belanja.";
            }

            if (this.expensePercent < 50) {
                return "Bagus! Kamu berhasil mengontrol pengeluaran.";
            }

            return "Keuangan cukup stabil.";
        },

        // =========================
        // 🤖 AI INSIGHT
        // =========================

        getAIInsight() {
            if (this.transactions.length === 0) {
                return "Belum ada data untuk dianalisis.";
            }

            let biggestCategory = null;
            let biggestValue = 0;

            Object.keys(this.budgets).forEach(cat => {
                let spending = this.getSpending(cat);
                if (spending > biggestValue) {
                    biggestValue = spending;
                    biggestCategory = cat;
                }
            });

            if (this.totalExpense > this.totalIncome) {
                return `🚨 Pengeluaran lebih besar dari pemasukan. Fokus kurangi ${biggestCategory}.`;
            }

            if (this.expensePercent > 80) {
                return `⚠️ 80% uang lo udah kepake. Terbanyak di ${biggestCategory}.`;
            }

            if (this.expensePercent < 50) {
                return `🔥 Keuangan aman. Tapi ${biggestCategory} paling sering keluar.`;
            }

            return `📊 Keuangan stabil. Perhatikan ${biggestCategory}.`;
        },

        getSavingSuggestion() {
            if (!this.transactions.length) return "";

            let suggestions = [];

            Object.keys(this.budgets).forEach(cat => {
                let spend = this.getSpending(cat);
                let limit = this.budgets[cat].limit;

                if (spend > limit) {
                    suggestions.push(`Kurangi ${cat}`);
                } else if (spend > limit * 0.8) {
                    suggestions.push(`${cat} hampir limit`);
                }
            });

            return suggestions.length 
                ? "💡 Saran: " + suggestions.join(', ') 
                : "✅ Semua pengeluaran masih aman";
        },

        // =========================
        // 📄 PDF EXPORT (NEW)
        // =========================

        generatePDF() {
    if (!window.jspdf) {
        alert("Library PDF belum load!");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let y = 20;

    // ===== TITLE =====
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("WEALTHYFLOW REPORT", 105, y, { align: "center" });

    y += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Tanggal: " + new Date().toLocaleDateString("id-ID"), 105, y, { align: "center" });

    y += 15;

    // ===== SUMMARY BOX =====
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Ringkasan Keuangan", 10, y);

    y += 8;

    doc.setFont("helvetica", "normal");

    const summary = [
        ["Total Saldo", this.formatRupiah(this.totalSaldo)],
        ["Total Pemasukan", this.formatRupiah(this.totalIncome)],
        ["Total Pengeluaran", this.formatRupiah(this.totalExpense)],
        ["Status", this.getFinanceStatus().message],
    ];

    summary.forEach(item => {
        doc.text(`${item[0]} :`, 10, y);
        doc.text(item[1], 80, y);
        y += 7;
    });

    y += 10;

    // ===== AI INSIGHT =====
    doc.setFont("helvetica", "bold");
    doc.text("AI Insight", 10, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    const insight = doc.splitTextToSize(this.getAIInsight(), 180);
    doc.text(insight, 10, y);

    y += insight.length * 6 + 5;

    const suggestion = doc.splitTextToSize(this.getSavingSuggestion(), 180);
    doc.text(suggestion, 10, y);

    y += suggestion.length * 6 + 10;

    // ===== CATEGORY BREAKDOWN =====
    doc.setFont("helvetica", "bold");
    doc.text("Pengeluaran per Kategori", 10, y);

    y += 8;

    doc.setFont("helvetica", "normal");

    Object.keys(this.budgets).forEach(cat => {
        const spend = this.getSpending(cat);
        if (spend > 0) {
            doc.text(`- ${cat}`, 10, y);
            doc.text(this.formatRupiah(spend), 120, y);
            y += 6;
        }
    });

    y += 10;

    // ===== FOOTER =====
    doc.setFontSize(9);
    doc.text("Generated by WealthyFlow Pro", 105, 290, { align: "center" });

    // SAVE
    doc.save("wealthyflow-report.pdf");

    this.pushNote("PDF berhasil di download 📄");
},

        // =========================

        addCategory() {
            if (!this.newCatName || this.newCatLimit <= 0) return;

            this.budgets[this.newCatName] = {
                limit: parseInt(this.newCatLimit),
                type: this.newCatType
            };

            this.saveData();
            this.showAddCategory = false;
            this.newCatName = '';
            this.newCatLimit = 0;
        },

        deleteCategory(key) {
            if (confirm('Hapus kategori ini?')) {
                delete this.budgets[key];
                this.saveData();
            }
        },

        clearHistory() {
            if (confirm('Hapus semua riwayat?')) {
                this.transactions = [];
                this.saveData();
                this.renderChart();
            }
        },

        saveData() {
            localStorage.setItem('pro_budgets', JSON.stringify(this.budgets));
            localStorage.setItem('pro_history', JSON.stringify(this.transactions));
        },

        formatRupiah(num) {
            return 'Rp' + new Intl.NumberFormat('id-ID').format(num);
        },

        getSpending(cat) {
            return this.transactions
                .filter(t => t.type === 'expense' && t.category === cat)
                .reduce((a, b) => a + b.amount, 0);
        },

        getPercent(cat) {
            let p = Math.round((this.getSpending(cat) / this.budgets[cat].limit) * 100);
            return p > 100 ? 100 : p || 0;
        },

        pushNote(msg) {
            const id = Date.now();
            this.notifications.push({ id, msg });
            setTimeout(() => {
                this.notifications = this.notifications.filter(n => n.id !== id);
            }, 2000);
        },

        // =========================
        // CHART
        // =========================

        renderChart() {
            const income = this.totalIncome;
            const expense = this.totalExpense;

            const ctx = document.getElementById('financeChart');
            if (!ctx) return;

            if (this.chart) {
                this.chart.destroy();
            }

            this.chart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Pemasukan', 'Pengeluaran'],
                    datasets: [{
                        data: [income, expense],
                        backgroundColor: ['#10b981', '#6366f1'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        },

        // =========================
        // CALCULATOR
        // =========================

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
                this.calcDisplay = eval(this.calcExpression + this.calcDisplay).toString();
                this.calcExpression = '';
            } catch {
                this.calcDisplay = 'Error';
            }
        },

        useCalcResult() {
            this.displayAmount = this.calcDisplay;
            this.newAmount = parseInt(this.calcDisplay) || 0;
        }
    }
}