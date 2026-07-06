---
phase: 60-estad-sticas-sobre-registros-reales
plans: [60-01, 60-02]
asvs_level: 2
audit_date: 2026-07-05
result: SECURED
threats_total: 5
threats_closed: 5
threats_open: 0
---

# Security Audit — Phase 60: Estadísticas sobre Registros Reales

**Result:** SECURED — all declared mitigations present in implemented code.

---

## Threat Verification

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-60-01 | Information Disclosure | mitigate | CLOSED | `crm-dashboard.service.ts:157` — `profesionalId` present in `prisma.cirugia.count` where clause |
| T-60-02 | Information Disclosure | mitigate | CLOSED | `crm-dashboard.service.ts:168` — `historiaClinica: { profesionalId }` present in `prisma.historiaClinicaEntrada.count` where clause |
| T-60-03 | Tampering | mitigate | CLOSED | `crm-dashboard.service.ts:155-170` — neither `cirugia.count` nor `historiaClinicaEntrada.count` where clauses contain `etapaCRM`; `etapaCRM` only appears in pre-existing `confirmados` (line 143) and `totalActivos` (line 151) paciente.count queries |
| T-60-04 | Information Disclosure | accept | CLOSED | See accepted risks log below |
| T-60-SC | Tampering | accept | CLOSED | See accepted risks log below |

---

## Mitigation Detail

### T-60-01 — cirugiasRealizadas scoped by profesionalId

File: `backend/src/modules/reportes/services/crm-dashboard.service.ts`

```
Lines 155-163:
  this.prisma.cirugia.count({
    where: {
      profesionalId,          // <-- tenant filter
      fecha: { lt: ahora },
      estado: { notIn: [EstadoCirugia.CANCELADA, EstadoCirugia.SUSPENDIDA] },
    },
  })
```

Cross-tenant data leakage via cirugia is impossible: every row returned is constrained to the calling profesionalId.

### T-60-02 — tratamientosRealizados scoped by historiaClinica.profesionalId

File: `backend/src/modules/reportes/services/crm-dashboard.service.ts`

```
Lines 164-170:
  this.prisma.historiaClinicaEntrada.count({
    where: {
      tipoEntrada: TipoEntradaHC.TRATAMIENTO,
      status: EstadoEntradaHC.FINALIZED,
      historiaClinica: { profesionalId },   // <-- nested tenant filter
    },
  })
```

HistoriaClinicaEntrada has no direct profesionalId; the nested relation `historiaClinica.profesionalId` is the correct and only scoping path. Confirmed present.

### T-60-03 — Counts are independent of etapaCRM

File: `backend/src/modules/reportes/services/crm-dashboard.service.ts`

All `etapaCRM` references in `getKpis` (lines 143, 151) belong exclusively to the pre-existing `confirmados` and `totalActivos` paciente.count queries. The two new count queries (`cirugia.count` lines 155-163 and `historiaClinicaEntrada.count` lines 164-170) contain no `etapaCRM` predicate. A consumer changing a patient's `etapaCRM` to `PERDIDO` or any other value cannot alter either count.

Invariant codified in spec: `crm-dashboard.service.spec.ts` — Test A asserts `expect.not.objectContaining({ etapaCRM: expect.anything() })` for both mocks (lines 53-70).

---

## Accepted Risks Log

### T-60-04 — Frontend Information Disclosure (accepted)

**Component:** `useCRMKpis` / `CRMKpiCards`
**Risk:** Frontend rendering of multi-tenant data.
**Rationale:** The frontend exclusively displays values already filtered by `profesionalId` in the backend (T-60-01, T-60-02). `CRMKpiCards.tsx:13` obtains `profId` via `useEffectiveProfessionalId()` and passes it as a query parameter; the backend enforces the tenant filter before returning any data. No client-side scoping logic that could be bypassed is present.
**Accepted by:** Phase 60-02 threat model, plan author.
**Residual risk:** Negligible — backend is the authoritative enforcement point.

### T-60-SC — Supply Chain (npm installs) (accepted)

**Component:** npm package installations for plans 60-01 and 60-02.
**Risk:** Introduction of malicious or unvetted third-party packages.
**Rationale:** No new dependencies were installed in either plan. `60-01-SUMMARY.md` and `60-02-SUMMARY.md` both declare `tech_stack.added: []`. RESTRICCIÓN v1.13 (no nuevas dependencias) was honored.
**Accepted by:** Phase 60-01 and 60-02 threat models, plan author.
**Residual risk:** None for this phase; existing dependency set unchanged.

---

## Unregistered Threat Flags

None. Both `60-01-SUMMARY.md` and `60-02-SUMMARY.md` report no new attack surface introduced during implementation.

---

## Auditor Notes

The `GET /reportes/crm/kpis` endpoint (controller line 86-91) accepts `profesionalId` as an unauthenticated query parameter and passes it directly to `getKpis`. The controller-level guard (`@Auth('ADMIN', 'PROFESIONAL')`) prevents unauthenticated access, but does not verify that the requesting user is authorized to query data for the supplied `profesionalId`. This authorization boundary is NOT in the phase 60 threat register (constraint: do not scan for new threats). It is noted here for the next security review cycle to evaluate whether caller-identity binding for `profesionalId` params is required at the controller layer.
