(function () {
  'use strict';

  const onReady = (fn) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  };

  // Toast notification function (reuse from interactions.js)
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

  // ==========================================
  // HAMBURGER MENU & SIDEBAR TOGGLE
  // ==========================================

  function initHamburgerMenu() {
    const hamburger = document.querySelector('.hamburger-menu');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.mobile-overlay');

    if (!hamburger || !sidebar || !overlay) return;

    const openMenu = () => {
      sidebar.classList.add('is-open');
      overlay.classList.add('is-visible');
      hamburger.classList.add('is-active');
      document.body.style.overflow = 'hidden'; // Prevent scroll
      hamburger.setAttribute('aria-expanded', 'true');
    };

    const closeMenu = () => {
      sidebar.classList.remove('is-open');
      overlay.classList.remove('is-visible');
      hamburger.classList.remove('is-active');
      document.body.style.overflow = '';
      hamburger.setAttribute('aria-expanded', 'false');
    };

    const toggleMenu = () => {
      if (sidebar.classList.contains('is-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    };

    // Click hamburger to toggle
    hamburger.addEventListener('click', toggleMenu);

    // Click overlay to close
    overlay.addEventListener('click', closeMenu);

    // Close menu when nav item is clicked
    const navButtons = sidebar.querySelectorAll('[data-nav]');
    navButtons.forEach((btn) => {
      btn.addEventListener('click', closeMenu);
    });

    // Swipe gestures for menu
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    // Swipe from left edge to open
    document.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleSwipe();
    }, { passive: true });

    function handleSwipe() {
      const diffX = touchEndX - touchStartX;
      const diffY = Math.abs(touchEndY - touchStartY);

      // Swipe right from left edge (open menu)
      if (diffX > 100 && touchStartX < 50 && diffY < 100) {
        openMenu();
      }

      // Swipe left when menu is open (close menu)
      if (diffX < -100 && sidebar.classList.contains('is-open') && diffY < 100) {
        closeMenu();
      }
    }
  }

  // ==========================================
  // PULL TO REFRESH
  // ==========================================

  function initPullToRefresh() {
    const pullToRefreshElement = document.querySelector('.pull-to-refresh');
    const mainPanel = document.querySelector('.main-panel');

    if (!pullToRefreshElement || !mainPanel) return;

    let touchStartY = 0;
    let touchCurrentY = 0;
    let isPulling = false;
    const threshold = 100; // Pull distance threshold

    mainPanel.addEventListener('touchstart', (e) => {
      // Only trigger if at top of page
      if (window.scrollY === 0) {
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    mainPanel.addEventListener('touchmove', (e) => {
      if (touchStartY === 0) return;

      touchCurrentY = e.touches[0].clientY;
      const pullDistance = touchCurrentY - touchStartY;

      if (pullDistance > 0 && pullDistance < 200) {
        isPulling = true;
        pullToRefreshElement.classList.add('is-pulling');

        // Add resistance effect
        const translateY = Math.min(pullDistance / 2, 100);
        pullToRefreshElement.style.transform = `translateX(-50%) translateY(${translateY - 100}px)`;
      }
    }, { passive: true });

    mainPanel.addEventListener('touchend', () => {
      if (isPulling) {
        const pullDistance = touchCurrentY - touchStartY;

        if (pullDistance > threshold) {
          // Trigger refresh
          performRefresh();
        } else {
          // Reset
          resetPullToRefresh();
        }
      }

      touchStartY = 0;
      touchCurrentY = 0;
      isPulling = false;
    });

    function performRefresh() {
      pullToRefreshElement.innerHTML = '<svg data-lucide="loader-2"></svg> Refreshing...';

      // Re-initialize icons
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }

      // Simulate refresh (replace with actual data fetch)
      setTimeout(() => {
        showToast('Dashboard refreshed ✨');
        resetPullToRefresh();

        // Here you would typically reload dashboard data
        // Example: fetchDashboardData().then(updateUI);
      }, 1500);
    }

    function resetPullToRefresh() {
      pullToRefreshElement.classList.remove('is-pulling');
      pullToRefreshElement.style.transform = 'translateX(-50%) translateY(-100px)';
      pullToRefreshElement.innerHTML = '<svg data-lucide="arrow-down"></svg> Pull to refresh';

      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    }
  }

  // ==========================================
  // SWIPE ACTIONS ON CARDS
  // ==========================================

  function initSwipeActions() {
    const swipeElements = document.querySelectorAll('.mobile-transaction-card, .credit-card');

    swipeElements.forEach((element) => {
      let touchStartX = 0;
      let touchStartTime = 0;
      let currentX = 0;
      let isSwiping = false;

      element.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartTime = Date.now();
        element.style.transition = 'none';
      }, { passive: true });

      element.addEventListener('touchmove', (e) => {
        if (!touchStartX) return;

        currentX = e.touches[0].clientX;
        const diffX = currentX - touchStartX;

        // Only allow left swipe
        if (diffX < 0 && diffX > -150) {
          isSwiping = true;
          element.style.transform = `translateX(${diffX}px)`;
        }
      }, { passive: true });

      element.addEventListener('touchend', () => {
        const swipeDistance = currentX - touchStartX;
        const swipeTime = Date.now() - touchStartTime;

        element.style.transition = 'transform 0.3s ease-out';

        // If swiped far enough or fast enough, trigger action
        if ((swipeDistance < -80 || (swipeDistance < -40 && swipeTime < 300)) && isSwiping) {
          // Show action
          element.style.transform = 'translateX(-80px)';
          showSwipeAction(element);
        } else {
          // Reset
          element.style.transform = 'translateX(0)';
        }

        touchStartX = 0;
        currentX = 0;
        isSwiping = false;
      });

      // Reset on tap elsewhere
      document.addEventListener('touchstart', (e) => {
        if (!element.contains(e.target)) {
          element.style.transform = 'translateX(0)';
        }
      }, { passive: true });
    });
  }

  function showSwipeAction(element) {
    // This is a placeholder - in production you'd show actual action buttons
    setTimeout(() => {
      showToast('Swipe action available! (Left: Delete, Right: Archive)');
      element.style.transform = 'translateX(0)';
    }, 2000);
  }

  // ==========================================
  // LONG PRESS ACTIONS
  // ==========================================

  function initLongPress() {
    const longPressElements = document.querySelectorAll('.credit-card, .mobile-transaction-card, .category-item');

    longPressElements.forEach((element) => {
      let pressTimer = null;
      let isLongPress = false;

      const startPress = (e) => {
        isLongPress = false;
        pressTimer = setTimeout(() => {
          isLongPress = true;
          handleLongPress(element);

          // Haptic feedback if available
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
        }, 500); // 500ms for long press
      };

      const cancelPress = () => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      };

      const endPress = (e) => {
        if (pressTimer) {
          clearTimeout(pressTimer);
        }
        // Prevent click if it was a long press
        if (isLongPress) {
          e.preventDefault();
          e.stopPropagation();
        }
        isLongPress = false;
      };

      element.addEventListener('touchstart', startPress, { passive: false });
      element.addEventListener('touchend', endPress, { passive: false });
      element.addEventListener('touchmove', cancelPress, { passive: true });
      element.addEventListener('touchcancel', cancelPress, { passive: true });
    });
  }

  function handleLongPress(element) {
    // Add visual feedback
    element.style.transform = 'scale(0.95)';
    setTimeout(() => {
      element.style.transform = '';
    }, 200);

    // Determine action based on element type
    if (element.classList.contains('credit-card')) {
      showToast('Card options: Edit | Delete | Set as Primary');
    } else if (element.classList.contains('mobile-transaction-card')) {
      showToast('Transaction options: Download | Share | Report');
    } else if (element.classList.contains('category-item')) {
      showToast('Category options: Edit Budget | View Details');
    }
  }

  // ==========================================
  // SHOW MORE CARDS ON MOBILE
  // ==========================================

  function initShowMoreCards() {
    const toggleBtn = document.getElementById('toggleCardsBtn');
    const cardGrid = document.querySelector('.card-grid');

    if (!toggleBtn || !cardGrid) return;

    // Check if we're on mobile
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      // Override the button to show/hide extra cards on mobile
      toggleBtn.textContent = 'Show All';

      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent any parent handlers

        if (cardGrid.classList.contains('show-all-mobile')) {
          cardGrid.classList.remove('show-all-mobile');
          toggleBtn.textContent = 'Show All';
          showToast('Showing 4 cards');
        } else {
          cardGrid.classList.add('show-all-mobile');
          toggleBtn.textContent = 'Show Less';
          showToast('Showing all cards');
        }
      }, { once: false }); // Allow multiple clicks
    }
  }

  // ==========================================
  // TOUCH FEEDBACK
  // ==========================================

  function initTouchFeedback() {
    const touchElements = document.querySelectorAll('button, .action-chip, .icon-button, .quick-action-btn');

    touchElements.forEach((element) => {
      element.addEventListener('touchstart', function() {
        this.style.opacity = '0.7';
      }, { passive: true });

      element.addEventListener('touchend', function() {
        this.style.opacity = '';
      }, { passive: true });

      element.addEventListener('touchcancel', function() {
        this.style.opacity = '';
      }, { passive: true });
    });
  }

  // ==========================================
  // PREVENT ZOOM ON DOUBLE TAP
  // ==========================================

  function preventDoubleTapZoom() {
    let lastTouchEnd = 0;

    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });
  }

  // ==========================================
  // RESPONSIVE RESIZE HANDLER
  // ==========================================

  function handleResize() {
    let resizeTimer;

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const width = window.innerWidth;

        // Reinitialize certain features on breakpoint changes
        if (width >= 1024) {
          // Desktop: close mobile menu if open
          const sidebar = document.querySelector('.sidebar');
          const overlay = document.querySelector('.mobile-overlay');
          const hamburger = document.querySelector('.hamburger-menu');

          if (sidebar) sidebar.classList.remove('is-open');
          if (overlay) overlay.classList.remove('is-visible');
          if (hamburger) hamburger.classList.remove('is-active');
          document.body.style.overflow = '';
        }
      }, 250);
    });
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================

  onReady(() => {
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const isMobileScreen = window.innerWidth < 1024;

    // Always initialize hamburger menu (visible on mobile/tablet)
    initHamburgerMenu();
    handleResize();

    // Only initialize touch-specific features on touch devices or small screens
    if (isTouchDevice || isMobileScreen) {
      initPullToRefresh();
      initSwipeActions();
      initLongPress();
      initShowMoreCards();
      initTouchFeedback();
      preventDoubleTapZoom();

      console.log('✨ Mobile interactions initialized (with touch features)');
    } else {
      console.log('✨ Mobile interactions initialized (basic features)');
    }
  });

})();
