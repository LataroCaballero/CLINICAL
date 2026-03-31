# Phase 17: CAE Emission UX — Research

**Researched:** 2026-03-30
**Domain:** Frontend TanStack Query mutation/polling + NestJS schema gap + shadcn/ui Dialog
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAE-02 | Sistema emite comprobante via FECAESolicitar — Facturador puede disparar la emisión desde UI; factura queda en EMISION_PENDIENTE inmediatamente | Endpoint POST /finanzas/facturas/:id/emitir ya existe (controller:171). Falta useEmitirFactura hook + onClick wire en LiquidacionesTab + ComprobantesTab/FacturaDetailModal. |
| CAE-03 | Facturador ve errores AFIP en español en un modal — mínimo error 10242, resultado=R, cert inválido | AfipBusinessError.spanishMessage ya se produce en backend. Problema: Factura schema no tiene campo afipError — estado queda EMISION_PENDIENTE sin texto visible. Plan debe agregar Factura.afipError (String?) + nueva migración + actualizar CaeEmissionProcessor.onFailed para persisitirlo. |

</phase_requirements>

---

## Summary

Phase 17 es puramente frontend con un único cambio de schema backend. El backend de emisión CAE está completamente implementado (endpoint, BullMQ, AfipRealService, error classification). Los dos gaps críticos son: (1) ningún hook ni botón llama a `POST /finanzas/facturas/:id/emitir`, y (2) cuando AFIP rechaza con `AfipBusinessError`, el mensaje en español se pierde — el procesador lanza `UnrecoverableError(spanishMessage)` al DLQ de BullMQ pero ningún campo del modelo `Factura` persiste ese mensaje, por lo que el polling de la UI nunca puede recuperarlo.

La solución tiene dos partes. Backend: agregar `Factura.afipError String?` al schema Prisma + migración, y actualizar `CaeEmissionProcessor.onFailed` para escribir `afipError` en la DB cuando el job falla permanentemente. Frontend: hook `useEmitirFactura` (useMutation POST /emitir), polling condicional en `useFactura` mientras `estado === EMISION_PENDIENTE`, botón wiring en los dos sitios donde existe "Emitir Comprobante" (LiquidacionesTab.tsx y liquidaciones/page.tsx), display del error en `FacturaDetailModal` con un Dialog secundario de error, y remoción del stub muerto `useGenerarFacturaPDF`.

El patrón de polling ya existe en el repo: `useWAThread` / `useMensajesNoLeidos` usan `refetchInterval` en TanStack Query. El modal de error sigue el patrón Dialog de shadcn/ui ya usado en `PresupuestoDetailModal` y `FacturaDetailModal`. No se requiere ninguna dependencia nueva.

**Primary recommendation:** Agregar `Factura.afipError String?` vía Prisma migration, persistirlo en `CaeEmissionProcessor.onFailed`, y usar `refetchInterval` condicional en `useFactura` para detectar la transición EMISION_PENDIENTE → EMITIDA o error.

---

## Standard Stack

### Core (all already installed — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | repo version | useMutation + useQuery polling | Established pattern in all hooks under frontend/src/hooks/ |
| shadcn/ui Dialog | repo version | Error modal | Same Dialog primitive used in FacturaDetailModal, PresupuestoDetailModal |
| sonner | repo version | Toast for pre-condition errors (IVA null, no cert) | Established toast in ComprobantesTab, LiquidacionesTab |
| Prisma | repo version | Schema migration for afipError field | Backend ORM |
| @nestjs/bullmq | repo version | CaeEmissionProcessor.onFailed persistence | BullMQ already configured in FinanzasModule |

### Installation

No new packages required. All dependencies are already present.

---

## Architecture Patterns

### Existing Pattern: TanStack Query Polling

The repo already uses `refetchInterval` for near-real-time status polling:

```typescript
// Source: frontend/src/hooks/useWAThread.ts (confirmed in codebase)
refetchInterval: 30 * 1000, // 30s polling — no WebSocket this phase
```

