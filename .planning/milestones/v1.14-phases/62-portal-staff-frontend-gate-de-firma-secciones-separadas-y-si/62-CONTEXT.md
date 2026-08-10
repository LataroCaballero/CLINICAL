# Phase 62: Portal + Staff Frontend — Gate de Firma, Secciones Separadas y Sincronización - Context

**Gathered:** 2026-07-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Fase **frontend** de v1.14 (cierra el milestone iniciado en Phase 61). El backend ya entregó todo lo necesario en Phase 61 (campo `Paciente.indicacionesLeidasAt`, endpoint portal-scoped `POST indicaciones/acuse`, `computePasosCrm` derivando el paso del perfil). Entrega:

1. **Gate de firma del consentimiento** (CONS-09/10): el botón de firma queda deshabilitado hasta que el paciente (a) abra el PDF del consentimiento y (b) tilde "Leí el consentimiento". Ambas condiciones, sin dependencia de indicaciones.
2. **Secciones separadas en el portal** (CONS-12, INDIC-01): la sección "Consentimiento" muestra SOLO los PDFs de consentimiento por zona; las indicaciones preoperatorias viven en una sección propia y separada.
3. **Acuse automático de indicaciones** (INDIC-02): al abrir el link/archivo de indicaciones, el portal dispara `POST indicaciones/acuse` sin paso adicional del paciente.
4. **Indicador de indicaciones en el staff** (INDIC-05): el stepper del board muestra si el paciente leyó las indicaciones, con la fecha de lectura.
5. **Sincronización del board** (EMBUDO-06): el board CRM refleja consentimiento firmado / indicaciones leídas sin recarga manual, vía refetch on window focus del query `['crm-kanban']`.

**Fuera de esta fase:** registro server-side de "PDF abierto" (el gate es client-side por diseño — ver Out of Scope en REQUIREMENTS); firma dibujada para indicaciones; backfill histórico; endpoints backend nuevos (salvo el mini-cambio de exposición de campo en `getKanban`, ver D-03).

</domain>

<decisions>
## Implementation Decisions

### A. Gate de firma del consentimiento (CONS-09/10)
- **D-00 (locked por Phase 61 + REQUIREMENTS):** El gate open-PDF es **client-side**. La prueba legal es la firma + el checkbox de acuse, NO un registro server-side de apertura. No se agrega tracking server-side de "PDF abierto".
- **D-01:** En `ZoneCard` (`PortalConsentimiento.tsx`), la firma se habilita solo cuando se cumplen **dos** condiciones nuevas + la firma dibujada:
  1. `pdfAbierto` — el paciente hizo click en el link "Descargar / ver el consentimiento" (se setea `true` en el `onClick` del `<a>` del PDF de consentimiento).
  2. `leiConsentimiento` — checkbox "Leí el consentimiento" tildado.
  Reemplazan al gate legacy `!indicacionesLeidas`. El botón queda `disabled` hasta `pdfAbierto && leiConsentimiento && !canvasEmpty && !isSubmitting && canvasSupported`.
- **D-02:** El checkbox de indicaciones actual dentro de `ZoneCard` (CONS-07 / D-11 legacy, líneas 171-205) se **elimina**; se reemplaza por el checkbox "Leí el consentimiento". La sección de consentimiento deja de mostrar cualquier link/contenido de indicaciones (cumple CONS-12).
- **D-03-firma:** El front **deja de enviar** `indicacionesLeidas` en el payload de `firmarConsentimiento`. Quitar el campo de `FirmarConsentimientoPayload` (`usePortalConsentimiento.ts:31-38`) y de la llamada en `handleFirmar` (`PortalConsentimiento.tsx:108-112`). Phase 61 ya removió el campo del DTO backend (`whitelist` lo strippearía igual, pero se limpia el front por prolijidad).

### B. Sección Indicaciones separada (INDIC-01/02)
- **D-04 (fuente de datos):** La nueva sección "Indicaciones" **reusa el response existente** de `useConsentimientosParaFirmar` (`GET /paciente-portal/public/consentimiento`), que ya trae `indicacionesUrl` per-zona. **No se crea endpoint backend nuevo.** La sección lee los `indicacionesUrl` de las zonas `PARA_FIRMAR`/aplicables y los presenta como link(s) de indicaciones.
- **D-05 (trigger del acuse):** El acuse se dispara **al abrir el link/archivo** de indicaciones — es decir, en el `onClick` del `<a href={safeIndicacionesUrl}>` (que abre en pestaña nueva). NO al expandir el acordeón. Rationale: "abrir" = abrir el archivo, más fiel a "leyó de verdad" que expandir la sección. Si no hay `indicacionesUrl` (médico no cargó indicaciones), no hay nada que abrir → no se dispara acuse y se muestra empty state.
- **D-06:** El acuse usa un **nuevo hook de mutación** análogo a `useFirmarConsentimiento` → `useAcusarIndicaciones` que hace `POST /paciente-portal/public/indicaciones/acuse` (portal-scoped, sin body o body vacío — confirmar route final contra el controller de Phase 61). Es **idempotente/set-once** en backend, así que disparar en cada click es seguro; opcionalmente el front puede evitar reenvíos redundantes en la misma sesión (guard local, no crítico).
- **D-07 (URL XSS-safe):** Mantener el guard `^https?://` ya presente (`safeIndicacionesUrl`, líneas 33-36) al renderizar `indicacionesUrl` como `href`. El backend de Phase 61 (cr-01) ya validó el URL server-side, pero el guard client-side se conserva como defensa en profundidad.

