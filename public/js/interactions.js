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

  // Tooltip functionality (desktop only)
  const createTooltip = () => {
    let tooltip = document.getElementById('global-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'global-tooltip';
      tooltip.className = 'tooltip';
      tooltip.innerHTML = '<div class="tooltip__content"></div><div class="tooltip__arrow"></div>';
      document.body.appendChild(tooltip);
    }
    return tooltip;
  };

  const showTooltip = (element, text) => {
    // Only show tooltips on desktop (>1024px)
    if (window.innerWidth <= 1023) return;

    const tooltip = createTooltip();
    const content = tooltip.querySelector('.tooltip__content');

    if (!content) return;

    content.textContent = text;

    // Position tooltip
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    // Center horizontally above the element
    const left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    const top = rect.top - tooltipRect.height - 12; // 12px gap

    tooltip.style.left = `${Math.max(8, left)}px`;
    tooltip.style.top = `${Math.max(8, top)}px`;

    // Show tooltip with animation
    requestAnimationFrame(() => {
      tooltip.classList.add('is-visible');
    });
  };

  const hideTooltip = () => {
    const tooltip = document.getElementById('global-tooltip');
    if (tooltip) {
      tooltip.classList.remove('is-visible');
    }
  };

  const initTooltips = () => {
    const elementsWithTooltip = document.querySelectorAll('[data-tooltip]');

    elementsWithTooltip.forEach((element) => {
      const tooltipText = element.getAttribute('data-tooltip');

      element.addEventListener('mouseenter', () => {
        if (tooltipText) {
          showTooltip(element, tooltipText);
        }
      });

      element.addEventListener('mouseleave', hideTooltip);

      // Hide tooltip on scroll
      element.addEventListener('click', hideTooltip);
    });

    // Hide tooltip on window scroll
    window.addEventListener('scroll', hideTooltip, { passive: true });
  };

  onReady(() => {
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons({ icons: lucide.icons });
    }

    // Initialize tooltips
    initTooltips();

    // Sticky topbar scroll effect
    const topbar = document.querySelector('.topbar');
    const mainPanel = document.querySelector('.main-panel');

    if (topbar && mainPanel) {
      const handleScroll = () => {
        const scrollTop = mainPanel.scrollTop || window.pageYOffset || document.documentElement.scrollTop;

        if (scrollTop > 20) {
          topbar.classList.add('is-scrolled');
        } else {
          topbar.classList.remove('is-scrolled');
        }
      };

      // Listen to scroll on main panel or window
      mainPanel.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('scroll', handleScroll, { passive: true });

      // Check initial scroll position
      handleScroll();
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

    // Toggle cards display (4 or 6 cards)
    const toggleCardsBtn = document.getElementById('toggleCardsBtn');
    if (toggleCardsBtn) {
      toggleCardsBtn.addEventListener('click', () => {
        const cardGrid = document.querySelector('.card-grid');
        const extraCards = document.querySelectorAll('.card-extra');
        const currentCount = toggleCardsBtn.dataset.cardCount;

        if (currentCount === '6') {
          // Hide extra cards (show only 4) - make cards larger
          extraCards.forEach(card => card.classList.add('hidden'));
          cardGrid.classList.add('show-four');
          toggleCardsBtn.dataset.cardCount = '4';
          toggleCardsBtn.textContent = 'Show 6';
          showToast('Showing 4 cards');
        } else {
          // Show all cards (show 6) - make cards smaller
          extraCards.forEach(card => card.classList.remove('hidden'));
          cardGrid.classList.remove('show-four');
          toggleCardsBtn.dataset.cardCount = '6';
          toggleCardsBtn.textContent = 'Show 4';
          showToast('Showing 6 cards');
        }
      });
    }
  });
})();
