/**
 * Unit tests for computePasosCrm — pure function that derives the 5 canonical
 * CRM stepper steps and todosCompletos flag for a patient.
 *
 * Tests follow TDD (RED → GREEN): the spec is written before the implementation.
 *
 * Steps covered (D-04/D-05):
 *   1. hc            — FINALIZED HistoriaClinicaEntrada with tipoEntrada CONSULTA_CIRUGIA
 *   2. presupuesto   — Presupuesto in estado ENVIADO or ACEPTADO
 *   3. cirugia       — any Cirugia record exists (fecha is required in model)
 *   4. consentimiento — ConsentimientoFirmado.firmadoAt (v1.12 primary) OR legacy flag
 *   5. indicacionesPreop — ConsentimientoFirmado.indicacionesLeidasAt (v1.12 primary) OR legacy flag
 */
import { computePasosCrm, PacientePasosInput } from './crm-steps.helper';

/** Builds a minimal all-empty (all-pendiente) input */
function emptyInput(): PacientePasosInput {
  return {
    presupuestos: [],
    cirugias: [],
    historiasClinicas: [],
    consentimientosFirmados: [],
    consentimientoFirmado: false,
    indicacionesEnviadas: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Paso 1: hc
// ─────────────────────────────────────────────────────────────────────────────

describe('computePasosCrm — hc', () => {
  it('is completo when at least one FINALIZED entry with CONSULTA_CIRUGIA', () => {
    const result = computePasosCrm({
      ...emptyInput(),
      historiasClinicas: [
        { entradas: [{ status: 'FINALIZED', tipoEntrada: 'CONSULTA_CIRUGIA' }] },
      ],
    });
    expect(result.pasos.hc).toBe('completo');
  });

  it('is completo even when other non-qualifying entries exist alongside a qualifying one', () => {
    const result = computePasosCrm({
      ...emptyInput(),
      historiasClinicas: [
        {
          entradas: [
            { status: 'DRAFT', tipoEntrada: 'CONSULTA_CIRUGIA' },
            { status: 'FINALIZED', tipoEntrada: 'CONSULTA_CIRUGIA' },
          ],
        },
      ],
    });
    expect(result.pasos.hc).toBe('completo');
  });

  it('is pendiente when no entradas exist', () => {
    const result = computePasosCrm(emptyInput());
    expect(result.pasos.hc).toBe('pendiente');
  });

  it('is pendiente when entry has CONSULTA_CIRUGIA but status DRAFT', () => {
    const result = computePasosCrm({
      ...emptyInput(),
      historiasClinicas: [
        { entradas: [{ status: 'DRAFT', tipoEntrada: 'CONSULTA_CIRUGIA' }] },
      ],
    });
    expect(result.pasos.hc).toBe('pendiente');
  });

  it('is pendiente when entry is FINALIZED but tipoEntrada is CONTROL (not CONSULTA_CIRUGIA)', () => {
    const result = computePasosCrm({
      ...emptyInput(),
      historiasClinicas: [
        { entradas: [{ status: 'FINALIZED', tipoEntrada: 'CONTROL' }] },
      ],
    });
    expect(result.pasos.hc).toBe('pendiente');
  });

  it('is pendiente when entry is FINALIZED but tipoEntrada is null', () => {
    const result = computePasosCrm({
      ...emptyInput(),
      historiasClinicas: [
        { entradas: [{ status: 'FINALIZED', tipoEntrada: null }] },
      ],
    });
    expect(result.pasos.hc).toBe('pendiente');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Paso 2: presupuesto
// ─────────────────────────────────────────────────────────────────────────────

describe('computePasosCrm — presupuesto', () => {
  it('is completo when a presupuesto has estado ENVIADO', () => {
    const result = computePasosCrm({
      ...emptyInput(),
      presupuestos: [{ estado: 'ENVIADO' }],
    });
    expect(result.pasos.presupuesto).toBe('completo');
  });

  it('is completo when a presupuesto has estado ACEPTADO', () => {
    const result = computePasosCrm({
      ...emptyInput(),
      presupuestos: [{ estado: 'ACEPTADO' }],
    });
    expect(result.pasos.presupuesto).toBe('completo');
  });

  it('is pendiente with empty presupuestos array', () => {
    const result = computePasosCrm(emptyInput());
    expect(result.pasos.presupuesto).toBe('pendiente');
  });

  it('is pendiente when presupuesto estado is PENDIENTE (not ENVIADO/ACEPTADO)', () => {
    const result = computePasosCrm({
      ...emptyInput(),
      presupuestos: [{ estado: 'PENDIENTE' }],
    });
    expect(result.pasos.presupuesto).toBe('pendiente');
  });

  it('is pendiente when presupuesto estado is RECHAZADO', () => {
    const result = computePasosCrm({
      ...emptyInput(),
      presupuestos: [{ estado: 'RECHAZADO' }],
    });
    expect(result.pasos.presupuesto).toBe('pendiente');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Paso 3: cirugia
// ─────────────────────────────────────────────────────────────────────────────

describe('computePasosCrm — cirugia', () => {
  it('is completo when cirugias array has at least one record (fecha required in model)', () => {
    const result = computePasosCrm({
      ...emptyInput(),
      cirugias: [{ fecha: new Date('2026-08-01'), estado: 'PROGRAMADA' }],
    });
    expect(result.pasos.cirugia).toBe('completo');
  });

  it('is completo regardless of estado (COMPLETADA counts)', () => {
    const result = computePasosCrm({
      ...emptyInput(),
      cirugias: [{ fecha: new Date('2025-06-01'), estado: 'COMPLETADA' }],
    });
    expect(result.pasos.cirugia).toBe('completo');
  });

  it('is pendiente when cirugias is empty', () => {
    const result = computePasosCrm(emptyInput());
    expect(result.pasos.cirugia).toBe('pendiente');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Paso 4: consentimiento
// ─────────────────────────────────────────────────────────────────────────────

describe('computePasosCrm — consentimiento', () => {
  it('is completo when ConsentimientoFirmado with firmadoAt exists (v1.12 primary)', () => {
    const result = computePasosCrm({
      ...emptyInput(),
      consentimientosFirmados: [
        { firmadoAt: new Date(), indicacionesLeidasAt: new Date() },
      ],
    });
    expect(result.pasos.consentimiento).toBe('completo');
  });

  it('is completo via legacy consentimientoFirmado flag (fallback for pre-v1.12)', () => {
    const result = computePasosCrm({
      ...emptyInput(),
      consentimientoFirmado: true,
    });
    expect(result.pasos.consentimiento).toBe('completo');
  });

  it('is pendiente when no ConsentimientoFirmado and legacy flag is false', () => {
    const result = computePasosCrm(emptyInput());
    expect(result.pasos.consentimiento).toBe('pendiente');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Paso 5: indicacionesPreop
// ─────────────────────────────────────────────────────────────────────────────

describe('computePasosCrm — indicacionesPreop', () => {
  it('is completo when ConsentimientoFirmado.indicacionesLeidasAt is present (v1.12 primary)', () => {
    const result = computePasosCrm({
      ...emptyInput(),
      consentimientosFirmados: [
        { firmadoAt: new Date(), indicacionesLeidasAt: new Date() },
      ],
    });
    expect(result.pasos.indicacionesPreop).toBe('completo');
  });

  it('is completo via legacy indicacionesEnviadas flag (fallback for pre-v1.12)', () => {
    const result = computePasosCrm({
      ...emptyInput(),
      indicacionesEnviadas: true,
    });
    expect(result.pasos.indicacionesPreop).toBe('completo');
  });

  it('is pendiente when no ConsentimientoFirmado.indicacionesLeidasAt and legacy flag is false', () => {
    const result = computePasosCrm(emptyInput());
    expect(result.pasos.indicacionesPreop).toBe('pendiente');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// todosCompletos
// ─────────────────────────────────────────────────────────────────────────────

describe('computePasosCrm — todosCompletos', () => {
  it('is true when all 5 steps are completo', () => {
    const result = computePasosCrm({
      presupuestos: [{ estado: 'ACEPTADO' }],
      cirugias: [{ fecha: new Date(), estado: 'COMPLETADA' }],
      historiasClinicas: [
        { entradas: [{ status: 'FINALIZED', tipoEntrada: 'CONSULTA_CIRUGIA' }] },
      ],
      consentimientosFirmados: [
        { firmadoAt: new Date(), indicacionesLeidasAt: new Date() },
      ],
      consentimientoFirmado: false,
      indicacionesEnviadas: false,
    });
    expect(result.todosCompletos).toBe(true);
    expect(Object.values(result.pasos).every((v) => v === 'completo')).toBe(true);
  });

  it('is false when exactly one step is pendiente (hc pendiente)', () => {
    const result = computePasosCrm({
      presupuestos: [{ estado: 'ACEPTADO' }],
      cirugias: [{ fecha: new Date(), estado: 'COMPLETADA' }],
      historiasClinicas: [], // hc pendiente
      consentimientosFirmados: [
        { firmadoAt: new Date(), indicacionesLeidasAt: new Date() },
      ],
      consentimientoFirmado: false,
      indicacionesEnviadas: false,
    });
    expect(result.todosCompletos).toBe(false);
    expect(result.pasos.hc).toBe('pendiente');
  });

  it('is false when all steps are pendiente (empty input)', () => {
    const result = computePasosCrm(emptyInput());
    expect(result.todosCompletos).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Robustez: arrays/flags undefined o null no deben lanzar
// ─────────────────────────────────────────────────────────────────────────────

describe('computePasosCrm — robustez con null/undefined', () => {
  it('does not throw when all arrays are undefined', () => {
    expect(() =>
      computePasosCrm({
        presupuestos: undefined as any,
        cirugias: undefined as any,
        historiasClinicas: undefined as any,
        consentimientosFirmados: undefined as any,
        consentimientoFirmado: undefined as any,
        indicacionesEnviadas: undefined as any,
      }),
    ).not.toThrow();
  });

  it('returns all pendiente and todosCompletos false when all inputs are undefined', () => {
    const result = computePasosCrm({
      presupuestos: undefined as any,
      cirugias: undefined as any,
      historiasClinicas: undefined as any,
      consentimientosFirmados: undefined as any,
      consentimientoFirmado: undefined as any,
      indicacionesEnviadas: undefined as any,
    });
    expect(result.pasos.hc).toBe('pendiente');
    expect(result.pasos.presupuesto).toBe('pendiente');
    expect(result.pasos.cirugia).toBe('pendiente');
    expect(result.pasos.consentimiento).toBe('pendiente');
    expect(result.pasos.indicacionesPreop).toBe('pendiente');
    expect(result.todosCompletos).toBe(false);
  });

  it('does not throw when all arrays are null', () => {
    expect(() =>
      computePasosCrm({
        presupuestos: null as any,
        cirugias: null as any,
        historiasClinicas: null as any,
        consentimientosFirmados: null as any,
        consentimientoFirmado: null as any,
        indicacionesEnviadas: null as any,
      }),
    ).not.toThrow();
  });
});
