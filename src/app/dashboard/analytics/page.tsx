'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MetricsOverview } from '@/components/analytics/metrics-overview'
import { AnalyticsLineChart } from '@/components/analytics/charts/line-chart'
import { AnalyticsBarChart } from '@/components/analytics/charts/bar-chart'
import { AnalyticsPieChart, AnalyticsDonutChart } from '@/components/analytics/charts/pie-chart'
import { AnalyticsFilters, DateRangePicker } from '@/components/analytics/date-range-picker'
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Activity, 
  Calendar,
  Download,
  Filter,
  RefreshCw,
  X
} from 'lucide-react'

// Sample analytics data
const analyticsMetrics = [
  {
    id: 'total-users',
    title: 'Total Users',
    value: 12345,
    change: { value: '+12.5%', type: 'positive' as const, period: 'vs last month' },
    icon: <Users className="h-5 w-5" />,
    color: 'blue' as const,
    description: 'Active users in the last 30 days'
  },
  {
    id: 'revenue',
    title: 'Monthly Revenue',
    value: '$87,430',
    change: { value: '+18.2%', type: 'positive' as const, period: 'vs last month' },
    icon: <DollarSign className="h-5 w-5" />,
    color: 'green' as const,
    description: 'Recurring revenue this month'
  },
  {
    id: 'conversion',
    title: 'Conversion Rate',
    value: '3.24%',
    change: { value: '-0.4%', type: 'negative' as const, period: 'vs last month' },
    icon: <TrendingUp className="h-5 w-5" />,
    color: 'yellow' as const,
    description: 'Visitors to customers'
  },
  {
    id: 'engagement',
    title: 'Avg. Session Time',
    value: '4m 32s',
    change: { value: '+8.1%', type: 'positive' as const, period: 'vs last month' },
    icon: <Activity className="h-5 w-5" />,
    color: 'purple' as const,
    description: 'Average time spent per session'
  }
]

const userGrowthData = [
  { name: 'Jan', users: 1200, newUsers: 180, churnedUsers: 45 },
  { name: 'Feb', users: 1350, newUsers: 220, churnedUsers: 70 },
  { name: 'Mar', users: 1480, newUsers: 195, churnedUsers: 65 },
  { name: 'Apr', users: 1620, newUsers: 240, churnedUsers: 100 },
  { name: 'May', users: 1800, newUsers: 280, churnedUsers: 100 },
  { name: 'Jun', users: 1950, newUsers: 250, churnedUsers: 100 },
  { name: 'Jul', users: 2100, newUsers: 300, churnedUsers: 150 }
]

const revenueData = [
  { name: 'Jan', revenue: 45000, target: 50000, expenses: 35000 },
  { name: 'Feb', revenue: 52000, target: 55000, expenses: 38000 },
  { name: 'Mar', revenue: 48000, target: 50000, expenses: 36000 },
  { name: 'Apr', revenue: 61000, target: 60000, expenses: 42000 },
  { name: 'May', revenue: 69000, target: 65000, expenses: 45000 },
  { name: 'Jun', revenue: 75000, target: 70000, expenses: 48000 },
  { name: 'Jul', revenue: 87000, target: 80000, expenses: 52000 }
]

const trafficSourcesData = [
  { name: 'Organic Search', value: 4200, color: '#3b82f6' },
  { name: 'Social Media', value: 2100, color: '#10b981' },
  { name: 'Direct Traffic', value: 1800, color: '#f59e0b' },
  { name: 'Email Campaign', value: 1200, color: '#8b5cf6' },
  { name: 'Referrals', value: 800, color: '#ef4444' },
  { name: 'Paid Ads', value: 600, color: '#6b7280' }
]

const deviceTypeData = [
  { name: 'Desktop', value: 6500, color: '#3b82f6' },
  { name: 'Mobile', value: 3800, color: '#10b981' },
  { name: 'Tablet', value: 1200, color: '#f59e0b' }
]