Pattern used in: `useWAUnread` (30s), `useMensajesNoLeidos` (60s), `useReportesDashboard` (5min), `useAlertasResumen` (60s), `useMensajesPaciente` (10s).

For EMISION_PENDIENTE polling: use conditional `refetchInterval` — poll only while `estado === EMISION_PENDIENTE`, stop when it transitions to `EMITIDA`, `EMISION_ERROR`, or `CAEA_PENDIENTE_INFORMAR`:

```typescript
// Pattern to implement in useFactura (or a wrapper hook)
refetchInterval: (query) => {
  const estado = query.state.data?.estado;
  return estado === 'EMISION_PENDIENTE' ? 3000 : false;
},
```

### Existing Pattern: Modal para acciones secundarias

```typescript
// Source: frontend/src/app/dashboard/finanzas/facturacion/components/FacturaDetailModal.tsx
// Already uses Dialog from @/components/ui/dialog
// Pattern: secondary Dialog inside FacturaDetailModal for the AFIP error
```

### Existing Pattern: useMutation con invalidateQueries

```typescript
// Source: frontend/src/hooks/useFinanzas.ts (useAnularFactura pattern)
return useMutation({
  mutationFn: async (facturaId: string) => {
    const { data } = await api.post(`/finanzas/facturas/${facturaId}/anular`);
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['finanzas', 'facturas'] });
  },
});
```

### Recommended Project Structure — New Files

No new files needed in backend (changes to existing files only). Frontend changes are additive to existing hooks + components.

```
frontend/src/hooks/useFinanzas.ts     — add useEmitirFactura + modify useFactura (refetchInterval)
frontend/src/app/dashboard/finanzas/facturacion/components/
  FacturaDetailModal.tsx              — add "Emitir Comprobante" button + AfipErrorModal
  ComprobantesTab.tsx                 — wire "Emitir Comprobante" onClick (se puede abrir FacturaDetailModal)
  LiquidacionesTab.tsx                — wire onClick en botón "Emitir Comprobante" existente (línea 570)
frontend/src/app/dashboard/finanzas/liquidaciones/page.tsx
                                      — wire onClick en botón "Emitir Comprobante" existente (línea 429)
backend/src/modules/finanzas/processors/cae-emission.processor.ts
                                      — persist afipError in onFailed
backend/src/prisma/schema.prisma      — add afipError String? to Factura model
```

### Anti-Patterns to Avoid

