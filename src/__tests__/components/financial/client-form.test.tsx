import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClientForm } from '../../../components/financial/clients/client-form'

/**
 * Client Form Component Tests
 * Testing the client creation and editing form
 */

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

const mockOnSuccess = vi.fn()
const mockOnCancel = vi.fn()

describe('ClientForm Component', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render client form with all fields', () => {
    render(<ClientForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

    expect(screen.getByText('Nieuwe klant')).toBeInTheDocument()
    expect(screen.getByLabelText('Naam')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mailadres')).toBeInTheDocument()
    expect(screen.getByText('Zakelijke klant')).toBeInTheDocument()
    expect(screen.getByText('Ook leverancier')).toBeInTheDocument()
  })

  it('should toggle business client fields', async () => {
    render(<ClientForm onSuccess={mockOnSuccess} />)

    const businessToggle = screen.getByRole('checkbox', { name: /zakelijke klant/i })
    
    // Initially should not show company fields
    expect(screen.queryByLabelText('Bedrijfsnaam')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('BTW-nummer')).not.toBeInTheDocument()

    // Toggle business client
    await user.click(businessToggle)

    // Should now show business fields
    expect(screen.getByLabelText('Bedrijfsnaam')).toBeInTheDocument()
    expect(screen.getByLabelText('BTW-nummer')).toBeInTheDocument()
    expect(screen.getByLabelText('Contactpersoon')).toBeInTheDocument()
  })

  it('should validate required fields', async () => {
    render(<ClientForm onSuccess={mockOnSuccess} />)

    const submitButton = screen.getByRole('button', { name: /klant toevoegen/i })
    await user.click(submitButton)

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/naam is verplicht/i)).toBeInTheDocument()
      expect(screen.getByText(/e-mailadres is verplicht/i)).toBeInTheDocument()
    })
  })

  it('should validate email format', async () => {
    render(<ClientForm onSuccess={mockOnSuccess} />)

    const emailField = screen.getByLabelText('E-mailadres')
    const submitButton = screen.getByRole('button', { name: /klant toevoegen/i })

    await user.type(emailField, 'invalid-email')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/ongeldig e-mailadres/i)).toBeInTheDocument()
    })
  })

  it('should validate Dutch postal code format', async () => {
    render(<ClientForm onSuccess={mockOnSuccess} />)

    const nameField = screen.getByLabelText('Naam')
    const emailField = screen.getByLabelText('E-mailadres')
    const postalCodeField = screen.getByLabelText('Postcode')
    const submitButton = screen.getByRole('button', { name: /klant toevoegen/i })

    await user.type(nameField, 'Jan Janssen')
    await user.type(emailField, 'jan@example.com')
    await user.type(postalCodeField, '123AB') // Invalid format

    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/ongeldige postcode/i)).toBeInTheDocument()
    })

    // Clear and enter valid postal code
    await user.clear(postalCodeField)
    await user.type(postalCodeField, '1234AB') // Valid format

    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.queryByText(/ongeldige postcode/i)).not.toBeInTheDocument()
    })
  })

  it('should perform VAT number validation for business clients', async () => {
    // Mock successful VAT validation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: {
          is_valid: true,
          company_name: 'Acme BV'
        }
      })
    })

    render(<ClientForm onSuccess={mockOnSuccess} />)

    // Enable business client
    const businessToggle = screen.getByRole('checkbox', { name: /zakelijke klant/i })
    await user.click(businessToggle)

    // Enter VAT number
    const vatField = screen.getByLabelText('BTW-nummer')
    await user.type(vatField, 'NL123456789B01')

    // Should trigger VAT validation after debounce
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/clients/validate-vat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vat_number: 'NL123456789B01',
          country_code: 'NL'
        })
      })
    }, { timeout: 1000 })

    // Should show validation success
    await waitFor(() => {
      expect(screen.getByText('Geldig - Acme BV')).toBeInTheDocument()
    })
  })

  it('should handle invalid VAT number validation', async () => {
    // Mock failed VAT validation
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        message: 'BTW-nummer is niet geldig'
      })
    })

    render(<ClientForm onSuccess={mockOnSuccess} />)

    const businessToggle = screen.getByRole('checkbox', { name: /zakelijke klant/i })
    await user.click(businessToggle)

    const vatField = screen.getByLabelText('BTW-nummer')
    await user.type(vatField, 'INVALID123')

    await waitFor(() => {
      expect(screen.getByText('BTW-nummer is niet geldig')).toBeInTheDocument()
    }, { timeout: 1000 })
  })

  it('should submit form with valid data', async () => {
    // Mock successful client creation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: {
          id: 'client-123',
          name: 'Jan Janssen',
          email: 'jan@example.com',
          is_business: false
        }
      })
    })

    render(<ClientForm onSuccess={mockOnSuccess} />)

    // Fill in required fields
    const nameField = screen.getByLabelText('Naam')
    const emailField = screen.getByLabelText('E-mailadres')
    const submitButton = screen.getByRole('button', { name: /klant toevoegen/i })

    await user.type(nameField, 'Jan Janssen')
    await user.type(emailField, 'jan@example.com')
    await user.click(submitButton)

    // Should submit form
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Jan Janssen')
      })
    })

    // Should call success callback
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(expect.objectContaining({
        id: 'client-123',
        name: 'Jan Janssen'
      }))
    })
  })

  it('should handle form submission errors', async () => {
    // Mock failed client creation
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<ClientForm onSuccess={mockOnSuccess} />)

    const nameField = screen.getByLabelText('Naam')
    const emailField = screen.getByLabelText('E-mailadres')
    const submitButton = screen.getByRole('button', { name: /klant toevoegen/i })

    await user.type(nameField, 'Jan Janssen')
    await user.type(emailField, 'jan@example.com')
    await user.click(submitButton)

    // Should show error (in real app this would be a toast)
    // For now we just verify the form doesn't call success
    await waitFor(() => {
      expect(mockOnSuccess).not.toHaveBeenCalled()
    })
  })

  it('should populate form when editing existing client', () => {
    const existingClient = {
      id: 'client-123',
      name: 'Existing Client',
      email: 'existing@example.com',
      company_name: 'Existing Company BV',
      is_business: true,
      is_supplier: true,
      vat_number: 'NL123456789B01',
      default_payment_terms: 30,
      notes: 'Important client'
    }

    render(<ClientForm client={existingClient as any} onSuccess={mockOnSuccess} />)

    // Should show edit mode
    expect(screen.getByText('Klant bewerken')).toBeInTheDocument()

    // Fields should be populated
    expect(screen.getByDisplayValue('Existing Client')).toBeInTheDocument()
    expect(screen.getByDisplayValue('existing@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Existing Company BV')).toBeInTheDocument()
    expect(screen.getByDisplayValue('NL123456789B01')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Important client')).toBeInTheDocument()

    // Checkboxes should be checked
    const businessToggle = screen.getByRole('checkbox', { name: /zakelijke klant/i })
    const supplierToggle = screen.getByRole('checkbox', { name: /ook leverancier/i })
    
    expect(businessToggle).toBeChecked()
    expect(supplierToggle).toBeChecked()

    // Submit button should say "bijwerken"
    expect(screen.getByRole('button', { name: /klant bijwerken/i })).toBeInTheDocument()
  })

  it('should call onCancel when cancel button is clicked', async () => {
    render(<ClientForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

    const cancelButton = screen.getByRole('button', { name: /annuleren/i })
    await user.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('should validate payment terms range', async () => {
    render(<ClientForm onSuccess={mockOnSuccess} />)

    const nameField = screen.getByLabelText('Naam')
    const emailField = screen.getByLabelText('E-mailadres')
    const paymentTermsField = screen.getByLabelText(/betalingstermijn/i)
    const submitButton = screen.getByRole('button', { name: /klant toevoegen/i })

    await user.type(nameField, 'Test Client')
    await user.type(emailField, 'test@example.com')
    await user.clear(paymentTermsField)
    await user.type(paymentTermsField, '0') // Invalid: should be > 0

    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/betalingstermijn moet tussen 1 en 365 dagen/i)).toBeInTheDocument()
    })
  })
})