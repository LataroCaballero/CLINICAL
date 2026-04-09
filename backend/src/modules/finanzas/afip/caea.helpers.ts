/**
 * Pure helper functions for CAEA period and order calculation.
 * No NestJS or Prisma dependencies — safe to use in unit tests without mocking.
 */

/**
 * Returns the CAEA periodo (YYYYMM) and orden (1 or 2) for a given date.
 * - Days 1–15: orden 1
 * - Days 16–31: orden 2
 */
export function calcularPeriodoYOrden(now: Date): { periodo: string; orden: 1 | 2 } {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const orden: 1 | 2 = now.getUTCDate() <= 15 ? 1 : 2;
  return { periodo: `${year}${month}`, orden };
}

/**
 * Returns the next CAEA periodo and orden that should be requested in advance.
 * AFIP allows pre-requesting the next quinquena starting from day 11 of current half,
 * and next month starting from day 27.
 *
 * - Day >= 27: next month, orden 1
 * - Day >= 11: current month, orden 2
 * - Otherwise: current period from calcularPeriodoYOrden
 */
export function calcularProximoPeriodoYOrden(now: Date): { periodo: string; orden: 1 | 2 } {
  const day = now.getUTCDate();
  if (day >= 27) {
    // Next month, orden 1 — use UTC-safe date arithmetic
    const utcYear = now.getUTCFullYear();
    const utcMonth = now.getUTCMonth(); // 0-indexed
    const nextMonthDate = new Date(Date.UTC(utcYear, utcMonth + 1, 1));
    return {
      periodo: `${nextMonthDate.getUTCFullYear()}${String(nextMonthDate.getUTCMonth() + 1).padStart(2, '0')}`,
      orden: 1,
    };
  }
  if (day >= 11) {
    return { periodo: calcularPeriodoYOrden(now).periodo, orden: 2 };
  }
  return calcularPeriodoYOrden(now);
}
