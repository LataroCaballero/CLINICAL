# Phase 64: Indicadores de Pendientes y Planilla Legible (Frontend) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-31
**Phase:** 64-Indicadores de Pendientes y Planilla Legible (Frontend)
**Areas discussed:** Estilo visual del badge, Fold badge recontacto, Planilla celda + tooltip, Touch al backend (TRAT-07)

---

## Estilo visual del badge de pendiente (CONTACTO-03/04)

| Option | Description | Selected |
|--------|-------------|----------|
| Span a mano, color acción | Reutilizar el patrón de `<span>` Tailwind existente en PatientCard con color de acción + icono | |
| Componente shadcn Badge | Usar `components/ui/badge.tsx` (variant outline/secondary); introduce patrón nuevo en la card | ✓ |
| CTA prominente | Badge de fondo lleno, más destacado que los informativos | |

**User's choice:** Componente shadcn Badge
**Notes:** Acepta introducir `Badge` en `PatientCard.tsx` aunque hoy esa card usa spans a mano.

---

## Fold badge recontacto ("Cirugía cancelada, recontactar")

| Option | Description | Selected |
|--------|-------------|----------|
| No, solo CONTACTO-03/04 | Dejar recontacto fuera de la card; ya en Lista de Acción | ✓ (con matiz) |
| Sí, sumarlo ahora | Badge de recontacto en columna CONFIRMADO | |

**User's choice:** No badge nuevo, **pero** debe quedar registrado en el "registro de contacto" (que ya se muestra en la card). Follow-up: eligió **prellenado automático cuando surge la cancelación**.
**Notes:** Al investigar se descubrió que Phase 63 YA implementa esto: `turnos.service.ts:281` crea un `contactoLog` SISTEMA automático al cancelar cirugía, y `getKanban` lo muestra como `ultimoContactoNota` en la card. Ante ese hallazgo, el usuario eligió **"Nada, ya cubierto"** → Phase 64 solo lo verifica en UAT, sin código. (Alternativas descartadas: resaltar la nota SISTEMA; prellenar el form ContactoSheet.)

---

## Planilla "Último tratamiento" — celda + tooltip (TRAT-07)

| Option | Description | Selected |
|--------|-------------|----------|
| CSS truncate + Radix Tooltip | Coma-separados truncados por CSS + Radix Tooltip con lista completa | ✓ |
| CSS truncate + title nativo | Igual pero manteniendo el `title` nativo actual | |
| Chips apilados | Un chip por tratamiento, sin colapsar | |

**User's choice:** CSS truncate + Radix Tooltip
**Notes:** Cumple Success Criteria #3 y #4 con mejor UX que el `title` nativo actual.

---

## Touch al backend para TRAT-07 (exponer lista completa)

| Option | Description | Selected |
|--------|-------------|----------|
| Nuevo campo array | `/turnos/rango` agrega array con la lista completa de nombres; mantiene `ultimoTratamiento` | ✓ |
| String completo unido | Backend devuelve el string completo sin "+N-1" | |
| Evitar backend | Vía pura-frontend (inviable: los nombres descartados no llegan al cliente) | |

**User's choice:** Nuevo campo array
**Notes:** Se confirmó que el colapso "primero +N-1" se arma en el backend (`formatearResumen`), por lo que el frontend no puede recuperar los nombres descartados sin este touch.

## Claude's Discretion

- Estructura concreta del campo array en el response de `/turnos/rango`.
- Cómo obtener la lista sin colapsar (extender helper vs. paralelo); manejo de la rama free-text.
- Estados vacíos (0 o 1 tratamiento); variant exacto del `Badge`.

## Deferred Ideas

- Badge dedicado de recontacto / resaltar nota SISTEMA / prellenar ContactoSheet — descartados (ya cubierto por Phase 63).
- Endpoint dedicado de planilla server-side — no se agrega.
</content>
