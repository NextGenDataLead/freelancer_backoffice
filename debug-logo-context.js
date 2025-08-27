// Debug script to test logo context mapping
const { generateInvoicePDFWithTemplate } = require('./src/lib/pdf/template-integration.js');

// Simulate typical invoice data
const testData = {
  invoice: {
    id: 'test-inv-001',
    invoice_number: 'INV-001',
    invoice_date: '2025-08-25',
    due_date: '2025-09-24',
    status: 'draft',
    reference: null,
    notes: null,
    currency: 'EUR',
    vat_type: 'reversed',
    vat_rate: 0.21,
    subtotal: 100,
    vat_amount: 0,
    total_amount: 100,
    discount_amount: 0
  },
  client: {
    name: 'Test Client',
    company_name: 'Test Company',
    address: 'Test Street 1',
    postal_code: '1234AB',
    city: 'Test City',
    country_code: 'NL',
    vat_number: 'NL123456789B01',
    is_business: true,
    email: 'test@example.com',
    phone: '+31612345678'
  },
  items: [{
    id: 'item-1',
    description: 'Test Service',
    quantity: 1,
    unit_price: 100,
    line_total: 100
  }],
  businessProfile: {
    business_name: 'Test Business',
    kvk_number: '12345678',
    btw_number: 'NL123456789B01',
    address: 'Business Street 1',
    postal_code: '5678CD',
    city: 'Business City',
    country_code: 'NL',
    email: 'business@example.com',
    phone: '+31687654321'
  }
};

console.log('🧪 Testing logo context mapping...');

// Test the function to see debug output
generateInvoicePDFWithTemplate(testData)
  .then(() => {
    console.log('✅ PDF generation test completed');
  })
  .catch(error => {
    console.error('❌ PDF generation test failed:', error);
  });