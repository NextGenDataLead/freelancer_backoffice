import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '../badge'

describe('Badge Component', () => {
  it('should render with default props', () => {
    render(<Badge>Default Badge</Badge>)
    const badge = screen.getByText('Default Badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-primary')
  })

  it('should apply variant classes', () => {
    render(<Badge variant="destructive">Destructive Badge</Badge>)
    const badge = screen.getByText('Destructive Badge')
    expect(badge).toHaveClass('bg-destructive')
  })

  it('should render as a child component', () => {
    render(
      <Badge asChild>
        <div>Child Element</div>
      </Badge>
    )
    const child = screen.getByText('Child Element')
    expect(child).toBeInTheDocument()
    expect(child).toHaveClass('inline-flex')
  })

  it('should apply custom classNames', () => {
    render(<Badge className="custom-badge-class">Custom</Badge>)
    const badge = screen.getByText('Custom')
    expect(badge).toHaveClass('custom-badge-class')
  })
})
