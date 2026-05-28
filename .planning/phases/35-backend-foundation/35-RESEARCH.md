# Phase 35: Backend Foundation - Research

**Researched:** 2026-05-24
**Domain:** NestJS service-layer logic — CRM state machine guards and Prisma query extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Validación en PATCH manual (updateEtapaCRM)**
- Eliminar la validación que bloquea mover a CONFIRMADO si el paciente no tiene presupuesto ACEPTADO (lines 519-528 en pacientes.service.ts)
- Mantener la validación de `motivoPerdida` requerida al mover a PERDIDO
- Los auto-contact logs del `etapaNotaMap` (NUEVO_LEAD, CONSULTADO, PRESUPUESTO_ENVIADO) se mantienen también para moves manuales

**Forward-only guard en auto-transiciones**
Ordenamiento de etapas (de menor a mayor avance):
`SIN_CLASIFICAR < NUEVO_LEAD < TURNO_AGENDADO < CONSULTADO < PRESUPUESTO_ENVIADO < CONFIRMADO < PROCEDIMIENTO_REALIZADO`
(PERDIDO es especial — no está en la cadena forward-only)

Guard aplicado a:
- `presupuestos.service.ts:marcarEnviado` → no sobreescribir si ya está en CONFIRMADO o PROCEDIMIENTO_REALIZADO
- `presupuestos.service.ts:aceptar` (admin) + `aceptarByToken` (token) → no sobreescribir si ya está en PROCEDIMIENTO_REALIZADO
- `presupuestos.service.ts:rechazarByToken` → no mover a PERDIDO si el paciente ya está en CONFIRMADO o PROCEDIMIENTO_REALIZADO
- `turnos.service.ts` → no sobreescribir con TURNO_AGENDADO si ya está en PRESUPUESTO_ENVIADO, CONFIRMADO o PROCEDIMIENTO_REALIZADO

**GET /kanban — campo flujo**
- Agregar `flujo: true` al `select` de la query de `getKanban`
- Agregar `flujo: p.flujo` en el response mapping de cada paciente
- Sin cambios en el WHERE filter

### Claude's Discretion
- Estructura interna del guard: inline vs función centralizada `isForwardMove(actual, nueva)`
- Si el guard bloquea una auto-transición, el update del presupuesto igual ocurre (solo se skippea el update de etapaCRM del paciente)

### Deferred Ideas (OUT OF SCOPE)
None — la discusión se mantuvo dentro del scope de Phase 35.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CRM-01 (backend) | El usuario puede mover un paciente a cualquier etapa del kanban mediante drag-and-drop sin restricciones de negocio | Eliminar bloque 519-528 en `updateEtapaCRM`; la única validación restante es `motivoPerdida` para PERDIDO |
| CRM-04 | Las transiciones automáticas del sistema no sobreescriben etapas más avanzadas puestas a mano | Forward-only guard con tabla de orden de etapas, aplicado en 5 sitios de auto-transición |
</phase_requirements>

---

## Summary

Phase 35 es un cambio puro de lógica de servicio en el backend. No hay nuevos modelos de Prisma, no hay nuevos endpoints, ni migraciones. El trabajo consiste en tres micro-cambios quirúrgicos bien localizados:

1. **Eliminar** un bloque de validación existente en `pacientes.service.ts:updateEtapaCRM` (líneas 519-528).
2. **Agregar** un forward-only guard en cinco puntos de auto-transición dentro de `presupuestos.service.ts` y `turnos.service.ts`.
3. **Extender** el `select` y el response mapping del método `getKanban` con el campo `flujo`.

Todo el código afectado ya existe y está comprendido. Los patrones a usar (`$transaction`, lectura previa del estado antes del transaction, `EtapaCRM` enum ya importado) son los que ya usa el codebase. La decisión pendiente de Claude's Discretion (inline vs función centralizada) se resuelve a favor de una función helper centralizada `isForwardAutoTransition(actual, nueva)` en el mismo archivo `pacientes.service.ts` o como helper top-level en `presupuestos.service.ts`, ya que se aplica en 5 sitios y evita duplicar la tabla de orden.

**Primary recommendation:** Implementar el guard como función helper privada en cada service donde se necesite, con la tabla de orden como constante de módulo. No crear un módulo shared nuevo — el alcance es pequeño y localizado.

---

