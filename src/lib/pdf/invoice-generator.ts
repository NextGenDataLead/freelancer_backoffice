import { chromium } from 'playwright'
import type { Client } from '@/lib/types/financial'

interface InvoiceData {
  invoice: any
  client: Client
  items: any[]
  businessProfile: any
}

/**
 * Generate PDF for an invoice using Playwright
 */
export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  const { invoice, client, items, businessProfile } = data

  // Generate HTML template for the invoice
  const htmlContent = generateInvoiceHTML(invoice, client, items, businessProfile)

  // Launch Playwright browser
  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    // Set content and generate PDF
    await page.setContent(htmlContent, { waitUntil: 'networkidle' })
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '2cm',
        left: '1cm'
      }
    })

    await browser.close()
    return Buffer.from(pdfBuffer)

  } catch (error) {
    await browser.close()
    throw error
  }
}

/**
 * Generate HTML template for invoice PDF
 */
function generateInvoiceHTML(
  invoice: any, 
  client: Client, 
  items: any[], 
  businessProfile: any
): string {
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(num)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const vatTypeLabel = (vatType: string) => {
    switch (vatType) {
      case 'reverse_charge': return 'BTW verlegd'
      case 'exempt': return 'Vrijgesteld'
      case 'standard': return 'Standaard BTW'
      default: return vatType
    }
  }

  return `
    <!DOCTYPE html>
    <html lang="nl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Factuur ${invoice.invoice_number}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 20px;
        }
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 40px;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 20px;
        }
        .business-info {
          flex: 1;
        }
        .business-info h1 {
          margin: 0;
          color: #2563eb;
          font-size: 24px;
        }
        .invoice-title {
          text-align: right;
          flex: 1;
        }
        .invoice-title h2 {
          margin: 0;
          font-size: 32px;
          color: #1f2937;
        }
        .invoice-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-bottom: 40px;
        }
        .client-info, .invoice-details {
          padding: 20px;
          background: #f9fafb;
          border-radius: 8px;
        }
        .client-info h3, .invoice-details h3 {
          margin: 0 0 15px 0;
          color: #374151;
          font-size: 16px;
          font-weight: 600;
        }
        .client-info p, .invoice-details p {
          margin: 5px 0;
          color: #6b7280;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .items-table th {
          background: #f3f4f6;
          padding: 12px;
          text-align: left;
          border-bottom: 2px solid #e5e7eb;
          font-weight: 600;
          color: #374151;
        }
        .items-table td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
        }
        .items-table .text-right {
          text-align: right;
        }
        .items-table .text-center {
          text-align: center;
        }
        .totals {
          float: right;
          width: 300px;
          margin-top: 20px;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .totals-row.total {
          border-top: 2px solid #374151;
          border-bottom: 2px solid #374151;
          font-weight: 700;
          font-size: 16px;
          margin-top: 10px;
        }
        .vat-info {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          padding: 15px;
          margin: 20px 0;
          font-size: 12px;
        }
        .payment-terms {
          margin-top: 40px;
          padding: 20px;
          background: #f0f9ff;
          border-radius: 8px;
          border-left: 4px solid #2563eb;
        }
        .payment-terms h4 {
          margin: 0 0 10px 0;
          color: #1e40af;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- Header -->
        <div class="header">
          <div class="business-info">
            <h1>${businessProfile.business_name || (businessProfile.first_name + ' ' + (businessProfile.last_name || '')) || 'ZZP Administratie'}</h1>
            <p><strong>KvK:</strong> ${businessProfile.kvk_number || 'Niet geregistreerd'}</p>
            ${businessProfile.btw_number ? `<p><strong>BTW:</strong> ${businessProfile.btw_number}</p>` : ''}
          </div>
          <div class="invoice-title">
            <h2>FACTUUR</h2>
            <p><strong>${invoice.invoice_number}</strong></p>
          </div>
        </div>

        <!-- Invoice Meta Information -->
        <div class="invoice-meta">
          <div class="client-info">
            <h3>Factureren aan:</h3>
            ${client.is_business && client.company_name ? `<p><strong>${client.company_name}</strong></p>` : ''}
            <p>${client.name}</p>
            ${client.address ? `<p>${client.address}</p>` : ''}
            ${client.postal_code && client.city ? `<p>${client.postal_code} ${client.city}</p>` : ''}
            ${client.country_code !== 'NL' ? `<p>${client.country_code}</p>` : ''}
            ${client.vat_number ? `<p><strong>BTW:</strong> ${client.vat_number}</p>` : ''}
          </div>
          
          <div class="invoice-details">
            <h3>Factuurgegevens:</h3>
            <p><strong>Factuurdatum:</strong> ${formatDate(invoice.invoice_date)}</p>
            <p><strong>Vervaldatum:</strong> ${formatDate(invoice.due_date)}</p>
            <p><strong>Betalingstermijn:</strong> ${client.default_payment_terms || 30} dagen</p>
            ${invoice.reference ? `<p><strong>Referentie:</strong> ${invoice.reference}</p>` : ''}
            <p><strong>Status:</strong> ${invoice.status === 'draft' ? 'Concept' : invoice.status === 'sent' ? 'Verzonden' : invoice.status}</p>
          </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 50%">Beschrijving</th>
              <th class="text-center" style="width: 15%">Aantal</th>
              <th class="text-right" style="width: 17.5%">Prijs p/e</th>
              <th class="text-right" style="width: 17.5%">Totaal</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>${item.description}</td>
                <td class="text-center">${parseFloat(item.quantity).toFixed(1)}</td>
                <td class="text-right">${formatCurrency(item.unit_price)}</td>
                <td class="text-right">${formatCurrency(item.line_total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totals -->
        <div class="totals">
          <div class="totals-row">
            <span>Subtotaal:</span>
            <span>${formatCurrency(invoice.subtotal)}</span>
          </div>
          <div class="totals-row">
            <span>BTW (${Math.round(parseFloat(invoice.vat_rate) * 100)}%):</span>
            <span>${formatCurrency(invoice.vat_amount)}</span>
          </div>
          <div class="totals-row total">
            <span>Totaal:</span>
            <span>${formatCurrency(invoice.total_amount)}</span>
          </div>
        </div>

        <div style="clear: both;"></div>

        <!-- VAT Information -->
        ${invoice.vat_type === 'reverse_charge' ? `
          <div class="vat-info">
            <strong>BTW verlegd:</strong> Voor deze levering/dienst is de BTW verlegd naar de afnemer conform artikel 12 van de BTW-wet.
          </div>
        ` : ''}
        
        ${invoice.vat_type === 'exempt' ? `
          <div class="vat-info">
            <strong>Export buiten EU:</strong> Deze factuur betreft een export buiten de EU en is daarom vrijgesteld van BTW.
          </div>
        ` : ''}

        <!-- Payment Terms -->
        <div class="payment-terms">
          <h4>Betalingsinformatie</h4>
          <p>Gelieve het verschuldigde bedrag van <strong>${formatCurrency(invoice.total_amount)}</strong> 
          uiterlijk voor <strong>${formatDate(invoice.due_date)}</strong> over te maken onder vermelding van 
          factuurnummer <strong>${invoice.invoice_number}</strong>.</p>
          ${invoice.notes ? `<p><strong>Opmerkingen:</strong> ${invoice.notes}</p>` : ''}
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>Factuur gegenereerd op ${formatDate(new Date().toISOString())} • ${businessProfile.business_name || 'ZZP Administratie'}</p>
        </div>
      </div>
    </body>
    </html>
  `
}