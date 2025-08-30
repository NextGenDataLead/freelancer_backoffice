# TAX_FORMS.md
## Dutch BTW and ICP Form Structure & Implementation Guide

### Overview
This document provides comprehensive mapping between the Backoffice tax dashboard and official Dutch tax forms (BTW aangifte and ICP opgaaf) for accurate form completion and compliance.

---

## 1. European Number Formatting Standards

### Format Requirements
- **Thousands Separator**: Dot (.) - e.g., 274.430
- **Decimal Separator**: Comma (,) - e.g., 274.430,19
- **Complete Example**: €1.318.332,29 instead of €1,318,332.29

### Implementation Priority
- [ ] Create `formatEuropeanNumber()` utility function
- [ ] Update all dashboard currency displays
- [ ] Update API response formatting
- [ ] Ensure consistency across BTW and ICP tabs

---

## 2. BTW Aangifte (VAT Declaration) Form Mapping

### 2.1 Official Form Structure (2025)

#### Section 1: Prestaties binnenland (Domestic Supplies)
- **Rubriek 1a**: Omzet 21% tarief (Standard rate revenue)
- **Rubriek 1b**: Verschuldigde btw 21% tarief (VAT owed 21%)
- **Rubriek 1c**: Omzet 9% tarief (Low rate revenue) 
- **Rubriek 1d**: Verschuldigde btw 9% tarief (VAT owed 9%)
- **Rubriek 1e**: Omzet 0% tarief (Zero-rate revenue)
- **Rubriek 1f**: Overige btw-vrije prestaties (Other exempt supplies)

#### Section 2: Verleggingsregelingen binnenland (Domestic Reverse Charge)
- **Rubriek 2a**: Omzet verlegd 21% tarief 
- **Rubriek 2b**: Omzet verlegd 9% tarief

#### Section 3: Prestaties naar of in het buitenland (Supplies to/in Foreign Countries)
- **Rubriek 3a**: Leveringen naar EU-landen (intracommunautair)
- **Rubriek 3b**: Prestaties andere EU-landen/diensten (EU B2B services) **← CONNECTS TO ICP**
- **Rubriek 3c**: Prestaties buiten EU (Non-EU supplies)

#### Section 4: Prestaties vanuit het buitenland (Reverse Charges from Abroad)
- **Rubriek 4a**: Omzet diensten uit EU-landen (verlegd)
- **Rubriek 4b**: Invoer goederen uit niet-EU-landen

#### Section 5: Voorbelasting (Input VAT)
- **Rubriek 5a**: Voorbelasting 21% tarief
- **Rubriek 5b**: Voorbelasting 9% tarief  
- **Rubriek 5c**: Overige voorbelasting (0% en verlegd)

#### Section 6: Totalen (Totals)
- **Rubriek 6**: Totale verschuldigde btw
- **Rubriek 7**: Totale voorbelasting
- **Rubriek 8**: Te betalen of terug te vragen (Final balance)

### 2.2 Dashboard to BTW Form Mapping

| Dashboard Section | BTW Form Box | Official Dutch Name |
|------------------|--------------|-------------------|
| Hoog tarief (21%) - Revenue | Rubriek 1a | Omzet 21% tarief |
| Hoog tarief (21%) - BTW | Rubriek 1b | Verschuldigde btw 21% tarief |
| Laag tarief (9%) - Revenue | Rubriek 1c | Omzet 9% tarief |
| Laag tarief (9%) - BTW | Rubriek 1d | Verschuldigde btw 9% tarief |
| EU B2B Diensten - Revenue | Rubriek 3b | Prestaties andere EU-landen/diensten |
| EU B2B Diensten - BTW | Rubriek 3b | (€0,00 - reverse charge) |
| Aftrekbare voorbelasting | Rubriek 5a/5b/5c | Combined voorbelasting |
| Netto BTW Positie | Rubriek 8 | Te betalen/terug te vragen |

### 2.3 Mathematical Relationships
```
Rubriek 6 (Total VAT owed) = 1b + 1d + (other applicable VAT)
Rubriek 7 (Total input VAT) = 5a + 5b + 5c  
Rubriek 8 (Balance) = Rubriek 6 - Rubriek 7
```

---

## 3. ICP Opgaaf (Intra-Community Declaration) Form Mapping

### 3.1 Official Form Structure (2025)

#### Primary Sections
- **AlgemeneGegevens**: General data (period, filer ID, submission date)
- **OpgaafIntracommunautairePrestaties**: Container for all ICP records
- **Prestatie**: Individual transaction records containing:
  - **LandCode**: Country code (ISO 3166-1 alpha-2)
  - **BtwIdentificatienummer**: EU partner VAT number
  - **SoortTransactieCode**: Transaction type (200-299 for services)
  - **TransactieBedrag**: Transaction amount (excl. VAT)

### 3.2 Dashboard to ICP Form Mapping

