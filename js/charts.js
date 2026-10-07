/* ==========================================================================
   charts.js — wrapper نمودارها روی Chart.js
   نیازمند لود بودن کتابخانه Chart.js از CDN قبل از این فایل
   ========================================================================== */

const _chartInstances = {};

function _destroyChartIfExists(canvasId) {
  if (_chartInstances[canvasId]) {
    _chartInstances[canvasId].destroy();
    delete _chartInstances[canvasId];
  }
}

const CHART_PALETTE = ['#D4AF7A', '#9C4F96', '#3FAE8C', '#E8A0A0', '#D96C8C'];

/**
 * نمودار میله‌ای
 * @param {string} canvasId
 * @param {string[]} labels
 * @param {Array<{label:string,data:number[],color?:string}>} series یک یا چند سری داده
 */
function renderBarChart(canvasId, labels, series) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return null;
  _destroyChartIfExists(canvasId);

  const datasets = series.map((s, i) => ({
    label: s.label,
    data: s.data,
    backgroundColor: s.color || CHART_PALETTE[i % CHART_PALETTE.length],
    borderRadius: 6,
    maxBarThickness: 36
  }));

  const chart = new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: series.length > 1,
          labels: { color: '#A79FB0', font: { family: 'Vazirmatn', size: 11 }, boxWidth: 12, boxHeight: 12 }
        },
        tooltip: {
          bodyFont: { family: 'Vazirmatn', size: 11 },
          titleFont: { family: 'Vazirmatn', size: 11 },
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` }
        }
      },
      scales: {
        x: { ticks: { color: '#A79FB0', font: { family: 'Vazirmatn', size: 11 } }, grid: { display: false } },
        y: {
          ticks: { color: '#A79FB0', font: { family: 'Vazirmatn', size: 11 }, callback: (v) => Number(v).toLocaleString('en-US') },
          grid: { color: '#322C40' }
        }
      }
    }
  });

  _chartInstances[canvasId] = chart;
  return chart;
}

/**
 * نمودار دایره‌ای (Donut)
 * @param {string} canvasId
 * @param {string[]} labels
 * @param {number[]} data
 * @param {string[]} [colors]
 */
function renderPieChart(canvasId, labels, data, colors) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return null;
  _destroyChartIfExists(canvasId);

  const chart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors || CHART_PALETTE,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#A79FB0', font: { family: 'Vazirmatn', size: 11 }, boxWidth: 12, boxHeight: 12, padding: 12 }
        },
        tooltip: {
          bodyFont: { family: 'Vazirmatn', size: 11 },
          titleFont: { family: 'Vazirmatn', size: 11 },
          callbacks: { label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.raw)}` }
        }
      }
    }
  });

  _chartInstances[canvasId] = chart;
  return chart;
}
