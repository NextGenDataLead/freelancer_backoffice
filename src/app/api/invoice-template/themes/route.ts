// Invoice Template Themes API
// GET endpoint for available template themes and presets
// Generated with Claude Code (https://claude.ai/code)

import { NextResponse } from 'next/server'
import { 
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'
import type { TemplateTheme, TemplateThemeConfig } from '@/lib/types/template'

// =============================================================================
// THEME DEFINITIONS
// =============================================================================

const TEMPLATE_THEMES: TemplateThemeConfig[] = [
  {
    id: 'stripe_inspired',
    name: 'Stripe Professional',
    description: 'Inspired by Stripe\'s sophisticated design with premium gradients and modern typography',
    preview_url: '/api/invoice-template/preview/stripe-inspired.png',
    brand_settings: {
      primary_color: '#635bff',
      secondary_color: '#0a2540',
      accent_color: '#00d4ff',
      text_color: '#1a202c',
      background_color: '#ffffff',
      font_family: 'Inter'
    },
    layout_settings: {
      header_style: 'premium',
      footer_style: 'modern',
      color_scheme: 'stripe',
      spacing: 'optimal',
      border_style: 'premium'
    }
  },
  {
    id: 'modern_blue',
    name: 'Modern Blue',
    description: 'Professional blue theme with enhanced gradients and sophisticated typography',
    preview_url: '/api/invoice-template/preview/modern-blue.png',
    brand_settings: {
      primary_color: '#2563eb',
      secondary_color: '#64748b',
      accent_color: '#0ea5e9',
      text_color: '#1f2937',
      background_color: '#ffffff',
      font_family: 'Inter'
    },
    layout_settings: {
      header_style: 'modern',
      footer_style: 'simple',
      color_scheme: 'blue',
      spacing: 'comfortable',
      border_style: 'subtle'
    }
  },
  {
    id: 'executive_black',
    name: 'Executive Black',
    description: 'Premium executive design with sophisticated shadows and professional emphasis',
    preview_url: '/api/invoice-template/preview/executive-black.png',
    brand_settings: {
      primary_color: '#1f2937',
      secondary_color: '#6b7280',
      accent_color: '#374151',
      text_color: '#1f2937',
      background_color: '#ffffff',
      font_family: 'Inter'
    },
    layout_settings: {
      header_style: 'executive',
      footer_style: 'detailed',
      color_scheme: 'black',
      spacing: 'comfortable',
      border_style: 'sophisticated'
    }
  },
  {
    id: 'dutch_orange',
    name: 'Dutch Orange Premium',
    description: 'Netherlands-inspired design with enhanced gradients and modern sophistication',
    preview_url: '/api/invoice-template/preview/dutch-orange.png',
    brand_settings: {
      primary_color: '#f97316',
      secondary_color: '#ea580c',
      accent_color: '#fb923c',
      text_color: '#1f2937',
      background_color: '#ffffff',
      font_family: 'Inter'
    },
    layout_settings: {
      header_style: 'modern',
      footer_style: 'simple',
      color_scheme: 'orange',
      spacing: 'comfortable',
      border_style: 'warm'
    }
  },
  {
    id: 'minimalist_platinum',
    name: 'Minimalist Platinum',
    description: 'Ultra-refined minimal design with platinum tones and maximum sophistication',
    preview_url: '/api/invoice-template/preview/minimalist-platinum.png',
    brand_settings: {
      primary_color: '#71717a',
      secondary_color: '#a1a1aa',
      accent_color: '#52525b',
      text_color: '#27272a',
      background_color: '#ffffff',
      font_family: 'Inter'
    },
    layout_settings: {
      header_style: 'minimal',
      footer_style: 'minimal',
      color_scheme: 'platinum',
      spacing: 'spacious',
      border_style: 'refined'
    }
  },
  {
    id: 'corporate_emerald',
    name: 'Corporate Emerald',
    description: 'Professional eco-conscious theme with sophisticated green gradients and trust elements',
    preview_url: '/api/invoice-template/preview/corporate-emerald.png',
    brand_settings: {
      primary_color: '#059669',
      secondary_color: '#047857',
      accent_color: '#10b981',
      text_color: '#1f2937',
      background_color: '#ffffff',
      font_family: 'Inter'
    },
    layout_settings: {
      header_style: 'corporate',
      footer_style: 'detailed',
      color_scheme: 'emerald',
      spacing: 'comfortable',
      border_style: 'professional'
    }
  },
  {
    id: 'fintech_purple',
    name: 'Fintech Purple',
    description: 'Modern fintech-inspired design with sophisticated purple gradients and premium feel',
    preview_url: '/api/invoice-template/preview/fintech-purple.png',
    brand_settings: {
      primary_color: '#7c3aed',
      secondary_color: '#a855f7',
      accent_color: '#8b5cf6',
      text_color: '#1f2937',
      background_color: '#ffffff',
      font_family: 'Inter'
    },
    layout_settings: {
      header_style: 'fintech',
      footer_style: 'modern',
      color_scheme: 'purple',
      spacing: 'optimal',
      border_style: 'premium'
    }
  },
  {
    id: 'warm_burgundy',
    name: 'Warm Burgundy',
    description: 'Sophisticated burgundy theme with premium gradients and executive presence',
    preview_url: '/api/invoice-template/preview/warm-burgundy.png',
    brand_settings: {
      primary_color: '#be123c',
      secondary_color: '#e11d48',
      accent_color: '#f43f5e',
      text_color: '#1f2937',
      background_color: '#ffffff',
      font_family: 'Inter'
    },
    layout_settings: {
      header_style: 'executive',
      footer_style: 'sophisticated',
      color_scheme: 'burgundy',
      spacing: 'comfortable',
      border_style: 'premium'
    }
  }
]

// =============================================================================
// FONT FAMILIES
// =============================================================================

const AVAILABLE_FONTS = [
  { 
    family: 'Inter', 
    name: 'Inter (Modern Sans-serif)', 
    category: 'sans-serif',
    web_safe: false,
    google_font: true
  },
  { 
    family: 'Roboto', 
    name: 'Roboto (Clean Sans-serif)', 
    category: 'sans-serif',
    web_safe: false,
    google_font: true
  },
  { 
    family: 'Open Sans', 
    name: 'Open Sans (Friendly Sans-serif)', 
    category: 'sans-serif',
    web_safe: false,
    google_font: true
  },
  { 
    family: 'Poppins', 
    name: 'Poppins (Contemporary Sans-serif)', 
    category: 'sans-serif',
    web_safe: false,
    google_font: true
  },
  { 
    family: 'Montserrat', 
    name: 'Montserrat (Geometric Sans-serif)', 
    category: 'sans-serif',
    web_safe: false,
    google_font: true
  },
  { 
    family: 'Lora', 
    name: 'Lora (Modern Serif)', 
    category: 'serif',
    web_safe: false,
    google_font: true
  },
  { 
    family: 'Merriweather', 
    name: 'Merriweather (Traditional Serif)', 
    category: 'serif',
    web_safe: false,
    google_font: true
  },
  { 
    family: 'Arial', 
    name: 'Arial (System Sans-serif)', 
    category: 'sans-serif',
    web_safe: true,
    google_font: false
  },
  { 
    family: 'Times New Roman', 
    name: 'Times New Roman (System Serif)', 
    category: 'serif',
    web_safe: true,
    google_font: false
  },
  { 
    family: 'Georgia', 
    name: 'Georgia (System Serif)', 
    category: 'serif',
    web_safe: true,
    google_font: false
  }
]

// =============================================================================
// COLOR PALETTES
// =============================================================================

const COLOR_PALETTES = {
  professional: [
    { name: 'Navy Blue', hex: '#1e40af' },
    { name: 'Royal Blue', hex: '#2563eb' },
    { name: 'Sky Blue', hex: '#0ea5e9' },
    { name: 'Slate Gray', hex: '#475569' },
    { name: 'Cool Gray', hex: '#6b7280' }
  ],
  creative: [
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Orange', hex: '#f97316' },
    { name: 'Purple', hex: '#8b5cf6' },
    { name: 'Pink', hex: '#ec4899' },
    { name: 'Teal', hex: '#14b8a6' }
  ],
  corporate: [
    { name: 'Forest Green', hex: '#16a34a' },
    { name: 'Deep Blue', hex: '#1d4ed8' },
    { name: 'Burgundy', hex: '#991b1b' },
    { name: 'Dark Gray', hex: '#374151' },
    { name: 'Black', hex: '#111827' }
  ],
  dutch_national: [
    { name: 'Dutch Orange', hex: '#ff6600' },
    { name: 'Royal Orange', hex: '#f97316' },
    { name: 'Deep Orange', hex: '#ea580c' },
    { name: 'Light Orange', hex: '#fb923c' },
    { name: 'Warm Orange', hex: '#fed7aa' }
  ]
}

// =============================================================================
// GET THEMES AND CONFIGURATION OPTIONS
// =============================================================================

export async function GET() {
  try {
    // Get authenticated user profile  
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Enhanced theme data with sophisticated color schemes
    const themeData = {
      themes: [
        {
          id: 'stripe_inspired',
          name: 'Stripe Professional',
          description: 'Inspired by Stripe\'s sophisticated design with premium gradients',
          brand_settings: { primary_color: '#635bff', secondary_color: '#0a2540', accent_color: '#00d4ff' },
          layout_settings: { header_style: 'premium', color_scheme: 'stripe', border_style: 'premium' }
        },
        {
          id: 'modern_blue',
          name: 'Modern Blue',
          description: 'Professional blue theme with enhanced gradients and sophisticated typography',
          brand_settings: { primary_color: '#2563eb', secondary_color: '#64748b', accent_color: '#0ea5e9' },
          layout_settings: { header_style: 'modern', color_scheme: 'blue', border_style: 'subtle' }
        },
        {
          id: 'executive_black', 
          name: 'Executive Black',
          description: 'Premium executive design with sophisticated shadows and professional emphasis',
          brand_settings: { primary_color: '#1f2937', secondary_color: '#6b7280', accent_color: '#374151' },
          layout_settings: { header_style: 'executive', color_scheme: 'black', border_style: 'sophisticated' }
        },
        {
          id: 'dutch_orange',
          name: 'Dutch Orange Premium', 
          description: 'Netherlands-inspired design with enhanced gradients and modern sophistication',
          brand_settings: { primary_color: '#f97316', secondary_color: '#ea580c', accent_color: '#fb923c' },
          layout_settings: { header_style: 'modern', color_scheme: 'orange', border_style: 'warm' }
        },
        {
          id: 'minimalist_platinum',
          name: 'Minimalist Platinum',
          description: 'Ultra-refined minimal design with platinum tones and maximum sophistication',
          brand_settings: { primary_color: '#71717a', secondary_color: '#a1a1aa', accent_color: '#52525b' },
          layout_settings: { header_style: 'minimal', color_scheme: 'platinum', border_style: 'refined' }
        },
        {
          id: 'corporate_emerald',
          name: 'Corporate Emerald',
          description: 'Professional eco-conscious theme with sophisticated green gradients',
          brand_settings: { primary_color: '#059669', secondary_color: '#047857', accent_color: '#10b981' },
          layout_settings: { header_style: 'corporate', color_scheme: 'emerald', border_style: 'professional' }
        },
        {
          id: 'fintech_purple',
          name: 'Fintech Purple',
          description: 'Modern fintech-inspired design with sophisticated purple gradients',
          brand_settings: { primary_color: '#7c3aed', secondary_color: '#a855f7', accent_color: '#8b5cf6' },
          layout_settings: { header_style: 'fintech', color_scheme: 'purple', border_style: 'premium' }
        },
        {
          id: 'warm_burgundy',
          name: 'Warm Burgundy',
          description: 'Sophisticated burgundy theme with premium gradients and executive presence',
          brand_settings: { primary_color: '#be123c', secondary_color: '#e11d48', accent_color: '#f43f5e' },
          layout_settings: { header_style: 'executive', color_scheme: 'burgundy', border_style: 'premium' }
        }
      ],
      options: {
        languages: [
          { value: 'nl', label: 'Nederlands (Dutch)', recommended: true },
          { value: 'en', label: 'English' }
        ],
        formats: [
          { value: 'A4', label: 'A4 (210 × 297 mm)', recommended: true },
          { value: 'Letter', label: 'US Letter (8.5 × 11 in)' }
        ]
      }
    }
    
    const response = createApiResponse(themeData, 'Template themes retrieved successfully')
    return NextResponse.json(response)

  } catch (error) {
    console.error('Themes API error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

// =============================================================================
// THEME APPLICATION HELPER (for future use)
// =============================================================================

function applyThemeToConfig(
  baseConfig: any,
  themeId: TemplateTheme
): any {
  const theme = TEMPLATE_THEMES.find(t => t.id === themeId)
  
  if (!theme) {
    throw new Error(`Theme ${themeId} not found`)
  }

  return {
    ...baseConfig,
    brand_settings: {
      ...baseConfig.brand_settings,
      ...theme.brand_settings
    },
    layout_settings: {
      ...baseConfig.layout_settings,
      ...theme.layout_settings
    }
  }
}