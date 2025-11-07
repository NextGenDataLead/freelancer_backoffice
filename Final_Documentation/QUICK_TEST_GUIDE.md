# Quick Test Guide - Tijd Page

## Prerequisites

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```
   Make sure it's running on `http://localhost:3000`

---

## Running Tests

### 1. Unit Tests (Fast - ~5 seconds)

Test pure logic and calculations without UI:

```bash
# Run all unit tests
npm test -- src/__tests__/unit/tijd-page-components.test.tsx --run

# Run with coverage
npm test -- src/__tests__/unit/tijd-page-components.test.tsx --coverage

# Watch mode (re-runs on file changes)
npm test -- src/__tests__/unit/tijd-page-components.test.tsx
```

**Expected result:** ✅ 30/30 tests passing

---

### 2. E2E Tests (Slower - ~20-30 seconds per test)

Test the full user experience with a real browser:

#### Quick Start (Recommended)
```bash
# Run all E2E tests (Chromium only, single worker)
npx playwright test src/__tests__/e2e/tijd-page-comprehensive.spec.ts --project=chromium --workers=1
```

#### Other Options
```bash
# Run specific test suite
npx playwright test src/__tests__/e2e/tijd-page-comprehensive.spec.ts -g "Statistics Cards"

# Run with UI (interactive debugging)
npx playwright test src/__tests__/e2e/tijd-page-comprehensive.spec.ts --ui

# Run all browsers (slower)
npx playwright test src/__tests__/e2e/tijd-page-comprehensive.spec.ts

# View last test report
npx playwright show-report
```

**Expected result:** ✅ 24/24 tests passing

---

### 3. Integration Tests

Test API routes and database operations:

```bash
npm run test:integration
```

---

### 4. All Tests Together

```bash
npm run test:ci
```

This runs:
- Type checking
- Linting
- Unit tests with coverage
- E2E tests

---

## Common Issues & Fixes

### Issue: "Browser not installed"
```bash
npx playwright install
```

### Issue: "Port 3000 is not running"
Make sure dev server is running:
```bash
npm run dev
```

### Issue: "Tests timing out"
Use single worker to avoid conflicts:
```bash
npx playwright test --workers=1
```

### Issue: "Login failing"
The tests use these credentials:
- Email: `imre.iddatasolutions@gmail.com`
- Password: `Qy192837465!?`

Make sure this user exists in your Clerk dashboard.

---

## Test Files Location

```
Backoffice/
├── src/__tests__/
│   ├── unit/
│   │   └── tijd-page-components.test.tsx       # 30 unit tests
│   ├── e2e/
│   │   └── tijd-page-comprehensive.spec.ts     # 24 E2E tests
│   └── integration/
│       └── time-tracking-api.test.ts           # API tests
└── Final_Documentation/
    ├── TIJD_PAGE_TEST_SUMMARY.md               # Full documentation
    └── QUICK_TEST_GUIDE.md                     # This file
```

---

## Quick Reference

| Command | What it does | Time |
|---------|-------------|------|
| `npm test -- src/__tests__/unit/tijd-page-components.test.tsx --run` | Unit tests | ~5s |
| `npx playwright test src/__tests__/e2e/tijd-page-comprehensive.spec.ts --project=chromium --workers=1` | E2E tests | ~5-10min |
| `npm run test:integration` | API tests | ~10s |
| `npm run test:ci` | All tests | ~10-15min |

---

**Status:** ✅ All tests passing - Production ready!
