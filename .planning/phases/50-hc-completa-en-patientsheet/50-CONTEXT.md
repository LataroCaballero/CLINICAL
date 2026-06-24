# Phase 50: HC Completa en PatientSheet - Context

**Gathered:** 2026-06-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Las entradas de Historia Clínica dentro del PatientSheet (`frontend/src/components/patient/PatientDrawer/views/HistoriaClinica.tsx`) deben renderizar el contenido completo de cada entrada **estructurada** (`primera_vez`) con chips de color (zona / diagnósticos / tratamientos) + observaciones (`otroTexto`) + comentario, con paridad visual frente a `HistorialClinicoPanel` (LiveTurno) y `TurnoHCModal` (agenda), mediante un componente de render **compartido reutilizable**.

Trabajo **solo de frontend**: el `contenido` completo ya llega vía `useHistoriaClinica`. El componente debe manejar los 2 shapes de `contenido` (v1.9 `zonas[]` agrupado y legacy plano) y no romper con entradas de texto libre.

**Fuera de scope (no se toca):**
- Entradas basadas en plantilla (`templateId`): conservan su render actual (`TemplateEntryPreview` / `TemplateFullContent`). El componente compartido es solo para el `contenido` no-plantilla.
- Cualquier cambio de backend / shape de datos.
- Refactorizar `HistorialClinicoPanel` / `TurnoHCModal` para que consuman el nuevo componente (deseable a futuro, pero no es requisito de esta fase; la paridad se logra replicando su convención visual).

</domain>

<decisions>
## Implementation Decisions

### Estilo / colores de chips (paridad con referencias)
- Copiar **exactamente** la convención visual de `HistorialClinicoPanel` y `TurnoHCModal`:
  - **Zona** → `Badge variant="secondary"`, `capitalize`, `font-semibold`, `text-xs`
  - **Diagnósticos** → `Badge variant="outline"`, `text-xs` (uno por diagnóstico)
  - **Tratamientos** → `Badge` azul: `bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50`, `text-xs` (solo el nombre, sin precio en el chip)
- Manejar los 2 shapes: v1.9 `zonas[]` (agrupado por zona) y legacy plano (`diagnostico.zonas` / `diagnostico.subzonas` + `tratamientos[]`).
- Texto libre: mostrar solo `texto` (como hoy); sin chips. Sin regresiones.

### Tarjeta (preview en la lista de entradas)
- Mostrar **todos** los chips con `wrap` (igual que las referencias) — no truncar la cantidad de chips, no "+X más".
- Comentario: truncado (preview), consistente con el `line-clamp` actual de la tarjeta.
- La tarjeta **NO** muestra observaciones (`otroTexto`) ni precios ni Total.

### Detalle (modal expandido de la entrada)
- Mostrar el contenido completo: chips (misma convención) + observaciones + comentario completo (sin truncar).
- **Observaciones (`otroTexto`):** render como **bloque etiquetado** — label "Observación" + fondo `muted` (estilo del detalle legacy actual). Se muestra solo en el detalle, por zona donde corresponda.
- **Precios + Total:** se **mantienen en el detalle** (precio por tratamiento + Total del presupuesto), tal como hoy. Nunca aparecen en la tarjeta.

### Claude's Discretion
- Nombre, ubicación y API del componente compartido (ej. props `entrada`/`contenido` + variante `card` | `detalle`, o dos exports). Decisión de arquitectura.
- Cómo parametrizar densidad tarjeta vs detalle (un prop de modo vs dos componentes que comparten sub-render de chips).
- Tipado/normalización de los 2 shapes de `contenido` dentro del componente.
- Manejo de casos borde (zona sin diagnósticos, sin tratamientos, contenido vacío) — mantener el fallback "(sin contenido)" existente.

</decisions>

<specifics>
## Specific Ideas

- La paridad visual de referencia es la fila de chips de `HistorialClinicoPanel.tsx` (líneas ~87-148) y `TurnoHCModal.tsx` `EntryCard` (líneas ~343-436): zona = badge secondary, diagnósticos = outline, tratamientos = badge azul. Replicar esa fila tal cual.
- El detalle del PatientSheet ya tiene un buen render de precios/Total y de bloques "Observación" (`FreeEntryFullContent`, líneas ~549-727 del archivo actual) — la idea es conservar esa riqueza de detalle y sumarle los **chips de color** que hoy le faltan, no reemplazarla por algo más pobre.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Badge` (`@/components/ui/badge`): primitiva de los chips. Las variantes/colores exactos ya están definidos en las referencias.
- `useHistoriaClinica` hook: ya devuelve el `contenido` completo de cada entrada (ambos shapes). No hace falta tocar el data layer.
- `@/lib/estadoTurno.ts` (`getEstadoTurnoChip`): existe, pero mapea **estados de turno** a chips — NO aplica al contenido de HC. No reutilizar acá.

### Established Patterns
- Render de chips de HC **duplicado** en 2 lugares: `HistorialClinicoPanel.tsx` (LiveTurno) y `TurnoHCModal.tsx` `EntryCard` (agenda). Ambos ya manejan los 2 shapes. El componente compartido de esta fase debe replicar esa misma convención (y queda como candidato para que esos 2 lo consuman a futuro).
- El PatientSheet (`PatientDrawer/views/HistoriaClinica.tsx`) hoy usa: `FreeEntryPreview` (tarjeta, texto plano truncado) y `FreeEntryFullContent` (detalle, bloques estructurados con precios/Total pero **sin chips de color** ni `otroTexto` en el shape v1.9).

### Integration Points
- Tarjeta: reemplazar el contenido de `FreeEntryPreview` (o su uso dentro de `EntryCard`) por el nuevo render de chips. Archivo: `PatientDrawer/views/HistoriaClinica.tsx`.
- Detalle: integrar chips + observaciones (bloque etiquetado) dentro de `FreeEntryFullContent`, conservando precios/Total. Mismo archivo.

### Nota de discrepancia con el roadmap
- El ROADMAP menciona `resumirTratamientosDeContenido` como asset existente de v1.10 — **no existe** en `frontend/src/`. No depender de él; el render se hace directo desde el `contenido`.

</code_context>

<deferred>
## Deferred Ideas

- Refactorizar `HistorialClinicoPanel` y `TurnoHCModal` para que consuman el nuevo componente compartido (eliminar la duplicación de los 3 lugares). Deseable, pero fuera del scope de esta fase — candidato a tech-debt en una fase futura.

</deferred>

---

*Phase: 50-hc-completa-en-patientsheet*
*Context gathered: 2026-06-24*