| Dashboard Field | ICP Form Field | Requirements |
|----------------|----------------|--------------|
| Country (BE, DE, FR, etc.) | LandCode | ISO 3166-1 alpha-2 codes only |
| VAT Number | BtwIdentificatienummer | Valid EU VAT format (BE0690567150) |
| Client Name | (Not in form) | For dashboard display only |
| Amount | TransactieBedrag | Must match BTW Rubriek 3b total |
| Transaction Type | SoortTransactieCode | 200-299 for services |

### 3.3 ICP-BTW Connection
**Critical**: The sum of all ICP TransactieBedrag amounts MUST equal the amount in BTW Rubriek 3b. Mismatches cause form rejection.

---

## 4. Implementation Todo List

### Phase 1: Number Formatting
- [ ] Create `src/lib/utils/formatEuropeanNumber.ts` utility
- [ ] Test with various number ranges (thousands, millions)
- [ ] Update currency formatting in dashboard components
- [ ] Update API response formatting

### Phase 2: BTW Form References
- [ ] Add box number indicators to BTW dashboard sections:
  - [ ] "Rubriek 1a" next to 21% revenue
  - [ ] "Rubriek 1b" next to 21% VAT
  - [ ] "Rubriek 1c" next to 9% revenue  
  - [ ] "Rubriek 1d" next to 9% VAT
  - [ ] "Rubriek 3b" next to EU B2B services
  - [ ] "Rubriek 5a/5b/5c" next to input VAT
  - [ ] "Rubriek 8" next to net VAT position

### Phase 3: ICP Form References  
- [ ] Add field indicators to ICP dashboard:
  - [ ] "LandCode" for country column
  - [ ] "BtwIdentificatienummer" for VAT number column
  - [ ] "TransactieBedrag" for amount column
- [ ] Show connection to BTW Rubriek 3b
- [ ] Add transaction type code display (200-299)

### Phase 4: Visual Enhancements
- [ ] Add tooltips explaining form connections
- [ ] Create visual form layout guides
- [ ] Add validation warnings for ICP-BTW consistency
- [ ] Include official Dutch terminology

### Phase 5: Testing & Validation
- [ ] Test number formatting with real data
- [ ] Verify form box mappings accuracy
- [ ] Validate ICP-BTW amount consistency
- [ ] Test with multiple quarters and scenarios

---

## 5. Form Visual Layout References

### BTW Form Layout (Conceptual)
```
┌─────────────────────────────────────┐
│ BTW AANGIFTE 2025 - Q3              │
├─────────────────────────────────────┤
│ 1. PRESTATIES BINNENLAND            │
│ 1a │ Omzet 21%      │ 1.306.810,44  │
│ 1b │ BTW 21%        │   274.430,19  │
│ 1c │ Omzet 9%       │         0,00  │
│ 1d │ BTW 9%         │         0,00  │
├─────────────────────────────────────┤
│ 3. PRESTATIES BUITENLAND            │
│ 3b │ EU Diensten    │    11.520,85  │ ← TO ICP
├─────────────────────────────────────┤
│ 5. VOORBELASTING                    │
│ 5a │ Voorbelasting  │        12,60  │
├─────────────────────────────────────┤
│ 8. │ SALDO          │   274.417,59  │
└─────────────────────────────────────┘
```

### ICP Form Layout (Conceptual)
```
┌─────────────────────────────────────┐
│ ICP OPGAAF 2025 - Q3                │
├─────────────────────────────────────┤
│ Land │ BTW Nummer    │ Bedrag       │
│ BE   │ BE0690567150  │ 11.520,85    │
├─────────────────────────────────────┤
│ TOTAAL              │ 11.520,85    │ ← MUST MATCH BTW 3b
└─────────────────────────────────────┘
```

---

## 6. Technical Implementation Notes

### Number Formatting Function
```typescript
export function formatEuropeanNumber(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatEuropeanCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}
```

### Form Box Component
```tsx
interface FormBoxProps {
  boxNumber: string;
  label: string;
  amount: number;
  tooltip?: string;
}

const FormBoxIndicator: React.FC<FormBoxProps> = ({ boxNumber, label, amount, tooltip }) => (
  <div className="form-box-indicator">
    <span className="box-number">{boxNumber}</span>
    <span className="box-label">{label}</span>
    <span className="box-amount">{formatEuropeanCurrency(amount)}</span>
  </div>
);
```

---

## 7. Compliance Notes

### Critical Requirements
1. **Number Format Consistency**: Must use European formatting throughout
2. **ICP-BTW Matching**: ICP total must equal BTW Rubriek 3b exactly
3. **VAT Number Validation**: All EU VAT numbers must be VIES-validated
4. **Country Code Standards**: Only ISO 3166-1 alpha-2 codes accepted
5. **Transaction Codes**: Services use 200-299 range only

### Validation Rules
- ICP TransactieBedrag sum = BTW Rubriek 3b amount
- All VAT numbers follow country-specific formats
- Country codes are valid EU member states only
- Amounts are positive and properly formatted

This implementation will provide users with clear visual guidance for completing Dutch tax forms accurately while maintaining full compliance with Belastingdienst requirements.