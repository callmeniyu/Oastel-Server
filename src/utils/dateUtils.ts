/**
 * Lightweight date utility functions
 * This file has minimal imports to avoid circular dependencies and performance issues
 */

/**
 * Parse a YYYY-MM-DD date string as Malaysia timezone date object
 * Malaysia is UTC+8, so we store dates at 4 AM UTC which represents noon in Malaysia
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object representing the date at noon in Malaysia timezone (stored as UTC)
 */
export function parseDateAsMalaysiaTimezone(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  // 4 AM UTC = 12 PM Malaysia (UTC+8)
  const malaysiaDate = new Date(Date.UTC(year, month - 1, day, 4, 0, 0));
  return malaysiaDate;
}

/**
 * Format a Date object as YYYY-MM-DD string in Malaysia timezone
 */
export function formatDateAsMalaysiaTimezone(date: Date): string {
  const malaysiaDateStr = date.toLocaleDateString('en-CA', { 
    timeZone: 'Asia/Kuala_Lumpur' 
  });
  return malaysiaDateStr;
}
