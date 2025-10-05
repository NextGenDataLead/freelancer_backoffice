// BACKUP: Original buildProfitOrganogram function
// Created before implementing horizontal layout experiment

const buildProfitOrganogram = (scores: any, breakdown: any): OrganogramNodeData => {
  const explanation = healthScoreResults?.explanations?.profit

  // Simple fallback structure if no detailed explanation is available
  if (!explanation || !explanation.details) {
    return {
      id: 'profit',
      name: 'Profit Health',
      score: scores.profit || 0,
      maxScore: 25,
      contribution: 100,
      level: 0,
      description: 'Revenue generation and value creation efficiency',
      metricId: 'profit_health_overview',
      hasDetailedBreakdown: false,
      children: [
        {
          id: 'hourly_rate_value',
          name: 'Hourly Rate Value',
          score: 8,
          maxScore: 8,
          contribution: 32,
          level: 1,
          description: 'Current effective hourly rate compared to target',
          metricId: 'hourly_rate_value',
          hasDetailedBreakdown: false // No expansion - this is a final calculated metric
        },
        {
          id: 'time_utilization_efficiency',
          name: 'Time Utilization Efficiency',
          score: 6,
          maxScore: 6,
          contribution: 24,
          level: 1,
          description: 'Efficiency in tracking and utilizing available time',
          metricId: 'time_utilization_efficiency',
          hasDetailedBreakdown: true,
          children: [
            {
              id: 'hours_progress',
              name: 'Hours Progress',
              score: 3,
              maxScore: 3,
              contribution: 0,
              level: 2,
              description: 'Progress toward monthly hour target',
              metricId: 'hours_progress',
              hasDetailedBreakdown: false
            },
            {
              id: 'tracking_consistency',
              name: 'Tracking Consistency',
              score: 3,
              maxScore: 3,
              contribution: 0,
              level: 2,
              description: 'Consistency of daily time tracking',
              metricId: 'tracking_consistency',
              hasDetailedBreakdown: false
            }
          ]
        },
        {
          id: 'revenue_quality_collection',
          name: 'Revenue Quality & Collection',
          score: 4,
          maxScore: 4,
          contribution: 16,
          level: 1,
          description: 'Quality of revenue streams and collection efficiency',
          metricId: 'revenue_quality_collection',
          hasDetailedBreakdown: true,
          children: [
            {
              id: 'collection_rate',
              name: 'Collection Rate',
              score: 2,
              maxScore: 2,
              contribution: 0,
              level: 2,
              description: 'Percentage of work successfully converted to cash',
              metricId: 'collection_rate',
              hasDetailedBreakdown: false
            },
            {
              id: 'invoicing_speed',
              name: 'Invoicing Speed',
              score: 2,
              maxScore: 2,
              contribution: 0,
              level: 2,
              description: 'How quickly completed work is converted to invoices',
              metricId: 'invoicing_speed',
              hasDetailedBreakdown: false
            }
          ]
        }
      ]
    }
  }

  // Extract metrics from explanation details (same logic as tree view)
  const children: OrganogramNodeData[] = []

  // First check if we have actual breakdown scores (like efficiency/cashflow do)
  if (breakdown && breakdown.scores) {
    console.log('Using actual breakdown scores for profit:', breakdown.scores)
    // Handle profit-specific breakdown scores here if they exist
    // For now, fall through to explanation parsing
  }

  const calculationDetails = explanation.details?.filter(detail => detail.type === 'calculations') || []

  for (const section of calculationDetails) {
    for (const item of section.items || []) {
      if (item.type === 'calculation') {
        const score = extractScoreFromDescription(item.description)
        const maxScore = extractMaxScoreFromDescription(item.description)

        if (maxScore > 0) {
          // Enable detailed breakdown only for composite metrics, not final calculated values
          const label = item.label || ''
          const hasDetailedBreakdown =
            label.includes('Time Utilization') ||
            label.includes('Revenue Quality') ||
            label.includes('Collection')
          // Hourly Rate Value is a final calculated metric, not a composite of sub-metrics

          // Debug: log the actual labels to see what we're getting
          console.log('Organogram metric label:', item.label, 'hasDetailedBreakdown:', hasDetailedBreakdown)

          // Build sub-metric children if this is a main category
          let subChildren: OrganogramNodeData[] | undefined = undefined
          if (hasDetailedBreakdown) {
            // For composite metrics, try to get real sub-components using actual breakdown data
            subChildren = buildRealSubComponents(label, healthScoreResults?.breakdown?.profit)
            console.log('Real sub-components found for', item.label, ':', subChildren?.length || 0)

            // If no component children found, provide sensible defaults based on metric type
            if (!subChildren || subChildren.length === 0) {
              if (label.includes('Time Utilization')) {
                subChildren = [
                  {
                    id: 'utilization_progress',
                    name: 'Utilization Progress',
                    score: roundScore(score * 0.7),
                    maxScore: roundScore(maxScore * 0.7),
                    contribution: 0,
                    level: 2,
                    description: 'Progress toward monthly hour target',
                    metricId: 'utilization_progress',
                    hasDetailedBreakdown: false
                  },
                  {
                    id: 'time_consistency',
                    name: 'Time Consistency',
                    score: roundScore(score * 0.3),
                    maxScore: roundScore(maxScore * 0.3),
                    contribution: 0,
                    level: 2,
                    description: 'Daily tracking consistency',
                    metricId: 'time_consistency',
                    hasDetailedBreakdown: false
                  }
                ]
              } else if (label.includes('Revenue Quality') || label.includes('Collection')) {
                subChildren = [
                  {
                    id: 'collection_efficiency',
                    name: 'Collection Efficiency',
                    score: roundScore(score * 0.6),
                    maxScore: roundScore(maxScore * 0.6),
                    contribution: 0,
                    level: 2,
                    description: 'Speed and effectiveness of payment collection',
                    metricId: 'collection_efficiency',
                    hasDetailedBreakdown: false
                  },
                  {
                    id: 'billing_quality',
                    name: 'Billing Quality',
                    score: roundScore(score * 0.4),
                    maxScore: roundScore(maxScore * 0.4),
                    contribution: 0,
                    level: 2,
                    description: 'Quality and timeliness of invoicing',
                    metricId: 'billing_quality',
                    hasDetailedBreakdown: false
                  }
                ]
              }
            }
          }

          children.push({
            id: getMetricIdFromLabel(item.label),
            name: item.label || 'Unknown Metric',
            score: score,
            maxScore: maxScore,
            contribution: (maxScore / 25) * 100,
            level: 1,
            description: item.description,
            calculationValue: item.value,
            calculationDescription: item.description,
            metricId: getMetricIdFromLabel(item.label),
            hasDetailedBreakdown,
            children: subChildren
          })
        }
      }
    }
  }

  return {
    id: 'profit',
    name: 'Profit Health',
    score: scores.profit || 0,
    maxScore: 25,
    contribution: 100,
    level: 0,
    description: 'Revenue generation and value creation efficiency',
    metricId: 'profit_health_overview',
    hasDetailedBreakdown: false, // Keep root simple for now
    children: children.length > 0 ? children : [
      {
        id: 'no_data',
        name: 'No Data Available',
        score: 0,
        maxScore: 25,
        contribution: 100,
        level: 1,
        hasDetailedBreakdown: false
      }
    ]
  }
}