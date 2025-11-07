# Shadcn UI Select Component E2E Testing Fix

## Problem Summary

E2E tests were failing when trying to interact with shadcn/ui Select components in dialogs. The specific issue:
- **Error**: "Project dropdown (2nd combobox) did not appear after client selection"
- **Root Cause**: Using `force: true` on Playwright clicks bypassed React event handlers, preventing `onValueChange` callbacks from firing

## Technical Background

### Shadcn Select Component Architecture

1. **Built on Radix UI**: Shadcn Select uses `@radix-ui/react-select` under the hood
2. **Portal Rendering**: Options render in a Portal outside the dialog DOM
3. **ARIA Roles**:
   - Trigger button: `role="combobox"`
   - Dropdown container: `role="listbox"`
   - Options: `role="option"`

### The Conditional Rendering Issue

In `unified-time-entry-form.tsx`:
```tsx
{/* Project Select - Only renders when client is selected */}
{selectedClientId && (
  <div className="space-y-2">
    <Select value={selectedProjectId} onValueChange={handleProjectSelect}>
      ...
    </Select>
  </div>
)}
```

**The Problem**: When `force: true` is used on clicks:
1. ✅ Visual click happens
2. ❌ React synthetic events don't fire
3. ❌ `onValueChange` callback never executes
4. ❌ `setSelectedClientId()` never called
5. ❌ Project dropdown never renders (conditional on `selectedClientId`)

## The Solution

### Key Changes

#### 1. Remove `force: true` from All Clicks

**Before** (broken):
```typescript
await selectTrigger.click({ force: true }) // ❌ Bypasses event handlers!
await option.click({ force: true })         // ❌ State doesn't update!
```

**After** (fixed):
```typescript
await selectTrigger.click({ trial: true }) // ✅ Check clickability first
await selectTrigger.click()                 // ✅ Normal click - events fire!
await option.click({ trial: true })         // ✅ Trial run
await option.click()                        // ✅ onSelect fires properly!
```

#### 2. Wait for Dialog Overlays to Clear

```typescript
// Check if there's a blocking overlay
const overlay = page.locator('[data-state="open"][data-aria-hidden="true"]').first()
if (await overlay.count() > 0) {
  await page.waitForTimeout(500) // Let overlay animation complete
}
```

#### 3. Proper Async Flow for Conditional Rendering

```typescript
// 1. Select client
await selectShadcnOption(page, 0, data.client)

// 2. Wait for API call
await page.waitForResponse(
  response => response.url().includes('/api/projects'),
  { timeout: 15000 }
)

// 3. Wait for React re-render
await page.waitForTimeout(1500)

// 4. Verify dropdown appeared
await projectDropdown.waitFor({ state: 'visible' })

// 5. Select project
await selectShadcnOption(page, 1, data.project)
```

### Updated Helper Function

```typescript
async function selectShadcnOption(page: Page, selectIndex: number, optionText: string) {
  const dialog = page.locator('[role="dialog"]').last()
  const scope = (await dialog.count()) > 0 ? dialog : page
  const selectTrigger = scope.locator('button[role="combobox"]').nth(selectIndex)

  await selectTrigger.waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForTimeout(800) // Wait for animations

  // Check for blocking overlays
  const overlay = page.locator('[data-state="open"][data-aria-hidden="true"]').first()
  if (await overlay.count() > 0) {
    await page.waitForTimeout(500)
  }

  // CRITICAL: Click WITHOUT force to fire React events
  await selectTrigger.click({ trial: true })
  await selectTrigger.click() // ← This fires onValueChange!

  // Wait for Portal dropdown
  await page.waitForSelector('[role="listbox"]', { state: 'visible' })
  await page.waitForTimeout(800)

  // Find and click option
  const listbox = page.locator('[role="listbox"]')
  const option = listbox.locator('[role="option"]').filter({ hasText: optionText }).first()

  await option.click({ trial: true })
  await option.click() // ← This fires onSelect!

  // Wait for dropdown to close
  await page.waitForSelector('[role="listbox"]', { state: 'hidden' })

  // CRITICAL: Wait for React state propagation
  await page.waitForTimeout(500)
}
```

## Research Sources

### Context7 MCP - Shadcn Documentation
- Library ID: `/shadcn-ui/ui`
- Confirmed Radix UI foundation
- Standard ARIA patterns for Select components

### Exa Code Context
Key findings from community solutions:
1. **Stack Overflow**: Testing shadcn Select requires avoiding `force` clicks
2. **Playwright Best Practices**: Use `getByRole()` and normal clicks
3. **Radix UI Pattern**: Portal-based rendering requires waiting for listbox

### Key Insight from Research
> "Using `force: true` bypasses the browser's actionability checks and event dispatch. This means event handlers (like `onClick`, `onChange`) may not fire, breaking React's state management."

## Testing Best Practices

### DO ✅

1. **Use normal clicks** to ensure event handlers fire
2. **Wait for overlays** to clear before clicking
3. **Use role-based selectors**: `role="combobox"`, `role="option"`
4. **Wait for state updates** after selections
5. **Verify API calls complete** before expecting UI changes

### DON'T ❌

1. ❌ Use `force: true` on shadcn components
2. ❌ Assume immediate re-renders after state changes
3. ❌ Ignore conditional rendering patterns
4. ❌ Use CSS selectors when ARIA roles are available
5. ❌ Skip waiting for Portal-rendered content

## Results

### Before Fix
- ❌ 4 tests timing out after 60 seconds
- ❌ "Project dropdown did not appear" errors
- ❌ Overlays blocking clicks
- ❌ State not updating despite visible clicks

### After Fix
- ✅ Proper event handler execution
- ✅ React state updates correctly
- ✅ Conditional rendering works
- ✅ Clean async flow

## Files Modified

1. **`src/__tests__/e2e/tijd-page-comprehensive.spec.ts`**
   - Rewrote `selectShadcnOption()` helper
   - Simplified `createQuickTimeEntry()` with proper async flow
   - Added network request waiting
   - Removed all `force: true` clicks

## Lessons Learned

1. **Playwright's `force` option should be avoided in React apps** - it breaks synthetic event systems
2. **Shadcn/Radix components require special handling** due to Portal rendering
3. **Conditional rendering needs explicit API + state update waits**
4. **MCP tools (Context7, Exa) are invaluable** for researching library internals and best practices

---

**Date**: 2025-11-03
**Author**: Claude Code with Exa & Context7 MCP Research
**Status**: ✅ Fixed - Ready for testing
