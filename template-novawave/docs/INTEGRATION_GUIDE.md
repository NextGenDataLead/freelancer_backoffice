# NovaWave Finance Dashboard Template - Integration Guide

This folder contains a complete neumorphic finance dashboard template extracted from the Test project. Follow the instructions below to integrate it into your Backoffice project piece by piece.

## 📁 Template Structure

```
template-novawave/
├── app/
│   ├── layout.jsx          # Root layout with fonts, meta tags, scripts
│   └── page.jsx            # Complete dashboard homepage component
├── styles/
│   ├── theme.css           # CSS variables, color scheme, neumorphic design
│   ├── animations.css      # Smooth transitions & micro-interactions
│   └── components.css      # Glass cards, sidebar, topbar, tables, etc.
├── public/
│   └── js/
│       ├── utils.js                 # Utility functions
│       ├── chart.js                 # Chart.js initialization
│       ├── interactions.js          # Desktop interactions
│       └── mobile-interactions.js   # Mobile/touch interactions
├── docs/
│   └── INTEGRATION_GUIDE.md        # This file
└── package.json.reference          # Dependencies reference
```

---

## 🎯 Step-by-Step Integration

### Step 1: Install Required Dependencies

```bash
cd /home/jimbojay/code/Backoffice
npm install chart.js lucide-react
```

**Dependencies:**
- `chart.js@^4.4.6` - For balance chart visualization
- `lucide-react@^0.454.0` - Icon library
- `next@14.2.13` (you likely already have this)
- `react@18.3.1` (you likely already have this)

---

### Step 2: Copy Styles to Your Project

```bash
# Option A: Copy all styles at once
cp -r template-novawave/styles/* <your-styles-directory>/

# Option B: Copy individual style files
cp template-novawave/styles/theme.css <your-styles-directory>/
cp template-novawave/styles/animations.css <your-styles-directory>/
cp template-novawave/styles/components.css <your-styles-directory>/
```

**What each style file does:**
- **theme.css**: Defines CSS variables for colors, spacing, neumorphic shadows
- **animations.css**: Smooth transitions, hover effects, entrance animations
- **components.css**: Styles for dashboard components (cards, sidebar, topbar, etc.)

---

### Step 3: Copy Public Assets

```bash
# Copy JavaScript files to your public directory
cp -r template-novawave/public/js/* <your-public-directory>/js/
```

**What each JS file does:**
- **utils.js**: Helper functions for DOM manipulation, formatting
- **chart.js**: Initializes Chart.js for the balance chart
- **interactions.js**: Handles desktop interactions (sidebar, navigation, etc.)
- **mobile-interactions.js**: Touch gestures, pull-to-refresh, mobile menu

---

### Step 4: Update Your Layout (app/layout.jsx)

**Key elements to integrate from `template-novawave/app/layout.jsx`:**

1. **Add Google Fonts (Outfit font family)**
2. **Import CSS files in correct order**
3. **Add Script tags for Lucide icons and Chart.js**
4. **Add custom JS script tags**

**Example integration:**

```jsx
import "./globals.css";
import "../styles/theme.css";
import "../styles/animations.css";
import "../styles/components.css";
import Script from "next/script";

export const metadata = {
  title: "Your App - Dashboard",
  description: "Your description",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <meta name="theme-color" content="#050b1b" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Script src="https://unpkg.com/lucide@latest" strategy="beforeInteractive" />
        <Script src="https://cdn.jsdelivr.net/npm/chart.js" strategy="beforeInteractive" />
        <Script src="/js/utils.js" strategy="afterInteractive" />
        <Script src="/js/chart.js" strategy="afterInteractive" />
        <Script src="/js/interactions.js" strategy="afterInteractive" />
        <Script src="/js/mobile-interactions.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
```

---

### Step 5: Update Your Homepage (app/page.jsx)

**Options:**

**Option A: Full Replacement**
```bash
# Replace your entire homepage with the template
cp template-novawave/app/page.jsx <your-app-directory>/page.jsx
```

**Option B: Selective Integration**
- Open `template-novawave/app/page.jsx`
- Copy specific sections you want (sidebar, topbar, cards, etc.)
- Integrate them into your existing page component

**Option C: Create a New Route**
```bash
# Create a new dashboard route
mkdir -p app/dashboard
cp template-novawave/app/page.jsx app/dashboard/page.jsx
```

---

### Step 6: Customize for Your Needs

**Common customizations:**

1. **Update branding:**
   - Change logo in `page.jsx:14-42`
   - Update title in `layout.jsx:8`

2. **Modify navigation:**
   - Edit sidebar buttons in `page.jsx:44-65`
   - Update topbar actions in `page.jsx:78-101`

3. **Customize colors:**
   - Edit CSS variables in `styles/theme.css`
   - Modify gradient colors in card components

4. **Connect to real data:**
   - Replace static data in `page.jsx` with API calls
   - Update chart data in `public/js/chart.js`

---

## 🎨 Key Design Features

- **Neumorphic glass-morphism design** - Soft, elevated cards with backdrop blur
- **Fully responsive** - Mobile-first design with touch interactions
- **Dark theme optimized** - Deep blue background with cyan/blue accents
- **Smooth animations** - Entrance animations, hover effects, transitions
- **Interactive charts** - Chart.js powered balance visualization
- **Accessibility** - ARIA labels, semantic HTML, keyboard navigation

---

## 🔧 Troubleshooting

### Styles not loading?
- Check CSS import order in `layout.jsx`
- Ensure file paths match your project structure
- Clear Next.js cache: `rm -rf .next && npm run dev`

### Icons not showing?
- Verify Lucide script is loading: Check browser console
- Ensure `lucide-react` is installed: `npm list lucide-react`

### Chart not rendering?
- Check Chart.js is loaded: Browser console
- Verify canvas element exists: `<canvas id="balanceChart" />`
- Check `/js/chart.js` is being executed

### JavaScript errors?
- Ensure all JS files are copied to `public/js/`
- Check script loading order in `layout.jsx`
- Verify DOM elements exist before JS initializes

---

## 📝 Notes

- This template uses **Next.js 14** with App Router
- Chart.js is loaded via CDN (can switch to npm package if preferred)
- Lucide icons are loaded via CDN + npm package
- All custom JS uses vanilla JavaScript (no framework dependencies)

---

## 🚀 Quick Start Command Sequence

```bash
# Navigate to your Backoffice project
cd /home/jimbojay/code/Backoffice

# Install dependencies
npm install chart.js lucide-react

# Copy styles
cp -r template-novawave/styles/* app/styles/

# Copy public assets
cp -r template-novawave/public/js/* public/js/

# Copy components (or manually integrate)
cp template-novawave/app/page.jsx app/page.jsx

# Update layout.jsx with template changes
# (Manually merge or replace)

# Run dev server
npm run dev
```

---

## 📞 Need Help?

When working through integration, reference:
- `template-novawave/app/layout.jsx` - For layout configuration
- `template-novawave/app/page.jsx` - For component structure
- `template-novawave/styles/theme.css` - For design variables
- `package.json.reference` - For exact dependency versions

Good luck with your integration!
