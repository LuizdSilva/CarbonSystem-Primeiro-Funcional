//  CarbonTree - dashboard.js

const CT = {
    primary:      '#16a34a',
    primaryLight: '#22c55e',
    accent:       '#4ade80',
    danger:       '#ef4444',
    warning:      '#f59e0b',
    info:         '#38bdf8',
    purple:       '#a78bfa',
    gridColor:    'rgba(30,48,39,0.8)',
    textMuted:    '#8aab95',
    fontFamily:   "'Space Grotesk', sans-serif",
};
if (typeof Chart !== 'undefined') {
    Chart.defaults.color                           = CT.textMuted;
    Chart.defaults.font.family                     = CT.fontFamily;
    Chart.defaults.font.size                       = 12;
    Chart.defaults.plugins.legend.labels.boxWidth = 12;
    Chart.defaults.plugins.legend.labels.padding  = 16;
}
function buildGradient(ctx, color, alpha = 0.35) {
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    const toRgba = (c, a) => {
        const tmp = document.createElement('canvas').getContext('2d');
        tmp.fillStyle = c;
        const hex = tmp.fillStyle;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    };
    gradient.addColorStop(0, toRgba(color, alpha));
    gradient.addColorStop(1, toRgba(color, 0));
    return gradient;
}

function limitLine(value, label, color) {
    return {
        type: 'line',
        yMin: value, yMax: value,
        borderColor: color,
        borderWidth: 1.5,
        borderDash: [6, 4],
        label: {
            content: label, display: true, position: 'end',
            backgroundColor: color, color: '#fff',
            font: { size: 10, weight: 'bold' },
            padding: { x: 6, y: 3 }, borderRadius: 4,
        }
    };
}

const baseOptions = (yLabel, unit) => ({
    responsive: true,
    maintainAspectRatio: true,
    interaction: { mode: 'index', intersect: false },
    plugins: {
        legend: { display: true, position: 'top' },
        tooltip: {
            backgroundColor: '#111814', borderColor: '#1e3027', borderWidth: 1,
            titleColor: '#e2f0e8', bodyColor: '#8aab95', padding: 10,
            callbacks: {
                /* L122: optional chaining para evitar crash quando parsed.y é undefined */
                label: (ctx) => ' ' + ctx.dataset.label + ': ' + (ctx.parsed && ctx.parsed.y != null ? ctx.parsed.y.toFixed(1) : '--') + ' ' + unit
            }
        }
    },
    scales: {
        x: { grid: { color: CT.gridColor }, ticks: { maxTicksLimit: 12, maxRotation: 0 } },
        y: {
            grid: { color: CT.gridColor },
            title: { display: true, text: yLabel, color: CT.textMuted, font: { size: 11 } },
            beginAtZero: false,
        }
    }
});
let co2Chart     = null;
let pmChart      = null;
let stationChart = null;

function initCo2Chart() {
    const canvas = document.getElementById('co2Chart');
    if (!canvas) return;
    const ctx      = canvas.getContext('2d');
    const rawData  = (typeof co2ChartData !== 'undefined') ? co2ChartData : [];
    const datasets = buildStationDatasets(rawData);
    const opts     = baseOptions('CO2 (ppm)', 'ppm');
    opts.plugins.annotation = { annotations: { limit: limitLine(1000, 'Limite 1000 ppm', CT.danger) } };
    co2Chart = new Chart(ctx, { type: 'line', data: { labels: extractLabels(rawData), datasets }, options: opts });
}

function initPmChart() {
    const canvas = document.getElementById('pmChart');
    if (!canvas) return;
    const ctx      = canvas.getContext('2d');
    const rawData  = (typeof pmChartData !== 'undefined') ? pmChartData : [];
    const datasets = buildStationDatasets(rawData);
    const opts     = baseOptions('PM (ug/m3)', 'ug/m3');
    opts.plugins.annotation = { annotations: { limit: limitLine(150, 'Limite 150 ug/m3', CT.danger) } };
    pmChart = new Chart(ctx, { type: 'line', data: { labels: extractLabels(rawData), datasets }, options: opts });
}

function initStationChart() {
    const canvas = document.getElementById('stationChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    stationChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: {
            responsive: true,
            scales: {
                x: { grid: { color: CT.gridColor } },
                y: { grid: { color: CT.gridColor }, beginAtZero: true }
            }
        }
    });
    loadStationComparison();
}
function loadStationComparison() {
    if (!stationChart) return;
    fetch('/api/charts/stations')
        .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function(data) {
            stationChart.data.labels = data.labels || [];
            stationChart.data.datasets = [
                {
                    label: 'CO2 (ppm)', data: data.co2 || [],
                    backgroundColor: hexAlpha(CT.primaryLight, 0.7), borderColor: CT.primaryLight,
                    borderWidth: 1.5, borderRadius: 6,
                },
                {
                    label: 'PM (ug/m3)', data: data.pm || [],
                    backgroundColor: hexAlpha(CT.warning, 0.7), borderColor: CT.warning,
                    borderWidth: 1.5, borderRadius: 6,
                }
            ];
            stationChart.update();
        })
        .catch(function(err) { console.warn('Station chart error:', err); });
}

const COLORS = [CT.primaryLight, CT.info, CT.warning, CT.purple, CT.accent];

function buildStationDatasets(rawData) {
    if (!Array.isArray(rawData) || rawData.length === 0) return [];
    const groups = {};
    rawData.forEach(function(point) {
        const name = point.stationName || 'Desconhecida';
        if (!groups[name]) groups[name] = {};
        groups[name][point.label] = point.value;
    });
    return Object.entries(groups).map(function(entry, idx) {
        const station  = entry[0];
        const hourMap  = entry[1];
        const color    = COLORS[idx % COLORS.length];
        const allLabels = extractLabels(rawData);
        return {
            label: station,
            data: allLabels.map(function(lbl) { return (hourMap[lbl] !== undefined) ? hourMap[lbl] : null; }),
            borderColor: color, backgroundColor: hexAlpha(color, 0.1),
            pointBackgroundColor: color, pointRadius: 3, pointHoverRadius: 5,
            borderWidth: 2, tension: 0.4, fill: true, spanGaps: true,
        };
    });
}

function extractLabels(rawData) {
    const seen = new Set();
    return rawData
        .map(function(p) { return p.label; })
        .filter(function(l) { if (seen.has(l)) return false; seen.add(l); return true; })
        .sort();
}
function hexAlpha(hex, alpha) {
    const c = document.createElement('canvas').getContext('2d');
    c.fillStyle = hex;
    const computed = c.fillStyle;
    const r = parseInt(computed.slice(1, 3), 16);
    const g = parseInt(computed.slice(3, 5), 16);
    const b = parseInt(computed.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function refreshCharts() {
    fetch('/api/charts/co2?hours=24')
        .then(function(r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function(data) {
            if (!co2Chart) return;
            co2Chart.data.labels = data.labels || [];
            if (co2Chart.data.datasets[0]) co2Chart.data.datasets[0].data = data.data || [];
            co2Chart.update('none');
        }).catch(function() {});

    fetch('/api/charts/pm?hours=24')
        .then(function(r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function(data) {
            if (!pmChart) return;
            pmChart.data.labels = data.labels || [];
            if (pmChart.data.datasets[0]) pmChart.data.datasets[0].data = data.data || [];
            pmChart.update('none');
        }).catch(function() {});

    loadStationComparison();
}

document.addEventListener('DOMContentLoaded', function() {
    initCo2Chart();
    initPmChart();
    initStationChart();
    setInterval(refreshCharts, 60000);
});
