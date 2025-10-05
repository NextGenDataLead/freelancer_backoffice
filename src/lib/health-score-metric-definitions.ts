/**
 * Comprehensive metric definitions for health score explanations
 * Provides detailed explanations for all business health metrics
 */

export interface MetricDefinition {
  id: string
  name: string
  category: 'profit' | 'cashflow' | 'efficiency' | 'risk'
  description: string
  importance: string
  calculation: string
  bestPractices: string[]
  benchmarks: {
    excellent: string
    good: string
    fair: string
    poor: string
  }
  commonCauses?: {
    good: string[]
    poor: string[]
  }
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  // ====== CASH FLOW METRICS ======

  outstanding_amount: {
    id: 'outstanding_amount',
    name: 'Outstanding Amount',
    category: 'cashflow',
    description: 'The total monetary value of unpaid invoices that are past their due date. This represents money owed to you that should have been collected already.',
    importance: 'High outstanding amounts can severely impact cash flow and create liquidity problems. Lower amounts indicate better payment collection efficiency.',
    calculation: 'Sum of all invoice amounts where payment_due_date < current_date AND payment_status = "unpaid"',
    bestPractices: [
      'Follow up on invoices within 3 days of due date',
      'Implement automated payment reminders',
      'Offer early payment discounts (e.g., 2% if paid within 10 days)',
      'Request upfront payments or deposits for new clients',
      'Consider factoring services for large outstanding amounts'
    ],
    benchmarks: {
      excellent: 'Under €1,000 outstanding',
      good: '€1,000 - €3,000 outstanding',
      fair: '€3,000 - €5,000 outstanding',
      poor: 'Over €5,000 outstanding'
    },
    commonCauses: {
      good: [
        'Proactive payment follow-up processes',
        'Clear payment terms and conditions',
        'Reliable client base with good payment history',
        'Efficient invoicing and billing systems'
      ],
      poor: [
        'Lack of payment follow-up procedures',
        'Working with clients who have cash flow problems',
        'Unclear or overly generous payment terms',
        'Delayed invoicing or billing errors'
      ]
    }
  },

  outstanding_count: {
    id: 'outstanding_count',
    name: 'Outstanding Count',
    category: 'cashflow',
    description: 'The number of individual unpaid invoices that are past their due date. This metric shows how many separate payment issues you\'re managing.',
    importance: 'A high count indicates systemic collection problems and requires more administrative effort to resolve. Fewer outstanding invoices mean more efficient collection processes.',
    calculation: 'Count of all invoices where payment_due_date < current_date AND payment_status = "unpaid"',
    bestPractices: [
      'Maintain a systematic collections workflow',
      'Prioritize high-value invoices first',
      'Set up payment plans for difficult cases',
      'Review client creditworthiness before extending payment terms',
      'Implement automated dunning processes'
    ],
    benchmarks: {
      excellent: '0-3 outstanding invoices',
      good: '4-5 outstanding invoices',
      fair: '6-7 outstanding invoices',
      poor: 'Over 7 outstanding invoices'
    },
    commonCauses: {
      good: [
        'Systematic collection procedures',
        'Good client screening and credit management',
        'Prompt invoicing and clear payment terms',
        'Regular account review and monitoring'
      ],
      poor: [
        'Inconsistent or absent collection procedures',
        'Working with too many high-risk clients',
        'Delayed invoicing or complex billing processes',
        'Lack of credit management policies'
      ]
    }
  },

  collection_speed: {
    id: 'collection_speed',
    name: 'Collection Speed (Days Equivalent)',
    category: 'cashflow',
    description: 'An estimated measure of how long it typically takes to collect payments, calculated based on the scale of outstanding amounts. Lower values indicate faster collection.',
    importance: 'Faster collection improves cash flow and reduces the risk of bad debt. It\'s a key indicator of your payment collection efficiency.',
    calculation: 'Approximated as: outstanding_amount / 1000 * 15 (capped at 60 days). €1,000 outstanding ≈ 15 days collection time.',
    bestPractices: [
      'Send invoices immediately upon work completion',
      'Follow up within 24-48 hours of due date',
      'Offer multiple convenient payment methods',
      'Implement late payment fees after grace period',
      'Establish clear payment terms upfront'
    ],
    benchmarks: {
      excellent: 'Under 7 days equivalent',
      good: '7-15 days equivalent',
      fair: '15-30 days equivalent',
      poor: 'Over 30 days equivalent'
    }
  },

  // ====== EFFICIENCY METRICS ======