export default function AnalyticsPage() {
  // State for filters
  const [showFilters, setShowFilters] = React.useState(false)
  const [dateRange, setDateRange] = React.useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
    label: 'Last 30 days'
  })
  
  const [filters, setFilters] = React.useState([
    {
      id: 'source',
      label: 'Traffic Source',
      value: 'all',
      options: [
        { value: 'all', label: 'All Sources' },
        { value: 'organic', label: 'Organic Search' },
        { value: 'social', label: 'Social Media' },
        { value: 'direct', label: 'Direct Traffic' },
        { value: 'email', label: 'Email Campaign' },
        { value: 'referral', label: 'Referrals' },
        { value: 'paid', label: 'Paid Ads' }
      ]
    },
    {
      id: 'device',
      label: 'Device Type',
      value: 'all',
      options: [
        { value: 'all', label: 'All Devices' },
        { value: 'desktop', label: 'Desktop' },
        { value: 'mobile', label: 'Mobile' },
        { value: 'tablet', label: 'Tablet' }
      ]
    },
    {
      id: 'location',
      label: 'Location',
      value: 'all',
      options: [
        { value: 'all', label: 'All Locations' },
        { value: 'us', label: 'United States' },
        { value: 'uk', label: 'United Kingdom' },
        { value: 'ca', label: 'Canada' },
        { value: 'au', label: 'Australia' },
        { value: 'de', label: 'Germany' }
      ]
    }
  ])

  const handleFilterChange = (filterId: string, value: string) => {
    setFilters(prev => prev.map(filter => 
      filter.id === filterId ? { ...filter, value } : filter
    ))
  }

  const handleDateRangeChange = (range: typeof dateRange) => {
    setDateRange(range)
  }

  const handleResetFilters = () => {
    setFilters(prev => prev.map(filter => ({ ...filter, value: 'all' })))
    setDateRange({
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date(),
      label: 'Last 30 days'
    })
  }

  const hasActiveFilters = filters.some(filter => filter.value !== 'all') || 
                          dateRange.label !== 'Last 30 days'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
            <p className="text-slate-600 mt-1">
              Comprehensive insights into your business performance
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant={showFilters ? "default" : "outline"} 
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                  !
                </Badge>
              )}
            </Button>
            <div className="w-40">
              <DateRangePicker
                selectedRange={dateRange}
                onRangeChange={handleDateRangeChange}
              />
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex gap-8">
          
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="w-80 flex-shrink-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Filters</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFilters(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <AnalyticsFilters
                    filters={filters}
                    dateRange={dateRange}
                    onFilterChange={handleFilterChange}
                    onDateRangeChange={handleDateRangeChange}
                    onReset={handleResetFilters}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 space-y-8">
          
          {/* Key Metrics Overview */}
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Key Metrics</h2>
            <MetricsOverview metrics={analyticsMetrics} />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            
            {/* User Growth Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    User Growth
                  </CardTitle>
                  <Badge variant="secondary">Last 7 months</Badge>
                </div>
                <p className="text-sm text-slate-600">
                  Track user acquisition and churn over time
                </p>
              </CardHeader>
              <CardContent>
                <AnalyticsLineChart
                  data={userGrowthData}
                  lines={[
                    { key: 'users', name: 'Total Users', color: '#3b82f6' },
                    { key: 'newUsers', name: 'New Users', color: '#10b981' },
                    { key: 'churnedUsers', name: 'Churned Users', color: '#ef4444', strokeDasharray: '5 5' }
                  ]}
                  height={300}
                />
              </CardContent>
            </Card>

            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <DollarSign className="mr-2 h-5 w-5" />
                    Revenue vs Target
                  </CardTitle>
                  <Badge variant="secondary">Last 7 months</Badge>
                </div>
                <p className="text-sm text-slate-600">
                  Monthly revenue performance against targets
                </p>
              </CardHeader>
              <CardContent>
                <AnalyticsBarChart
                  data={revenueData}
                  bars={[
                    { key: 'revenue', name: 'Actual Revenue', color: '#10b981' },
                    { key: 'target', name: 'Target', color: '#3b82f6' },
                    { key: 'expenses', name: 'Expenses', color: '#ef4444' }
                  ]}
                  height={300}
                />
              </CardContent>
            </Card>

            {/* Traffic Sources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Traffic Sources
                </CardTitle>
                <p className="text-sm text-slate-600">
                  Where your visitors are coming from
                </p>
              </CardHeader>
              <CardContent>
                <AnalyticsPieChart
                  data={trafficSourcesData}
                  height={300}
                  outerRadius={100}
                />
              </CardContent>
            </Card>

            {/* Device Types */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2 h-5 w-5" />
                  Device Types
                </CardTitle>
                <p className="text-sm text-slate-600">
                  User sessions by device type
                </p>
              </CardHeader>
              <CardContent>
                <AnalyticsDonutChart
                  data={deviceTypeData}
                  height={300}
                  outerRadius={100}
                />
              </CardContent>
            </Card>

          </div>

          {/* Additional Insights */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Performing Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { page: '/dashboard', views: 12543, change: '+12%' },
                    { page: '/pricing', views: 8721, change: '+8%' },
                    { page: '/features', views: 6432, change: '+15%' },
                    { page: '/analytics', views: 4521, change: '+22%' },
                    { page: '/settings', views: 3210, change: '+5%' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium text-sm">{item.page}</p>
                        <p className="text-xs text-slate-500">{item.views.toLocaleString()} views</p>
                      </div>
                      <Badge variant="secondary" className="text-green-600">
                        {item.change}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { action: 'New user registration', time: '2 minutes ago', type: 'success' },
                    { action: 'Payment processed', time: '5 minutes ago', type: 'success' },
                    { action: 'Failed login attempt', time: '8 minutes ago', type: 'warning' },
                    { action: 'User upgraded plan', time: '12 minutes ago', type: 'success' },
                    { action: 'Password reset request', time: '15 minutes ago', type: 'info' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        item.type === 'success' ? 'bg-green-500' :
                        item.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.action}</p>
                        <p className="text-xs text-slate-500">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Bounce Rate</span>
                    <span className="font-semibold">42.3%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Page Load Time</span>
                    <span className="font-semibold">1.2s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Server Uptime</span>
                    <span className="font-semibold">99.9%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">API Response</span>
                    <span className="font-semibold">145ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Error Rate</span>
                    <span className="font-semibold">0.02%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          </div>
        </div>
      </div>
    </div>
  )
}