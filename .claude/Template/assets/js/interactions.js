(function () {
  const onReady = (fn) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  };

  const showToast = (message) => {
    const toast = document.querySelector('[data-toast]');
    if (!toast) return;
    const messageNode = toast.querySelector('[data-toast-message]');
    if (messageNode) {
      messageNode.textContent = message;
    }
    toast.classList.add('is-visible');
    toast.removeAttribute('hidden');
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 2600);
  };

  onReady(() => {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

    const navButtons = document.querySelectorAll('[data-nav]');
    navButtons.forEach((button) => {
      button.addEventListener('click', () => {
        navButtons.forEach((btn) => {
          btn.classList.remove('is-active');
          btn.removeAttribute('aria-current');
        });
        button.classList.add('is-active');
        button.setAttribute('aria-current', 'page');
        showToast(`${button.dataset.nav} section selected`);
      });
    });

    const customizeButtons = document.querySelectorAll('[data-action="customize"]');
    customizeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        showToast('Customization panel coming soon ✨');
      });
    });

    const downloadButtons = document.querySelectorAll('[data-action="download"]');
    downloadButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        showToast('Report download scheduled');
      });
    });
  });
})();
