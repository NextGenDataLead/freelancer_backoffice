/**
 * Detailed Metric Explanation Modal
 * Shows layman's terms explanations for specific health score metrics
 */

import React from 'react'
import { X, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Lightbulb } from 'lucide-react'
import { getMetricDefinition } from '@/lib/health-score-metric-definitions'

interface DetailedMetricExplanationModalProps {
  metricId: string
  metricName: string
  currentValue?: number
  isOpen: boolean
  onClose: () => void
  className?: string
}

// Additional layman's terms explanations for business context
const LAYMAN_EXPLANATIONS: Record<string, {
  whatItMeans: string
  whyItMatters: string
  easyFixes: string[]
  redFlags: string[]
  successStories: string
}> = {
  // ====== MAIN CATEGORY EXPLANATIONS ======
  profit_health_overview: {
    whatItMeans: "Profit Health measures how effectively your business generates sustainable revenue. It looks at whether you're hitting your income targets through subscription revenue (if applicable), hourly rate optimization, and productive time utilization.",
    whyItMatters: "Without strong profit health, you can't grow your business, invest in better tools, or build financial security. It's the foundation that makes everything else possible - from taking time off to upgrading your equipment.",
    easyFixes: [
      "Set realistic but challenging monthly revenue targets and track progress weekly",
      "Raise your hourly rates by 10-15% annually - most clients will accept modest increases",
      "Focus on high-value activities during your most productive hours",
      "If offering subscriptions, prioritize customer retention over new sign-ups",
      "Track your time religiously - you can't manage what you don't measure"
    ],
    redFlags: [
      "Your income varies wildly month to month with no clear pattern",
      "You haven't raised rates in over 2 years despite improving skills",
      "You're working more hours but earning the same or less money",
      "You avoid discussing money with clients or feel guilty charging fair rates",
      "You're constantly stressed about making ends meet financially"
    ],
    successStories: "Successful freelancers typically maintain 70-80% profit health by consistently hitting time targets, gradually increasing rates, and developing predictable revenue streams. This gives them the freedom to be selective about clients and projects."
  },

  cashflow_health_overview: {
    whatItMeans: "Cash Flow Health measures how quickly and reliably you collect payments from clients. It focuses on reducing overdue invoices and improving your payment collection processes so you have predictable money coming in.",
    whyItMatters: "Good cash flow health means you can pay your bills on time, avoid stress about money, and make business decisions from a position of strength rather than desperation. Poor cash flow kills more businesses than lack of profit.",
    easyFixes: [
      "Send invoices immediately when work is completed, not weeks later",
      "Follow up on overdue payments within 3 days, not 3 weeks",
      "Ask for 25-50% upfront payment before starting larger projects",
      "Offer convenient payment methods (bank transfer, PayPal, etc.)",
      "Set up automated payment reminders in your invoicing software"
    ],
    redFlags: [
      "You regularly have more than €5,000 in overdue invoices",
      "You avoid following up on late payments because it feels awkward",
      "You're doing new work for clients who haven't paid old invoices",
      "Your cash flow stress affects your sleep or relationships",
      "You accept 'the check is in the mail' responses without follow-up"
    ],
    successStories: "Top freelancers maintain cash flow health by being professional but persistent about collections. They typically get paid within 7-15 days and rarely have more than €2,000 outstanding at any time."
  },

  efficiency_health_overview: {
    whatItMeans: "Efficiency Health measures how well you convert your time into billable revenue. It tracks whether you're meeting your monthly hour targets consistently and how quickly you turn completed work into invoices.",
    whyItMatters: "High efficiency means you earn more money in less time, giving you freedom to pursue better opportunities, take breaks, or simply work fewer hours for the same income. It's about working smarter, not harder.",
    easyFixes: [
      "Set daily hour targets (like 6-7 hours) instead of just monthly goals",
      "Time-block your calendar with specific tasks and protect those blocks",
      "Bill clients weekly instead of waiting until projects are completely finished",
      "Eliminate low-value tasks that don't contribute to your income goals",
      "Use the 80/20 rule - focus 80% of time on the 20% of activities that generate most revenue"
    ],
    redFlags: [
      "You consistently miss your monthly hour targets by more than 20%",
      "You have more than 40 hours of unbilled work sitting around",
      "You spend significant time on non-billable activities without realizing it",
      "Your productivity varies dramatically from day to day",
      "You feel busy all the time but aren't hitting your income goals"
    ],
    successStories: "Efficient freelancers typically achieve 85-90% billing efficiency by staying focused on revenue-generating activities and maintaining regular billing cycles. This lets them work 30-35 hours per week while earning full-time income."
  },

  risk_health_overview: {
    whatItMeans: "Risk Management Health identifies potential threats to your business continuity, particularly delays in getting paid and work that's completed but not yet invoiced. It's about preventing problems before they become crises.",
    whyItMatters: "Good risk management prevents cash flow emergencies, reduces stress, and helps you sleep better at night. It's the difference between reactive scrambling and proactive business management.",
    easyFixes: [
      "Review your 'ready to bill' work daily and invoice within 24-48 hours",
      "Set maximum limits for how much any single client can owe you",
      "Diversify your client base so no single client represents more than 40% of revenue",
      "Build an emergency fund equal to 2-3 months of expenses",
      "Monitor client payment patterns and flag slow payers early"
    ],
    redFlags: [
      "You have more than €8,000 in work completed but not yet invoiced",
      "One client represents more than 50% of your total revenue",
      "You're regularly surprised by cash flow problems",
      "You avoid looking at your financial situation because it's stressful",
      "You take on any work regardless of client payment history"
    ],
    successStories: "Risk-aware freelancers maintain diverse client bases, keep completed work under €3,000, and build financial buffers. This gives them negotiating power and peace of mind to make strategic decisions rather than desperate ones."
  },
  outstanding_amount: {
    whatItMeans: "This is the total money that clients owe you for work you've already completed, but they haven't paid yet even though the payment deadline has passed.",
    whyItMatters: "When clients don't pay on time, you can't pay your own bills or invest in growing your business. It's like lending money to friends who forget to pay you back.",
    easyFixes: [
      "Send a friendly payment reminder email within 3 days of the due date",
      "Offer a small discount (like 2%) for paying early to encourage faster payments",
      "Ask for 50% payment upfront before starting new projects",
      "Set up automated payment reminders in your accounting software"
    ],
    redFlags: [
      "Same clients are always late with payments",
      "Outstanding amounts are growing every month",
      "You're avoiding difficult conversations about overdue payments",
      "You're taking on risky clients just to get work"
    ],
    successStories: "Many successful freelancers keep outstanding amounts under €1,000 by following up consistently and being selective about clients. This gives them predictable cash flow to plan ahead."
  },

  outstanding_count: {
    whatItMeans: "This counts how many separate unpaid invoices you have sitting in your inbox that are past their due date. Each invoice represents a payment conversation you need to have.",
    whyItMatters: "Managing multiple overdue invoices is mentally draining and takes time away from actual work. The more overdue invoices you have, the more 'collection work' you're doing instead of billable work.",
    easyFixes: [
      "Set aside 30 minutes every Monday to review and follow up on overdue invoices",
      "Create a simple email template for payment reminders to save time",
      "Prioritize following up on the highest-value invoices first",
      "Consider offering payment plans to clients who are struggling"
    ],
    redFlags: [
      "You have more than 7 overdue invoices to manage",
      "You're spending hours each week chasing payments instead of working",
      "You avoid checking your overdue invoice list because it's overwhelming",
      "You're accepting late payments as 'just how business works'"
    ],
    successStories: "Top-performing freelancers rarely have more than 3-4 overdue invoices at any time. They achieve this by being proactive with follow-ups and selective with clients."
  },

  collection_speed: {
    whatItMeans: "This estimates how many days it typically takes for you to collect payment after sending an invoice, based on your current overdue amounts. Think of it like 'how long do I usually wait for my money?'",
    whyItMatters: "Faster collection means you can pay your bills, save money, and take on better opportunities. Slow collection is like working for free for weeks or months at a time.",
    easyFixes: [
      "Follow up within 24-48 hours if payment is late (not weeks later)",
      "Make it super easy for clients to pay: offer multiple payment methods",
      "Send invoices the same day you finish work, not days or weeks later",
      "Build late payment fees into your contracts (like 2% per month)"
    ],
    redFlags: [
      "You regularly wait 45+ days to get paid for completed work",
      "You're afraid to follow up because you don't want to annoy clients",
      "You're doing new work for clients who still owe you money",
      "You assume slow payment is normal and acceptable"
    ],
    successStories: "The best freelancers get paid within 7-15 days on average. They do this by setting clear expectations upfront and following up consistently without being pushy."
  },

  hours_progress: {
    whatItMeans: "This shows whether you're on track to hit your monthly hour target based on what day of the month it is. For example, if you're aiming for 160 hours this month and it's day 15, you should have about 80 hours logged.",
    whyItMatters: "Consistent hour tracking helps you earn predictable income and spot problems early. If you're behind by day 10, you can still catch up. If you wait until day 25, it's too late.",
    easyFixes: [
      "Set a daily hour target (like 6-8 hours) and track it each day",
      "Use a simple time tracking app that sends you daily reminders",
      "Front-load your hours early in the month when motivation is high",
      "Block out specific hours in your calendar for deep work"
    ],
    redFlags: [
      "You're consistently behind on hours and scrambling at month-end",
      "You forget to track time for days at a time",
      "Your monthly income is unpredictable because your hours vary wildly",
      "You set unrealistic hour targets that you never hit"
    ],
    successStories: "Successful freelancers often aim to be 10-20% ahead of their monthly target by mid-month. This gives them flexibility for unexpected opportunities or personal time."
  },

  daily_consistency: {
    whatItMeans: "This is your average hours per day so far this month. If you've logged 60 hours over 20 days, you're averaging 3 hours per day. Higher consistency usually means better work-life balance.",
    whyItMatters: "Working 12 hours one day and 0 hours the next three days leads to burnout and unpredictable income. Consistent daily work, even if fewer hours, is more sustainable and reliable.",
    easyFixes: [
      "Aim for 4-6 productive hours per working day rather than occasional marathons",
      "Create a morning routine that naturally leads into focused work",
      "Batch similar tasks (like all your calls on Tuesdays) to improve efficiency",
      "Take regular breaks to maintain energy throughout the day"
    ],
    redFlags: [
      "You work 14-hour days followed by days of exhaustion and no work",
      "Your productivity varies dramatically based on your mood or energy",
      "You rely on last-minute panic to meet deadlines",
      "You can't predict your weekly income because your hours are so variable"
    ],
    successStories: "Many top freelancers work 6-7 hours per day consistently rather than burning out with long days. This approach leads to better quality work and happier clients."
  },

  unbilled_hours: {
    whatItMeans: "These are hours you've worked and tracked but haven't yet turned into invoices sent to clients. Think of it as completed work that hasn't been converted to 'money requests' yet.",
    whyItMatters: "Unbilled hours are like having cash sitting in your drawer instead of in your bank account earning interest. The longer work sits unbilled, the higher the risk you'll forget details or the client will question the work.",
    easyFixes: [
      "Set up a weekly billing day (like every Friday) to convert tracked time into invoices",
      "Bill immediately when you finish a project or reach a milestone",
      "Use time tracking software that automatically suggests when to bill",
      "Set calendar reminders to review unbilled time every few days"
    ],
    redFlags: [
      "You have more than 40 hours of unbilled work piling up",
      "You wait until the end of the month to do all your billing at once",
      "You've forgotten what some of your old unbilled hours were for",
      "Clients are questioning charges because too much time passed before billing"
    ],
    successStories: "Efficient freelancers rarely have more than 10-15 unbilled hours at any time. They bill weekly or bi-weekly, which improves cash flow and reduces disputes."
  },

  billing_efficiency: {
    whatItMeans: "This is the percentage of your tracked time that actually gets converted into money. If you track 100 hours but only bill 80 hours, your billing efficiency is 80%.",
    whyItMatters: "Low billing efficiency means you're working for free more than you realize. It could be administrative tasks, or work you can't charge for, or just inefficient processes that eat up your time.",
    easyFixes: [
      "Track everything you do and see what's not billable - then try to minimize those tasks",
      "Bill for legitimate work time including client meetings and project planning",
      "Automate or eliminate administrative tasks that don't add value",
      "Set boundaries with clients about what work is billable vs. free"
    ],
    redFlags: [
      "You're working 40 hours but only billing 25 hours consistently",
      "You spend hours on administrative tasks that don't generate revenue",
      "You give away too much free work or 'scope creep'",
      "You're not tracking all your actual work time accurately"
    ],
    successStories: "Top performers achieve 85-90%+ billing efficiency by being disciplined about what they do for free and optimizing their workflows to minimize non-billable time."
  },

  ready_to_bill: {
    whatItMeans: "This is the dollar value of work you've completed but haven't converted to invoices yet. It's like having products ready to ship but sitting in your warehouse instead of being sold.",
    whyItMatters: "Ready-to-bill work represents immediate money you could have in your bank account. Delays in billing create unnecessary cash flow gaps and increase the risk of payment disputes.",
    easyFixes: [
      "Set up a daily 15-minute routine to review completed work and create invoices",
      "Use project management tools that automatically flag when work is ready to bill",
      "Bill in stages for large projects instead of waiting until everything is done",
      "Create invoice templates to speed up the billing process"
    ],
    redFlags: [
      "You have more than €5,000 in ready-to-bill work sitting around",
      "You finish projects but wait weeks before sending the invoice",
      "You're waiting for multiple projects to be done before billing any of them",
      "Your billing process is so complex that you avoid doing it regularly"
    ],
    successStories: "Successful freelancers typically have less than €2,000 in ready-to-bill work because they invoice within 24-48 hours of completion. This maximizes their cash flow."
  },

  subscription_growth: {
    whatItMeans: "If you have subscription or recurring revenue, this measures whether you're gaining or losing subscribers compared to your target growth rate.",
    whyItMatters: "Subscription revenue is like having a salary - it's predictable income that covers your basic expenses. Growing subscriptions means less stress about finding new clients every month.",
    easyFixes: [
      "Focus on keeping existing subscribers happy rather than just finding new ones",
      "Ask satisfied clients if they'd be interested in ongoing monthly services",
      "Create simple packages that clients can subscribe to (like monthly reports or maintenance)",
      "Offer small discounts for annual subscriptions vs. monthly"
    ],
    redFlags: [
      "You're losing more subscribers than you're gaining",
      "Your subscription offerings don't provide clear ongoing value",
      "You're not actively working to convert one-time clients to ongoing relationships",
      "Your subscription pricing is too low to make meaningful impact"
    ],
    successStories: "Many freelancers successfully transition to having 50-70% recurring revenue by converting their best services into monthly subscriptions, providing more predictable income."
  },

  rate_optimization: {
    whatItMeans: "This measures how well you're increasing your hourly rates over time to meet your income targets. It's about getting paid more for the same amount of work.",
    whyItMatters: "Raising rates is often easier than working more hours. If you can increase your rate from €50 to €75 per hour, you can earn the same money working fewer hours and have more time for other things.",
    easyFixes: [
      "Review and increase rates annually, even if just by 10-15%",
      "Position rate increases as investments in better service quality",
      "Test higher rates with new clients before raising rates for existing ones",
      "Specialize in high-value skills that naturally command higher rates"
    ],
    redFlags: [
      "You haven't raised your rates in over 2 years",
      "You're afraid to discuss rate increases with existing clients",
      "Your rates are significantly below market average for your skills",
      "You compete primarily on price rather than value"
    ],
    successStories: "Many freelancers double their effective rates over 3-4 years by consistently delivering great results and gradually raising prices. This leads to working with better clients and earning more for less stress."
  },

  payment_risk: {
    whatItMeans: "This is the total amount of money you might not be able to collect from overdue invoices. It's like having loans to friends that they might never pay back.",
    whyItMatters: "High payment risk can threaten your ability to pay bills and grow your business. It also indicates you might be working with unreliable clients who create stress and uncertainty.",
    easyFixes: [
      "Research new clients' payment history and financial stability before accepting work",
      "Require 50% payment upfront for projects over €2,000",
      "Set clear payment terms and stick to them consistently",
      "Consider using payment protection or insurance for large projects"
    ],
    redFlags: [
      "You have more than €3,000 in potentially uncollectable debt",
      "You're working with clients who have a history of payment problems",
      "You accept work without checking client creditworthiness",
      "You're afraid to enforce payment terms because you need the work"
    ],
    successStories: "Smart freelancers keep payment risk under €1,000 by being selective about clients and using deposits. This allows them to focus on work instead of debt collection."
  }
}

