import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Switch } from '@/components/ui/switch'

describe('Switch Component', () => {
  it('renders unchecked by default', () => {
    render(<Switch />)
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toBeInTheDocument()
    expect(switchElement).toHaveAttribute('aria-checked', 'false')
    expect(switchElement).toHaveClass('bg-slate-200')
  })

  it('renders checked when defaultChecked is true', () => {
    render(<Switch defaultChecked />)
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveAttribute('aria-checked', 'true')
    expect(switchElement).toHaveClass('bg-slate-900')
  })

  it('renders checked when checked prop is true', () => {
    render(<Switch checked />)
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveAttribute('aria-checked', 'true')
    expect(switchElement).toHaveClass('bg-slate-900')
  })

  it('handles click events and toggles state', () => {
    const handleChange = vi.fn()
    render(<Switch onCheckedChange={handleChange} />)
    
    const switchElement = screen.getByRole('switch')
    fireEvent.click(switchElement)
    
    expect(handleChange).toHaveBeenCalledWith(true)
  })

  it('does not toggle when disabled', () => {
    const handleChange = vi.fn()
    render(<Switch disabled onCheckedChange={handleChange} />)
    
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toBeDisabled()
    expect(switchElement).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
    
    fireEvent.click(switchElement)
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('has proper accessibility attributes', () => {
    render(<Switch aria-label="Toggle notifications" />)
    const switchElement = screen.getByRole('switch')
    
    expect(switchElement).toHaveAttribute('role', 'switch')
    expect(switchElement).toHaveAttribute('aria-label', 'Toggle notifications')
    expect(switchElement).toHaveAttribute('aria-checked')
  })

  it('applies custom className', () => {
    render(<Switch className="custom-switch" />)
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveClass('custom-switch')
  })

  it('forwards ref correctly', () => {
    const ref = vi.fn()
    render(<Switch ref={ref} />)
    expect(ref).toHaveBeenCalled()
  })

  it('updates thumb position based on checked state', () => {
    const { rerender } = render(<Switch checked={false} />)
    let thumb = screen.getByRole('switch').querySelector('.translate-x-0')
    expect(thumb).toBeInTheDocument()

    rerender(<Switch checked={true} />)
    thumb = screen.getByRole('switch').querySelector('.translate-x-5')
    expect(thumb).toBeInTheDocument()
  })
})