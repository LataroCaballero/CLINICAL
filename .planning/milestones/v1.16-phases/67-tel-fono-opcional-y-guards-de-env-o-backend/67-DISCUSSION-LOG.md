# Phase 67: Teléfono Opcional y Guards de Envío (Backend) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-17
**Phase:** 67-Teléfono Opcional y Guards de Envío (Backend)
**Areas discussed:** Vacío vs null, Portal updateContacto

**Áreas presentadas y no seleccionadas:** Alcance del guard WA, Forma del error — resueltas por criterio de Claude (ver sección final).

---

## Vacío vs null

### Q1 — ¿Dónde se resuelve el `telefono: ""` que manda el frontend?

| Option | Description | Selected |
|--------|-------------|----------|
| Normalizar a null en el service | `telefono?.trim() \|\| null` en create/update de PacientesService. Un solo punto que cubre todos los callers. El frontend no cambia. | ✓ |
| Rechazar vacío en el DTO | `@IsOptional() @IsNotEmpty()` → 400 si viene `""`. Obliga a que cada formulario mande `undefined`. | |
| Dejar `""` y chequear falsy | Sin normalización; cada guard y vista usa chequeo falsy. Dos representaciones de "sin teléfono" en la BD. | |

**User's choice:** Normalizar a null en el service
**Notes:** Motiva D-01 y el helper `normalizeTelefono()`.

### Q2 — ¿Qué hace `update()` con vacío sobre un paciente que sí tenía número?

| Option | Description | Selected |
|--------|-------------|----------|
| Borrarlo: vacío → null | Misma regla en create y update. Permite corregir un número mal cargado. Riesgo: PATCH parcial mal armado podría borrar sin querer. | ✓ |
| Ignorar vacío en update | `""` se descarta; sólo create puede dejar null. Blinda el SC#2 pero deja al usuario sin forma de vaciar el campo. | |
| Borrar sólo con null explícito | Distingue "no lo toqué" de "lo quiero vacío"; exige que el form de la fase 69 mande null a propósito. | |

**User's choice:** Borrarlo: vacío → null
**Notes:** Genera la asimetría con el portal documentada en D-08.

### Q3 — ¿Qué cuenta como "sin teléfono" para el guard de envío?

| Option | Description | Selected |
|--------|-------------|----------|
| Falsy tras trim | Bloquea si es null, vacío o sólo espacios. No juzga validez del número, sólo existencia. Cubre filas históricas con espacios. | ✓ |
| Además exigir largo mínimo | Bloquea números inservibles (<6), pero el error diría "sin teléfono" habiendo uno cargado — confuso. | |
| Sólo null estricto | Más simple, pero depende de que la normalización nunca deje pasar un `""`; una fila cargada por SQL manual se escaparía. | |

**User's choice:** Falsy tras trim

### Q4 — ¿`telefonoAlternativo` sirve de fallback?

| Option | Description | Selected |
|--------|-------------|----------|
| Bloquear igual | El guard mira sólo `telefono`. Ningún path de WA lee hoy el alternativo. Mantiene el alcance y simplifica la fase 69. | ✓ |
| Caer al alternativo | Aprovecha un dato existente, pero cambia la semántica en los 4 paths y roza ENVIO-F02 (diferido). | |

**User's choice:** Bloquear igual

---

## Portal updateContacto

**Corrección surgida en esta área:** la nota del roadmap atribuye `pacientes.service.ts:436` a "la validación de staging del portal". Es incorrecto — ese sitio es `updateContacto`, rama `'contacto'` del editor por secciones de la ficha del **staff**. La validación del portal relevante para SC#5 es WR-02 en `paciente-portal.service.ts:690-703`. Ambos sitios entran en la fase.

### Q1 — `updateContacto` exige teléfono ≥6 chars. ¿Qué hacemos?

| Option | Description | Selected |
|--------|-------------|----------|
| Relajar, pero validar si hay valor | Vacío/null → null; con valor → sigue exigiendo ≥6 chars. Consistente con la normalización, no pierde el chequeo de basura. | ✓ |
| Relajar del todo | Cualquier string o null se acepta. Se pierde el único chequeo de forma existente. | |
| Dejarlo estricto | TEL-01 aplica sólo al alta. Un paciente creado inline quedaría con la sección Contacto ineditable. | |

**User's choice:** Relajar, pero validar si hay valor

### Q2 — ¿Dónde vive el umbral de ≥6 chars?

| Option | Description | Selected |
|--------|-------------|----------|
| Helper único en el service | `normalizeTelefono()` privado en PacientesService, usado por create, update y updateContacto. Una sola definición de "teléfono válido". | ✓ |
| Sólo en updateContacto | Menos código tocado, pero el alta podría meter un teléfono de 2 dígitos que la ficha después rechaza al editar. | |
| Mover todo al DTO | Más idiomático en NestJS, pero `updatePacienteSection` recibe `data: any` sin DTO por sección — habría que crearlo y eso agranda la fase. | |

**User's choice:** Helper único en el service

### Q3 — ¿Tocamos `updateEmergencia`?

| Option | Description | Selected |
|--------|-------------|----------|
| No tocarlo | Requisito clínico distinto del teléfono comercial. Ningún requisito de v1.16 lo menciona. | ✓ |
| Aplicarle el mismo helper | Gana consistencia de formato, pero toca una rama que ningún requisito pide. | |
| Hacerlo opcional también | Decisión de producto nueva, fuera de TEL-01/02/03. | |

**User's choice:** No tocarlo
**Notes:** Anotado en Deferred Ideas.

### Q4 — WR-02 justificaba el drop de null por la columna non-nullable. ¿Qué pasa ahora?

| Option | Description | Selected |
|--------|-------------|----------|
| Mantener WR-02, recontextualizar | Comportamiento y test intactos; se reescribe el comentario a "el portal nunca borra datos de contacto". Cero riesgo sobre SC#5. | ✓ |
| Levantar WR-02 sólo para teléfono | Coherente con la regla del staff, pero hay que reescribir el test y le da al paciente la capacidad de dejarse incontactable. | |
| Levantar WR-02 del todo | Simplifica el helper, pero WR-02 protege más campos que el teléfono. | |

**User's choice:** Mantener WR-02, recontextualizar

---

## Claude's Discretion

Dos zonas grises se presentaron y el usuario no las seleccionó. Quedan resueltas por criterio de Claude, registradas como D-09 y D-10 en CONTEXT.md:

- **Alcance del guard WA** → los 4 paths de `whatsapp.service.ts` (incluido `retryMessage`, que el roadmap omite) más `presupuestos.service.ts`, vía helper privado colocado junto al guard de `whatsappOptIn`.
- **Forma del error** → `BadRequestException` con mensaje plano en español, siguiendo el patrón del guard de opt-in. Sin código de error estructurado: no existe ese patrón en el codebase y la fase 69 deshabilita el botón antes de llegar al backend.

## Deferred Ideas

Ninguna idea nueva. Rozadas durante la discusión y ya diferidas en REQUIREMENTS.md:

- **ENVIO-F02** — email como canal alternativo (rozado en Q4 de Vacío vs null).
- **ENVIO-F01** — guard en lista de acción CRM y contacto rápido del kanban.
- **FICHA-F01 / F02** — vista e indicador de ficha incompleta.
- **Contacto de emergencia opcional** — descartado en Q3 de Portal updateContacto; decisión de producto nueva.