  hours_progress: {
    id: 'hours_progress',
    name: 'Hours Progress (Time Utilization)',
    category: 'efficiency',
    description: 'Measures your tracked hours against the MTD target based on expected working days (not calendar days). The target adapts to your working schedule - e.g., if you work Mon-Thu, the system only counts those days when calculating your MTD target.',
    importance: 'This metric ensures fair assessment regardless of your working schedule. Part-time or custom schedules get appropriate targets. Staying on track ensures consistent income and identifies productivity gaps when they\'re still correctable.',
    calculation: 'MTD Target = (expected working days up to yesterday / total working days in month) × monthly target. Score = (actual hours / MTD target) × 100%. Example: Sept 9, Mon-Thu schedule: 5 working days passed ÷ 18 total = 27.8% × 120h = 33.3h target.',
    bestPractices: [
      'Configure your actual working days per week in settings (Mon-Sun)',
      'Set realistic monthly hours target aligned with your schedule',
      'Track time daily to maintain consistent progress',
      'Review progress is measured up to yesterday (not today)',
      'Adjust targets if consistently over/under performing'
    ],
    benchmarks: {
      excellent: '≥100% of target (on or ahead of schedule)',
      good: '80-100% of target (slightly behind but recoverable)',
      fair: '60-80% of target (significantly behind, needs action)',
      poor: 'Under 60% of target (critical productivity gap)'
    },
    commonCauses: {
      good: [
        'Accurate working days configuration matching actual schedule',
        'Realistic monthly hours target for your working pattern',
        'Consistent daily time tracking habits',
        'Good work-life balance and energy management',
        'Effective time blocking and calendar management'
      ],
      poor: [
        'Incorrect working days configuration (e.g., set to 5 days but work 3)',
        'Unrealistic monthly hours target not matching capacity',
        'Inconsistent tracking or work patterns',
        'Overly ambitious monthly targets',
        'Too many interruptions or unplanned tasks',
        'Poor time management or procrastination'
      ]
    }
  },

  current_hours_mtd: {
    id: 'current_hours_mtd',
    name: 'Current Hours (Month-to-Date)',
    category: 'efficiency',
    description: 'The total number of hours you\'ve tracked and logged for work activities so far this month. This includes all billable and potentially billable time.',
    importance: 'Tracking hours accurately is essential for understanding productivity, pricing services correctly, and ensuring you meet your income targets.',
    calculation: 'Sum of all logged hours from the 1st of current month to current date',
    bestPractices: [
      'Log time immediately after completing tasks',
      'Use time tracking software with project/client categorization',
      'Include all work-related activities (meetings, admin, etc.)',
      'Review and correct time entries daily',
      'Set daily hour targets based on monthly goals'
    ],
    benchmarks: {
      excellent: 'On track for 160+ hours/month',
      good: 'On track for 120-160 hours/month',
      fair: 'On track for 80-120 hours/month',
      poor: 'On track for under 80 hours/month'
    }
  },

  mtd_target: {
    id: 'mtd_target',
    name: 'MTD Target Hours',
    category: 'efficiency',
    description: 'The expected number of hours you should have completed by this point in the month, based on your monthly target and the current date.',
    importance: 'This provides a benchmark to measure whether you\'re on track to meet your monthly productivity goals. Staying on target ensures consistent income.',
    calculation: '(monthly_hours_target / days_in_month) * current_day_of_month',
    bestPractices: [
      'Set realistic monthly hour targets based on your capacity',
      'Check progress weekly against MTD targets',
      'Adjust daily schedules when falling behind target',
      'Account for holidays and planned time off',
      'Build in buffer time for unexpected interruptions'
    ],
    benchmarks: {
      excellent: '100%+ of MTD target achieved',
      good: '80-100% of MTD target achieved',
      fair: '60-80% of MTD target achieved',
      poor: 'Under 60% of MTD target achieved'
    }
  },

  unbilled_hours: {
    id: 'unbilled_hours',
    name: 'Unbilled Hours',
    category: 'efficiency',
    description: 'Hours of work you\'ve completed but haven\'t yet converted into invoices sent to clients. These represent potential revenue not yet captured.',
    importance: 'High unbilled hours indicate potential cash flow problems and revenue leakage. The longer work remains unbilled, the higher the risk of collection issues.',
    calculation: 'Sum of logged hours where billing_status = "ready_to_bill" OR "not_billed"',
    bestPractices: [
      'Bill clients weekly or bi-weekly for time-based work',
      'Set up automatic billing for recurring work',
      'Review unbilled hours daily',
      'Implement project milestones for billing triggers',
      'Use time tracking software with billing integration'
    ],
    benchmarks: {
      excellent: '0-10 unbilled hours',
      good: '10-20 unbilled hours',
      fair: '20-40 unbilled hours',
      poor: 'Over 40 unbilled hours'
    },
    commonCauses: {
      good: [
        'Regular weekly billing cycles',
        'Automated billing for recurring work',
        'Prompt project completion and invoicing',
        'Good client communication about billing expectations'
      ],
      poor: [
        'Irregular or delayed billing practices',
        'Waiting for project completion before billing',
        'Complex approval processes before billing',
        'Lack of automated billing systems'
      ]
    }
  },

  daily_average: {
    id: 'daily_average',
    name: 'Daily Average Hours',
    category: 'efficiency',
    description: 'The average number of hours you\'ve been logging per working day this month. This indicates your daily productivity consistency.',
    importance: 'Consistent daily productivity is more sustainable and predictable than sporadic bursts. It helps maintain work-life balance and steady income flow.',
    calculation: 'current_month_hours / current_day_of_month',
    bestPractices: [
      'Aim for 6-8 productive hours per working day',
      'Maintain consistent daily schedules',
      'Track both deep work and administrative time',
      'Plan buffer time for unexpected tasks',
      'Focus on sustainable productivity over occasional sprints'
    ],
    benchmarks: {
      excellent: '5+ hours per day average',
      good: '3-5 hours per day average',
      fair: '2-3 hours per day average',
      poor: 'Under 2 hours per day average'
    }
  },

