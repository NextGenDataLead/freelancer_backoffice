// For development purposes, we can hardcode a date here.
// If the hardcoded date is null, the current date will be used.
// This makes it easy to switch between a fixed date and the real date.
const hardcodedDate: Date | null = new Date('2025-09-20');

// Function to get the current date, which will be the hardcoded date if it's set,
// otherwise it will be the real current date.
export function getCurrentDate(): Date {
  return hardcodedDate || new Date();
}