- **No BullMQ job status endpoint:** No crear `GET /finanzas/facturas/:id/job-status`. El patron establecido es polling del modelo con `GET /finanzas/facturas/:id`. Mantener consistencia.
- **No toast para errores AFIP:** CAE-03 requiere modal explícitamente. Un `toast.error(afipError)` no satisface el requisito.
- **No polling ilimitado:** `refetchInterval` debe ser `false` (no un number) cuando `estado !== EMISION_PENDIENTE`. Pollling continuo desperdicia requests cuando la factura ya está resuelta.
- **No omitir migración Prisma:** Sin `Factura.afipError`, no hay forma de surfacear el `spanishMessage` al frontend via polling. El enfoque de leer `job.failedReason` desde el frontend no es viable (BullMQ no expone jobs al cliente sin un endpoint dedicado).
- **No dejar useGenerarFacturaPDF:** El stub lanza `Error('PDF generation not implemented yet')` y nunca es importado — eliminarlo es requerimiento explícito (Success Criteria #5).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Estado polling UI | WebSocket, SSE | `refetchInterval` en TanStack Query | Patrón ya establecido en el repo (useWAUnread, useMensajesNoLeidos); suficiente para este use case |
| Error display | Custom toast | shadcn/ui Dialog | CAE-03 requiere modal explícitamente; Dialog ya instalado y usado |
| Job status endpoint | GET /finanzas/jobs/:id | Persistir `afipError` en Factura | Mantiene la API REST simple; el polling de `GET /finanzas/facturas/:id` ya funciona |
| AFIP error translation | Frontend regex | `AfipBusinessError.spanishMessage` ya producido en backend | Backend produce la traducción correcta; frontend solo muestra lo que lee de `Factura.afipError` |

**Key insight:** El mensaje de error ya existe en backend — el gap es de persistencia y transporte, no de traducción.

---

## Common Pitfalls

### Pitfall 1: Factura.estado queda EMISION_PENDIENTE para siempre en caso de error

**What goes wrong:** `CaeEmissionProcessor.process()` lanza `UnrecoverableError(spanishMessage)`. BullMQ mueve el job al DLQ pero NO actualiza `Factura.estado`. La factura queda atrapada en `EMISION_PENDIENTE` indefinidamente. El polling de la UI no detecta jamás una transición de error porque no hay ninguna.

**Why it happens:** El schema actual no tiene campo `afipError` ni un estado `EMISION_ERROR`. El procesador solo loguea el mensaje, no lo persiste.

**How to avoid:** Dos opciones — (A) agregar `Factura.afipError String?` y persistirlo en `onFailed`, o (B) agregar enum `EstadoFactura.EMISION_ERROR` y transicionar. Opción A es más simple (no requiere migration enum change, solo agregar field). Ver Code Examples.

**Warning signs:** Si el auditor ve una factura con `estado=EMISION_PENDIENTE` y `cae=null` sin jobId activo en BullMQ, el error se perdió.

### Pitfall 2: Polling race condition — modal abre antes de que el error esté disponible

**What goes wrong:** El usuario hace click en "Emitir", la UI invalida la query, el `useFactura` polling empieza. El job falla en BullMQ pero `onFailed` no ha persistido aún `afipError`. La UI muestra "Emitiendo..." sin error. Cuando el siguiente poll corre, `afipError` ya está persistido.

**Why it happens:** BullMQ `onFailed` es async; la persistencia a DB puede ser lenta.

**How to avoid:** El polling de 3s es suficiente — `onFailed` normalmente completa en <1s. No requiere acción especial. El usuario verá el error en el próximo tick de polling.

### Pitfall 3: Botón "Emitir Comprobante" accesible para facturas ya emitidas o anuladas

**What goes wrong:** El botón dispara `POST /emitir` en una factura `EMITIDA` o `ANULADA`. El backend rechaza con `BadRequestException` pero la UX es confusa.

**How to avoid:** Deshabilitar el botón cuando `factura.estado !== EMITIDA_PENDIENTE`. Lógica: mostrar botón solo si `estado` es un estado "emitable" (no `EMITIDA`, no `ANULADA`, no `EMISION_PENDIENTE`). En la práctica, las facturas recién creadas tienen `estado=EMITIDA` por default del schema — verificar si CreateFactura debe cambiar el default (fuera de scope; no romper).

**Warning signs:** Si el botón "Emitir" aparece en facturas con `cae !== null`, hay un bug de visibilidad.

### Pitfall 4: useFactura query key colisiona con useFacturas (lista)

**What goes wrong:** `useFactura(id)` usa `queryKey: ['finanzas', 'facturas', id]`. `useFacturas(filters)` usa `queryKey: ['finanzas', 'facturas', profesionalId, filters]`. Un `invalidateQueries({ queryKey: ['finanzas', 'facturas'] })` invalida AMBAS. Esto es intencional para refrescar la lista cuando el detalle cambia, pero debe ser consciente.

**How to avoid:** En `useEmitirFactura.onSuccess`, invalidar ambas keys explícitamente para asegurarse que la lista y el detalle se actualizan. El polling del detalle maneja el estado transient; la invalidación de la lista actualiza el badge de estado en ComprobantesTab.

### Pitfall 5: profesionalId requerido por el endpoint POST /emitir

**What goes wrong:** El controller requiere `profesionalId` como query param: `@Query('profesionalId') profesionalId: string`. Si el hook no lo incluye, el endpoint retorna 400 con "profesionalId es requerido."

**How to avoid:** `useEmitirFactura` debe leer `profesionalId` via `useEffectiveProfessionalId()` y pasarlo como query param.

---

## Code Examples

### useEmitirFactura hook (nuevo)

```typescript
// Source: Pattern from useAnularFactura in frontend/src/hooks/useFinanzas.ts
// Add to the FACTURACION section of useFinanzas.ts

export function useEmitirFactura() {
  const queryClient = useQueryClient();
  const profesionalId = useEffectiveProfessionalId();

  return useMutation({
    mutationFn: async (facturaId: string) => {
      const { data } = await api.post(
        `/finanzas/facturas/${facturaId}/emitir`,
        undefined,
        { params: { profesionalId } }
      );
      return data as { jobId: string; status: string };
    },
    onSuccess: (_, facturaId) => {
      // Invalidate list (updates badge in ComprobantesTab)
      queryClient.invalidateQueries({ queryKey: ['finanzas', 'facturas'] });
      // Invalidate detail (starts polling loop via refetchInterval)
      queryClient.invalidateQueries({ queryKey: ['finanzas', 'facturas', facturaId] });
    },
  });
}
```

### useFactura con polling condicional (modificar existente)

```typescript
// Source: Pattern from useWAUnread in frontend/src/hooks/useWAThread.ts
// Modify existing useFactura in frontend/src/hooks/useFinanzas.ts

export function useFactura(id: string | null) {
  return useQuery({
    queryKey: ['finanzas', 'facturas', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get(`/finanzas/facturas/${id}`);
      return data as FacturaDetail;
    },
    // Poll every 3s while job is in-flight; stop when resolved
    refetchInterval: (query) => {
      const estado = query.state.data?.estado;
      return estado === 'EMISION_PENDIENTE' ? 3000 : false;
    },
  });
}
```

### Factura.afipError persistido en onFailed (backend)

```typescript
// Source: Modification to CaeEmissionProcessor.onFailed
// backend/src/modules/finanzas/processors/cae-emission.processor.ts
// Requires PrismaService injection (add to constructor)

@OnWorkerEvent('failed')
async onFailed(job: Job<CaeJobData>): Promise<void> {
  this.logger.error(`CAE job ${job.id} failed: ${job.failedReason}`);
  const maxAttempts = job.opts?.attempts ?? 3;
  if (job.attemptsMade >= maxAttempts) {
    // Persist error message so frontend polling can surface it
    await this.prisma.factura.update({
      where: { id: job.data.facturaId },
      data: { afipError: job.failedReason ?? 'Error desconocido al emitir.' },
    });
    this.logger.warn(
      `Max retries reached for facturaId ${job.data.facturaId} — attempting CAEA fallback`,
    );
    await this.caeaService.asignarCaeaFallback(job.data.facturaId, job.data.profesionalId);
  }
}
```

### Prisma schema addition

```prisma
// Source: backend/src/prisma/schema.prisma — add to model Factura
model Factura {
  // ... existing fields ...
  afipError        String?   // Spanish error message from AfipBusinessError.spanishMessage (set by CaeEmissionProcessor.onFailed on permanent failure)
}
```

### AFIP error display en FacturaDetailModal

```typescript
// Source: Pattern from FacturaDetailModal.tsx Dialog usage
// Add inside FacturaDetailModal — shows when factura.afipError is non-null

{factura.afipError && (
  <>
    <Separator />
    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-700">Error de emisión AFIP</p>
          <p className="text-sm text-red-600 mt-1">{factura.afipError}</p>
        </div>
      </div>
    </div>
  </>
)}
```

### Botón "Emitir Comprobante" con estado

```typescript
// Source: Pattern from Button usage in FacturaDetailModal footer
// Add to FacturaDetailModal footer — visible when factura has no CAE and is not ANULADA

const emitirFactura = useEmitirFactura();

{!factura.cae && factura.estado !== EstadoFactura.ANULADA && (
  <Button
    onClick={() => emitirFactura.mutate(facturaId!)}
    disabled={
      emitirFactura.isPending ||
      factura.estado === EstadoFactura.EMISION_PENDIENTE
    }
  >
    {factura.estado === EstadoFactura.EMISION_PENDIENTE
      ? 'Emitiendo...'
      : emitirFactura.isPending
      ? 'Enviando...'
      : 'Emitir Comprobante'}
  </Button>
)}
```

### FacturaDetail type update (frontend)

```typescript
// Source: frontend/src/types/finanzas.ts — add to FacturaDetail
export interface FacturaDetail extends Factura {
  qrImageDataUrl: string | null;
  ptoVta: number | null;
  obraSocial?: { id: string; nombre: string } | null;
  afipError: string | null;  // NEW — populated when BullMQ job fails permanently
}
```

### getFacturaById backend response update

```typescript
// Source: backend/src/modules/finanzas/finanzas.service.ts — getFacturaById must select afipError
// Ensure afipError is included in the Prisma select and in FacturaDetailDto
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AfipBusinessError solo logueado | AfipBusinessError persistido en Factura.afipError | Phase 17 (nuevo) | Frontend puede surfacear el mensaje via polling |
| useGenerarFacturaPDF (stub muerto) | Eliminado — inline api.get blob en componentes | Phase 17 cleanup | Menos confusion para futuros developers |
| Botones "Emitir Comprobante" inert | onClick → useEmitirFactura.mutate() | Phase 17 | CAE-02 satisfecho |

**Deprecated/outdated:**
- `useGenerarFacturaPDF`: Dead stub, throws `Error('PDF generation not implemented yet')`, never imported. Eliminar de `useFinanzas.ts`.

---

## Open Questions

1. **¿Debe "Emitir Comprobante" vivir en FacturaDetailModal, en ComprobantesTab row, o en ambos?**
   - What we know: El botón existe en LiquidacionesTab.tsx:570 y liquidaciones/page.tsx:429 (inert). FacturaDetailModal tiene un footer con acciones. ComprobantesTab tiene una columna Acciones.
   - Recommendation: El botón primario debe estar en `FacturaDetailModal` (ya tiene contexto completo). En ComprobantesTab y LiquidacionesTab, el click en la row abre el modal, que luego tiene el botón. Los botones "Emitir Comprobante" inert en LiquidacionesTab y liquidaciones/page pueden abrirlos directamente: `onClick={() => { setSelectedFacturaId(facturaId); setDetailModalOpen(true); }}` — más UX consistente que disparar la emisión directamente desde la tabla sin confirmación.

2. **¿Crear `EstadoFactura.EMISION_ERROR` o usar `afipError String?`?**
   - What we know: Agregar un nuevo valor al enum Prisma requiere migración de DB que afecta to todos los switch/Record en frontend que usan `EstadoFactura`. El campo `afipError String?` es más quirúrgico.
   - Recommendation: Usar `Factura.afipError String?` sin cambiar el enum. La UI detecta el error condicionalmente: `factura.estado === EstadoFactura.EMISION_PENDIENTE && factura.afipError !== null`. El estado puede quedar como `EMISION_PENDIENTE` con un error displayable — semánticamente aceptable dado que la emisión sí intentó procesarse.

3. **¿Qué pasa si CAEA fallback activa después del error AFIP?**
   - What we know: `CaeEmissionProcessor.onFailed` primero persiste `afipError`, luego llama `caeaService.asignarCaeaFallback()`. Si el fallback funciona, el estado cambia a `CAEA_PENDIENTE_INFORMAR` y `afipError` queda en la DB (stale).
   - Recommendation: En la query `getFacturaById`, no devolver `afipError` si `estado !== EMISION_PENDIENTE`. O simplemente: la UI muestra `afipError` solo si `estado === EMISION_PENDIENTE && afipError !== null`. Si el fallback CAEA tuvo éxito, el estado cambia y el error no se muestra. Correcto.

---

## Validation Architecture

Config.json no tiene `workflow.nyquist_validation: false` (key ausente) — sección incluida.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest (backend) |
| Config file | backend/package.json scripts.test |
| Quick run command | `cd backend && npm test -- --testPathPattern=cae-emission` |
| Full suite command | `cd backend && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAE-02 | POST /emitir enqueues BullMQ job + sets EMISION_PENDIENTE | unit | `cd backend && npm test -- --testPathPattern=finanzas.service` | ✅ (finanzas.service.spec.ts) |
| CAE-02 | useEmitirFactura calls POST /emitir with profesionalId param | unit | N/A — frontend hook, no test infra | ❌ Wave 0 |
| CAE-03 | CaeEmissionProcessor.onFailed persists afipError on UnrecoverableError | unit | `cd backend && npm test -- --testPathPattern=cae-emission.processor` | ✅ (cae-emission.processor.spec.ts — needs new test case) |
| CAE-03 | FacturaDetailModal shows afipError in panel when non-null | manual | Manual visual check with USE_AFIP_STUB=true | N/A |

### Sampling Rate

- **Per task commit:** `cd backend && npm test -- --testPathPattern=cae-emission.processor`
- **Per wave merge:** `cd backend && npm test`
- **Phase gate:** Full backend suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] New test case in `cae-emission.processor.spec.ts` — covers that `onFailed` calls `prisma.factura.update({ data: { afipError: job.failedReason } })` when max retries reached
- [ ] Prisma migration file — `afipError String?` on Factura model (command: `cd backend && npx prisma migrate dev --name add-factura-afip-error`)

