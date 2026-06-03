const fs = require('fs');
let src = fs.readFileSync('script.js', 'utf8');

const newRenderCharts = `        renderCharts() {
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

            window.appCharts = window.appCharts || { pie: null, line: null, bar: null };

            // ── PIE / DOUGHNUT CHART ─────────────────────────────────────────
            const ctxPie = document.getElementById('pieChart');
            if (ctxPie) {
                if (window.appCharts.pie) {
                    window.appCharts.pie.destroy();
                    window.appCharts.pie = null;
                }
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
                if (window.appCharts.line) {
                    window.appCharts.line.destroy();
                    window.appCharts.line = null;
                }
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
                if (window.appCharts.bar) {
                    window.appCharts.bar.destroy();
                    window.appCharts.bar = null;
                }
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
        },`;

// Find start marker
const startMarker = '        renderCharts() {';
const startIdx = src.indexOf(startMarker);
if (startIdx === -1) {
    console.error('ERROR: Could not find renderCharts start');
    process.exit(1);
}

// Find end: the closing '        },' after renderCharts
// We need to find the matching closing brace
let depth = 0;
let i = startIdx;
let endIdx = -1;
while (i < src.length) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
        depth--;
        if (depth === 0) {
            // Find the comma after the closing brace
            let j = i + 1;
            while (j < src.length && (src[j] === ' ' || src[j] === '\r')) j++;
            if (src[j] === ',') {
                endIdx = j + 1;
            } else {
                endIdx = i + 1;
            }
            break;
        }
    }
    i++;
}

if (endIdx === -1) {
    console.error('ERROR: Could not find renderCharts end');
    process.exit(1);
}

console.log('Found renderCharts from', startIdx, 'to', endIdx);
console.log('Original length:', endIdx - startIdx);

const result = src.slice(0, startIdx) + newRenderCharts + src.slice(endIdx);
fs.writeFileSync('script.js', result, 'utf8');
console.log('SUCCESS: script.js updated. New length:', result.length);
