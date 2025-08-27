/**
 * Smart Color Palette Generator
 * Generates coordinated color schemes from a single primary color
 * Generated with Claude Code (https://claude.ai/code)
 */

// Color manipulation utilities
export interface RGB {
  r: number
  g: number
  b: number
}

export interface HSL {
  h: number
  s: number
  l: number
}

export interface ColorPalette {
  primary: string
  primary_rgb: string
  secondary: string
  accent: string
  text_primary: string
  text_secondary: string
  text_muted: string
  background: string
  background_light: string
  background_dark: string
  gradient_primary: string
  gradient_secondary: string
  border: string
  border_light: string
}

/**
 * Convert hex color to RGB values
 */
export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) throw new Error(`Invalid hex color: ${hex}`)
  
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  }
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min
  const sum = max + min
  
  const l = sum / 2

  let h = 0
  let s = 0

  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - sum) : diff / sum

    switch (max) {
      case r:
        h = ((g - b) / diff) + (g < b ? 6 : 0)
        break
      case g:
        h = ((b - r) / diff) + 2
        break
      case b:
        h = ((r - g) / diff) + 4
        break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360
  const s = hsl.s / 100
  const l = hsl.l / 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h * 6) % 2 - 1))
  const m = l - c / 2

  let r = 0, g = 0, b = 0

  if (h < 1/6) {
    r = c; g = x; b = 0
  } else if (h < 2/6) {
    r = x; g = c; b = 0
  } else if (h < 3/6) {
    r = 0; g = c; b = x
  } else if (h < 4/6) {
    r = 0; g = x; b = c
  } else if (h < 5/6) {
    r = x; g = 0; b = c
  } else {
    r = c; g = 0; b = x
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  }
}

/**
 * Lighten a color by a percentage
 */
export function lighten(color: string, amount: number): string {
  const rgb = hexToRgb(color)
  const hsl = rgbToHsl(rgb)
  
  const newHsl: HSL = {
    ...hsl,
    l: Math.min(100, hsl.l + (amount * 100))
  }
  
  return rgbToHex(hslToRgb(newHsl))
}

/**
 * Darken a color by a percentage
 */
export function darken(color: string, amount: number): string {
  const rgb = hexToRgb(color)
  const hsl = rgbToHsl(rgb)
  
  const newHsl: HSL = {
    ...hsl,
    l: Math.max(0, hsl.l - (amount * 100))
  }
  
  return rgbToHex(hslToRgb(newHsl))
}

/**
 * Adjust saturation of a color
 */
export function saturate(color: string, amount: number): string {
  const rgb = hexToRgb(color)
  const hsl = rgbToHsl(rgb)
  
  const newHsl: HSL = {
    ...hsl,
    s: Math.max(0, Math.min(100, hsl.s + (amount * 100)))
  }
  
  return rgbToHex(hslToRgb(newHsl))
}

/**
 * Get complementary color (180° hue shift)
 */
export function complementary(color: string): string {
  const rgb = hexToRgb(color)
  const hsl = rgbToHsl(rgb)
  
  const newHsl: HSL = {
    ...hsl,
    h: (hsl.h + 180) % 360
  }
  
  return rgbToHex(hslToRgb(newHsl))
}

/**
 * Get high contrast color (white or black) based on luminance
 */
export function getHighContrastColor(color: string): string {
  const rgb = hexToRgb(color)
  
  // Calculate relative luminance
  const getLuminance = (c: number) => {
    const srgb = c / 255
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4)
  }
  
  const luminance = 0.2126 * getLuminance(rgb.r) + 0.7152 * getLuminance(rgb.g) + 0.0722 * getLuminance(rgb.b)
  
  // Return white for dark colors, black for light colors
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

/**
 * Generate a complete color palette from a primary color
 */
export function generateColorPalette(primaryColor: string): ColorPalette {
  const primaryRgb = hexToRgb(primaryColor)
  
  return {
    primary: primaryColor,
    primary_rgb: `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`,
    
    // Secondary colors - lighter variants of primary
    secondary: lighten(primaryColor, 0.3),
    accent: saturate(lighten(primaryColor, 0.2), 0.1),
    
    // High contrast text colors
    text_primary: getHighContrastColor(primaryColor),
    text_secondary: getHighContrastColor(primaryColor) === '#ffffff' 
      ? 'rgba(255, 255, 255, 0.8)' 
      : 'rgba(0, 0, 0, 0.7)',
    text_muted: getHighContrastColor(primaryColor) === '#ffffff'
      ? 'rgba(255, 255, 255, 0.6)'
      : 'rgba(0, 0, 0, 0.5)',
    
    // Background variations
    background: '#ffffff',
    background_light: lighten(primaryColor, 0.45),
    background_dark: darken(primaryColor, 0.1),
    
    // Gradients
    gradient_primary: `linear-gradient(135deg, ${primaryColor} 0%, ${darken(primaryColor, 0.1)} 100%)`,
    gradient_secondary: `linear-gradient(135deg, ${lighten(primaryColor, 0.4)} 0%, ${lighten(primaryColor, 0.2)} 100%)`,
    
    // Borders
    border: lighten(primaryColor, 0.3),
    border_light: lighten(primaryColor, 0.4)
  }
}

/**
 * Generate CSS custom properties from color palette
 */
export function generateCSSVariables(palette: ColorPalette): string {
  return `
    --brand-primary: ${palette.primary};
    --brand-primary-rgb: ${palette.primary_rgb};
    --brand-secondary: ${palette.secondary};
    --brand-accent: ${palette.accent};
    --brand-text: ${palette.text_primary};
    --brand-text-secondary: ${palette.text_secondary};
    --brand-text-muted: ${palette.text_muted};
    --brand-background: ${palette.background};
    --brand-background-light: ${palette.background_light};
    --brand-background-dark: ${palette.background_dark};
    --gradient-brand: ${palette.gradient_primary};
    --gradient-brand-light: ${palette.gradient_secondary};
    --brand-border: ${palette.border};
    --brand-border-light: ${palette.border_light};
  `.trim()
}

/**
 * Popular brand color presets
 */
export const BRAND_COLOR_PRESETS = {
  'Professional Blue': '#2563eb',
  'Corporate Navy': '#1e40af', 
  'Modern Teal': '#0891b2',
  'Success Green': '#16a34a',
  'Warning Orange': '#ea580c',
  'Elegant Purple': '#7c3aed',
  'Classic Black': '#1f2937',
  'Premium Gold': '#d97706',
  'Tech Gray': '#4b5563',
  'Creative Pink': '#db2777'
} as const

/**
 * Test if a color has good contrast ratio
 */
export function hasGoodContrast(color1: string, color2: string, level: 'AA' | 'AAA' = 'AA'): boolean {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)
  
  const getLum = (rgb: RGB) => {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      const srgb = c / 255
      return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  
  const lum1 = getLum(rgb1)
  const lum2 = getLum(rgb2)
  const ratio = (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05)
  
  return level === 'AAA' ? ratio >= 7 : ratio >= 4.5
}