'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, Calendar, AlertCircle, CheckCircle, Users, Database } from 'lucide-react';

interface SubscriptionData {
  id: string;
  status: string;
  plan: {
    name: string;
    price: number;
    billing_interval: string;
    features: Record<string, any>;
    limits: Record<string, any>;
  };
  provider: string;
  current_period_start: string;
  current_period_end: string;
  trial_end?: string;
}

interface UsageData {
  api_calls: number;
  storage_used_gb: number;
  active_users: number;
  clients_count: number;
  time_entries_count: number;
  usage_percentage: number;
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Implement actual API calls when authentication is set up
    // For now, show demo data
    setTimeout(() => {
      setSubscription({
        id: 'sub_demo',
        status: 'active',
        plan: {
          name: 'Professional',
          price: 79.00,
          billing_interval: 'monthly',
          features: {
            max_clients: 100,
            api_calls: 25000,
            support_level: 'priority',
            features: ['time_tracking', 'advanced_invoicing', 'expense_management', 'financial_reporting', 'client_portal']
          },
          limits: {
            storage_gb: 25,
            users: 10,
            projects: 50
          }
        },
        provider: 'mollie',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

      setUsage({
        api_calls: 12500,
        storage_used_gb: 8.5,
        active_users: 4,
        clients_count: 23,
        time_entries_count: 156,
        usage_percentage: 50
      });

      setLoading(false);
    }, 1000);
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, label: 'Active', icon: CheckCircle },
      trialing: { variant: 'secondary' as const, label: 'Trial', icon: Calendar },
      past_due: { variant: 'destructive' as const, label: 'Past Due', icon: AlertCircle },
      canceled: { variant: 'outline' as const, label: 'Canceled', icon: AlertCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-muted-foreground">Manage your subscription and view usage</p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          Provider: {subscription?.provider === 'mollie' ? 'Mollie' : 'Stripe'} 
        </Badge>
      </div>

      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Current Subscription
              </CardTitle>
              <CardDescription>Your active subscription plan and billing details</CardDescription>
            </div>
            {subscription && getStatusBadge(subscription.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Plan</p>
                  <p className="text-2xl font-bold">{subscription.plan.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Price</p>
                  <p className="text-2xl font-bold">
                    €{subscription.plan.price.toFixed(2)}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{subscription.plan.billing_interval}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Next billing</p>
                  <p className="text-lg font-semibold">{formatDate(subscription.current_period_end)}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-3">Plan Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {subscription.plan.features.features?.map((feature: string) => (
                    <div key={feature} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="capitalize">{feature.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline">Change Plan</Button>
                <Button variant="outline">Update Payment Method</Button>
                <Button variant="destructive">Cancel Subscription</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Current Usage
          </CardTitle>
          <CardDescription>Your usage for the current billing period</CardDescription>
        </CardHeader>
        <CardContent>
          {usage && subscription && (
            <div className="space-y-4">
              {/* API Calls */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">API Calls</span>
                  <span className="text-sm text-muted-foreground">
                    {usage.api_calls.toLocaleString()} / {subscription.plan.features.api_calls?.toLocaleString() || 'Unlimited'}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${getUsagePercentage(usage.api_calls, subscription.plan.features.api_calls)}%` }}
                  ></div>
                </div>
              </div>

              {/* Storage */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Storage</span>
                  <span className="text-sm text-muted-foreground">
                    {usage.storage_used_gb.toFixed(1)} GB / {subscription.plan.limits.storage_gb} GB
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${getUsagePercentage(usage.storage_used_gb, subscription.plan.limits.storage_gb)}%` }}
                  ></div>
                </div>
              </div>

              {/* Users */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Active Users</span>
                  <span className="text-sm text-muted-foreground">
                    {usage.active_users} / {subscription.plan.limits.users === -1 ? 'Unlimited' : subscription.plan.limits.users}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${getUsagePercentage(usage.active_users, subscription.plan.limits.users)}%` }}
                  ></div>
                </div>
              </div>

              {/* Business Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="text-center p-4 bg-secondary/50 rounded-lg">
                  <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{usage.clients_count}</p>
                  <p className="text-sm text-muted-foreground">Clients</p>
                </div>
                <div className="text-center p-4 bg-secondary/50 rounded-lg">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{usage.time_entries_count}</p>
                  <p className="text-sm text-muted-foreground">Time Entries</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Multi-Provider Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Provider Information</CardTitle>
          <CardDescription>Your current payment provider and optimization details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Cost Optimized:</strong> You're using {subscription?.provider === 'mollie' ? 'Mollie' : 'Stripe'} 
              {subscription?.provider === 'mollie' && 
                ' with €0.30 SEPA Direct Debit fees (vs Stripe\'s 1.4% + €0.25). This saves money on European payments!'
              }
              {subscription?.provider === 'stripe' && 
                ' with global payment support and advanced features like Customer Portal and advanced billing controls.'
              }
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Current Provider Benefits</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {subscription?.provider === 'mollie' ? (
                  <>
                    <li>• €0.30 per SEPA Direct Debit transaction</li>
                    <li>• Native EU compliance (GDPR, PSD2)</li>
                    <li>• iDEAL, SEPA, and European payment methods</li>
                    <li>• Optimized for European businesses</li>
                  </>
                ) : (
                  <>
                    <li>• Global payment method support</li>
                    <li>• Advanced billing and subscription features</li>
                    <li>• Built-in Customer Portal</li>
                    <li>• Comprehensive fraud protection</li>
                  </>
                )}
              </ul>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Multi-Provider Architecture</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Provider abstraction layer active</li>
                <li>• Seamless provider switching capability</li>
                <li>• Zero downtime migrations supported</li>
                <li>• Future provider additions ready</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}