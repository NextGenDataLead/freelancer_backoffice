'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  CreditCard, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Euro,
  Calendar,
  Filter,
  Search,
  MoreHorizontal,
  RefreshCw,
  PauseCircle,
  PlayCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  Building
} from 'lucide-react';

interface SubscriptionData {
  id: string;
  tenant_id: string;
  tenant_name: string;
  plan_name: string;
  payment_provider: 'mollie' | 'stripe';
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'suspended';
  current_period_start: string;
  current_period_end: string;
  price: number;
  billing_interval: 'monthly' | 'yearly';
  trial_end?: string;
  canceled_at?: string;
  cancel_at_period_end: boolean;
  usage_percentage: number;
  last_payment_date?: string;
  next_payment_date?: string;
}

const statusConfig = {
  trialing: { color: 'bg-blue-100 text-blue-800', icon: Clock },
  active: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
  past_due: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  canceled: { color: 'bg-gray-100 text-gray-800', icon: XCircle },
  unpaid: { color: 'bg-red-100 text-red-800', icon: XCircle },
  suspended: { color: 'bg-orange-100 text-orange-800', icon: PauseCircle },
};

const providerConfig = {
  mollie: { color: 'bg-purple-100 text-purple-800', label: 'Mollie' },
  stripe: { color: 'bg-indigo-100 text-indigo-800', label: 'Stripe' },
};

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');

  useEffect(() => {
    // TODO: Replace with actual API call
    setTimeout(() => {
      setSubscriptions([
        {
          id: 'sub_001',
          tenant_id: 'tenant_001',
          tenant_name: 'Acme Corp',
          plan_name: 'Professional',
          payment_provider: 'mollie',
          status: 'active',
          current_period_start: '2025-01-01T00:00:00Z',
          current_period_end: '2025-02-01T00:00:00Z',
          price: 79.00,
          billing_interval: 'monthly',
          cancel_at_period_end: false,
          usage_percentage: 68,
          last_payment_date: '2025-01-01T10:30:00Z',
          next_payment_date: '2025-02-01T10:30:00Z'
        },
        {
          id: 'sub_002',
          tenant_id: 'tenant_002',
          tenant_name: 'Tech Startup BV',
          plan_name: 'Starter',
          payment_provider: 'mollie',
          status: 'trialing',
          current_period_start: '2025-01-05T00:00:00Z',
          current_period_end: '2025-02-05T00:00:00Z',
          price: 29.00,
          billing_interval: 'monthly',
          trial_end: '2025-01-19T23:59:59Z',
          cancel_at_period_end: false,
          usage_percentage: 23,
          next_payment_date: '2025-01-19T10:30:00Z'
        },
        {
          id: 'sub_003',
          tenant_id: 'tenant_003',
          tenant_name: 'Enterprise Solutions',
          plan_name: 'Enterprise',
          payment_provider: 'stripe',
          status: 'active',
          current_period_start: '2024-12-15T00:00:00Z',
          current_period_end: '2025-01-15T00:00:00Z',
          price: 199.00,
          billing_interval: 'monthly',
          cancel_at_period_end: false,
          usage_percentage: 89,
          last_payment_date: '2024-12-15T08:45:00Z',
          next_payment_date: '2025-01-15T08:45:00Z'
        },
        {
          id: 'sub_004',
          tenant_id: 'tenant_004',
          tenant_name: 'Design Studio',
          plan_name: 'Professional',
          payment_provider: 'mollie',
          status: 'past_due',
          current_period_start: '2024-12-01T00:00:00Z',
          current_period_end: '2025-01-01T00:00:00Z',
          price: 79.00,
          billing_interval: 'monthly',
          cancel_at_period_end: false,
          usage_percentage: 45,
          last_payment_date: '2024-11-01T12:15:00Z'
        },
        {
          id: 'sub_005',
          tenant_id: 'tenant_005',
          tenant_name: 'Marketing Agency',
          plan_name: 'Starter',
          payment_provider: 'mollie',
          status: 'canceled',
          current_period_start: '2024-11-01T00:00:00Z',
          current_period_end: '2024-12-01T00:00:00Z',
          price: 29.00,
          billing_interval: 'monthly',
          canceled_at: '2024-11-15T14:20:00Z',
          cancel_at_period_end: true,
          usage_percentage: 12,
          last_payment_date: '2024-11-01T09:30:00Z'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.plan_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const matchesProvider = providerFilter === 'all' || sub.payment_provider === providerFilter;
    
    return matchesSearch && matchesStatus && matchesProvider;
  });

  const handleSubscriptionAction = (subscriptionId: string, action: string) => {
    console.log(`${action} subscription:`, subscriptionId);
    // TODO: Implement subscription actions
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getRevenueMetrics = () => {
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
    const monthlyRevenue = activeSubscriptions.reduce((sum, s) => 
      sum + (s.billing_interval === 'monthly' ? s.price : s.price / 12), 0);
    const yearlyRevenue = monthlyRevenue * 12;
    
    return {
      activeCount: activeSubscriptions.length,
      totalSubscriptions: subscriptions.length,
      monthlyRevenue,
      yearlyRevenue,
      churnRate: (subscriptions.filter(s => s.status === 'canceled').length / subscriptions.length) * 100
    };
  };

  const metrics = getRevenueMetrics();

  if (loading) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Subscription Management</h1>
          <p className="text-muted-foreground">Monitor and manage tenant subscriptions across all payment providers</p>
        </div>
        <Button variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Sync Providers
        </Button>
      </div>

      {/* Provider Status Alert */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Multi-Provider Active:</strong> Mollie ({subscriptions.filter(s => s.payment_provider === 'mollie').length} subs) • 
          Stripe ({subscriptions.filter(s => s.payment_provider === 'stripe').length} subs) • 
          Provider abstraction enables seamless management
        </AlertDescription>
      </Alert>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Subscriptions</p>
                <p className="text-2xl font-bold">{metrics.activeCount}</p>
                <p className="text-xs text-green-600">+{((metrics.activeCount / metrics.totalSubscriptions) * 100).toFixed(1)}% active</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.monthlyRevenue)}</p>
                <p className="text-xs text-green-600">{formatCurrency(metrics.yearlyRevenue)} annual</p>
              </div>
              <Euro className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Churn Rate</p>
                <p className="text-2xl font-bold">{metrics.churnRate.toFixed(1)}%</p>
                <p className="text-xs text-yellow-600">Industry avg: 5-10%</p>
              </div>
              <TrendingDown className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Provider Split</p>
                <p className="text-2xl font-bold">{subscriptions.filter(s => s.payment_provider === 'mollie').length}M / {subscriptions.filter(s => s.payment_provider === 'stripe').length}S</p>
                <p className="text-xs text-blue-600">Mollie / Stripe</p>
              </div>
              <Building className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search tenants or plans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trialing">Trialing</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                <SelectItem value="mollie">Mollie</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Subscriptions ({filteredSubscriptions.length})</CardTitle>
          <CardDescription>
            Manage tenant subscriptions across all payment providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredSubscriptions.map((subscription) => {
              const StatusIcon = statusConfig[subscription.status].icon;
              
              return (
                <div
                  key={subscription.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <StatusIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium truncate">
                          {subscription.tenant_name}
                        </h3>
                        <Badge 
                          className={`text-xs ${statusConfig[subscription.status].color}`}
                          variant="secondary"
                        >
                          {subscription.status}
                        </Badge>
                        <Badge 
                          className={`text-xs ${providerConfig[subscription.payment_provider].color}`}
                          variant="secondary"
                        >
                          {providerConfig[subscription.payment_provider].label}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{subscription.plan_name}</span>
                        <span>•</span>
                        <span>{formatCurrency(subscription.price)}/{subscription.billing_interval}</span>
                        <span>•</span>
                        <span className={getUsageColor(subscription.usage_percentage)}>
                          {subscription.usage_percentage}% usage
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right text-sm">
                      <p className="font-medium">
                        {subscription.next_payment_date ? 
                          formatDate(subscription.next_payment_date) : 
                          'No payment'
                        }
                      </p>
                      <p className="text-muted-foreground">
                        Period: {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                      </p>
                    </div>

                    <div className="flex gap-1">
                      {subscription.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSubscriptionAction(subscription.id, 'pause')}
                        >
                          <PauseCircle className="w-4 h-4" />
                        </Button>
                      )}
                      {subscription.status === 'suspended' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSubscriptionAction(subscription.id, 'resume')}
                        >
                          <PlayCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSubscriptionAction(subscription.id, 'edit')}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSubscriptionAction(subscription.id, 'more')}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Provider Performance Comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Mollie Performance</CardTitle>
            <CardDescription>EU-focused payment provider statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Active Subscriptions:</span>
                <span className="font-medium">
                  {subscriptions.filter(s => s.payment_provider === 'mollie' && s.status === 'active').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Monthly Revenue:</span>
                <span className="font-medium">
                  {formatCurrency(
                    subscriptions
                      .filter(s => s.payment_provider === 'mollie' && s.status === 'active')
                      .reduce((sum, s) => sum + (s.billing_interval === 'monthly' ? s.price : s.price / 12), 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Avg Transaction Fee:</span>
                <span className="font-medium text-green-600">€0.30 (SEPA)</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Success Rate:</span>
                <span className="font-medium text-green-600">97.2%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stripe Performance</CardTitle>
            <CardDescription>Global payment provider statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Active Subscriptions:</span>
                <span className="font-medium">
                  {subscriptions.filter(s => s.payment_provider === 'stripe' && s.status === 'active').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Monthly Revenue:</span>
                <span className="font-medium">
                  {formatCurrency(
                    subscriptions
                      .filter(s => s.payment_provider === 'stripe' && s.status === 'active')
                      .reduce((sum, s) => sum + (s.billing_interval === 'monthly' ? s.price : s.price / 12), 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Avg Transaction Fee:</span>
                <span className="font-medium text-yellow-600">1.4% + €0.25</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Success Rate:</span>
                <span className="font-medium text-green-600">96.8%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}