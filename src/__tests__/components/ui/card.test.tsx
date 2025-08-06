import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

describe('Card Components', () => {
  describe('Card', () => {
    it('renders with correct styles', () => {
      render(<Card>Test Card</Card>)
      const card = screen.getByText('Test Card')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass('bg-card', 'text-card-foreground')
    })

    it('applies custom className', () => {
      render(<Card className="custom-card">Custom Card</Card>)
      const card = screen.getByText('Custom Card')
      expect(card).toHaveClass('custom-card')
    })

    it('renders without ref issues', () => {
      render(<Card>Ref Card</Card>)
      expect(screen.getByText('Ref Card')).toBeInTheDocument()
    })
  })

  describe('CardHeader', () => {
    it('renders with correct styles', () => {
      render(<CardHeader>Header Content</CardHeader>)
      const header = screen.getByText('Header Content')
      expect(header).toBeInTheDocument()
      expect(header).toHaveClass('grid', 'px-6')
    })

    it('applies custom className', () => {
      render(<CardHeader className="custom-header">Custom Header</CardHeader>)
      const header = screen.getByText('Custom Header')
      expect(header).toHaveClass('custom-header')
    })

    it('renders without ref issues', () => {
      render(<CardHeader>Ref Header</CardHeader>)
      expect(screen.getByText('Ref Header')).toBeInTheDocument()
    })
  })

  describe('CardTitle', () => {
    it('renders with correct styles', () => {
      render(<CardTitle>Title</CardTitle>)
      const title = screen.getByText('Title')
      expect(title).toBeInTheDocument()
      expect(title).toHaveClass('leading-none', 'font-semibold')
    })

    it('applies custom className', () => {
      render(<CardTitle className="custom-title">Custom Title</CardTitle>)
      const title = screen.getByText('Custom Title')
      expect(title).toHaveClass('custom-title')
    })

    it('renders without ref issues', () => {
      render(<CardTitle>Ref Title</CardTitle>)
      expect(screen.getByText('Ref Title')).toBeInTheDocument()
    })
  })

  describe('CardContent', () => {
    it('renders with correct styles', () => {
      render(<CardContent>Content</CardContent>)
      const content = screen.getByText('Content')
      expect(content).toBeInTheDocument()
      expect(content).toHaveClass('px-6')
    })

    it('applies custom className', () => {
      render(<CardContent className="custom-content">Custom Content</CardContent>)
      const content = screen.getByText('Custom Content')
      expect(content).toHaveClass('custom-content')
    })

    it('renders without ref issues', () => {
      render(<CardContent>Ref Content</CardContent>)
      expect(screen.getByText('Ref Content')).toBeInTheDocument()
    })
  })

  describe('Complete Card Structure', () => {
    it('renders full card with all components', () => {
      render(
        <Card data-testid="full-card">
          <CardHeader>
            <CardTitle>Test Card</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is the card content</p>
          </CardContent>
        </Card>
      )

      const card = screen.getByTestId('full-card')
      const title = screen.getByText('Test Card')
      const content = screen.getByText('This is the card content')

      expect(card).toBeInTheDocument()
      expect(title).toBeInTheDocument()
      expect(content).toBeInTheDocument()
    })
  })
})