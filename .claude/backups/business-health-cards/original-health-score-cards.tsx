// BACKUP: Original Business Health Score Cards from unified-financial-dashboard.tsx
// Date: Current state before making vertically compact
// Location: Business Health Score section - collapsible content cards

{/* Enhanced Health Metrics - More Engaging & Gamified */}
<div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-3">
  {/* Revenue Score Card */}
  <button
    onClick={() => setShowExplanation('revenue')}
    className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 p-4 transition-all duration-300 hover:from-primary/10 hover:to-primary/20 hover:scale-105 hover:shadow-lg border border-primary/20 hover:border-primary/40"
  >
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
          <DollarSign className="h-5 w-5 text-primary" />
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
          healthScores.revenue >= 20 ? 'bg-green-500/20 text-green-600' :
          healthScores.revenue >= 15 ? 'bg-blue-500/20 text-blue-600' :
          healthScores.revenue >= 10 ? 'bg-orange-500/20 text-orange-600' : 'bg-red-500/20 text-red-600'
        }`}>
          {healthScores.revenue >= 20 ? '🏆' : healthScores.revenue >= 15 ? '⭐' : healthScores.revenue >= 10 ? '📈' : '⚠️'}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-left">Revenue (MTD)</p>
        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold text-primary">{healthScores.revenue}</span>
          <span className="text-sm text-muted-foreground">/25</span>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-primary/20 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${(healthScores.revenue / 25) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-left">
          {healthScores.revenue >= 20 ? 'Crushing it! 🚀' :
           healthScores.revenue >= 15 ? 'Strong performance' :
           healthScores.revenue >= 10 ? 'Room to grow' : 'Needs attention'}
        </p>
      </div>
    </div>
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
  </button>

  {/* Cash Flow Score Card */}
  <button
    onClick={() => setShowExplanation('cashflow')}
    className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/5 to-green-500/10 p-4 transition-all duration-300 hover:from-green-500/10 hover:to-green-500/20 hover:scale-105 hover:shadow-lg border border-green-500/20 hover:border-green-500/40"
  >
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
          <Activity className="h-5 w-5 text-green-500" />
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
          healthScores.cashflow >= 20 ? 'bg-green-500/20 text-green-600' :
          healthScores.cashflow >= 15 ? 'bg-blue-500/20 text-blue-600' :
          healthScores.cashflow >= 10 ? 'bg-orange-500/20 text-orange-600' : 'bg-red-500/20 text-red-600'
        }`}>
          {healthScores.cashflow >= 20 ? '💰' : healthScores.cashflow >= 15 ? '💵' : healthScores.cashflow >= 10 ? '💳' : '🔴'}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-left">Cash Flow</p>
        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold text-green-600">{healthScores.cashflow}</span>
          <span className="text-sm text-muted-foreground">/25</span>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-green-500/20 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${(healthScores.cashflow / 25) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-left">
          {healthScores.cashflow >= 20 ? 'Money flowing! 💸' :
           healthScores.cashflow >= 15 ? 'Healthy collections' :
           healthScores.cashflow >= 10 ? 'Some delays' : 'Collection issues'}
        </p>
      </div>
    </div>
    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
  </button>

  {/* Efficiency Score Card */}
  <button
    onClick={() => setShowExplanation('efficiency')}
    className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/5 to-blue-500/10 p-4 transition-all duration-300 hover:from-blue-500/10 hover:to-blue-500/20 hover:scale-105 hover:shadow-lg border border-blue-500/20 hover:border-blue-500/40"
  >
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
          <Clock className="h-5 w-5 text-blue-500" />
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
          healthScores.efficiency >= 20 ? 'bg-green-500/20 text-green-600' :
          healthScores.efficiency >= 15 ? 'bg-blue-500/20 text-blue-600' :
          healthScores.efficiency >= 10 ? 'bg-orange-500/20 text-orange-600' : 'bg-red-500/20 text-red-600'
        }`}>
          {healthScores.efficiency >= 20 ? '⚡' : healthScores.efficiency >= 15 ? '⏰' : healthScores.efficiency >= 10 ? '📊' : '⏳'}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-left">Efficiency (MTD)</p>
        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold text-blue-600">{healthScores.efficiency}</span>
          <span className="text-sm text-muted-foreground">/25</span>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-blue-500/20 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${(healthScores.efficiency / 25) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-left">
          {healthScores.efficiency >= 20 ? 'Peak productivity! ⚡' :
           healthScores.efficiency >= 15 ? 'Great momentum' :
           healthScores.efficiency >= 10 ? 'Building steam' : 'Ramp up needed'}
        </p>
      </div>
    </div>
    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
  </button>

  {/* Risk Management Score Card */}
  <button
    onClick={() => setShowExplanation('risk')}
    className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/5 to-purple-500/10 p-4 transition-all duration-300 hover:from-purple-500/10 hover:to-purple-500/20 hover:scale-105 hover:shadow-lg border border-purple-500/20 hover:border-purple-500/40"
  >
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
          <Users className="h-5 w-5 text-purple-500" />
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
          healthScores.risk >= 20 ? 'bg-green-500/20 text-green-600' :
          healthScores.risk >= 15 ? 'bg-blue-500/20 text-blue-600' :
          healthScores.risk >= 10 ? 'bg-orange-500/20 text-orange-600' : 'bg-red-500/20 text-red-600'
        }`}>
          {healthScores.risk >= 20 ? '🛡️' : healthScores.risk >= 15 ? '✅' : healthScores.risk >= 10 ? '⚠️' : '🚨'}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-left">Risk Management</p>
        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold text-purple-600">{healthScores.risk}</span>
          <span className="text-sm text-muted-foreground">/25</span>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-purple-500/20 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${(healthScores.risk / 25) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-left">
          {healthScores.risk >= 20 ? 'Well protected! 🛡️' :
           healthScores.risk >= 15 ? 'Manageable risks' :
           healthScores.risk >= 10 ? 'Some concerns' : 'High risk areas'}
        </p>
      </div>
    </div>
    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
  </button>
</div>