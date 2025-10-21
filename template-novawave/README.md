# NovaWave Finance Dashboard Template

A modern, neumorphic finance dashboard template built with Next.js 14, featuring glass-morphism design, smooth animations, and interactive charts.

## 📦 What's Included

- **Complete Next.js App Router setup**
- **3 CSS files** (theme, animations, components)
- **4 JavaScript files** (utils, chart, interactions, mobile)
- **Full homepage component** with dashboard UI
- **Responsive design** optimized for mobile and desktop

## 🎨 Design Features

- Neumorphic glass-morphism design
- Dark theme with cyan/blue accents
- Smooth entrance animations
- Interactive Chart.js visualizations
- Touch gestures & pull-to-refresh
- Fully accessible (ARIA labels)

## 📖 Documentation

See **[docs/INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md)** for detailed integration instructions.

## 🚀 Quick Start

```bash
# 1. Install dependencies in your project
npm install chart.js lucide-react

# 2. Copy files to your project
cp -r styles/* <your-project>/app/styles/
cp -r public/js/* <your-project>/public/js/

# 3. Follow the integration guide
# See docs/INTEGRATION_GUIDE.md for step-by-step instructions
```

## 📂 File Structure

```
template-novawave/
├── app/
│   ├── layout.jsx          # Root layout
│   └── page.jsx            # Homepage dashboard
├── styles/
│   ├── theme.css           # Design variables
│   ├── animations.css      # Transitions & animations
│   └── components.css      # Component styles
├── public/js/
│   ├── utils.js            # Helper functions
│   ├── chart.js            # Chart initialization
│   ├── interactions.js     # Desktop interactions
│   └── mobile-interactions.js  # Mobile gestures
└── docs/
    └── INTEGRATION_GUIDE.md    # Detailed instructions
```

## 🔗 Dependencies

- `next@14.2.13`
- `react@18.3.1`
- `chart.js@^4.4.6`
- `lucide-react@^0.454.0`

## 💡 Usage

This template is designed to be integrated piece by piece into your existing Next.js project. You can:

1. **Replace your entire homepage** - Copy all files and replace
2. **Selective integration** - Pick specific components or sections
3. **New route** - Create a separate dashboard route

Refer to the [Integration Guide](docs/INTEGRATION_GUIDE.md) for detailed instructions.

---

**Template Source:** Extracted from `/home/jimbojay/code/Test`
**Ready for integration into:** `/home/jimbojay/code/Backoffice`
