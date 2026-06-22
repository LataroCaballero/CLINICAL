# Requirements: CLINICAL — v1.10 Refinamiento Planilla de Tratamientos

**Defined:** 2026-06-21
**Core Value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada posible.

## v1.10 Requirements

Refinamientos a la planilla de Tratamientos en `/dashboard/pacientes`. Cada requisito mapea a una fase del roadmap.

### Último tratamiento

- [ ] **TRAT-01**: La columna "Último tratamiento" muestra el/los tratamiento(s) registrados en la entrada de HC correspondiente a ese turno (resolución por turno/fecha), no el último tratamiento global del paciente.
- [ ] **TRAT-02**: El lector de tratamientos resuelve los tres shapes de contenido de HC: v1.9 agrupado por zona (`contenido.zonas[].tratamientos`), legacy plano (`contenido.tratamientos`) y texto libre / tratamiento en consultorio.
- [x] **TRAT-03**: Al crear una entrada de HC con tratamientos, el snapshot de tratamientos se persiste aunque `consumirInsumos=false` (fix tech debt LIVHC-05/PAC-01); las entradas nuevas siempre pueblan la columna.

### Filtro de pacientes

- [ ] **TRAT-04**: Un paciente con flujo CIRUGIA que no tiene ningún tratamiento real (ni turno tipo Tratamiento, ni entrada de HC con tipoEntrada=TRATAMIENTO con contenido de tratamientos) no aparece en la planilla de Tratamientos (filtro automático, sin acción manual).
- [ ] **TRAT-05**: Se preserva el estado dual de v1.8 — un paciente con flujo CIRUGIA que sí tiene un tratamiento real sigue apareciendo en la planilla simultáneamente con su presencia en el kanban CRM.

### Legibilidad de estado

- [ ] **TRAT-06**: Los chips de la columna "Estado" tienen color-coding semántico y labels humanizados para todos los valores reales del enum `EstadoTurno` (PENDIENTE, CONFIRMADO, EN_ESPERA, SIENDO_ATENDIDO, FINALIZADO, AUSENTE, CANCELADO).

## Out of Scope

Explicitamente excluido. Documentado para prevenir scope creep.

| Feature | Reason |
|---------|--------|
| Backfill de entradas HC históricas sin snapshot de tratamientos | Las entradas legacy se tratan como están; sólo se corrige hacia adelante (entradas nuevas) y se hacen legibles los shapes existentes. Consistente con la política sin-backfill de v1.8/v1.9 |
| Inferir tratamiento "planificado" para turnos futuros sin HC (desde presupuesto o tipo de turno) | El usuario optó por mostrar sólo lo registrado en la HC; turnos futuros sin HC quedan vacíos |
| Botón/flag de archivar por fila en la planilla de Tratamientos | El usuario optó por filtro automático, no por acción manual reversible |

## Traceability

Qué fases cubren qué requisitos.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TRAT-01 | Phase 48 | Pending |
| TRAT-02 | Phase 48 | Pending |
| TRAT-03 | Phase 48 | Complete |
| TRAT-04 | Phase 49 | Pending |
| TRAT-05 | Phase 49 | Pending |
| TRAT-06 | Phase 49 | Pending |

**Coverage:**
- v1.10 requirements: 6 total
- Mapped to phases: 6 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-06-21*
*Last updated: 2026-06-21 — traceability complete (roadmap phases 48–49 assigned)*