  billing_efficiency: {
    id: 'billing_efficiency',
    name: 'Billing Efficiency',
    category: 'efficiency',
    description: 'The percentage of your tracked hours that have been successfully converted to billable invoices. This measures how effectively you monetize your time.',
    importance: 'High billing efficiency means you\'re maximizing revenue from your time investment. Low efficiency indicates time spent on non-billable activities or billing delays.',
    calculation: '(billed_hours / total_tracked_hours) * 100',
    bestPractices: [
      'Minimize non-billable administrative tasks',
      'Bill for all legitimate work including meetings and calls',
      'Set clear expectations with clients about billable activities',
      'Implement efficient project management to reduce rework',
      'Regularly review and optimize your billing processes'
    ],
    benchmarks: {
      excellent: '90%+ billing efficiency',
      good: '80-90% billing efficiency',
      fair: '70-80% billing efficiency',
      poor: 'Under 70% billing efficiency'
    }
  },

  daily_consistency: {
    id: 'daily_consistency',
    name: 'Daily Consistency',
    category: 'efficiency',
    description: 'Your average hours per day worked this month compared to your target daily hours (calculated from your monthly target ÷ expected working days). This measures how consistently you meet your productivity goals.',
    importance: 'Meeting your daily hours target consistently ensures you hit your monthly goals. This metric adapts to your working schedule (e.g., if you work Mon-Thu, it calculates the appropriate daily target).',
    calculation: 'Actual: total_hours_MTD / calendar_days_MTD. Target: monthly_hours_target / expected_working_days_in_month. Score: (actual / target) × 100%. Example: 6.5h/day actual vs 6.67h/day target = 97.5%',
    bestPractices: [
      'Set realistic monthly hours targets based on your working schedule',
      'Select your actual working days per week in settings (Mon-Sun)',
      'Track all work hours consistently, including meetings and admin time',
      'Review daily progress to stay on track with monthly goals',
      'Adjust your schedule if consistently over or under target'
    ],
    benchmarks: {
      excellent: '≥100% of target (on or ahead of schedule)',
      good: '80-100% of target (slightly behind but recoverable)',
      fair: '60-80% of target (significantly behind, needs action)',
      poor: 'Under 60% of target (critical productivity gap)'
    },
    commonCauses: {
      good: [
        'Realistic monthly hours target aligned with working schedule',
        'Accurate working days configuration in settings',
        'Consistent daily work patterns on scheduled working days',
        'Effective time management and prioritization',
        'Good tracking discipline (logging all productive hours)'
      ],
      poor: [
        'Unrealistic monthly hours target not matching actual capacity',
        'Incorrect working days configuration (e.g., set to 5 days but only work 3)',
        'Irregular work schedules or poor time management',
        'Forgetting to track hours consistently',
        'Lack of clear daily goals or priorities',
        'Burnout or energy management issues'
      ]
    }
  },

  // ====== PROFIT METRICS ======

  active_subscribers: {
    id: 'active_subscribers',
    name: 'Active Subscribers',
    category: 'profit',
    description: 'The current number of customers paying for recurring subscription services, compared to your target number of subscribers.',
    importance: 'Subscription revenue provides predictable, recurring income that\'s more stable than project-based work. Growing subscriber base indicates business scalability.',
    calculation: 'Count of customers with active subscription status',
    bestPractices: [
      'Focus on customer retention and reducing churn',
      'Implement referral programs to grow subscriber base',
      'Offer multiple subscription tiers to capture different market segments',
      'Regularly survey subscribers to improve service offerings',
      'Track and optimize customer acquisition costs'
    ],
    benchmarks: {
      excellent: '100%+ of target subscribers',
      good: '80-100% of target subscribers',
      fair: '60-80% of target subscribers',
      poor: 'Under 60% of target subscribers'
    }
  },

  average_subscription_fee: {
    id: 'average_subscription_fee',
    name: 'Average Subscription Fee',
    category: 'profit',
    description: 'The average monthly recurring revenue per subscriber, compared to your target pricing. This measures the value of your subscription offerings.',
    importance: 'Higher average fees indicate better pricing strategy and value positioning. This directly impacts total subscription revenue and business profitability.',
    calculation: 'total_subscription_revenue / number_of_active_subscribers',
    bestPractices: [
      'Regularly review and optimize pricing strategy',
      'Offer premium tiers with additional value',
      'Implement value-based pricing rather than cost-plus',
      'Test price increases with existing customers gradually',
      'Focus on demonstrating ROI to justify higher prices'
    ],
    benchmarks: {
      excellent: '100%+ of target pricing',
      good: '80-100% of target pricing',
      fair: '60-80% of target pricing',
      poor: 'Under 60% of target pricing'
    }
  },

  monthly_recurring_revenue: {
    id: 'monthly_recurring_revenue',
    name: 'Monthly Recurring Revenue (MRR)',
    category: 'profit',
    description: 'The total predictable revenue generated from subscriptions each month. This is calculated as subscribers × average subscription fee.',
    importance: 'MRR is a key metric for subscription businesses as it provides predictable cash flow and indicates business growth trajectory.',
    calculation: 'active_subscribers * average_subscription_fee',
    bestPractices: [
      'Focus on both subscriber growth and pricing optimization',
      'Minimize churn to protect existing MRR',
      'Upsell existing customers to higher-value plans',
      'Track MRR growth rate month-over-month',
      'Diversify subscription offerings to reduce concentration risk'
    ],
    benchmarks: {
      excellent: '100%+ of target MRR',
      good: '80-100% of target MRR',
      fair: '60-80% of target MRR',
      poor: 'Under 60% of target MRR'
    }
  },

