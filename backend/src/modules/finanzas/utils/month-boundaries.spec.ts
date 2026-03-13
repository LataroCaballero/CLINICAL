import { getMonthBoundariesART, MonthBoundaries } from './month-boundaries';

describe('getMonthBoundariesART', () => {
  it('should return start = 2026-03-01T03:00:00.000Z for 2026-03', () => {
    const boundaries: MonthBoundaries = getMonthBoundariesART('2026-03');
    expect(boundaries.start.toISOString()).toBe('2026-03-01T03:00:00.000Z');
  });

  it('should return end = 2026-04-01T02:59:59.999Z for 2026-03', () => {
    const boundaries: MonthBoundaries = getMonthBoundariesART('2026-03');
    expect(boundaries.end.toISOString()).toBe('2026-04-01T02:59:59.999Z');
  });

  it('should exclude a practice at 2026-03-01T02:30:00Z from March (it is still Feb in ART)', () => {
    const boundaries: MonthBoundaries = getMonthBoundariesART('2026-03');
    const practiceDate = new Date('2026-03-01T02:30:00.000Z');
    expect(practiceDate < boundaries.start).toBe(true);
  });

  it('should correctly roll to next year for December (end boundary in 2027-01)', () => {
    const boundaries: MonthBoundaries = getMonthBoundariesART('2026-12');
    expect(boundaries.end.toISOString()).toBe('2027-01-01T02:59:59.999Z');
  });

  it('should return start = 2026-01-01T03:00:00.000Z for 2026-01', () => {
    const boundaries: MonthBoundaries = getMonthBoundariesART('2026-01');
    expect(boundaries.start.toISOString()).toBe('2026-01-01T03:00:00.000Z');
  });
});
