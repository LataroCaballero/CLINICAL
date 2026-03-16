/**
 * ART timezone boundary utilities.
 *
 * Argentina uses UTC-3 with no daylight saving time (fixed offset).
 * ART offset = 3 * 60 * 60 * 1000 ms = 10800000 ms.
 *
 * A "month boundary in ART" means:
 *   start = midnight ART on day 1 of the month = 03:00:00 UTC on day 1
 *   end   = 23:59:59.999 ART on last day of month = 02:59:59.999 UTC on day 1 of next month
 */

export interface MonthBoundaries {
  /** Inclusive start: midnight ART = 03:00:00 UTC on day 1 of the given month */
  start: Date;
  /** Inclusive end: 23:59:59.999 ART on last day = 02:59:59.999 UTC on day 1 of next month */
  end: Date;
}

const ART_OFFSET_MS = 3 * 60 * 60 * 1000; // UTC-3 in milliseconds

/**
 * Returns the start and end UTC timestamps that correspond to the full
 * calendar month in Argentine Time (ART = UTC-3, no DST).
 *
 * @param mes - Month string in 'YYYY-MM' format (e.g. '2026-03')
 */
export function getMonthBoundariesART(mes: string): MonthBoundaries {
  const [yearStr, monthStr] = mes.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-based

  // Start: midnight ART (00:00:00 ART) on the first day of the month.
  // midnight ART = UTC+03:00:00 on the same calendar day.
  // Use Date.UTC to avoid local system timezone influence.
  const startMs = Date.UTC(year, month - 1, 1, 3, 0, 0, 0);

  // Next month (for end boundary)
  let nextMonth: number;
  let nextYear: number;
  if (month === 12) {
    nextMonth = 1;
    nextYear = year + 1;
  } else {
    nextMonth = month + 1;
    nextYear = year;
  }

  // End: 23:59:59.999 ART on the last day of the month.
  // = midnight ART of day 1 of next month, minus 1 ms.
  // = 03:00:00 UTC on day 1 of next month, minus 1 ms.
  const endMs = Date.UTC(nextYear, nextMonth - 1, 1, 3, 0, 0, 0) - 1;

  return {
    start: new Date(startMs),
    end: new Date(endMs),
  };
}