  hourly_rate_value: {
    id: 'hourly_rate_value',
    name: 'Hourly Rate Value',
    category: 'profit',
    description: 'Your current effective hourly rate compared to your target rate. This measures how well you\'re pricing your time-based services.',
    importance: 'Achieving target hourly rates is crucial for profitability in service businesses. Higher rates indicate better positioning and value delivery.',
    calculation: 'total_time_based_revenue / total_billable_hours',
    bestPractices: [
      'Regularly review and increase rates based on value delivered',
      'Focus on high-value activities and specialized skills',
      'Eliminate low-rate work that doesn\'t meet your targets',
      'Communicate value clearly to justify higher rates',
      'Consider value-based pricing over hourly billing'
    ],
    benchmarks: {
      excellent: '100%+ of target hourly rate',
      good: '80-100% of target hourly rate',
      fair: '60-80% of target hourly rate',
      poor: 'Under 60% of target hourly rate'
    }
  },

  // ====== RISK METRICS ======

  ready_to_bill: {
    id: 'ready_to_bill',
    name: 'Ready to Bill Amount',
    category: 'risk',
    description: 'The monetary value of completed work that is ready to be invoiced but hasn\'t been billed yet. This represents immediate revenue potential.',
    importance: 'High ready-to-bill amounts indicate potential cash flow delays. This work should be converted to invoices quickly to maintain healthy cash flow.',
    calculation: 'Sum of (unbilled_hours * hourly_rate) + completed_project_values',
    bestPractices: [
      'Convert ready-to-bill work to invoices within 24-48 hours',
      'Implement daily billing review processes',
      'Automate billing for recurring work where possible',
      'Set up billing milestones for long-term projects',
      'Use project management tools that trigger billing alerts'
    ],
    benchmarks: {
      excellent: 'Under €2,000 ready to bill',
      good: '€2,000 - €5,000 ready to bill',
      fair: '€5,000 - €10,000 ready to bill',
      poor: 'Over €10,000 ready to bill'
    }
  },

  payment_risk: {
    id: 'payment_risk',
    name: 'Payment Risk Amount',
    category: 'risk',
    description: 'The total value of overdue invoices that represent risk to your cash flow. This is the same as outstanding amount but viewed from a risk perspective.',
    importance: 'High payment risk can jeopardize business operations and indicates collection challenges that need immediate attention.',
    calculation: 'Sum of all overdue invoice amounts',
    bestPractices: [
      'Implement credit checks for new clients',
      'Require deposits or upfront payments for high-risk projects',
      'Set clear payment terms and enforce them consistently',
      'Consider payment risk insurance for large projects',
      'Maintain diverse client base to reduce concentration risk'
    ],
    benchmarks: {
      excellent: 'Under €1,000 at risk',
      good: '€1,000 - €3,000 at risk',
      fair: '€3,000 - €5,000 at risk',
      poor: 'Over €5,000 at risk'
    }
  },

  subscription_health: {
    id: 'subscription_health',
    name: 'Subscription Health',
    category: 'risk',
    description: 'Overall health of your subscription business including subscriber growth, churn rate, and revenue stability. Shows if subscription revenue is growing or declining.',
    importance: 'Healthy subscription metrics indicate sustainable recurring revenue. Poor health suggests customer satisfaction issues or market challenges.',
    calculation: 'Composite score based on subscriber growth, churn rate, and MRR growth',
    bestPractices: [
      'Monitor churn rate and implement retention strategies',
      'Regularly survey customers for satisfaction and feedback',
      'Invest in customer success and support functions',
      'Continuously improve product/service offerings',
      'Track and optimize customer lifetime value'
    ],
    benchmarks: {
      excellent: 'Growing subscribers, low churn (<5%)',
      good: 'Stable subscribers, moderate churn (5-10%)',
      fair: 'Slow growth, higher churn (10-15%)',
      poor: 'Declining subscribers, high churn (>15%)'
    }
  },

  // ====== ADDITIONAL PROFIT METRICS ======

  subscription_growth: {
    id: 'subscription_growth',
    name: 'Subscription Growth',
    category: 'profit',
    description: 'Measures your progress toward subscriber growth targets, tracking current subscribers vs. your growth goal.',
    importance: 'Subscription growth directly impacts recurring revenue and business scalability. Achieving growth targets indicates effective customer acquisition and retention.',
    calculation: 'Current active subscribers compared to monthly subscriber target',
    bestPractices: [
      'Implement customer referral programs',
      'Optimize your pricing and value proposition',
      'Focus on customer retention to reduce churn',
      'Use content marketing to attract ideal customers',
      'Track and improve customer acquisition costs'
    ],
    benchmarks: {
      excellent: '100%+ of subscriber target',
      good: '80-100% of subscriber target',
      fair: '60-80% of subscriber target',
      poor: 'Under 60% of subscriber target'
    },
    commonCauses: {
      good: [
        'Strong value proposition and customer satisfaction',
        'Effective marketing and customer acquisition strategies',
        'Good word-of-mouth and referral programs',
        'Competitive pricing and service quality'
      ],
      poor: [
        'Weak value proposition or market fit',
        'High customer churn or poor retention',
        'Insufficient marketing or lead generation',
        'Pricing issues or competitive disadvantages'
      ]
    }
  },