### C. Indicador de indicaciones en el staff (INDIC-05)
- **D-08:** Para mostrar la **fecha** de lectura (requerido por SC#5/INDIC-05), se expone `indicacionesLeidasAt` en el payload de `getKanban`. **Mini-cambio backend, sin lógica nueva:** el `select` de `getKanban` (`pacientes.service.ts:662`) ya trae `indicacionesLeidasAt`; solo falta (a) agregarlo al objeto de respuesta del `.map` de pacientes y (b) agregar el campo al tipo `KanbanPatient` (`useCRMKanban.ts:36-61`).
- **D-09:** En `EtapaStepper.tsx`, el sub-indicador "Indicaciones preop" (líneas 213-225, dentro de `showSubIndicadores` bajo `CONFIRMADO`) muestra la fecha cuando `indicacionesLeidasAt != null`: p.ej. `Indicaciones preop · leídas DD/MM/AAAA` (formato `toLocaleDateString('es-AR')`, consistente con el resto del portal/board). El coloreo verde/naranja del dot se mantiene gobernado por `pasos.indicacionesPreop` (ya existente).

### D. Sincronización del board (EMBUDO-06)
- **D-10:** En `useCRMKanban` (`useCRMKanban.ts:93-105`) activar **`refetchOnWindowFocus: true` explícito** y **reducir `staleTime`** (de `30_000` a un valor bajo, sugerido `0`–`5_000`) para que el refetch on focus dispare efectivamente cuando el staff vuelve a la pestaña tras cambios hechos desde el portal. Trade-off aceptado: más requests a cambio de datos siempre frescos (cierra la deuda W-1 de v1.13). El planner ajusta el valor exacto de `staleTime`.
- **D-11:** El query key sigue siendo `['crm-kanban', profesionalId]` (no se cambia). El requisito EMBUDO-06 menciona `['crm-kanban']` como familia de key; `refetchOnWindowFocus` opera sobre la key completa igual. Las invalidaciones existentes (`useUpdateFlujo`, `useUpdateEtapaCRM`, etc. ya invalidan `['crm-kanban']`) no se tocan.

### Claude's Discretion
- Layout exacto de la nueva sección "Indicaciones" en el acordeón del portal (ícono, copy del empty state, orden respecto a "Consentimiento"). Seguir el patrón visual de las secciones existentes (`AccordionItem` con ícono lucide + título).
- Valor exacto de `staleTime` dentro del rango D-10.
- Micro-copy de los checkboxes y del indicador de fecha del staff.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos y roadmap del milestone
- `.planning/REQUIREMENTS.md` — CONS-09, CONS-10, CONS-12, INDIC-01, INDIC-02, INDIC-05, EMBUDO-06 (scope de Phase 62); tabla "Out of Scope" (gate open-PDF es client-side; no registro server-side de apertura).
- `.planning/ROADMAP.md` §"Phase 62" — Goal + 6 Success Criteria (fuente de verdad de qué debe ser TRUE).
- `.planning/PROJECT.md` — deuda W-1 v1.13 (refetch on focus) cierra en esta fase.

### Fase previa (backend ya entregado)
- `.planning/phases/61-backend-schema-decoupling-e-indicaciones/61-CONTEXT.md` — decisiones D-01..D-07 de Phase 61 (endpoint de acuse set-once, decoupling de firma, derivación de `computePasosCrm`, fix cr-01 XSS de `indicacionesUrl`).

### Código a modificar (paths verificados en scout)
- `frontend/src/components/portal/PortalConsentimiento.tsx` — `ZoneCard` (gate open-PDF + checkbox "Leí el consentimiento", remover checkbox de indicaciones y su render); quitar `indicacionesLeidas` del payload.
- `frontend/src/app/portal/[token]/page.tsx:33-38, 302-377` — agregar 5ª sección "Indicaciones" al acordeón (config `SECCIONES` + nuevo `AccordionItem`).
- `frontend/src/hooks/usePortalConsentimiento.ts` — quitar `indicacionesLeidas` de `FirmarConsentimientoPayload`; agregar hook `useAcusarIndicaciones` (POST `indicaciones/acuse`).
- `frontend/src/hooks/useCRMKanban.ts:36-105` — agregar `indicacionesLeidasAt` al tipo `KanbanPatient`; `refetchOnWindowFocus: true` + bajar `staleTime`.
- `frontend/src/components/crm/EtapaStepper.tsx:213-225` — mostrar fecha en el sub-indicador "Indicaciones preop".
- `backend/src/modules/pacientes/pacientes.service.ts` — exponer `indicacionesLeidasAt` en el objeto de respuesta del `.map` de `getKanban` (el `select` ya lo trae, línea 662).
- `backend/src/modules/paciente-portal/paciente-portal.controller.ts:173` — route `POST indicaciones/acuse` (confirmar prefijo/route final para el hook del front).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`useFirmarConsentimiento`** (`usePortalConsentimiento.ts:57-71`): patrón exacto para el nuevo `useAcusarIndicaciones` (mutation con `portalApi.post`, invalidación opcional de `['portal-consentimiento']`).
- **`useConsentimientosParaFirmar`** (`usePortalConsentimiento.ts:42-53`): ya devuelve `indicacionesUrl` per-zona en el estado `PARA_FIRMAR` → fuente de datos de la nueva sección Indicaciones (D-04), sin backend nuevo.
- **Patrón `AccordionItem`** en `page.tsx` (secciones info/salud/consentimiento/consultas): la sección Indicaciones se agrega con el mismo shape (ícono lucide + título + componente hijo).
- **`safeIndicacionesUrl` guard** (`^https?://`, `PortalConsentimiento.tsx:33-36`): reusar para el `href` de indicaciones (defensa en profundidad sobre la validación server-side de Phase 61).
- **Sub-indicadores del stepper** (`EtapaStepper.tsx:198-227`): ya existe el dot "Indicaciones preop"; solo se le suma la fecha.

### Established Patterns
- **`portalApi`** (`lib/portal-api.ts`) — cliente axios portal-scoped que adjunta el JWT `portal-paciente`; todo endpoint del portal lo usa. El acuse (D-06) va por acá, no por `api.ts`.
- **Estados D-10 del consentimiento** — `ConsentimientoEstado` es discriminated union (SIN_CIRUGIA, SIN_CATALOGO, SIN_ZONA, SIN_PDF, YA_FIRMADO, PARA_FIRMAR); la sección Indicaciones debe manejar la ausencia de `indicacionesUrl` con empty state (no todas las zonas tienen indicaciones cargadas).
- **Formato de fecha** `toLocaleDateString('es-AR')` — usado en portal y board; el indicador de staff lo reusa.

### Integration Points
- El acuse (`useAcusarIndicaciones`) escribe `Paciente.indicacionesLeidasAt` en backend → tras el refetch on focus del board (D-10), `computePasosCrm` marca `indicacionesPreop = completo`. El flujo portal→board queda cerrado end-to-end.
- `getKanban` es el único consumidor de `computePasosCrm`; el campo `indicacionesLeidasAt` expuesto (D-08) viaja solo para display de fecha, NO cambia la derivación del paso (que ya usa el `.some(...)`/campo del perfil).

</code_context>

<specifics>
## Specific Ideas

- "Abrir" indicaciones = abrir el archivo (click en el link), no expandir la sección → el acuse refleja intención real de lectura.
- El indicador del staff debe mostrar fecha (no solo estado) para cumplir INDIC-05 literalmente; el costo backend es exponer un campo ya seleccionado.
- Preferir freshness sobre volumen de requests en el board (cierre de deuda W-1): refetch on focus con staleTime bajo.

</specifics>

<deferred>
## Deferred Ideas

- Registro server-side de "PDF abierto" del consentimiento — explícitamente Out of Scope en REQUIREMENTS (el gate es client-side por diseño legal).
- Endpoint backend dedicado de indicaciones (GET portal-scoped separado) — se descartó a favor de reusar el response de consentimiento (D-04). Considerar si en el futuro las indicaciones se desacoplan por completo de las zonas de consentimiento.
- Guard local anti-reenvío del acuse por sesión — opcional/no crítico (backend es idempotente set-once); el planner decide si vale la pena.

None — la discusión se mantuvo dentro del scope de la fase.

</deferred>

---

*Phase: 62-portal-staff-frontend-gate-de-firma-secciones-separadas-y-si*
*Context gathered: 2026-07-20*