export function DetailedMetricExplanationModal({
  metricId,
  metricName,
  currentValue,
  isOpen,
  onClose,
  className = ''
}: DetailedMetricExplanationModalProps) {
  if (!isOpen) return null

  const metricDefinition = getMetricDefinition(metricId)
  const laymanExplanation = LAYMAN_EXPLANATIONS[metricId]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
      <div className={`bg-card border rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl ${className}`}>
        {/* Header */}
        <div className="sticky top-0 bg-card border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{metricName}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Understanding this metric in plain English
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Status */}
          {currentValue !== undefined && (
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Your Current Status</h3>
                  <p className="text-2xl font-bold text-primary">{currentValue}</p>
                </div>
              </div>
            </div>
          )}

          {/* What It Means (Layman's Terms) */}
          {laymanExplanation && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Lightbulb className="h-5 w-5 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold">What This Actually Means</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed pl-11">
                {laymanExplanation.whatItMeans}
              </p>
            </div>
          )}

          {/* Why It Matters */}
          {laymanExplanation && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold">Why This Matters for Your Business</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed pl-11">
                {laymanExplanation.whyItMatters}
              </p>
            </div>
          )}

          {/* Easy Fixes */}
          {laymanExplanation && laymanExplanation.easyFixes.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold">Easy Ways to Improve This</h3>
              </div>
              <div className="pl-11 space-y-3">
                {laymanExplanation.easyFixes.map((fix, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-600 text-xs font-bold flex items-center justify-center mt-0.5 flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{fix}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Red Flags */}
          {laymanExplanation && laymanExplanation.redFlags.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold">Warning Signs to Watch For</h3>
              </div>
              <div className="pl-11 space-y-2">
                {laymanExplanation.redFlags.map((flag, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground leading-relaxed">{flag}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success Stories */}
          {laymanExplanation && laymanExplanation.successStories && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold">What Success Looks Like</h3>
              </div>
              <div className="pl-11 bg-muted/20 rounded-lg p-4">
                <p className="text-sm text-muted-foreground leading-relaxed italic">
                  {laymanExplanation.successStories}
                </p>
              </div>
            </div>
          )}

          {/* Technical Details (Fallback) */}
          {metricDefinition && (
            <div className="border-t pt-6 space-y-4">
              <h3 className="text-lg font-semibold text-muted-foreground">Technical Details</h3>

              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-medium">Description</h4>
                  <p className="text-muted-foreground">{metricDefinition.description}</p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Calculation</h4>
                  <p className="text-muted-foreground font-mono text-xs bg-muted/50 p-2 rounded">
                    {metricDefinition.calculation}
                  </p>
                </div>
              </div>

              {/* Benchmarks */}
              <div className="space-y-2">
                <h4 className="font-medium">Benchmarks</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="bg-green-500/10 p-2 rounded">
                    <div className="font-medium text-green-600">Excellent</div>
                    <div className="text-muted-foreground">{metricDefinition.benchmarks.excellent}</div>
                  </div>
                  <div className="bg-blue-500/10 p-2 rounded">
                    <div className="font-medium text-blue-600">Good</div>
                    <div className="text-muted-foreground">{metricDefinition.benchmarks.good}</div>
                  </div>
                  <div className="bg-yellow-500/10 p-2 rounded">
                    <div className="font-medium text-yellow-600">Fair</div>
                    <div className="text-muted-foreground">{metricDefinition.benchmarks.fair}</div>
                  </div>
                  <div className="bg-red-500/10 p-2 rounded">
                    <div className="font-medium text-red-600">Poor</div>
                    <div className="text-muted-foreground">{metricDefinition.benchmarks.poor}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  )
}