  subscription_pricing: {
    id: 'subscription_pricing',
    name: 'Subscription Pricing',
    category: 'profit',
    description: 'Compares your average subscription fee to your target pricing, measuring pricing effectiveness and revenue optimization.',
    importance: 'Achieving target pricing is crucial for profitability. Higher average fees indicate better value positioning and pricing strategy.',
    calculation: 'Average revenue per subscriber compared to target subscription pricing',
    bestPractices: [
      'Regularly test and optimize pricing strategies',
      'Offer tiered pricing to capture different customer segments',
      'Focus on value delivery to justify premium pricing',
      'Monitor competitor pricing and market conditions',
      'Implement gradual price increases for existing customers'
    ],
    benchmarks: {
      excellent: '100%+ of target pricing',
      good: '80-100% of target pricing',
      fair: '60-80% of target pricing',
      poor: 'Under 60% of target pricing'
    },
    commonCauses: {
      good: [
        'Clear value proposition and strong customer results',
        'Effective pricing strategy and market positioning',
        'Premium service quality and customer experience',
        'Limited competition or strong differentiation'
      ],
      poor: [
        'Weak value communication or poor results',
        'Pricing too low to attract customers initially',
        'Strong competitive pressure on pricing',
        'Market conditions or economic pressures'
      ]
    }
  },

  revenue_diversification: {
    id: 'revenue_diversification',
    name: 'Revenue Diversification',
    category: 'profit',
    description: 'Measures the percentage of your revenue coming from subscriptions vs. other sources, indicating business model stability.',
    importance: 'A higher subscription mix provides more predictable cash flow and business stability compared to project-based revenue.',
    calculation: 'Subscription revenue as percentage of total revenue',
    bestPractices: [
      'Gradually increase subscription offerings',
      'Convert one-time clients to recurring relationships',
      'Develop productized services for recurring revenue',
      'Focus on long-term client relationships',
      'Build subscription-based versions of your core services'
    ],
    benchmarks: {
      excellent: '70%+ subscription revenue mix',
      good: '50-70% subscription revenue mix',
      fair: '30-50% subscription revenue mix',
      poor: 'Under 30% subscription revenue mix'
    },
    commonCauses: {
      good: [
        'Strong subscription product-market fit',
        'Successful transition from project to recurring work',
        'Effective customer retention and upselling',
        'Clear subscription value proposition'
      ],
      poor: [
        'Business model still heavily project-based',
        'Difficulty converting clients to subscriptions',
        'Limited subscription offerings or poor fit',
        'Market preference for project-based work'
      ]
    }
  },

  rate_optimization: {
    id: 'rate_optimization',
    name: 'Rate Optimization',
    category: 'profit',
    description: 'Measures how well your hourly rate improvements contribute to reaching your overall revenue targets.',
    importance: 'Rate optimization is key to profitability growth. Higher rates mean more revenue from the same time investment.',
    calculation: 'Percentage of revenue target achieved through hourly rate optimization',
    bestPractices: [
      'Regularly review and increase rates based on value delivered',
      'Specialize in high-value, niche services',
      'Demonstrate clear ROI to clients to justify higher rates',
      'Eliminate low-rate work that drags down averages',
      'Consider value-based pricing over hourly billing'
    ],
    benchmarks: {
      excellent: '100%+ rate optimization target achieved',
      good: '80-100% rate optimization target achieved',
      fair: '60-80% rate optimization target achieved',
      poor: 'Under 60% rate optimization target achieved'
    },
    commonCauses: {
      good: [
        'Strong value delivery and client results',
        'Specialized skills in high-demand areas',
        'Effective rate increase communication',
        'Premium positioning in the market'
      ],
      poor: [
        'Reluctance to increase rates or poor timing',
        'Weak value proposition or commoditized services',
        'Market pressure or competitive pricing',
        'Lack of confidence in rate justification'
      ]
    }
  },

  subscription_effectiveness: {
    id: 'subscription_effectiveness',
    name: 'Subscription Effectiveness',
    category: 'profit',
    description: 'Measures how effectively your subscription business contributes to your overall subscription revenue targets.',
    importance: 'High subscription effectiveness indicates a successful transition to recurring revenue and sustainable business growth.',
    calculation: 'Percentage of subscription revenue target achieved',
    bestPractices: [
      'Focus on subscriber retention and reducing churn',
      'Optimize subscription pricing and value delivery',
      'Develop upselling and cross-selling strategies',
      'Monitor and improve customer satisfaction scores',
      'Implement systematic customer success processes'
    ],
    benchmarks: {
      excellent: '100%+ subscription target achieved',
      good: '80-100% subscription target achieved',
      fair: '60-80% subscription target achieved',
      poor: 'Under 60% subscription target achieved'
    },
    commonCauses: {
      good: [
        'Strong customer satisfaction and retention',
        'Effective subscription pricing and value delivery',
        'Successful customer acquisition strategies',
        'Good market timing and product-market fit'
      ],
      poor: [
        'High customer churn or poor retention',
        'Pricing issues or value proposition problems',
        'Insufficient customer acquisition or marketing',
        'Market challenges or competitive pressures'
      ]
    }
  },