## Standard Stack

### Core (sin cambios respecto al stack existente)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | existente | Framework HTTP + DI | Stack del proyecto |
| Prisma | existente | ORM + `$transaction` | Stack del proyecto |
| TypeScript | existente | Tipos, enum EtapaCRM | Stack del proyecto |

### No se necesitan librerías nuevas

Esta fase no requiere instalar nada. Todo el trabajo es lógica TypeScript sobre APIs de Prisma que ya están en uso.

---

## Architecture Patterns

### Pattern 1: Forward-Only Guard con tabla de orden

**What:** Antes de cada auto-transición de etapaCRM, leer el estado actual del paciente y compararlo con la etapa destino. Si el estado actual es más avanzado, skip the update — pero no abortar la operación principal (el estado del presupuesto sigue actualizándose).

**When to use:** En los 5 call sites de auto-transición automática del sistema (no en `updateEtapaCRM` manual).

**Implementation (Claude's Discretion resuelto: helper con constante):**

```typescript
// Constante de orden — colocar una vez por service file, fuera de la clase
const ETAPA_ORDEN: Record<string, number> = {
  SIN_CLASIFICAR: 0,   // null también mapea a 0
  NUEVO_LEAD: 1,
  TURNO_AGENDADO: 2,
  CONSULTADO: 3,
  PRESUPUESTO_ENVIADO: 4,
  CONFIRMADO: 5,
  PROCEDIMIENTO_REALIZADO: 6,
  // PERDIDO: excluido intencionalmente (cadena especial)
};

function etapaOrden(e: EtapaCRM | null | undefined): number {
  return ETAPA_ORDEN[e ?? 'SIN_CLASIFICAR'] ?? 0;
}

function isAutoTransitionBlocked(actual: EtapaCRM | null | undefined, destino: EtapaCRM): boolean {
  return etapaOrden(actual) >= etapaOrden(destino);
}
```

**Call site pattern — leer etapaCRM ANTES del $transaction:**

```typescript
// Leer estado actual ANTES del $transaction (no añadir latencia dentro)
const paciente = await this.prisma.paciente.findUnique({
  where: { id: presupuesto.pacienteId },
  select: { etapaCRM: true },
});

const [updated] = await this.prisma.$transaction([
  this.prisma.presupuesto.update({ ... }),  // SIEMPRE ocurre
  ...(isAutoTransitionBlocked(paciente?.etapaCRM, EtapaCRM.CONFIRMADO)
    ? []
    : [this.prisma.paciente.update({
        where: { id: presupuesto.pacienteId },
        data: { etapaCRM: EtapaCRM.CONFIRMADO },
      })]
  ),
  this.prisma.contactoLog.create({ ... }),  // SIEMPRE ocurre
]);
```

**Nota importante:** `prisma.$transaction([])` con array vacío en algunos de los items requiere spread condicional. Dado que los `$transaction` actuales son arrays literales (no interactivo/callback style), el spread condicional `...(condition ? [] : [update])` es el patrón correcto para incluir/excluir operaciones. Verificado en el codebase existente — este patrón es compatible con Prisma Client.

### Pattern 2: Eliminación de bloque de validación (updateEtapaCRM)

**What:** Eliminar líneas 519-528 de `pacientes.service.ts` — el bloque `if (dto.etapaCRM === EtapaCRM.CONFIRMADO)` que lanza BadRequestException si no hay presupuesto aceptado.

**What stays:** La validación de `motivoPerdida` en línea 513-517 NO se toca. Los auto-logs del `etapaNotaMap` (líneas 539-553) NO se tocan.

**Before (to remove):**
```typescript
if (dto.etapaCRM === EtapaCRM.CONFIRMADO) {
  const tienePresupuestoAceptado = paciente.presupuestos.some(
    (p) => p.estado === EstadoPresupuesto.ACEPTADO,
  );
  if (!tienePresupuestoAceptado) {
    throw new BadRequestException(
      'El paciente debe tener al menos un presupuesto ACEPTADO para pasar a CONFIRMADO',
    );
  }
}
```

**Side effect:** El `select` del `findUnique` en línea 507-510 incluye `presupuestos: { select: { estado: true } }` que solo sirve para esa validación. Una vez eliminado el bloque, ese nested select puede removerse también para no hacer una query innecesaria.

### Pattern 3: Extensión del campo `flujo` en `getKanban`

**What:** Dos cambios mínimos en `getKanban`:

```typescript
// En el select (línea ~609):
select: {
  // ... campos existentes ...
  flujo: true,   // AGREGAR
}

// En el response mapping (línea ~667):
pacientes: items.map((p) => ({
  // ... campos existentes ...
  flujo: p.flujo ?? null,   // AGREGAR
})),
```

**No changes needed in:**
- WHERE filter (sigue devolviendo `CIRUGIA + null legacy`)
- Controller `pacientes.controller.ts:60`
- Columnas del kanban agrupadas (línea 645-662)

### Pattern 4: Guard en `turnos.service.ts`

La auto-transición existente (líneas 134-140) usa `etapasIniciales` como whitelist. El guard forward-only extiende esta lógica: la whitelist actual es `[null, EtapaCRM.NUEVO_LEAD]`, lo que ya evita sobreescribir la mayoría de etapas avanzadas, pero no cubre `SIN_CLASIFICAR`. Con el guard, se puede reemplazar la whitelist por la función `isAutoTransitionBlocked`:

```typescript
// Antes (línea 134-140):
const etapasIniciales: (EtapaCRM | null)[] = [null, EtapaCRM.NUEVO_LEAD];
if (etapasIniciales.includes(pacienteCRM?.etapaCRM ?? null)) {
  await this.prisma.paciente.update({ ... });
}

// Después:
if (!isAutoTransitionBlocked(pacienteCRM?.etapaCRM, EtapaCRM.TURNO_AGENDADO)) {
  await this.prisma.paciente.update({ ... });
}
```

Esto es equivalente en comportamiento (TURNO_AGENDADO tiene orden 2; bloquea si actual >= 2, i.e., ya está en TURNO_AGENDADO, CONSULTADO, PRESUPUESTO_ENVIADO, CONFIRMADO o PROCEDIMIENTO_REALIZADO).

### Anti-Patterns to Avoid

- **Leer etapaCRM dentro del `$transaction` callback:** Añadir latencia innecesaria y complicar la transacción. Siempre leer antes.
- **Usar `prisma.$transaction` en modo interactivo/callback** para este caso: el modo array (batch) es suficiente y más simple.
- **Crear un nuevo shared module** para el helper: el scope de 5 call sites no justifica un módulo separado. Duplicar la constante en `presupuestos.service.ts` y `turnos.service.ts` si es necesario.
- **Abortar la operación del presupuesto** cuando el guard bloquea: el update del presupuesto SIEMPRE ocurre; solo se skippea el update de `etapaCRM` del paciente.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| State machine completa | FSM library, xstate | Tabla de orden + helper function | El CRM tiene 7 etapas; una tabla de enteros es suficiente y no añade dependencias |
| Guard de transición | Enum comparison ad-hoc en cada call site | Constante `ETAPA_ORDEN` + helper function | 5 call sites — evitar drift entre ellos |

---

## Common Pitfalls

### Pitfall 1: El enum EtapaCRM en Prisma NO está en orden lógico

**What goes wrong:** El enum en `schema.prisma` define PROCEDIMIENTO_REALIZADO antes que CONFIRMADO (línea 1142 vs 1143). Si alguien asume que el orden del enum es el orden de avance CRM, el guard fallaría silenciosamente.

**Why it happens:** El enum fue definido antes de definir la lógica de avance.

**How to avoid:** La tabla `ETAPA_ORDEN` es la fuente de verdad del orden de avance. No derivar orden del enum de Prisma.

**Warning signs:** Guard que no bloquea transiciones a CONFIRMADO cuando el paciente ya está en PROCEDIMIENTO_REALIZADO.

### Pitfall 2: `rechazarByToken` — guard distinto al de los demás

**What goes wrong:** Para `marcarEnviado` y `aceptar`, el guard evita bajar de nivel. Para `rechazarByToken`, el guard evita mover a PERDIDO si el paciente ya está en CONFIRMADO o PROCEDIMIENTO_REALIZADO. La dirección es la misma (no retroceder), pero la etapa destino es PERDIDO que está fuera de la cadena.

**How to avoid:** Para `rechazarByToken`, verificar explícitamente: si `etapaOrden(actual) >= etapaOrden(CONFIRMADO)`, no mover a PERDIDO. Usar `isAutoTransitionBlocked` con PERDIDO fuera de `ETAPA_ORDEN` — la función devolverá `false` (orden 0 para PERDIDO no definido). Necesita manejo especial:

```typescript
// Para rechazarByToken — guard especial para PERDIDO:
const etapasProtegidas = [EtapaCRM.CONFIRMADO, EtapaCRM.PROCEDIMIENTO_REALIZADO];
const bloqueado = etapasProtegidas.includes(paciente?.etapaCRM as EtapaCRM);
```

O bien, agregar PERDIDO con orden -1 en la tabla y verificar que el destino es PERDIDO para usar esta lógica especial.

### Pitfall 3: `aceptarByToken` tiene un `findUnique` para el paciente pero no lee `etapaCRM`

**What goes wrong:** `aceptarByToken` (línea 557-560) ya hace un `findUnique` del paciente para obtener `nombreCompleto`, pero no pide `etapaCRM`. Si se agrega el guard aquí, el select debe incluir `etapaCRM`.

**How to avoid:** Extender el select existente: `select: { nombreCompleto: true, etapaCRM: true }` — sin query adicional.

### Pitfall 4: `$transaction` spread condicional — TypeScript tipado

**What goes wrong:** `[...someArray]` dentro de `$transaction([...])` puede requerir tipado explícito si TypeScript infiere un tipo never[] para el caso vacío.

**How to avoid:** Tipar la operación condicional como `PrismaPromise<any>[]` o usar `as const` según corresponda. Alternativa más simple: extraer el update a una variable y hacer el spread:

```typescript
const maybePacienteUpdate = isAutoTransitionBlocked(etapaCRM, EtapaCRM.CONFIRMADO)
  ? []
  : [this.prisma.paciente.update({ where: { id }, data: { etapaCRM: EtapaCRM.CONFIRMADO } })];

await this.prisma.$transaction([
  presupuestoUpdate,
  ...maybePacienteUpdate,
  contactoCreate,
]);
```

---

## Code Examples

### Guard helper con ETAPA_ORDEN
```typescript
// Source: Diseño de Phase 35 — basado en CONTEXT.md

const ETAPA_ORDEN: Record<string, number> = {
  SIN_CLASIFICAR: 0,
  NUEVO_LEAD: 1,
  TURNO_AGENDADO: 2,
  CONSULTADO: 3,
  PRESUPUESTO_ENVIADO: 4,
  CONFIRMADO: 5,
  PROCEDIMIENTO_REALIZADO: 6,
  // PERDIDO: no incluido — manejo especial por call site
};

function etapaOrden(e: EtapaCRM | null | undefined): number {
  return ETAPA_ORDEN[e ?? 'SIN_CLASIFICAR'] ?? 0;
}

// Returns true when the auto-transition should be SKIPPED
function isAutoTransitionBlocked(
  actual: EtapaCRM | null | undefined,
  destino: EtapaCRM,
): boolean {
  return etapaOrden(actual) >= etapaOrden(destino);
}
```

### `aceptar` con guard (presupuestos.service.ts ~línea 130)
```typescript
async aceptar(id: string) {
  const presupuesto = await this.prisma.presupuesto.findUnique({
    where: { id },
    select: { id: true, pacienteId: true, profesionalId: true, total: true, estado: true },
  });
  if (!presupuesto) throw new NotFoundException('Presupuesto no encontrado');
  // ... validación estado ...

  // Leer etapaCRM actual ANTES del $transaction
  const pacienteCRM = await this.prisma.paciente.findUnique({
    where: { id: presupuesto.pacienteId },
    select: { etapaCRM: true },
  });

  const movimiento = await this.cuentasCorrientesService.createMovimiento(/* ... */);

  const maybeCRMUpdate = isAutoTransitionBlocked(pacienteCRM?.etapaCRM, EtapaCRM.CONFIRMADO)
    ? []
    : [this.prisma.paciente.update({
        where: { id: presupuesto.pacienteId },
        data: { etapaCRM: EtapaCRM.CONFIRMADO },
      })];

  const [updated] = await this.prisma.$transaction([
    this.prisma.presupuesto.update({ where: { id }, data: { estado: EstadoPresupuesto.ACEPTADO, fechaAceptado: new Date(), cargoMovimientoId: movimiento.id }, include: { items: { orderBy: { orden: 'asc' } }, paciente: { select: { id: true, nombreCompleto: true } } } }),
    ...maybeCRMUpdate,
    this.prisma.contactoLog.create({ data: { pacienteId: presupuesto.pacienteId, profesionalId: presupuesto.profesionalId, tipo: TipoContacto.SISTEMA, nota: 'Esperando turno para cirugia' } }),
  ]);

  return this.formatPresupuesto(updated);
}
```

### Eliminación del bloque CONFIRMADO en `updateEtapaCRM`
```typescript
// ANTES (pacientes.service.ts líneas 507-528):
const paciente = await this.prisma.paciente.findUnique({
  where: { id },
  select: { id: true, profesionalId: true, presupuestos: { select: { estado: true } } },
  //                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //                                        Este select solo servía para la validación
});
// ... (motivoPerdida check) ...
if (dto.etapaCRM === EtapaCRM.CONFIRMADO) {
  // ← ELIMINAR ESTE BLOQUE COMPLETO (líneas 519-528)
}

// DESPUÉS:
const paciente = await this.prisma.paciente.findUnique({
  where: { id },
  select: { id: true, profesionalId: true },
  // presupuestos ya no se necesita
});
// ... (motivoPerdida check) ...
// (bloque CONFIRMADO eliminado)
```

### `getKanban` — agregar flujo
```typescript
// select (agregar):
select: {
  id: true,
  nombreCompleto: true,
  // ... otros campos ...
  flujo: true,   // NUEVO
}

// response mapping (agregar):
pacientes: items.map((p) => ({
  id: p.id,
  // ... otros campos ...
  flujo: p.flujo ?? null,  // NUEVO
})),
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Validación de negocio en PATCH manual (requiere presupuesto ACEPTADO para CONFIRMADO) | Libre movimiento manual, guard solo en auto-transiciones | Phase 35 | UX: el profesional puede mover libremente; el sistema no retrocede lo que el profesional ya decidió |
| `turnos.service.ts` whitelist `[null, NUEVO_LEAD]` | Guard `isAutoTransitionBlocked` genérico | Phase 35 | Consistencia: mismo mecanismo en todos los auto-transition points |

---

## Open Questions

1. **Ubicación de `ETAPA_ORDEN` y helpers**
   - What we know: El guard se aplica en `presupuestos.service.ts` (4 métodos) y `turnos.service.ts` (1 método)
   - What's unclear: ¿Duplicar la constante en cada service, o crear un archivo `crm-utils.ts` compartido?
   - Recommendation: Dado que NestJS no favorece archivos de utilidades sueltos fuera de módulos, duplicar la constante en `presupuestos.service.ts` y `turnos.service.ts` es aceptable. Son 5 líneas. Si el proyecto crece y más servicios necesitan el guard, moverlo a `common/crm-utils.ts`.

2. **TypeScript inference en spread condicional dentro de `$transaction`**
   - What we know: `$transaction` acepta `PrismaPromise<any>[]`
   - What's unclear: Exact TS error message (if any) with the conditional spread pattern
   - Recommendation: Usar la variable intermedia `const maybeCRMUpdate = condition ? [] : [update]` — más legible y evita ambigüedad de tipos.

---

## Sources

### Primary (HIGH confidence)
- Código fuente leído directamente: `backend/src/modules/pacientes/pacientes.service.ts` (líneas 495-697)
- Código fuente leído directamente: `backend/src/modules/presupuestos/presupuestos.service.ts` (líneas 120-663)
- Código fuente leído directamente: `backend/src/modules/turnos/turnos.service.ts` (líneas 120-170)
- Código fuente leído directamente: `backend/src/prisma/schema.prisma` (líneas 1137-1167) — enum EtapaCRM, FlujoPaciente

### Secondary (MEDIUM confidence)
- `.planning/phases/35-backend-foundation/35-CONTEXT.md` — decisiones de diseño acordadas con el usuario

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — sin librerías nuevas, todo el stack existente
- Architecture: HIGH — código leído directamente, patrones claros y precisos
- Pitfalls: HIGH — identificados a partir de lectura real del código (enum order, aceptarByToken select, rechazarByToken edge case)

**Research date:** 2026-05-24
**Valid until:** Estable — no hay dependencias externas nuevas. Válido hasta que el schema Prisma cambie.
