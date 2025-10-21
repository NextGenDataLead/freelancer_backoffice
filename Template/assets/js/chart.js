(function () {
  const onReady = (fn) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  };

  onReady(() => {
    const canvas = document.getElementById('balanceChart');
    if (!canvas) return;

    if (typeof window.Chart === 'undefined') {
      console.warn('[dashboard] Chart.js not available — skipping graph render');
      canvas.parentElement?.classList.add('chart--fallback');
      return;
    }

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(52, 211, 153, 0.45)');
    gradient.addColorStop(1, 'rgba(52, 211, 153, 0)');

    const datasets = {
      '1y': [8200, 8600, 7800, 8120, 8540, 9100, 8730, 8920, 9340, 9820, 10210, 9870],
      '6m': [8200, 8450, 8120, 8540, 9100, 8730],
      '3m': [8730, 8920, 9340],
      '1m': [9340],
    };

    const labelsFull = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labelsFull,
        datasets: [
          {
            label: 'Actual balance',
            data: datasets['1y'],
            fill: true,
            tension: 0.4,
            borderColor: '#22d3ee',
            backgroundColor: gradient,
            pointRadius: 0,
            borderWidth: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            borderColor: 'rgba(148, 163, 184, 0.35)',
            borderWidth: 1,
            padding: 12,
            titleColor: '#f8fafc',
            bodyColor: '#e2e8f0',
            displayColors: false,
          },
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(148, 163, 184, 0.1)',
              borderDash: [6, 6],
            },
            ticks: {
              color: 'rgba(148, 163, 184, 0.55)',
              font: {
                family: 'Outfit, system-ui',
              },
            },
          },
          y: {
            grid: {
              color: 'rgba(148, 163, 184, 0.12)',
              borderDash: [6, 6],
            },
            ticks: {
              color: 'rgba(148, 163, 184, 0.45)',
              callback: (value) => `$${value / 1000}k`,
              font: {
                family: 'Outfit, system-ui',
              },
            },
          },
        },
      },
    });

    const timeframeButtons = document.querySelectorAll('[data-timeframe]');
    timeframeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        timeframeButtons.forEach((btn) => btn.classList.remove('is-active'));
        button.classList.add('is-active');

        const key = button.dataset.timeframe;
        const values = datasets[key];

        if (!Array.isArray(values)) {
          return;
        }

        chart.data.datasets[0].data = values;
        chart.data.labels = labelsFull.slice(0, values.length);
        chart.update();
      });
    });

    window.dashboardChart = chart;
  });
})();
