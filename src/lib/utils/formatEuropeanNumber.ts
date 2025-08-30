/**
 * European Number Formatting Utilities
 * 
 * Implements Dutch/European number formatting standards:
 * - Thousands separator: dot (.)
 * - Decimal separator: comma (,)
 * - Examples: 1.234,56 instead of 1,234.56
 */

/**
 * Format a number using European conventions (Dutch locale)
 * @param amount - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string (e.g., "274.430,19")
 */
export function formatEuropeanNumber(amount: number, decimals: number = 2): string {
  return new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(amount);
}

/**
 * Format a number as European currency (EUR with Dutch locale)
 * @param amount - The amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string (e.g., "€ 274.430,19")
 */
export function formatEuropeanCurrency(amount: number, decimals: number = 2): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(amount);
}

/**
 * Format a number as compact European currency (no spaces, shorter format)
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "€274.430,19")
 */
export function formatCompactEuropeanCurrency(amount: number): string {
  const formatted = formatEuropeanCurrency(amount);
  // Remove space between € and number for compact display
  return formatted.replace('€ ', '€');
}

/**
 * Parse a European formatted number string back to a number
 * @param europeanNumber - String in European format (e.g., "1.234,56")
 * @returns Parsed number
 */
export function parseEuropeanNumber(europeanNumber: string): number {
  // Remove currency symbols and spaces
  const cleanNumber = europeanNumber.replace(/[€\s]/g, '');
  
  // Replace dots (thousands) with empty string and comma (decimal) with dot
  const normalizedNumber = cleanNumber
    .replace(/\./g, '') // Remove thousands separators (dots)
    .replace(/,/g, '.'); // Replace decimal comma with dot
  
  return parseFloat(normalizedNumber);
}

/**
 * Validate if a string is in proper European number format
 * @param value - String to validate
 * @returns true if valid European number format
 */
export function isValidEuropeanNumber(value: string): boolean {
  // European number pattern: optional digits with dots as thousands separator, comma as decimal
  // Examples: 1,23 | 12,34 | 123,45 | 1.234,56 | 12.345,67
  const europeanNumberRegex = /^\d{1,3}(\.\d{3})*,\d{2}$|^\d+,\d{2}$|^\d+$/;
  return europeanNumberRegex.test(value.replace(/[€\s]/g, ''));
}

/**
 * Format percentage using European conventions
 * @param value - The percentage value (e.g., 0.21 for 21%)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string (e.g., "21%")
 */
export function formatEuropeanPercentage(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

/**
 * Format VAT rate for display (e.g., 0.21 -> "21%")
 * @param rate - VAT rate as decimal (e.g., 0.21)
 * @returns Formatted rate string (e.g., "21%")
 */
export function formatVATRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/**
 * Format amount with proper BTW form box styling
 * Used for displaying amounts with their corresponding BTW form box numbers
 * @param amount - The amount to format
 * @param boxNumber - The BTW form box number (e.g., "1a", "1b")
 * @returns Object with formatted amount and box reference
 */
export function formatBTWBoxAmount(amount: number, boxNumber: string) {
  return {
    amount: formatEuropeanCurrency(amount),
    boxNumber: `Rubriek ${boxNumber}`,
    compactAmount: formatCompactEuropeanCurrency(amount)
  };
}

/**
 * Type definitions for BTW form mapping
 */
export interface BTWFormMapping {
  dashboardLabel: string;
  formBox: string;
  officialName: string;
  amount: number;
  formattedAmount: string;
}

/**
 * Type definitions for ICP form mapping  
 */
export interface ICPFormMapping {
  dashboardField: string;
  formField: string;
  value: string | number;
  requirements: string;
}