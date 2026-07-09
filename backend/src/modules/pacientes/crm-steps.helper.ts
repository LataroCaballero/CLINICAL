/**
 * Pure helper for CRM stepper step-state computation.
 * Extracted to enable direct unit testing without NestJS/Prisma imports.
 *
 * Computes the 5 canonical CRM stepper steps (D-04/D-05) and a derived
 * todosCompletos flag for a patient's kanban payload.
 *
 * Precedence for consentimiento (D-05):
 *   Primary source: ConsentimientoFirmado model (v1.12 portal/consent)
 *   Fallback (OR): legacy Paciente boolean flag (pre-v1.12 patients)
 *
 * Precedence for indicacionesPreop (v1.14, D-04):
 *   Primary source: Paciente.indicacionesLeidasAt (acuse en el perfil del paciente)
 *   Fallback 1 (OR): ConsentimientoFirmado.indicacionesLeidasAt (legacy v1.12)
 *   Fallback 2 (OR): legacy Paciente.indicacionesEnviadas boolean (pre-v1.12)
 */

export type PasoEstado = 'completo' | 'pendiente';

export interface PasosCrm {
  hc: PasoEstado;
  presupuesto: PasoEstado;
  cirugia: PasoEstado;
  consentimiento: PasoEstado;
  indicacionesPreop: PasoEstado;
}

/**
 * Minimal structural interface — only the fields that computePasosCrm reads.
 * Decoupled from the full Prisma Paciente type to keep this helper reusable
 * and testable without Prisma imports.
 */
export interface PacientePasosInput {
  /** Presupuestos excluidos RECHAZADO (ya filtrados por getKanban select) */
  presupuestos?: Array<{ estado: string }> | null;
  /** Registros Cirugia del paciente (fecha es requerida en el modelo) */
  cirugias?: Array<{ fecha: Date | string; estado: string }> | null;
  /** HistoriasClincias con sus entradas */
  historiasClinicas?: Array<{
    entradas: Array<{
      status: string;
      tipoEntrada: string | null;
    }>;
  }> | null;
  /** ConsentimientosFirmados (v1.12) — fuente primaria para pasos 4 y 5 */
  consentimientosFirmados?: Array<{
    firmadoAt: Date | string;
    indicacionesLeidasAt: Date | string | null;
  }> | null;
  /** Legacy Paciente.consentimientoFirmado boolean (fallback pre-v1.12) */
  consentimientoFirmado?: boolean | null;
  /** Legacy Paciente.indicacionesEnviadas boolean (fallback pre-v1.12) */
  indicacionesEnviadas?: boolean | null;
  /** Paciente.indicacionesLeidasAt (v1.14) — fuente PRIMARIA nueva del paso indicaciones */
  indicacionesLeidasAt?: Date | string | null;
}

/**
 * Computes the state of the 5 canonical CRM stepper steps for a patient.
 * Pure function — no side effects, no external dependencies.
 *
 * @param p - Structural patient input (subset of Prisma Paciente relations)
 * @returns { pasos: PasosCrm; todosCompletos: boolean }
 */
export function computePasosCrm(p: PacientePasosInput): {
  pasos: PasosCrm;
  todosCompletos: boolean;
} {
  const presupuestos = p.presupuestos ?? [];
  const cirugias = p.cirugias ?? [];
  const historiasClinicas = p.historiasClinicas ?? [];
  const consentimientosFirmados = p.consentimientosFirmados ?? [];
  const consentimientoFirmadoLegacy = p.consentimientoFirmado ?? false;
  const indicacionesEnviadasLegacy = p.indicacionesEnviadas ?? false;

  // ── Paso 1: HC ────────────────────────────────────────────────────────────
  // Completo: al menos una entrada con status FINALIZED Y tipoEntrada CONSULTA_CIRUGIA
  const hcCompleto = historiasClinicas.some((hc) =>
    hc.entradas.some(
      (e) => e.status === 'FINALIZED' && e.tipoEntrada === 'CONSULTA_CIRUGIA',
    ),
  );

  // ── Paso 2: Presupuesto ───────────────────────────────────────────────────
  // Completo: algún presupuesto con estado ENVIADO o ACEPTADO
  const presupuestoCompleto = presupuestos.some(
    (pr) => pr.estado === 'ENVIADO' || pr.estado === 'ACEPTADO',
  );

  // ── Paso 3: Cirugía ───────────────────────────────────────────────────────
  // Completo: existe cualquier registro Cirugia (fecha es requerida en el modelo)
  const cirugiaCompleto = cirugias.length > 0;

  // ── Paso 4: Consentimiento ────────────────────────────────────────────────
  // Primary (v1.12): ConsentimientoFirmado.firmadoAt presente
  // Fallback (legacy): Paciente.consentimientoFirmado === true
  const consentimientoCompleto =
    consentimientosFirmados.some((c) => c.firmadoAt != null) ||
    consentimientoFirmadoLegacy === true;

  // ── Paso 5: Indicaciones preop ────────────────────────────────────────────
  // Primary (v1.14): Paciente.indicacionesLeidasAt presente (acuse en el perfil)
  // Fallback 1 (legacy v1.12): ConsentimientoFirmado.indicacionesLeidasAt
  // Fallback 2 (legacy pre-v1.12): Paciente.indicacionesEnviadas === true
  const indicacionesPreopCompleto =
    p.indicacionesLeidasAt != null ||
    consentimientosFirmados.some((c) => c.indicacionesLeidasAt != null) ||
    indicacionesEnviadasLegacy === true;

  const pasos: PasosCrm = {
    hc: hcCompleto ? 'completo' : 'pendiente',
    presupuesto: presupuestoCompleto ? 'completo' : 'pendiente',
    cirugia: cirugiaCompleto ? 'completo' : 'pendiente',
    consentimiento: consentimientoCompleto ? 'completo' : 'pendiente',
    indicacionesPreop: indicacionesPreopCompleto ? 'completo' : 'pendiente',
  };

  // todosCompletos: true solo cuando los 5 pasos son 'completo' (EMBUDO-04)
  const todosCompletos = Object.values(pasos).every((v) => v === 'completo');

  return { pasos, todosCompletos };
}
