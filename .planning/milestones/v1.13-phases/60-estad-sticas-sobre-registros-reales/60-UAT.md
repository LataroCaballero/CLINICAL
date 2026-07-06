---
status: complete
phase: 60-estad-sticas-sobre-registros-reales
source: [60-01-SUMMARY.md, 60-02-SUMMARY.md]
started: 2026-07-05T22:33:46Z
updated: 2026-07-05T22:37:10Z
---

## Current Test

[testing complete]

## Tests

### 1. Card "Cirugías realizadas" en el dashboard
expected: En la sección de KPIs del CRM aparece una tarjeta "Cirugías realizadas" con subtítulo "registro efectivo" mostrando un conteo real de cirugías ya realizadas (fecha pasada, no canceladas/suspendidas) del profesional actual.
result: pass

### 2. Card "Tratamientos realizados" en el dashboard
expected: Aparece una tarjeta "Tratamientos realizados" con subtítulo "registro efectivo" mostrando el conteo de entradas de historia clínica de tipo tratamiento ya finalizadas del profesional actual.
result: pass

### 3. Grilla de 6 tarjetas KPI
expected: La sección de KPIs ahora muestra 6 tarjetas acomodadas de forma pareja — 2 columnas en móvil, 3 en tablet, 6 en escritorio — sin tarjetas cortadas ni desalineadas.
result: pass

### 4. Los conteos reflejan registros reales, no la etapa CRM
expected: Cambiar la etapa CRM de un paciente (por ejemplo marcarlo como PERDIDO) NO altera los números de "Cirugías realizadas" ni "Tratamientos realizados". Reflejan hechos registrados, no el estado del embudo.
result: pass

### 5. Aislamiento por profesional
expected: Al cambiar el contexto de profesional (o iniciar sesión como otro profesional), los conteos "Cirugías realizadas" y "Tratamientos realizados" cambian para mostrar solo los registros de ese profesional.
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
