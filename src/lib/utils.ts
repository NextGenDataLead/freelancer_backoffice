import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ClientContact } from "@/lib/types/financial"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a contact's first and last name into a full name
 * @param contact - The contact object with first_name and last_name
 * @returns Formatted full name (e.g., "John Doe")
 */
export function formatContactName(contact: { first_name: string; last_name: string }): string {
  return `${contact.first_name} ${contact.last_name}`.trim();
}

/**
 * Formats a contact's full name for display with optional prefix
 * @param contact - The contact object with first_name and last_name
 * @param prefix - Optional prefix (e.g., "Contact:")
 * @returns Formatted string (e.g., "Contact: John Doe")
 */
export function formatContactNameWithPrefix(
  contact: { first_name: string; last_name: string },
  prefix?: string
): string {
  const fullName = formatContactName(contact);
  return prefix ? `${prefix} ${fullName}` : fullName;
}