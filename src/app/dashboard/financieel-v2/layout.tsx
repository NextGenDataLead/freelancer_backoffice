'use client'

import '@/app/styles/theme.css'
import '@/app/styles/animations.css'
import '@/app/styles/components.css'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export default function FinancieelV2Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [unbilledAmount, setUnbilledAmount] = useState(0)

  // Fetch unbilled amount for invoice button badge
  useEffect(() => {
    const fetchUnbilledAmount = async () => {
      try {
        const response = await fetch('/api/invoices/dashboard-metrics')
        if (response.ok) {
          const data = await response.json()
          setUnbilledAmount(data.data?.factureerbaar || 0)
        }
      } catch (error) {
        console.error('Failed to fetch unbilled amount:', error)
      }
    }
    fetchUnbilledAmount()
  }, [])

  // Quick action handlers
  const handleStartTimer = () => {
    router.push('/dashboard/financieel-v2/tijd?action=start_timer')
  }

  const handleLogExpense = () => {
    // Navigate to expenses page and open modal
    router.push('/dashboard/financieel-v2/uitgaven?action=create')
  }

  const handleCreateInvoice = () => {
    if (unbilledAmount > 0) {
      router.push(`/dashboard/financieel-v2/facturen?action=create&unbilled_amount=${unbilledAmount}`)
    } else {
      router.push('/dashboard/financieel-v2/facturen?action=create')
    }
  }

  const handleViewTax = () => {
    // Calculate previous quarter based on current date
    const now = new Date()
    const currentMonth = now.getMonth() // 0-11
    const currentYear = now.getFullYear()

    // Determine current quarter: Q1 (0-2), Q2 (3-5), Q3 (6-8), Q4 (9-11)
    const currentQuarter = Math.floor(currentMonth / 3) + 1

    // Calculate previous quarter
    let previousQuarter = currentQuarter - 1
    let previousYear = currentYear

    if (previousQuarter === 0) {
      // If current is Q1, previous is Q4 of last year
      previousQuarter = 4
      previousYear = currentYear - 1
    }

    router.push(`/dashboard/financieel-v2/belasting?year=${previousYear}&quarter=${previousQuarter}`)
  }

  // Initialize Lucide icons and setup scroll effects
  useEffect(() => {
    const initializeLucide = () => {
      if (typeof window !== 'undefined' && (window as any).lucide) {
        (window as any).lucide.createIcons()
      } else {
        // Retry after a short delay if lucide isn't loaded yet
        setTimeout(initializeLucide, 100)
      }
    }

    // Tooltip functionality (desktop only)
    const createTooltip = () => {
      let tooltip = document.getElementById('global-tooltip')
      if (!tooltip) {
        tooltip = document.createElement('div')
        tooltip.id = 'global-tooltip'
        tooltip.className = 'tooltip'
        tooltip.innerHTML = '<div class="tooltip__content"></div><div class="tooltip__arrow"></div>'
        document.body.appendChild(tooltip)
      }
      return tooltip
    }

    const showTooltip = (element: Element, text: string) => {
      // Only show tooltips on desktop (>1024px)
      if (window.innerWidth <= 1023) return

      const tooltip = createTooltip()
      const content = tooltip.querySelector('.tooltip__content')

      if (!content) return

      content.textContent = text

      // Position tooltip
      const rect = element.getBoundingClientRect()
      const tooltipRect = tooltip.getBoundingClientRect()

      // Center horizontally above the element
      const left = rect.left + (rect.width / 2) - (tooltipRect.width / 2)
      const top = rect.top - tooltipRect.height - 12 // 12px gap

      tooltip.style.left = `${Math.max(8, left)}px`
      tooltip.style.top = `${Math.max(8, top)}px`

      // Show tooltip with animation
      requestAnimationFrame(() => {
        tooltip.classList.add('is-visible')
      })
    }

    const hideTooltip = () => {
      const tooltip = document.getElementById('global-tooltip')
      if (tooltip) {
        tooltip.classList.remove('is-visible')
      }
    }

    const initTooltips = () => {
      const elementsWithTooltip = document.querySelectorAll('[data-tooltip]')

      elementsWithTooltip.forEach((element) => {
        const tooltipText = element.getAttribute('data-tooltip')

        element.addEventListener('mouseenter', () => {
          if (tooltipText) {
            showTooltip(element, tooltipText)
          }
        })

        element.addEventListener('mouseleave', hideTooltip)

        // Hide tooltip on scroll
        element.addEventListener('click', hideTooltip)
      })

      // Hide tooltip on window scroll
      window.addEventListener('scroll', hideTooltip, { passive: true })
    }

    // Topbar scroll effect
    const topbar = document.querySelector('.topbar')
    const mainPanel = document.querySelector('.main-panel')

    const handleScroll = () => {
      const scrollTop = mainPanel?.scrollTop || window.pageYOffset || document.documentElement.scrollTop

      if (scrollTop > 0) {
        topbar?.classList.add('is-scrolled')
      } else {
        topbar?.classList.remove('is-scrolled')
      }
    }

    if (topbar) {
      // Listen to scroll on main panel, window, and document
      mainPanel?.addEventListener('scroll', handleScroll, { passive: true })
      window.addEventListener('scroll', handleScroll, { passive: true })
      document.addEventListener('scroll', handleScroll, { passive: true })

      // Check initial scroll position
      handleScroll()
    }

    // Initialize immediately and with delays to catch all icons
    initializeLucide()
    initTooltips()

    // Re-initialize after a delay to catch dynamically loaded content
    const timer1 = setTimeout(() => {
      initializeLucide()
    }, 100)

    const timer2 = setTimeout(() => {
      initializeLucide()
    }, 300)

    const timer3 = setTimeout(() => {
      initializeLucide()
    }, 500)

    // Cleanup function
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)

      if (topbar) {
        mainPanel?.removeEventListener('scroll', handleScroll)
        window.removeEventListener('scroll', handleScroll)
        document.removeEventListener('scroll', handleScroll)
      }

      // Clean up tooltip
      const tooltip = document.getElementById('global-tooltip')
      if (tooltip) {
        tooltip.remove()
      }
    }
  }, [])

  // Reinitialize tooltips and icons when pathname changes (for newly added elements)
  useEffect(() => {
    // Immediate initialization
    if (typeof window !== 'undefined' && (window as any).lucide) {
      (window as any).lucide.createIcons()
    }

    const timer = setTimeout(() => {
      // Reinitialize Lucide icons for new page content
      if (typeof window !== 'undefined' && (window as any).lucide) {
        (window as any).lucide.createIcons()
      }

      // Reinitialize tooltips for new page content
      const hideTooltip = () => {
        const tooltip = document.getElementById('global-tooltip')
        if (tooltip) {
          tooltip.classList.remove('is-visible')
        }
      }

      const showTooltip = (element: Element, text: string) => {
        if (window.innerWidth <= 1023) return

        let tooltip = document.getElementById('global-tooltip')
        if (!tooltip) {
          tooltip = document.createElement('div')
          tooltip.id = 'global-tooltip'
          tooltip.className = 'tooltip'
          tooltip.innerHTML = '<div class="tooltip__content"></div><div class="tooltip__arrow"></div>'
          document.body.appendChild(tooltip)
        }

        const content = tooltip.querySelector('.tooltip__content')
        if (!content) return

        content.textContent = text

        const rect = element.getBoundingClientRect()
        const tooltipRect = tooltip.getBoundingClientRect()

        const left = rect.left + (rect.width / 2) - (tooltipRect.width / 2)
        const top = rect.top - tooltipRect.height - 12

        tooltip.style.left = `${Math.max(8, left)}px`
        tooltip.style.top = `${Math.max(8, top)}px`

        requestAnimationFrame(() => {
          tooltip.classList.add('is-visible')
        })
      }

      const elementsWithTooltip = document.querySelectorAll('[data-tooltip]')
      elementsWithTooltip.forEach((element) => {
        const tooltipText = element.getAttribute('data-tooltip')

        // Don't reinitialize tooltips on elements that already have them
        // to preserve their click handlers
        if ((element as any)._tooltipInitialized) {
          return
        }

        (element as any)._tooltipInitialized = true

        element.addEventListener('mouseenter', () => {
          if (tooltipText) {
            showTooltip(element, tooltipText)
          }
        })

        element.addEventListener('mouseleave', hideTooltip)
        element.addEventListener('click', hideTooltip)
      })
    }, 100)

    return () => clearTimeout(timer)
  }, [pathname])

  // Navigation items configuration
  const navItems = [
    { href: '/dashboard/financieel-v2', icon: 'home', label: 'Cockpit', tooltip: 'Cockpit' },
    { href: '/dashboard/financieel-v2/tijd', icon: 'clock', label: 'Time', tooltip: 'Time Tracking' },
    { href: '/dashboard/financieel-v2/uitgaven', icon: 'receipt', label: 'Expenses', tooltip: 'Expenses' },
    { href: '/dashboard/financieel-v2/facturen', icon: 'file-text', label: 'Invoices', tooltip: 'Invoices' },
    { href: '/dashboard/financieel-v2/klanten', icon: 'users', label: 'Clients', tooltip: 'Clients' },
    { href: '/dashboard/financieel-v2/belasting', icon: 'calculator', label: 'Tax', tooltip: 'Tax' },
  ]

  // Get page title based on pathname
  const getPageTitle = () => {
    const item = navItems.find(item => item.href === pathname)
    return item ? item.label : 'Cockpit'
  }

  return (
    <div
      className="novawave-template"
      style={{ fontFamily: 'Outfit, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <div className="backdrop-aura" aria-hidden="true" />
      {/* Mobile Overlay */}
      <div className="mobile-overlay" aria-hidden="true" />
      {/* Pull to Refresh Indicator */}
      <div className="pull-to-refresh" aria-live="polite">
        <i data-lucide="arrow-down" /> Pull to refresh
      </div>
      <div className="dashboard-shell">
        <aside className="sidebar" role="navigation" aria-label="Primary navigation">
          <div className="sidebar__logo" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor: '#60a5fa', stopOpacity: 1}} />
                  <stop offset="50%" style={{stopColor: '#3b82f6', stopOpacity: 1}} />
                  <stop offset="100%" style={{stopColor: '#6366f1', stopOpacity: 1}} />
                </linearGradient>
                <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor: '#22d3ee', stopOpacity: 1}} />
                  <stop offset="100%" style={{stopColor: '#06b6d4', stopOpacity: 1}} />
                </linearGradient>
              </defs>
              {/* Laptop/Monitor base */}
              <rect x={8} y={16} width={32} height={20} rx={2} stroke="url(#logoGradient)" strokeWidth="2.5" fill="none" />
              {/* Screen content - code brackets */}
              <path d="M 16 22 L 14 26 L 16 30" stroke="url(#accentGradient)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M 32 22 L 34 26 L 32 30" stroke="url(#accentGradient)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              {/* Center dot/cursor */}
              <circle cx={24} cy={26} r="1.5" fill="url(#accentGradient)" />
              {/* Laptop base/stand */}
              <path d="M 6 36 L 12 36 L 12 38 L 36 38 L 36 36 L 42 36" stroke="url(#logoGradient)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              {/* Network nodes/connection dots */}
              <circle cx={12} cy={10} r={2} fill="url(#accentGradient)" opacity="0.8" />
              <circle cx={24} cy={8} r={2} fill="url(#logoGradient)" opacity="0.8" />
              <circle cx={36} cy={10} r={2} fill="url(#accentGradient)" opacity="0.8" />
              {/* Connection lines */}
              <path d="M 13 11 L 22 9" stroke="url(#logoGradient)" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
              <path d="M 26 9 L 35 11" stroke="url(#logoGradient)" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
            </svg>
          </div>
          <nav className="sidebar__nav">
            {navItems.map((item) => (
              <button
                key={item.href}
                type="button"
                className={pathname === item.href ? 'is-active' : ''}
                onClick={() => router.push(item.href)}
                data-nav={item.label}
                data-tooltip={item.tooltip}
                aria-current={pathname === item.href ? 'page' : undefined}
                aria-label={item.tooltip}
              >
                <i data-lucide={item.icon} />
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
          {/* Settings button at bottom */}
          <button
            type="button"
            className={pathname === '/dashboard/settings' ? 'sidebar__settings is-active' : 'sidebar__settings'}
            onClick={() => router.push('/dashboard/settings')}
            data-tooltip="Settings"
            aria-label="Settings"
            style={{ marginTop: 'auto' }}
          >
            <i data-lucide="settings" />
            <span className="nav-label">Settings</span>
          </button>
        </aside>
        <main className="main-panel" role="main">
          <header className="topbar">
            <div className="topbar__left">
              <button type="button" className="hamburger-menu" aria-label="Toggle navigation menu" aria-expanded="false">
                <span />
                <span />
                <span />
              </button>
              <h1>{getPageTitle()}</h1>
            </div>
            <div className="topbar__center">
              <button
                type="button"
                className="quick-action-btn timer-btn"
                aria-label="Start timer"
                onClick={handleStartTimer}
              >
                <i data-lucide="clock" />
                <span>Timer</span>
              </button>
              <button
                type="button"
                className="quick-action-btn expense-btn"
                aria-label="Log expense"
                onClick={handleLogExpense}
              >
                <i data-lucide="receipt" />
                <span>Expense</span>
              </button>
              <button
                type="button"
                className="quick-action-btn invoice-btn"
                aria-label="Create invoice"
                onClick={handleCreateInvoice}
              >
                <i data-lucide="file-text" />
                <span>Invoice</span>
                {unbilledAmount > 0 && (
                  <span className="action-badge">€{(unbilledAmount / 1000).toFixed(1)}K</span>
                )}
              </button>
              <button
                type="button"
                className="quick-action-btn tax-btn"
                aria-label="Tax reporting Q4 - 75% complete"
                onClick={handleViewTax}
              >
                <i data-lucide="calendar-check" />
                <span>Tax</span>
                <div className="tax-indicator">
                  <span className="tax-quarter">Q4</span>
                  <div className="tax-gauge">
                    <div className="tax-gauge-fill" style={{width: '75%'}} />
                  </div>
                </div>
              </button>
            </div>
            <div className="topbar__right">
              <button type="button" className="icon-button" data-tooltip="Messages" aria-label="Messages">
                <i data-lucide="mail" />
              </button>
              <button type="button" className="icon-button notification-button" data-tooltip="Notifications" aria-label="Notifications">
                <i data-lucide="bell" />
                <span className="notification-badge" />
              </button>
              <div className="avatar" role="button" tabIndex={0} aria-label="Account menu">
                <img src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=facearea&w=100&q=80" alt="Jack Dawson" />
                <div className="topbar__meta">
                  <strong>Jack Dawson</strong>
                  <span>@jack_dawson</span>
                </div>
                <i data-lucide="chevron-down" />
              </div>
            </div>
          </header>
          {/* Page content */}
          {children}
        </main>
      </div>
      <div className="toast" data-toast hidden aria-live="polite" aria-atomic="true">
        <span className="toast__status" aria-hidden="true" />
        <span data-toast-message>Interaction saved</span>
      </div>
    </div>
  )
}
