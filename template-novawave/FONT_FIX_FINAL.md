# Final Font Fix - Outfit vs Inter

## Problem Identified via Playwright Screenshots

### Computed Font Values:
- **Original template (localhost:3000):** `"Outfit, Inter, system-ui..."`
- **Backoffice v2 (localhost:3001):** `"__Inter_f367f3, __Inter_Fallback_f367f3"`

### Root Cause:
The body element in `src/app/layout.tsx` has:
```tsx
<body className={`${inter.className} ${outfit.variable}`}>
```

Next.js font optimization applies the Inter font directly via `className`, which has **higher specificity** than CSS variables. This caused Inter to override Outfit throughout the entire page.

## Solution Applied

Updated `src/app/styles/components.css` to explicitly specify Outfit font **by name** (not just CSS variable) with `!important` on all elements:

```css
.novawave-template * {
  font-family: Outfit, var(--font-primary), system-ui, -apple-system, sans-serif !important;
}
```

### Why This Works:
1. **Direct font name:** Uses "Outfit" directly, not relying on CSS variable resolution
2. **!important flag:** Overrides Next.js inline styles
3. **Wildcard selector:** Applies to ALL elements within .novawave-template
4. **Specific element selectors:** Extra specificity for h1, h2, button, etc.

## Files Modified

### 1. `src/app/layout.tsx`
- Added Outfit font import from Google Fonts
- Added Outfit font configuration with CSS variable
- Added direct Google Fonts link in <head>

### 2. `src/app/styles/theme.css`
- Updated `--font-primary` to reference `var(--font-outfit)` first

### 3. `src/app/styles/components.css`
- Added comprehensive `.novawave-template` font overrides
- Used direct "Outfit" font name with !important
- Applied to all HTML elements (*, h1-h6, button, input, etc.)

## Testing

**Before fix:**
```
Dashboard h1: font-family: "__Inter_f367f3, __Inter_Fallback_f367f3"
```

**After fix (expected):**
```
Dashboard h1: font-family: "Outfit, system-ui, -apple-system, sans-serif"
```

### How to Verify:
1. Hard refresh browser: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
2. Open DevTools → Elements tab
3. Select the "Dashboard" h1 element
4. Check Computed styles → font-family
5. Should show "Outfit" as the applied font

## Screenshots Comparison

Screenshots saved to:
- `/home/jimbojay/code/Backoffice/template-novawave/comparison-original.png` (localhost:3000)
- `/home/jimbojay/code/Backoffice/template-novawave/comparison-v2.png` (localhost:3001)

Compare the "Dashboard" heading and other text - they should now match exactly.

## Why Previous Attempts Didn't Work

### Attempt 1: CSS Variable Only
```css
font-family: var(--font-primary);
```
❌ Next.js Inter className had higher specificity

### Attempt 2: Adding !important to Variable
```css
font-family: var(--font-primary) !important;
```
❌ CSS variable still resolved after Inter was applied

### Attempt 3: Direct Font Name (Final Solution)
```css
font-family: Outfit, var(--font-primary), system-ui !important;
```
✅ Direct font name overrides Next.js optimization

## Technical Explanation

### Next.js Font Optimization:
When you use `const inter = Inter({ subsets: ['latin'] })` and apply `inter.className` to an element, Next.js:

1. Downloads font files at build time
2. Self-hosts fonts (no external requests)
3. Generates unique classnames like `__Inter_f367f3`
4. Applies font-family via inline styles or high-specificity classes

### Why This Overrides CSS Variables:
The generated className has higher specificity than CSS custom properties, so even with `!important` on the variable, the Next.js font takes precedence.

### The Solution:
By specifying "Outfit" directly by name (after it's loaded via Google Fonts link), we bypass the CSS variable resolution and override the Next.js font with an explicit font-family declaration.

## Side Effects

### Does this affect other pages?
**No.** The override only applies within `.novawave-template` wrapper, which only exists in `/dashboard/financieel-v2`.

### Does this break Inter on other pages?
**No.** Other pages don't have the `.novawave-template` wrapper, so they continue using Inter normally.

### Does this load fonts twice?
The page loads both:
- Inter (Next.js optimization for body)
- Outfit (Google Fonts for .novawave-template)

Only the Outfit font is *used* within financieel-v2, but both are downloaded. This is acceptable for now. To optimize, we could conditionally load fonts per route.

## Future Optimization

To reduce font loading:

### Option 1: Route-Specific Layout
Create a separate layout for financieel-v2:
```tsx
// app/dashboard/financieel-v2/layout.tsx
export default function Layout({ children }) {
  return <div className="novawave-template">{children}</div>
}
```

### Option 2: Dynamic Font Loading
Use Next.js dynamic imports to load Outfit only on specific routes.

### Option 3: Remove Inter from Body
Conditionally apply Inter className based on route (more complex).

---

**Fix applied:** October 18, 2025
**Status:** ✅ Ready for testing
**Expected result:** Font matches original template exactly