  time_utilization_efficiency: {
    id: 'time_utilization_efficiency',
    name: 'Time Utilization Efficiency',
    category: 'profit',
    description: 'Measures how efficiently you\'re using your available time to meet monthly hour targets and maximize productivity.',
    importance: 'Efficient time utilization directly impacts revenue potential and ensures you\'re on track to meet income goals.',
    calculation: 'Current month-to-date hours vs. target hours for the current period',
    bestPractices: [
      'Track time consistently and review daily progress',
      'Set weekly milestones to stay on track',
      'Focus on high-value activities during productive hours',
      'Eliminate time-wasting activities and distractions',
      'Use time blocking to protect productive work time'
    ],
    benchmarks: {
      excellent: '100%+ of time utilization target',
      good: '80-100% of time utilization target',
      fair: '60-80% of time utilization target',
      poor: 'Under 60% of time utilization target'
    },
    commonCauses: {
      good: [
        'Consistent daily work routines and schedules',
        'Effective time management and prioritization',
        'Good energy management and work habits',
        'Minimal distractions and efficient work environment'
      ],
      poor: [
        'Inconsistent work patterns or poor planning',
        'Too many distractions or non-productive activities',
        'Overcommitment or unrealistic time targets',
        'Poor energy management or burnout issues'
      ]
    }
  },

  revenue_quality_collection: {
    id: 'revenue_quality_collection',
    name: 'Revenue Quality & Collection',
    category: 'profit',
    description: 'Measures the overall quality of your revenue streams including collection efficiency and payment reliability.',
    importance: 'High-quality revenue is predictable, collectible, and comes from reliable sources, ensuring sustainable business growth.',
    calculation: 'Composite score based on collection speed, payment reliability, and revenue source diversity',
    bestPractices: [
      'Focus on clients with reliable payment histories',
      'Implement efficient invoicing and collection processes',
      'Diversify revenue sources to reduce concentration risk',
      'Set clear payment terms and enforce them consistently',
      'Build long-term relationships with quality clients'
    ],
    benchmarks: {
      excellent: 'Fast collection, diverse, reliable clients',
      good: 'Mostly reliable clients, good collection',
      fair: 'Mixed client quality, average collection',
      poor: 'Slow collection, high-risk clients'
    },
    commonCauses: {
      good: [
        'Strong client relationships and clear communication',
        'Efficient billing and collection processes',
        'Good client screening and credit management',
        'Diverse revenue streams and client base'
      ],
      poor: [
        'Poor client screening or high-risk customers',
        'Inefficient billing processes or unclear terms',
        'Over-dependence on few clients or revenue sources',
        'Weak collection procedures or enforcement'
      ]
    }
  },

  // ====== ADDITIONAL CASH FLOW METRICS ======

  volume_efficiency: {
    id: 'volume_efficiency',
    name: 'Volume Efficiency',
    category: 'cashflow',
    description: 'Measures how efficiently you manage the volume of outstanding invoices relative to your total invoicing activity.',
    importance: 'Lower volume ratios indicate better collection processes and fewer administrative burdens from overdue accounts.',
    calculation: 'Outstanding invoice count as percentage of total monthly invoicing volume',
    bestPractices: [
      'Implement systematic collection workflows',
      'Set up automated payment reminders',
      'Offer convenient payment methods for clients',
      'Review and improve invoicing processes regularly',
      'Focus on preventing rather than collecting overdue amounts'
    ],
    benchmarks: {
      excellent: 'Under 10% of invoices outstanding',
      good: '10-20% of invoices outstanding',
      fair: '20-30% of invoices outstanding',
      poor: 'Over 30% of invoices outstanding'
    },
    commonCauses: {
      good: [
        'Efficient invoicing and collection systems',
        'Clear payment terms and client communication',
        'Good client relationships and payment habits',
        'Proactive follow-up on payment deadlines'
      ],
      poor: [
        'Delayed invoicing or unclear payment terms',
        'Poor client payment habits or cash flow issues',
        'Lack of systematic collection procedures',
        'Insufficient follow-up on overdue accounts'
      ]
    }
  },

  absolute_amount_control: {
    id: 'absolute_amount_control',
    name: 'Absolute Amount Control',
    category: 'cashflow',
    description: 'Tracks the total monetary value of overdue amounts to ensure it stays within manageable limits for cash flow.',
    importance: 'Controlling absolute overdue amounts prevents cash flow crises and maintains financial stability.',
    calculation: 'Total value of all overdue invoices in euros',
    bestPractices: [
      'Set maximum acceptable overdue limits and monitor closely',
      'Prioritize collection of high-value overdue amounts',
      'Implement credit limits for clients with payment issues',
      'Consider factoring or collection services for large amounts',
      'Require deposits or advance payments for high-risk projects'
    ],
    benchmarks: {
      excellent: 'Under €2,000 total overdue',
      good: '€2,000 - €5,000 total overdue',
      fair: '€5,000 - €10,000 total overdue',
      poor: 'Over €10,000 total overdue'
    },
    commonCauses: {
      good: [
        'Effective credit management and client screening',
        'Quick collection processes and payment follow-up',
        'Strong client relationships and payment discipline',
        'Appropriate payment terms and risk management'
      ],
      poor: [
        'Poor client credit assessment or payment terms',
        'Delayed collection efforts or weak enforcement',
        'Client financial difficulties or payment disputes',
        'Inadequate risk management procedures'
      ]
    }
  },

