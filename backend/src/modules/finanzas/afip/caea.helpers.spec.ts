import { calcularPeriodoYOrden, calcularProximoPeriodoYOrden } from './caea.helpers';
import { AfipTransientError } from './afip.errors';
import { AfipUnavailableError } from './afip.errors';

describe('calcularPeriodoYOrden', () => {
  it('day 10 → orden 1', () => {
    const result = calcularPeriodoYOrden(new Date('2026-01-10'));
    expect(result).toEqual({ periodo: '202601', orden: 1 });
  });

  it('day 15 → orden 1 (boundary)', () => {
    const result = calcularPeriodoYOrden(new Date('2026-01-15'));
    expect(result).toEqual({ periodo: '202601', orden: 1 });
  });

  it('day 16 → orden 2', () => {
    const result = calcularPeriodoYOrden(new Date('2026-01-16'));
    expect(result).toEqual({ periodo: '202601', orden: 2 });
  });
});

describe('calcularProximoPeriodoYOrden', () => {
  it('day 27 → next month orden 1', () => {
    const result = calcularProximoPeriodoYOrden(new Date('2026-01-27'));
    expect(result).toEqual({ periodo: '202602', orden: 1 });
  });

  it('day 12 → current month orden 2', () => {
    const result = calcularProximoPeriodoYOrden(new Date('2026-01-12'));
    expect(result).toEqual({ periodo: '202601', orden: 2 });
  });

  it('day 5 → current month orden 1', () => {
    const result = calcularProximoPeriodoYOrden(new Date('2026-01-05'));
    expect(result).toEqual({ periodo: '202601', orden: 1 });
  });
});

describe('AfipUnavailableError', () => {
  it('is instanceof AfipTransientError', () => {
    const err = new AfipUnavailableError('ARCA down');
    expect(err instanceof AfipTransientError).toBe(true);
  });

  it('has name AfipUnavailableError', () => {
    const err = new AfipUnavailableError('ARCA down');
    expect(err.name).toBe('AfipUnavailableError');
  });

  it('carries the message', () => {
    const err = new AfipUnavailableError('service outage');
    expect(err.message).toBe('service outage');
  });
});
