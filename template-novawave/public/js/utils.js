(function () {
  function formatCurrency(value, currency = 'USD') {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
      }).format(value);
    } catch (error) {
      console.warn('[dashboard] Unable to format currency', error);
      return `$${Number(value || 0).toFixed(2)}`;
    }
  }

  function formatCompact(value) {
    return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value);
  }

  window.DashboardUtils = {
    formatCurrency,
    formatCompact,
  };
})();
