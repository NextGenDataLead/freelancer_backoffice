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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  CreditCard, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Euro,
  Calendar,
  Database
} from 'lucide-react';

interface PlanData {
  id: string;
  name: string;
  description: string;
  price: number;
  billing_interval: 'monthly' | 'yearly';
  features: Record<string, any>;
  limits: Record<string, any>;
  is_active: boolean;
  supported_providers: string[];
  sort_order: number;
  subscriber_count?: number;
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<PlanData | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    // TODO: Replace with actual API call
    setTimeout(() => {
      setPlans([
        {
          id: '1',
          name: 'Starter',
          description: 'Perfect for freelancers and small teams getting started',
          price: 29.00,
          billing_interval: 'monthly',
          features: {
            max_clients: 25,
            api_calls: 5000,
            support_level: 'email',
            features: ['time_tracking', 'basic_invoicing', 'expense_management']
          },
          limits: { storage_gb: 5, users: 3, projects: 10 },
          is_active: true,
          supported_providers: ['mollie'],
          sort_order: 1,
          subscriber_count: 15
        },
        {
          id: '2', 
          name: 'Professional',
          description: 'Ideal for growing businesses and teams',
          price: 79.00,
          billing_interval: 'monthly',
          features: {
            max_clients: 100,
            api_calls: 25000,
            support_level: 'priority',
            features: ['time_tracking', 'advanced_invoicing', 'expense_management', 'financial_reporting', 'client_portal']
          },
          limits: { storage_gb: 25, users: 10, projects: 50 },
          is_active: true,
          supported_providers: ['mollie'],
          sort_order: 2,
          subscriber_count: 8
        },
        {
          id: '3',
          name: 'Enterprise',
          description: 'Full-featured solution for large organizations',
          price: 199.00,
          billing_interval: 'monthly',
          features: {
            max_clients: -1,
            api_calls: 100000,
            support_level: 'dedicated',
            features: ['time_tracking', 'advanced_invoicing', 'expense_management', 'financial_reporting', 'client_portal', 'api_access', 'custom_integrations', 'sso']
          },
          limits: { storage_gb: 100, users: -1, projects: -1 },
          is_active: true,
          supported_providers: ['mollie', 'stripe'],
          sort_order: 3,
          subscriber_count: 3
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const handleCreatePlan = () => {
    setIsCreateDialogOpen(true);
  };

  const handleEditPlan = (plan: PlanData) => {
    setEditingPlan(plan);
  };

  const handleTogglePlan = (planId: string) => {
    setPlans(plans.map(plan => 
      plan.id === planId 
        ? { ...plan, is_active: !plan.is_active }
        : plan
    ));
  };

  const formatLimit = (value: number) => {
    return value === -1 ? 'Unlimited' : value.toLocaleString();
  };

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
          <h1 className="text-3xl font-bold">Subscription Plans</h1>
          <p className="text-muted-foreground">Manage platform subscription plans and pricing</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreatePlan}>
              <Plus className="w-4 h-4 mr-2" />
              Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Plan</DialogTitle>
              <DialogDescription>
                Create a new subscription plan with custom features and pricing
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Plan Name</Label>
                  <Input id="name" placeholder="e.g. Professional" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (€)</Label>
                  <Input id="price" type="number" placeholder="79.00" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Plan description..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Billing Interval</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Supported Providers</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select providers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mollie">Mollie Only</SelectItem>
                      <SelectItem value="both">Mollie + Stripe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button>Create Plan</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Provider Status */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Multi-Provider Ready:</strong> Plans support Mollie (€0.30 SEPA) and future Stripe integration. 
          Provider abstraction allows seamless switching without plan changes.
        </AlertDescription>
      </Alert>

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className={!plan.is_active ? 'opacity-60' : ''}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {plan.name}
                    {!plan.is_active && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEditPlan(plan)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleTogglePlan(plan.id)}>
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pricing */}
              <div className="text-center">
                <div className="text-3xl font-bold flex items-center justify-center gap-1">
                  <Euro className="w-6 h-6" />
                  {plan.price.toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground">per {plan.billing_interval}</p>
              </div>

              <Separator />

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold">{plan.subscriber_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Subscribers</p>
                </div>
                <div className="text-center">
                  <Database className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold">{formatLimit(plan.limits.storage_gb)}GB</p>
                  <p className="text-xs text-muted-foreground">Storage</p>
                </div>
              </div>

              <Separator />

              {/* Key Limits */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Clients:</span>
                  <span className="font-medium">{formatLimit(plan.features.max_clients)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>API Calls:</span>
                  <span className="font-medium">{formatLimit(plan.features.api_calls)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Users:</span>
                  <span className="font-medium">{formatLimit(plan.limits.users)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Support:</span>
                  <Badge variant="outline" className="text-xs">
                    {plan.features.support_level}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Providers */}
              <div className="flex flex-wrap gap-1">
                {plan.supported_providers.map((provider) => (
                  <Badge key={provider} variant="secondary" className="text-xs">
                    {provider}
                  </Badge>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  variant={plan.is_active ? "destructive" : "default"} 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleTogglePlan(plan.id)}
                >
                  {plan.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleEditPlan(plan)}>
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Performance</CardTitle>
          <CardDescription>Overview of subscription plan metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <CreditCard className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{plans.filter(p => p.is_active).length}</p>
              <p className="text-sm text-muted-foreground">Active Plans</p>
            </div>
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{plans.reduce((sum, p) => sum + (p.subscriber_count || 0), 0)}</p>
              <p className="text-sm text-muted-foreground">Total Subscribers</p>
            </div>
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <Euro className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">
                €{plans.reduce((sum, p) => sum + (p.price * (p.subscriber_count || 0)), 0).toFixed(0)}
              </p>
              <p className="text-sm text-muted-foreground">Monthly Revenue</p>
            </div>
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <Settings className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{plans.filter(p => p.supported_providers.includes('mollie')).length}</p>
              <p className="text-sm text-muted-foreground">Mollie Compatible</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}