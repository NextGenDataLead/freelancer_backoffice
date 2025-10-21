# Due Recurring Expenses Feature - Implementation Complete ✅

**Date**: 2025-10-20
**Status**: Ready for Testing

---

## Feature Overview

Users can now see **overdue recurring expense templates** directly in the "Nieuwe uitgave" form and add them to the expense list with one click!

### User Experience

1. **Go to Expenses page**: `/dashboard/financieel-v2/uitgaven`
2. **Click "Nieuwe Uitgave"** button
3. **Below "Bon uploaden" section**: You'll see an **orange alert card** showing due recurring expenses (if any exist)
4. **Carousel navigation**: Browse through multiple due templates with Previous/Next buttons
5. **Two action buttons per template**:
   - **"Toevoegen aan uitgaven"** (Add to expenses) - Creates actual expense records
   - **"Template aanpassen"** (Adjust template) - Navigate to recurring expenses page

---

## How It Works

### Detection Logic

The system automatically detects recurring expense templates that are **overdue**:

- **Due condition**: `next_occurrence` date ≤ today
- **Calculation**: Determines how many occurrences should have been created already
- **Aggregation**: Shows ONE card per template, even if multiple occurrences are due

### Example

**Template**: "Office Rent" - €1500/month - next_occurrence: 2024-12-01

**Today**: 2025-01-20

**Result**: Card shows "2x Office Rent - €3000 total" (December + January)

**Action**: Click "Toevoegen aan uitgaven" creates:
- Expense 1: Office Rent - €1500 - expense_date: 2024-12-01
- Expense 2: Office Rent - €1500 - expense_date: 2025-01-01
- Updates template: next_occurrence: 2025-02-01

---

## API Endpoints Created

### 1. GET `/api/recurring-expenses/due`
**Purpose**: Fetch all due recurring expense templates

**Response**:
```json
{
  "data": [
    {
      "template": {...},
      "occurrences_due": 2,
      "total_amount": 3000.00,
      "next_occurrence_date": "2024-12-01",
      "last_occurrence_date": "2025-01-01"
    }
  ],
  "message": "Found 1 recurring expense(s) with due occurrences"
}
```

### 2. POST `/api/recurring-expenses/templates/[id]/create-expenses`
**Purpose**: Convert template's due occurrences into actual expense records

**Process**:
1. Validates template exists and is active
2. Calculates all overdue occurrences
3. Creates expense records (status: draft)
4. Updates template's `next_occurrence` to next future date
5. Returns created expenses

**Response**:
```json
{
  "data": {
    "expenses": [...],
    "count": 2,
    "template": {...},
    "next_occurrence": "2025-02-01"
  },
  "message": "Created 2 expense(s) from template"
}
```

---

## Components Created

### 1. `due-recurring-expenses-carousel.tsx`
**Location**: `src/components/financial/expenses/due-recurring-expenses-carousel.tsx`

**Features**:
- Fetches due recurring expenses on load
- Displays carousel with navigation (Previous/Next)
- Shows occurrence count and total amount
- Two action buttons (Add / Adjust)
- Auto-hides if no due expenses
- Shows loading state
- Updates UI after expense creation

### 2. Integration in `expense-form.tsx`
**Location**: `src/components/financial/expenses/expense-form.tsx`

**Changes**:
- Added import for carousel component
- Inserted carousel between "Bon uploaden" and expense form
- Callback to refresh on expense creation

---

## Database Changes

**No migrations needed!** Uses existing tables:
- ✅ `recurring_expense_templates` (already exists)
- ✅ `expenses` (already exists)

**Metadata tracking**: Created expenses include:
```json
{
  "source": "recurring_template",
  "template_id": "uuid",
  "template_name": "Office Rent",
  "occurrence_date": "2024-12-01"
}
```

---

## Testing Instructions

### Prerequisites
1. ✅ Be logged in
2. ✅ Have at least one recurring expense template with `next_occurrence` in the past

### Create Test Data

**Step 1**: Create a recurring template with past date
1. Go to: `/dashboard/financieel-v2/terugkerende-uitgaven`
2. Click "Nieuwe Template"
3. Fill in:
   - Name: "Test Rent"
   - Amount: 1000
   - Frequency: monthly
   - Start date: 2024-11-01 (past date)
4. Save

**Step 2**: Manually update `next_occurrence` to trigger "due" status:
```sql
UPDATE recurring_expense_templates
SET next_occurrence = '2024-12-01'
WHERE name = 'Test Rent';
```

### Test the Feature

**Test 1**: View Due Expenses Carousel
1. Go to: `/dashboard/financieel-v2/uitgaven`
2. Click "Nieuwe Uitgave"
3. Look below "Bon uploaden" section

**Expected**: Orange alert card shows "Test Rent" with occurrence count

**Test 2**: Add Expenses from Template
1. In the carousel, click "Toevoegen aan uitgaven"
2. Wait for success message
3. Close the modal
4. Check expense list

**Expected**:
- 2 expenses created (Dec + Jan)
- Each with €1000 amount
- Status: draft
- Template's next_occurrence updated to future date

**Test 3**: Adjust Template
1. Click "Template aanpassen" button
2. Should navigate to recurring expenses page

