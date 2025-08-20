# Time Entry Workflows Tests

This document explains how to run the comprehensive time entry tests that verify all three ways to create time entries in the application.

## 🎯 What These Tests Do

The tests verify that **all three time entry workflows** work correctly and **entries appear in the "Tijdsregistraties" table**:

1. **"Nieuwe Tijdsregistratie" with manual input** - User manually enters hours
2. **"Nieuwe Tijdsregistratie" with timer** - User uses built-in timer, pauses it, then submits
3. **Main page "Start Timer" button** - User uses main timer with auto-registration

## 🚀 How to Run the Tests

### Prerequisites
1. **Development server running**: `npm run dev`
2. **Authentication credentials**: Tests use `nextgendatalead@gmail.com` / `Q789123@!#!`
3. **Playwright installed**: `npx playwright install` (if not already done)
4. **Clean browser state**: Tests handle authentication automatically

### Run the Tests
```bash
# Run the specific time entry workflow tests
npm run test:time-entry
```

Or directly:
```bash
npx playwright test src/__tests__/e2e/time-entry-workflows.spec.ts --headed
```

## 📋 Test Scenarios

### Test 1: Manual Time Entry
- Opens "Nieuwe Tijdsregistratie" dialog
- Selects "Handmatig Invoeren" mode
- Fills in: Client, Project, Description, Hours (2.5)
- Submits with "Tijd registreren" button
- **Verifies**: Entry appears in table with correct data

### Test 2: Timer Time Entry  
- Opens "Nieuwe Tijdsregistratie" dialog
- Selects "Met Timer" mode
- Fills in: Client, Project, Description
- Starts timer → Waits 2 seconds → Pauses timer
- **Verifies**: Hours field populated automatically
- Submits with "Tijd registreren" button
- **Verifies**: Entry appears in table

### Test 3: Main Timer Auto-Registration
- Clicks main "Start Timer" button
- Fills setup dialog: Client, Project, Description
- Starts timer → Waits 3 seconds → Stops timer
- **Confirms auto-registration dialog**
- **Verifies**: Entry automatically saved to database
- **Verifies**: Entry appears in table without manual submit

## 🔍 What to Look For

### Success Indicators
- ✅ All three tests pass
- ✅ Three new entries appear in "Tijdsregistraties" table:
  - "E2E Test Project - Manual" 
  - "E2E Test Project - Timer"
  - "E2E Test Project - Main Timer"
- ✅ Each entry has correct hours, client, and description

### Failure Troubleshooting
If tests fail, check:
1. **Development server** is running (`npm run dev`)
2. **User is logged in** to the application
3. **Database is accessible** and Supabase connection works
4. **No JavaScript errors** in browser console
5. **Client creation** worked (test creates "Test Client B.V.")

## 🧪 Test Data

The tests use consistent test data:
- **Client**: "Test Client B.V." (auto-created if doesn't exist)
- **Projects**: 
  - "E2E Test Project - Manual"
  - "E2E Test Project - Timer" 
  - "E2E Test Project - Main Timer"
- **Hours**: 2.5 (manual), ~0.001 (timer-based)
- **Descriptions**: Include test type identifier

## 📊 Expected Results

After running the tests successfully, you should see **3 new entries** in the Tijdsregistraties table:

| Client | Project | Description | Hours | Method |
|--------|---------|-------------|-------|---------|
| Test Client B.V. | E2E Test Project - Manual | End-to-end test time entry (Manual input) | 2:30 | Manual |
| Test Client B.V. | E2E Test Project - Timer | End-to-end test time entry (Timer) | ~0:00 | Timer |  
| Test Client B.V. | E2E Test Project - Main Timer | End-to-end test time entry (Main timer auto-register) | ~0:00 | Main Timer |

## 🔧 Technical Details

### Test Framework
- **Playwright**: Browser automation and E2E testing
- **TypeScript**: Type-safe test code
- **Headed mode**: Browser visible for debugging

### Authentication System
- **Clerk Integration**: Handles two-step authentication flow
- **Robust Login**: Automatically handles email → password → dashboard flow
- **Error Recovery**: Handles "Validating Access" and loading states
- **Session Management**: Checks for existing login before authenticating

### Test Strategy
- **Sequential execution**: Tests run one by one (not parallel)
- **State verification**: Each test counts entries before/after
- **Real browser interaction**: Actual clicks, typing, form submission
- **Database verification**: Confirms entries saved to Supabase

### Browser Support
Tests run on **Chromium** by default, but can be configured for:
- Chrome, Firefox, Safari
- Mobile viewports
- Different devices

This comprehensive test suite ensures the time entry functionality works end-to-end, from UI interaction to database persistence!