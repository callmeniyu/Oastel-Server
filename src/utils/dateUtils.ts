/**
 * Centralized Date Utility for Malaysian Timezone (UTC+8)
 * 
 * This utility ensures ALL date operations across the application
 * use Malaysian timezone consistently to prevent booking count mismatches.
 * 
 * KEY PRINCIPLES:
 * 1. All dates are stored in database as UTC timestamps
 * 2. All date comparisons use Malaysian timezone (Asia/Kuala_Lumpur)
 * 3. Date strings (YYYY-MM-DD) always represent Malaysian calendar dates
 * 4. No local server timezone should affect date calculations
 */

const MALAYSIA_TIMEZONE = 'Asia/Kuala_Lumpur';

/**
 * Get current date/time in Malaysian timezone
 * @returns Date object representing current moment
 */
export function getMalaysianNow(): Date {
  return new Date();
}

/**
 * Parse a YYYY-MM-DD date string as Malaysia timezone date object
 * Malaysia is UTC+8, so we create a UTC date that represents the correct Malaysian date
 * 
 * CRITICAL: This ensures dates are interpreted consistently regardless of server timezone
 * 
 * APPROACH: For date "2026-02-06", we want to store it as a Date object that when displayed
 * in Malaysia timezone (UTC+8), shows "2026-02-06 00:00:00". 
 * This means the UTC value should be "2026-02-05 16:00:00" (8 hours earlier).
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object representing midnight on that date in Malaysia timezone (stored as UTC)
 */
export function parseDateAsMalaysiaTimezone(dateString: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD`);
  }
  
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Malaysia is UTC+8
  // To represent "2026-02-06 00:00:00 Malaysia time" in UTC, we need "2026-02-05 16:00:00 UTC"
  // Create the date in UTC by manually calculating: subtract 8 hours from midnight
  const utcDate = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  
  // Subtract 8 hours (Malaysia offset) to get the correct UTC representation
  const malaysiaOffsetMs = 8 * 60 * 60 * 1000;
  const correctedUtc = utcDate - malaysiaOffsetMs;
  
  return new Date(correctedUtc);
}

/**
 * Format a Date object as YYYY-MM-DD string in Malaysia timezone
 * 
 * CRITICAL: This ensures date formatting is consistent regardless of server timezone
 */
export function formatDateAsMalaysiaTimezone(date: Date): string {
  const malaysiaDateStr = date.toLocaleDateString('en-CA', { 
    timeZone: MALAYSIA_TIMEZONE 
  });
  return malaysiaDateStr;
}

/**
 * Create a Date object for a specific date in Malaysian timezone
 * 
 * @param year - Full year (e.g., 2026)
 * @param month - Month (1-12, NOT 0-11)
 * @param day - Day of month (1-31)
 * @returns Date object representing that date in Malaysian timezone
 */
export function createMalaysianDate(year: number, month: number, day: number): Date {
  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return parseDateAsMalaysiaTimezone(dateString);
}

/**
 * Check if two dates represent the same calendar date in Malaysian timezone
 * 
 * @param date1 - First date
 * @param date2 - Second date
 * @returns true if both dates are the same Malaysian calendar date
 */
export function isSameMalaysianDate(date1: Date, date2: Date): boolean {
  return formatDateAsMalaysiaTimezone(date1) === formatDateAsMalaysiaTimezone(date2);
}

/**
 * Get Malaysian date components (year, month, day)
 * 
 * @param date - Date to extract components from
 * @returns Object with year, month (1-12), and day
 */
export function getMalaysianDateComponents(date: Date): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: MALAYSIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0');
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
  
  return { year, month, day };
}

/**
 * Add days to a date in Malaysian timezone
 * 
 * @param date - Starting date
 * @param days - Number of days to add (can be negative)
 * @returns New Date object
 */
export function addDaysMalaysiaTimezone(date: Date, days: number): Date {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  
  // Ensure we maintain Malaysian timezone consistency
  const dateStr = formatDateAsMalaysiaTimezone(newDate);
  return parseDateAsMalaysiaTimezone(dateStr);
}

/**
 * Compare two dates in Malaysian timezone
 * 
 * @param date1 - First date
 * @param date2 - Second date
 * @returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function compareMalaysianDates(date1: Date, date2: Date): number {
  const str1 = formatDateAsMalaysiaTimezone(date1);
  const str2 = formatDateAsMalaysiaTimezone(date2);
  
  if (str1 < str2) return -1;
  if (str1 > str2) return 1;
  return 0;
}

/**
 * Check if a date is today in Malaysian timezone
 * 
 * @param date - Date to check
 * @returns true if date is today in Malaysia
 */
export function isMalaysianToday(date: Date): boolean {
  return isSameMalaysianDate(date, getMalaysianNow());
}

/**
 * Check if a date is before today in Malaysian timezone
 * 
 * @param date - Date to check
 * @returns true if date is before today in Malaysia
 */
export function isBeforeMalaysianToday(date: Date): boolean {
  return compareMalaysianDates(date, getMalaysianNow()) < 0;
}

/**
 * Check if a date is after today in Malaysian timezone
 * 
 * @param date - Date to check
 * @returns true if date is after today in Malaysia
 */
export function isAfterMalaysianToday(date: Date): boolean {
  return compareMalaysianDates(date, getMalaysianNow()) > 0;
}

/**
 * Parse various date formats into a consistent Date object
 * Handles: Date objects, YYYY-MM-DD strings, ISO strings
 * 
 * @param dateInput - Date in various formats
 * @returns Date object or null if invalid
 */
export function parseFlexibleDate(dateInput: any): Date | null {
  if (!dateInput) return null;
  
  // Already a Date object
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  
  // String input
  if (typeof dateInput === 'string') {
    // YYYY-MM-DD format (preferred)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return parseDateAsMalaysiaTimezone(dateInput);
    }
    
    // ISO string or other formats
    const parsed = new Date(dateInput);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  
  return null;
}