  // ====== ADDITIONAL RISK METRICS ======

  invoice_processing_risk: {
    id: 'invoice_processing_risk',
    name: 'Invoice Processing Risk',
    category: 'risk',
    description: 'Measures the risk from completed work that hasn\'t been converted to invoices yet, representing potential revenue delays.',
    importance: 'High invoice processing risk can create cash flow gaps and indicates inefficient billing processes that need immediate attention.',
    calculation: 'Total value of completed work ready to be invoiced',
    bestPractices: [
      'Implement daily billing review and processing',
      'Set up automated billing triggers for completed work',
      'Create billing milestones for long-term projects',
      'Use project management tools with billing integration',
      'Establish clear work completion and billing workflows'
    ],
    benchmarks: {
      excellent: 'Under €2,000 ready to bill',
      good: '€2,000 - €5,000 ready to bill',
      fair: '€5,000 - €8,000 ready to bill',
      poor: 'Over €8,000 ready to bill'
    },
    commonCauses: {
      good: [
        'Efficient billing processes and quick turnaround',
        'Automated billing systems and regular reviews',
        'Clear project completion and billing triggers',
        'Good project management and workflow systems'
      ],
      poor: [
        'Delayed billing processes or complex approvals',
        'Poor project management or unclear completion criteria',
        'Manual billing systems without automation',
        'Lack of regular billing review procedures'
      ]
    }
  },

  payment_collection_risk: {
    id: 'payment_collection_risk',
    name: 'Payment Collection Risk',
    category: 'risk',
    description: 'Assesses the risk level of overdue payments and their potential impact on your cash flow and business operations.',
    importance: 'High collection risk can threaten business viability and indicates the need for improved credit management and collection procedures.',
    calculation: 'Total value of overdue invoices weighted by age and client payment history',
    bestPractices: [
      'Implement comprehensive credit checks for new clients',
      'Set and enforce clear payment terms consistently',
      'Monitor client payment patterns and flag risks early',
      'Consider payment insurance for high-value projects',
      'Maintain diverse client base to reduce concentration risk'
    ],
    benchmarks: {
      excellent: 'Under €1,000 at risk',
      good: '€1,000 - €3,000 at risk',
      fair: '€3,000 - €5,000 at risk',
      poor: 'Over €5,000 at risk'
    },
    commonCauses: {
      good: [
        'Strong client credit assessment and screening',
        'Effective collection processes and follow-up',
        'Good client relationships and payment discipline',
        'Appropriate payment terms and risk management'
      ],
      poor: [
        'Poor client credit assessment or high-risk clients',
        'Weak collection procedures or inconsistent enforcement',
        'Client financial difficulties or payment disputes',
        'Overly generous payment terms or poor risk management'
      ]
    }
  },

  client_concentration_risk: {
    id: 'client_concentration_risk',
    name: 'Client Concentration Risk',
    category: 'risk',
    description: 'Evaluates the risk of over-dependence on a small number of clients for your revenue, which can threaten business stability.',
    importance: 'High concentration risk makes your business vulnerable to client loss. Diversification reduces this risk and provides more stable revenue.',
    calculation: 'Revenue concentration analysis showing dependence on top clients',
    bestPractices: [
      'Actively diversify client base to reduce concentration',
      'Set maximum revenue percentage limits per client',
      'Develop multiple revenue streams and service offerings',
      'Build long-term contracts with key clients',
      'Continuously prospect for new client opportunities'
    ],
    benchmarks: {
      excellent: 'No single client >30% of revenue',
      good: 'Top client 30-40% of revenue',
      fair: 'Top client 40-50% of revenue',
      poor: 'Top client >50% of revenue'
    },
    commonCauses: {
      good: [
        'Active client diversification and business development',
        'Multiple service offerings attracting different clients',
        'Strong client acquisition and retention strategies',
        'Balanced revenue streams and client relationships'
      ],
      poor: [
        'Over-reliance on few large clients or projects',
        'Limited service offerings or narrow market focus',
        'Insufficient business development and prospecting',
        'Comfort with existing clients without diversification'
      ]
    }
  },

  business_model_risk: {
    id: 'business_model_risk',
    name: 'Business Model Risk',
    category: 'risk',
    description: 'Assesses risks related to your business model sustainability, including subscription health, market position, and revenue predictability.',
    importance: 'Business model risks can threaten long-term viability. Monitoring these helps ensure sustainable growth and competitive positioning.',
    calculation: 'Composite assessment of subscription health, market trends, and revenue sustainability',
    bestPractices: [
      'Continuously monitor market trends and competitive landscape',
      'Diversify revenue streams to reduce model dependence',
      'Invest in customer retention and satisfaction',
      'Adapt business model based on market feedback',
      'Build sustainable competitive advantages'
    ],
    benchmarks: {
      excellent: 'Strong, diverse, sustainable model',
      good: 'Stable model with minor risks',
      fair: 'Model challenges requiring attention',
      poor: 'Significant model risks threatening viability'
    },
    commonCauses: {
      good: [
        'Strong market position and competitive advantages',
        'Diverse revenue streams and client base',
        'Proven value proposition and customer satisfaction',
        'Adaptable business model and market responsiveness'
      ],
      poor: [
        'Market disruption or competitive pressure',
        'Over-dependence on specific revenue streams',
        'Changing customer needs or preferences',
        'Inability to adapt to market changes'
      ]
    }
  },

