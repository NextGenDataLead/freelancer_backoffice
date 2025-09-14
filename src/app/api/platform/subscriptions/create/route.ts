// Platform Subscription Creation API
// Provider-agnostic endpoint using the extensible architecture

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { initializePaymentProviders } from '@/lib/payments/initialize-providers';
import type { PaymentProviderName } from '@/lib/payments/types';
import { z } from 'zod';

// Request validation schema
const createSubscriptionSchema = z.object({
  tenantId: z.string().uuid('Invalid tenant ID'),
  planId: z.string().uuid('Invalid plan ID'), 
  paymentProvider: z.enum(['mollie', 'stripe']).optional(),
  paymentMethodId: z.string().optional(),
  trialDays: z.number().int().min(0).max(90).optional()
});

export async function POST(request: NextRequest) {
  try {
    // Initialize payment providers
    await initializePaymentProviders();

    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validatedData = createSubscriptionSchema.parse(body);

    // Initialize subscription service
    const subscriptionService = new SubscriptionService();

    // Create subscription using provider abstraction
    const subscription = await subscriptionService.createSubscription({
      tenantId: validatedData.tenantId,
      planId: validatedData.planId,
      paymentProvider: validatedData.paymentProvider, // Will use optimal provider if not specified
      paymentMethodId: validatedData.paymentMethodId,
      trialDays: validatedData.trialDays
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        provider: subscription.provider,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialStart: subscription.trialStart,
        trialEnd: subscription.trialEnd
      }
    });

  } catch (error) {
    console.error('Subscription creation failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Subscription creation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    await initializePaymentProviders();
    
    const { getProviderStatus } = await import('@/lib/payments/initialize-providers');
    const status = getProviderStatus();

    return NextResponse.json({
      status: 'healthy',
      providers: status,
      message: 'Provider abstraction layer operational'
    });

  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}