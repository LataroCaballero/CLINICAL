---
status: partial
phase: 62-portal-staff-frontend-gate-de-firma-secciones-separadas-y-si
source: [62-VERIFICATION.md]
started: 2026-07-21T15:54:23Z
updated: 2026-07-21T15:54:23Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Gate de firma del consentimiento (visual/interactivo)
expected: Botón de firma deshabilitado hasta abrir el PDF y tildar "Leí el consentimiento"; sección de consentimiento sin rastro de indicaciones; firma funciona end-to-end una vez cumplidas ambas condiciones + firma dibujada.
result: [pending]

### 2. Acuse de lectura de indicaciones (Network)
expected: Al click en el link de indicaciones se dispara POST /paciente-portal/public/indicaciones/acuse (200); empty state sin request cuando no hay indicacionesUrl cargada.
result: [pending]

### 3. Fecha en stepper + refetch on focus del board CRM
expected: Sub-indicador "Indicaciones preop" muestra la fecha en es-AR; al acusar desde el portal en otra pestaña y volver el foco al board, el dot pasa a verde con la fecha visible sin recarga manual.
result: [pending]

### 4. DECISIÓN DE PRODUCTO — CR-03 (stepper per-zone vs campo global)
expected: Decisión explícita sobre `Paciente.indicacionesLeidasAt` (campo global/set-once de Phase 61) mostrado como confirmación por zona en el stepper. En pacientes multi-zona, abrir indicaciones de la zona A marca todas las zonas como leídas. Aceptar como limitación conocida (agregar override) o crear plan de gap-closure.
result: [pending]

### 5. DECISIÓN DE PRODUCTO — WR-01 (fallo silencioso de acuse)
expected: Decisión explícita sobre el fallo silencioso de `useAcusarIndicaciones()` (sin onError/toast). Aceptar (backend reintentable, próximo click reintenta) o agregar manejo de error visible al paciente para el registro legal INDIC-02.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
