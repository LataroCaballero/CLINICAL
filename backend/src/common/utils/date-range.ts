/**
 * Returns the start and end of a day in local timezone.
 * Accepts either a Date object or a date string (yyyy-MM-dd).
 * When receiving a string, it parses manually to avoid UTC interpretation.
 */
export function getDayRange(date: Date | string) {
  let year: number, month: number, day: number;

  if (typeof date === 'string') {
    // Parse "yyyy-MM-dd" manually to avoid timezone issues
    const parts = date.split('-').map(Number);
    year = parts[0];
    month = parts[1] - 1; // JavaScript months are 0-indexed
    day = parts[2];
  } else {
    year = date.getFullYear();
    month = date.getMonth();
    day = date.getDate();
  }

  // Create dates in local timezone
  const start = new Date(year, month, day, 0, 0, 0, 0);
  const end = new Date(year, month, day, 23, 59, 59, 999);

  return { start, end };
}