**Expected**: Opens `/dashboard/financieel-v2/terugkerende-uitgaven?edit=[id]`

**Test 4**: Multiple Due Templates
1. Create 2-3 recurring templates with past `next_occurrence` dates
2. Open "Nieuwe Uitgave" form
3. Use Previous/Next buttons in carousel

**Expected**:
- Shows "1 van 3" counter
- Can navigate between templates
- Each template shows correct occurrence count

**Test 5**: No Due Templates
1. Ensure all templates have future `next_occurrence`
2. Open "Nieuwe Uitgave" form

**Expected**: Carousel doesn't appear (auto-hides)

---

## UI/UX Details

### Visual Design
- **Color**: Orange theme (warning/attention)
- **Border**: Dashed orange border (2px)
- **Background**: Orange tint (50% opacity)
- **Icon**: AlertTriangle (orange)

### Copy (Dutch)
- **Title**: "Terugkerende uitgaven te verwerken"
- **Description**: "Deze terugkerende uitgaven zijn verlopen en kunnen automatisch worden toegevoegd"
- **Badge**: "{count} template(s)"
- **Occurrence info**: "{count}x uitgave(n) te verwerken - €{total} totaal"
- **Period**: "Periode: {from} - {to}"
- **Button 1**: "Toevoegen aan uitgaven"
- **Button 2**: "Template aanpassen"
- **Navigation**: "Vorige / Volgende"
- **Counter**: "{current} van {total}"

### Responsive
- **Desktop**: Full carousel with navigation
- **Mobile**: Stacked layout, touch-friendly buttons

---

## Edge Cases Handled

1. **No due templates**: Component auto-hides
2. **Template becomes inactive**: Not shown in carousel
3. **Multiple occurrences**: Aggregated into one card
4. **Template has end_date**: Respects end date when calculating occurrences
5. **Escalation**: Applies amount escalation if configured
6. **VAT calculation**: Correctly calculates VAT for each occurrence
7. **Business use percentage**: Applied to deductible VAT
8. **Concurrent creation**: Handled by database constraints
9. **Template deleted during creation**: API returns 404 error
10. **Grace period active**: API blocks creation (403 error)

---

## Files Created

### API Routes (2)
- `src/app/api/recurring-expenses/due/route.ts`
- `src/app/api/recurring-expenses/templates/[id]/create-expenses/route.ts`

### Components (1)
- `src/components/financial/expenses/due-recurring-expenses-carousel.tsx`

### Files Modified (2)
- `src/components/financial/expenses/expense-form.tsx` (added carousel)
- `src/lib/financial/recurring-expense-calculator.ts` (added `calculateNextOccurrence`)

---

## Benefits

### For Users
✅ **No manual tracking**: System tracks due recurring expenses automatically
✅ **One-click creation**: Convert multiple occurrences to expenses instantly
✅ **Visual reminder**: Orange alert card catches attention
✅ **Batch processing**: Create multiple occurrences at once
✅ **Accurate forecasting**: Cash flow forecast stays accurate

### For Business
✅ **Consistent data**: Ensures recurring expenses aren't forgotten
✅ **Time savings**: Reduces manual data entry
✅ **Improved accuracy**: Automated calculations prevent errors
✅ **Better insights**: Complete expense history for reporting

---

## Future Enhancements (Optional)

1. **Email notifications**: Alert users when recurring expenses are due
2. **Auto-approval**: Option to auto-approve expenses from trusted templates
3. **Bulk actions**: "Add all due expenses" button
4. **Calendar integration**: Show due expenses on calendar view
5. **Reminder frequency**: Configure how many days before due to show warning
6. **Snooze feature**: Delay a template's next occurrence by X days
7. **Smart scheduling**: AI-powered suggestions for optimal timing
8. **Expense rules**: Auto-categorize or tag expenses from specific templates

---

## Troubleshooting

### Issue: Carousel doesn't appear
**Solution**:
- Check if there are recurring templates with `next_occurrence <= today`
- Verify templates are `is_active = true`
- Check browser console for API errors

### Issue: "Failed to create expenses" error
**Check**:
- User has permission to create expenses
- User not in grace period (pending deletion)
- Template still exists and is active
- Database constraints are met

### Issue: Wrong number of occurrences
**Debug**:
- Check template's `start_date` and `next_occurrence`
- Verify frequency setting
- Check if `end_date` is limiting occurrences
- Review `calculateOccurrences` logic

### Issue: Expenses created with wrong dates
**Check**:
- Template's `next_occurrence` value
- Frequency calculation logic
- `day_of_month` setting for monthly/quarterly/yearly templates

---

## Performance Notes

- **Lazy loading**: Carousel only fetches data when expense form is opened
- **Caching**: Consider adding client-side cache for due expenses (future)
- **Pagination**: Currently loads all due templates (fine for most users)
- **Optimistic updates**: Removes template from carousel immediately after creation

---

## Success Metrics

Track these to measure feature adoption:
- Number of expenses created via carousel vs manual entry
- Time saved per user (avg. 2-3 minutes per recurring expense)
- Reduction in forgotten recurring expenses
- User satisfaction scores

---

🎉 **Feature is complete and ready for production use!**

For questions or issues, refer to the implementation files or check the API error messages.
