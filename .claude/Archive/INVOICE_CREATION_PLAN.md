# Invoice Creation from Time Entries - Implementation Plan

## Current Issue
The `handleCreateInvoiceFromTime` function was simplified during debugging to just show an alert. According to the SaaS roadmap and research, this needs to be a comprehensive invoice creation system.

## Required Functionality (Based on Roadmap)

### Phase 1 MVP Requirements:
- Create professional invoices with logo/branding
- **Critical**: Support both standard (21%) VAT and **Reverse-Charged VAT** for EU business services
- Convert selected time entries into line items
- Calculate totals including VAT
- Generate PDF invoices
- Track invoice status (Sent, Paid, Overdue)

### Implementation Script

```typescript
const handleCreateInvoiceFromTime = async (selectedEntries: string[]) => {
  try {
    // Group entries by client for separate invoices
    const selected = unbilledEntries.filter(entry => selectedEntries.includes(entry.id))
    const clientGroups = selected.reduce((acc, entry) => {
      const clientId = entry.client?.id || 'unknown'
      if (!acc[clientId]) {
        acc[clientId] = {
          client: entry.client,
          entries: []
        }
      }
      acc[clientId].entries.push(entry)
      return acc
    }, {} as Record<string, { client: any; entries: any[] }>)

    const invoicesCreated = []
    
    // Create invoice for each client group
    for (const [clientId, group] of Object.entries(clientGroups)) {
      if (!group.client) continue

      // Calculate totals
      const subtotal = group.entries.reduce((sum, entry) => 
        sum + (entry.hours * (entry.hourly_rate || 0)), 0)
      
      // Determine VAT scenario based on client location and type
      const isEUBusiness = group.client.country_code && 
        group.client.country_code !== 'NL' && 
        group.client.is_business && 
        group.client.vat_number
      
      const vatRate = isEUBusiness ? 0 : 0.21 // Reverse charge or standard VAT
      const vatAmount = subtotal * vatRate
      const total = subtotal + vatAmount

      // Prepare invoice data
      const invoiceData = {
        client_id: group.client.id,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
        currency: 'EUR',
        vat_rate: vatRate,
        is_reverse_charged: isEUBusiness,
        subtotal: subtotal,
        vat_amount: vatAmount,
        total: total,
        status: 'draft',
        description: `Factuur voor ${group.entries.length} uur${group.entries.length > 1 ? 'en' : ''} werkzaamheden`,
        line_items: group.entries.map(entry => ({
          description: `${entry.project_name || 'Werkzaamheden'} - ${entry.description}`,
          quantity: entry.hours,
          unit_price: entry.hourly_rate || 0,
          total: entry.hours * (entry.hourly_rate || 0),
          date: entry.entry_date
        }))
      }

      // Create invoice via API
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      })

      if (!response.ok) {
        throw new Error(`Failed to create invoice for ${group.client.company_name || group.client.name}`)
      }

      const invoice = await response.json()
      invoicesCreated.push(invoice)

      // Mark time entries as invoiced
      for (const entry of group.entries) {
        await fetch(`/api/time-entries/${entry.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            invoiced: true, 
            invoice_id: invoice.id 
          })
        })
      }
    }

    // Success feedback
    const invoiceCount = invoicesCreated.length
    const clientNames = Object.values(clientGroups).map(g => 
      g.client?.company_name || g.client?.name).filter(Boolean)
    
    if (invoiceCount === 1) {
      alert(`✅ Factuur succesvol aangemaakt voor ${clientNames[0]}!`)
    } else {
      alert(`✅ ${invoiceCount} facturen succesvol aangemaakt voor: ${clientNames.join(', ')}`)
    }

    // Refresh data and close dialog
    setShowInvoiceDialog(false)
    handleRefresh()
    
  } catch (error) {
    console.error('Invoice creation error:', error)
    alert(`❌ Fout bij het aanmaken van factuur: ${error.message}`)
  }
}
```

### Key Features Included:

1. **Multi-client Invoice Creation**: Groups time entries by client and creates separate invoices
2. **Reverse-Charged VAT Logic**: Automatically detects EU business clients and applies reverse charge
3. **Professional Invoice Data**: Includes all necessary fields for a complete invoice
4. **Time Entry Integration**: Marks entries as invoiced and links to invoice
5. **Error Handling**: Comprehensive error handling with user feedback
6. **API Integration**: Uses existing invoice and time-entry APIs

### Next Steps:
1. Fix VAT validation issue in client form
2. Implement this invoice creation logic
3. Test end-to-end workflow
4. Add PDF generation capabilities

## Priority: Fix VAT Validation First
Before implementing invoice creation, need to resolve the VAT number validation issue with BE0690567150 (valid VIES number not being accepted).