---

## Sources

### Primary (HIGH confidence)
- Direct code reading: `frontend/src/hooks/useFinanzas.ts` — confirmed useGenerarFacturaPDF stub exists (lines 354-362); confirmed useEmitirFactura absent
- Direct code reading: `backend/src/modules/finanzas/finanzas.controller.ts:171` — POST /finanzas/facturas/:id/emitir confirmed, requires `profesionalId` query param, returns 202
- Direct code reading: `backend/src/modules/finanzas/finanzas.service.ts:1085` — emitirFactura returns `{ jobId, status: 'EMISION_PENDIENTE' }`
- Direct code reading: `backend/src/modules/finanzas/afip/afip.errors.ts` — AfipBusinessError.spanishMessage confirmed, AFIP_TRANSLATIONS map confirmed
- Direct code reading: `backend/src/modules/finanzas/processors/cae-emission.processor.ts` — onFailed does NOT persist afipError — confirmed gap
- Direct code reading: `backend/src/prisma/schema.prisma:522` — Factura model confirmed, no afipError field
- Direct code reading: `frontend/src/hooks/useWAThread.ts:14` — `refetchInterval: 30 * 1000` polling pattern confirmed
- Direct code reading: `.planning/v1.2-MILESTONE-AUDIT.md` — gap analysis MISSING-01, MISSING-02, FLOW-BROKEN-01, FLOW-BROKEN-02 confirmed
- Direct code reading: `frontend/src/app/dashboard/finanzas/facturacion/components/LiquidacionesTab.tsx:570` — inert "Emitir Comprobante" Button confirmed (no onClick)
- Direct code reading: `frontend/src/app/dashboard/finanzas/liquidaciones/page.tsx:429` — second inert "Emitir Comprobante" Button confirmed

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — architectural decisions (onFailed max retries logic, EMISION_PENDIENTE placement in enum)

### Tertiary (LOW confidence)
- None — all findings are directly verified from codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed in package.json/codebase; no new installs needed
- Architecture: HIGH — endpoint, processor, error classes, all directly read from source
- Pitfalls: HIGH — gap identified directly in schema (no afipError field) and processor (no persistence in onFailed)
- Frontend patterns: HIGH — refetchInterval, useMutation, Dialog all verified in multiple existing files

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (schema/patterns are stable; no external dependencies)