  // ====== COMPONENT BREAKDOWN METRICS ======

  collection_rate: {
    id: 'collection_rate',
    name: 'Collection Rate',
    category: 'profit',
    description: 'The percentage of your potential revenue that has been successfully collected vs. what remains unbilled. This shows how efficiently you convert work into cash.',
    importance: 'A high collection rate indicates efficient billing processes and good cash flow management. Low rates suggest money being left on the table.',
    calculation: 'Total collected revenue / (total collected revenue + unbilled work value) * 100',
    bestPractices: [
      'Bill clients immediately upon work completion',
      'Set up regular billing cycles (weekly or bi-weekly)',
      'Minimize unbilled work by staying current with invoicing',
      'Use automated billing systems where possible',
      'Track and review collection metrics weekly'
    ],
    benchmarks: {
      excellent: '95%+ collection rate',
      good: '85-95% collection rate',
      fair: '75-85% collection rate',
      poor: 'Under 75% collection rate'
    },
    commonCauses: {
      good: [
        'Efficient billing processes and quick invoicing',
        'Automated billing systems and regular cycles',
        'Good project management and completion tracking',
        'Clear billing procedures and client expectations'
      ],
      poor: [
        'Delayed invoicing or irregular billing cycles',
        'Poor project completion tracking',
        'Complex approval processes for billing',
        'Lack of systematic billing procedures'
      ]
    }
  },

  invoicing_speed: {
    id: 'invoicing_speed',
    name: 'Invoicing Speed',
    category: 'profit',
    description: 'Measures how quickly you convert completed work into invoices. Higher percentages indicate faster invoicing and better cash flow.',
    importance: 'Fast invoicing improves cash flow and reduces the risk of work being forgotten or disputed. It\'s crucial for maintaining healthy business finances.',
    calculation: '(1 - unbilled_work_value / total_work_value) * 100. Higher percentages mean less work is sitting unbilled.',
    bestPractices: [
      'Invoice within 24-48 hours of work completion',
      'Set up automated invoicing for recurring work',
      'Use project milestones to trigger invoicing',
      'Implement daily billing review processes',
      'Eliminate approval bottlenecks in billing workflow'
    ],
    benchmarks: {
      excellent: '95%+ invoicing speed',
      good: '85-95% invoicing speed',
      fair: '75-85% invoicing speed',
      poor: 'Under 75% invoicing speed'
    },
    commonCauses: {
      good: [
        'Streamlined billing processes and quick turnaround',
        'Automated invoicing systems and triggers',
        'Clear work completion definitions and procedures',
        'Efficient project management and tracking'
      ],
      poor: [
        'Manual billing processes requiring multiple approvals',
        'Unclear work completion criteria',
        'Delayed project management updates',
        'Complex billing procedures or administrative delays'
      ]
    }
  },

  payment_quality: {
    id: 'payment_quality',
    name: 'Payment Quality',
    category: 'profit',
    description: 'Measures the percentage of revenue that is collected on time vs. overdue amounts. Higher percentages indicate better payment collection and lower risk.',
    importance: 'High payment quality reduces cash flow risk and indicates reliable revenue streams. Poor payment quality can jeopardize business operations.',
    calculation: '(1 - overdue_amount / total_revenue) * 100. Higher percentages mean fewer payment problems.',
    bestPractices: [
      'Implement strict credit checks for new clients',
      'Set clear payment terms and enforce them consistently',
      'Follow up promptly on overdue payments',
      'Consider requiring deposits for high-risk projects',
      'Build relationships with reliable, financially stable clients'
    ],
    benchmarks: {
      excellent: '95%+ payment quality',
      good: '85-95% payment quality',
      fair: '75-85% payment quality',
      poor: 'Under 75% payment quality'
    },
    commonCauses: {
      good: [
        'Strong client credit assessment and selection',
        'Clear payment terms and consistent enforcement',
        'Proactive payment follow-up procedures',
        'Reliable client base with good payment history'
      ],
      poor: [
        'Working with high-risk or financially unstable clients',
        'Weak credit management and assessment procedures',
        'Inconsistent payment follow-up or enforcement',
        'Overly generous payment terms or poor contract management'
      ]
    }
  }
}

/**
 * Get detailed explanation for a specific metric
 */
export function getMetricDefinition(metricId: string): MetricDefinition | null {
  return METRIC_DEFINITIONS[metricId] || null
}

/**
 * Get all metrics for a specific category
 */
export function getMetricsByCategory(category: 'profit' | 'cashflow' | 'efficiency' | 'risk'): MetricDefinition[] {
  return Object.values(METRIC_DEFINITIONS).filter(metric => metric.category === category)
}

/**
 * Search metrics by name or description
 */
export function searchMetrics(query: string): MetricDefinition[] {
  const searchTerm = query.toLowerCase()
  return Object.values(METRIC_DEFINITIONS).filter(metric =>
    metric.name.toLowerCase().includes(searchTerm) ||
    metric.description.toLowerCase().includes(searchTerm) ||
    metric.id.toLowerCase().includes(searchTerm)
  )
}