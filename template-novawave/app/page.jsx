export default function Page() {
  return (
    <div>
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
            <button type="button" className="is-active" data-nav="Home" data-tooltip="Home" aria-current="page" aria-label="Dashboard home">
              <i data-lucide="home" />
              <span className="nav-label">Home</span>
            </button>
            <button type="button" data-nav="Blocks" data-tooltip="Blocks" aria-label="Blocks">
              <i data-lucide="layout-dashboard" />
              <span className="nav-label">Blocks</span>
            </button>
            <button type="button" data-nav="Cards" data-tooltip="Cards" aria-label="Cards">
              <i data-lucide="credit-card" />
              <span className="nav-label">Cards</span>
            </button>
            <button type="button" data-nav="Contacts" data-tooltip="Contacts" aria-label="Contacts">
              <i data-lucide="users" />
              <span className="nav-label">Contacts</span>
            </button>
            <button type="button" data-nav="Settings" data-tooltip="Settings" aria-label="Settings">
              <i data-lucide="settings" />
              <span className="nav-label">Settings</span>
            </button>
          </nav>
        </aside>
        <main className="main-panel" role="main">
          <header className="topbar">
            <div className="topbar__left">
              <button type="button" className="hamburger-menu" aria-label="Toggle navigation menu" aria-expanded="false">
                <span />
                <span />
                <span />
              </button>
              <h1>Dashboard</h1>
            </div>
            <div className="topbar__center">
              <button type="button" className="quick-action-btn timer-btn" aria-label="Start timer">
                <i data-lucide="clock" />
                <span>Timer</span>
              </button>
              <button type="button" className="quick-action-btn expense-btn" aria-label="Log expense">
                <i data-lucide="receipt" />
                <span>Expense</span>
              </button>
              <button type="button" className="quick-action-btn invoice-btn" aria-label="Create invoice">
                <i data-lucide="file-text" />
                <span>Invoice</span>
                <span className="action-badge">€4.5K</span>
              </button>
              <button type="button" className="quick-action-btn tax-btn" aria-label="Tax reporting Q4 - 75% complete">
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
          <section className="main-grid" aria-label="Dashboard content">
            {/* Left column: My cards */}
            <article className="glass-card" style={{gridColumn: 'span 6', gridRow: 'span 1'}} aria-labelledby="cards-title">
              <div className="card-header">
                <h2 className="card-header__title" id="cards-title">My cards</h2>
                <div style={{display: 'flex', gap: 8}}>
                  <button type="button" id="toggleCardsBtn" className="action-chip secondary" style={{padding: '6px 12px', fontSize: '0.8rem'}} data-card-count={6}>
                    Show 4
                  </button>
                  <button type="button" className="action-chip secondary" style={{padding: '6px 12px', fontSize: '0.8rem'}}>+ Add new</button>
                </div>
              </div>
              <div className="card-grid">
                <div className="credit-card" style={{gridColumn: 'span 6', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.95), rgba(59, 130, 246, 0.95))'}}>
                  <span className="credit-card__status">Active</span>
                  <div className="credit-card__sum">$12,850.00</div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8}}>
                    <div className="credit-card__chip" aria-hidden="true" />
                    <div style={{display: 'flex', gap: 6}}>
                      <div className="promo-card__badge" style={{width: 20, height: 20, background: '#facc15'}} />
                      <div className="promo-card__badge" style={{width: 20, height: 20, background: '#ef4444'}} />
                    </div>
                  </div>
                </div>
                <div className="credit-card" style={{gridColumn: 'span 6', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.95), rgba(124, 58, 237, 0.95))'}}>
                  <span className="credit-card__status">Active</span>
                  <div className="credit-card__sum">$8,420.50</div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8}}>
                    <div className="credit-card__chip" aria-hidden="true" />
                    <div style={{display: 'flex', gap: 6}}>
                      <div className="promo-card__badge" style={{width: 20, height: 20, background: '#3b82f6'}} />
                      <div className="promo-card__badge" style={{width: 20, height: 20, background: '#8b5cf6'}} />
                    </div>
                  </div>
                </div>
                <div className="credit-card" style={{gridColumn: 'span 6', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))'}}>
                  <span className="credit-card__status">Active</span>
                  <div className="credit-card__sum">$5,230.75</div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8}}>
                    <div className="credit-card__chip" aria-hidden="true" />
                    <div style={{display: 'flex', gap: 6}}>
                      <div className="promo-card__badge" style={{width: 20, height: 20, background: '#10b981'}} />
                      <div className="promo-card__badge" style={{width: 20, height: 20, background: '#059669'}} />
                    </div>
                  </div>
                </div>
                <div className="credit-card" style={{gridColumn: 'span 6', background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.95), rgba(219, 39, 119, 0.95))'}}>
                  <span className="credit-card__status">Active</span>
                  <div className="credit-card__sum">$3,890.00</div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8}}>
                    <div className="credit-card__chip" aria-hidden="true" />
                    <div style={{display: 'flex', gap: 6}}>
                      <div className="promo-card__badge" style={{width: 20, height: 20, background: '#ec4899'}} />
                      <div className="promo-card__badge" style={{width: 20, height: 20, background: '#db2777'}} />
                    </div>
                  </div>
                </div>
                <div className="credit-card card-extra" style={{gridColumn: 'span 6', background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.95), rgba(249, 115, 22, 0.95))'}}>
                  <span className="credit-card__status">Active</span>
                  <div className="credit-card__sum">$2,150.25</div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8}}>
                    <div className="credit-card__chip" aria-hidden="true" />
                    <div style={{display: 'flex', gap: 6}}>
                      <div className="promo-card__badge" style={{width: 20, height: 20, background: '#fb923c'}} />
                      <div className="promo-card__badge" style={{width: 20, height: 20, background: '#f97316'}} />
                    </div>
                  </div>
                </div>
                <div className="credit-card card-extra" style={{gridColumn: 'span 6', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.95), rgba(8, 145, 178, 0.95))'}}>
                  <span className="credit-card__status">Active</span>
                  <div className="credit-card__sum">$1,750.00</div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8}}>
                    <div className="credit-card__chip" aria-hidden="true" />
                    <div style={{display: 'flex', gap: 6}}>
                      <div className="promo-card__badge" style={{width: 20, height: 20, background: '#06b6d4'}} />
                      <div className="promo-card__badge" style={{width: 20, height: 20, background: '#0891b2'}} />
                    </div>
                  </div>
                </div>
              </div>
            </article>
            {/* Right column: Total balance */}
            <article className="glass-card" style={{gridColumn: 'span 6', gridRow: 'span 1'}} aria-labelledby="total-balance-title">
              <div className="card-header">
                <h2 className="card-header__title" id="total-balance-title">Total balance</h2>
                <div className="time-toggle" role="tablist" aria-label="Balance timeframe">
                  <button type="button" className="is-active" data-timeframe="1y" role="tab" aria-selected="true">1 year</button>
                  <button type="button" data-timeframe="6m" role="tab" aria-selected="false">6 month</button>
                  <button type="button" data-timeframe="3m" role="tab" aria-selected="false">3 month</button>
                  <button type="button" data-timeframe="1m" role="tab" aria-selected="false">1 month</button>
                </div>
              </div>
              <div className="balance-chart" aria-hidden="false">
                <canvas id="balanceChart" height={280} role="img" aria-label="Balance chart" />
              </div>
              <div className="metric" role="presentation">
                <span>6 month average</span>
                <strong>$8,000.00</strong>
              </div>
              <div className="chart-legends" role="presentation">
                <span><span className="legend-bullet" style={{background: 'rgba(148, 163, 184, 0.4)'}} />Available money</span>
                <span><span className="legend-bullet" style={{background: 'var(--color-success)'}} />Actual balance</span>
              </div>
            </article>
            {/* Recent transactions */}
            <article className="glass-card" style={{gridColumn: 'span 5', gridRow: 'span 1'}} aria-labelledby="transactions-title">
              <div className="card-header">
                <h2 className="card-header__title" id="transactions-title">Recent transaction</h2>
                <div style={{display: 'flex', gap: 8}}>
                  <button type="button" className="action-chip secondary" style={{padding: '6px 12px', fontSize: '0.8rem'}}>Sort ↑↓</button>
                  <button type="button" className="action-chip secondary" style={{padding: '6px 12px', fontSize: '0.8rem'}}>Month ▾</button>
                </div>
              </div>
              <div className="table-wrapper">
                {/* Desktop Table View */}
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Transaction</th>
                      <th scope="col">Status</th>
                      <th scope="col">Type</th>
                      <th scope="col" style={{textAlign: 'right'}}>Sum</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div className="transaction">
                          <div className="transaction__icon" aria-hidden="true">🎧</div>
                          <div>
                            <strong>Spotify</strong>
                            <span style={{display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)'}}>17 Jan 2025, 02:00 PM</span>
                          </div>
                        </div>
                      </td>
                      <td><span className="status-pill is-success">Completed</span></td>
                      <td style={{color: 'var(--color-text-muted)'}}>Subscription</td>
                      <td style={{textAlign: 'right', fontWeight: 600}}>$9.99</td>
                    </tr>
                    <tr>
                      <td>
                        <div className="transaction">
                          <div className="transaction__icon" aria-hidden="true">🛒</div>
                          <div>
                            <strong>App Store</strong>
                            <span style={{display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)'}}>16 Jan 2025, 10:06 AM</span>
                          </div>
                        </div>
                      </td>
                      <td><span className="status-pill is-danger">Canceled</span></td>
                      <td style={{color: 'var(--color-text-muted)'}}>Subscription</td>
                      <td style={{textAlign: 'right', fontWeight: 600}}>$4.99</td>
                    </tr>
                    <tr>
                      <td>
                        <div className="transaction">
                          <div className="transaction__icon" aria-hidden="true">🥬</div>
                          <div>
                            <strong>GreenGrocers</strong>
                            <span style={{display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)'}}>16 Jan 2025, 02:00 PM</span>
                          </div>
                        </div>
                      </td>
                      <td><span className="status-pill is-success">Completed</span></td>
                      <td style={{color: 'var(--color-text-muted)'}}>Groceries</td>
                      <td style={{textAlign: 'right', fontWeight: 600}}>$4.99</td>
                    </tr>
                  </tbody>
                </table>
                {/* Mobile Card View */}
                <div className="mobile-transaction-list">
                  <div className="mobile-transaction-card">
                    <div className="transaction">
                      <div className="transaction__icon" aria-hidden="true">🎧</div>
                      <div style={{flex: 1}}>
                        <strong style={{display: 'block', marginBottom: 4}}>Spotify</strong>
                        <span style={{display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 6}}>17 Jan 2025, 02:00 PM</span>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8}}>
                          <span style={{color: 'var(--color-text-muted)', fontSize: '0.85rem'}}>Subscription</span>
                          <span className="status-pill is-success">Completed</span>
                        </div>
                      </div>
                    </div>
                    <div style={{fontWeight: 600, fontSize: '1.1rem', whiteSpace: 'nowrap'}}>$9.99</div>
                  </div>
                  <div className="mobile-transaction-card">
                    <div className="transaction">
                      <div className="transaction__icon" aria-hidden="true">🛒</div>
                      <div style={{flex: 1}}>
                        <strong style={{display: 'block', marginBottom: 4}}>App Store</strong>
                        <span style={{display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 6}}>16 Jan 2025, 10:06 AM</span>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8}}>
                          <span style={{color: 'var(--color-text-muted)', fontSize: '0.85rem'}}>Subscription</span>
                          <span className="status-pill is-danger">Canceled</span>
                        </div>
                      </div>
                    </div>
                    <div style={{fontWeight: 600, fontSize: '1.1rem', whiteSpace: 'nowrap'}}>$4.99</div>
                  </div>
                  <div className="mobile-transaction-card">
                    <div className="transaction">
                      <div className="transaction__icon" aria-hidden="true">🥬</div>
                      <div style={{flex: 1}}>
                        <strong style={{display: 'block', marginBottom: 4}}>GreenGrocers</strong>
                        <span style={{display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 6}}>16 Jan 2025, 02:00 PM</span>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8}}>
                          <span style={{color: 'var(--color-text-muted)', fontSize: '0.85rem'}}>Groceries</span>
                          <span className="status-pill is-success">Completed</span>
                        </div>
                      </div>
                    </div>
                    <div style={{fontWeight: 600, fontSize: '1.1rem', whiteSpace: 'nowrap'}}>$4.99</div>
                  </div>
                </div>
              </div>
            </article>
            {/* Categories */}
            <article className="glass-card" style={{gridColumn: 'span 5', gridRow: 'span 1'}} aria-labelledby="categories-title">
              <div className="card-header">
                <h2 className="card-header__title" id="categories-title">Categories</h2>
                <button type="button" className="action-chip secondary" style={{padding: '6px 12px', fontSize: '0.8rem'}}>See all</button>
              </div>
              <p style={{margin: 0, color: 'var(--color-text-muted)'}}>Spent 8,450.00 USD</p>
              <div className="progress-bar">
                <div className="progress-bar__fill" />
              </div>
              <div className="category-list">
                <div className="category-item">
                  <div className="category-item__label">
                    <span className="category-item__dot" style={{background: 'var(--color-accent-blue)'}} />
                    <span>Utility payments</span>
                  </div>
                  <span>1200.00 USD →</span>
                </div>
                <div className="category-item">
                  <div className="category-item__label">
                    <span className="category-item__dot" style={{background: 'var(--color-success)'}} />
                    <span>Groceries</span>
                  </div>
                  <span>845.00 USD →</span>
                </div>
                <div className="category-item">
                  <div className="category-item__label">
                    <span className="category-item__dot" style={{background: 'var(--color-warning)'}} />
                    <span>Beauty and health</span>
                  </div>
                  <span>400.00 USD →</span>
                </div>
              </div>
            </article>
            {/* Revolutionize Your Banking with AI */}
            <article className="glass-card" style={{gridColumn: 'span 2', gridRow: 'span 1'}} aria-labelledby="promo-title">
              <div className="promo-card">
                <div className="promo-card__badge float-soft" aria-hidden="true" />
                <div>
                  <h2 className="promo-card__title" id="promo-title">Revolutionize Your Banking with AI</h2>
                  <p className="promo-card__body">Leverage the power of AI to manage your finances more efficiently.</p>
                </div>
                <button type="button" className="action-chip" data-action="customize" style={{alignSelf: 'center'}}>Customize dashboard</button>
              </div>
            </article>
          </section>
        </main>
      </div>
      <div className="toast" data-toast hidden aria-live="polite" aria-atomic="true">
        <span className="toast__status" aria-hidden="true" />
        <span data-toast-message>Interaction saved</span>
      </div>
    </div>
    
  );
}
