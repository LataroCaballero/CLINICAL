# Phase 67: Teléfono Opcional y Guards de Envío (Backend) - Context

**Gathered:** 2026-08-17
**Status:** Ready for planning

<domain>
## Phase Boundary

El backend acepta y persiste un paciente sin teléfono (`Paciente.telefono` nullable + `@IsOptional()` en `CreatePacienteDto`), y los entrypoints de envío por WhatsApp fallan con un error controlado en español —sin llegar a la API de Meta— cuando el paciente no tiene número.

**Requisitos cubiertos:** TEL-01, ENVIO-01, ENVIO-02.

**Fuera de esta fase:** todo lo de UI. Los placeholders de display (TEL-03), el alta completa sin teléfono desde `NewPacienteModal` (TEL-02) y los botones deshabilitados con tooltip (ENVIO-03) son de la Phase 69. La creación inline en el autosuggest es de la Phase 68.

</domain>

<decisions>
## Implementation Decisions

### Normalización de teléfono vacío vs null

- **D-01:** El teléfono vacío se normaliza a `null` **en el service**, no en el DTO ni en el frontend. Un helper privado `normalizeTelefono(value)` en `PacientesService` hace: `trim` → si queda vacío devuelve `null` → si hay valor valida el largo mínimo. Razón: el frontend hoy manda `telefono: ""` (no `undefined`) cuando el campo queda en blanco, y un `""` pasa `@IsString()`, no es `null`, y haría que el guard de envío no dispare y que el placeholder de la Phase 69 no aparezca. Normalizar en el service cubre todos los callers presentes y futuros —alta completa, alta inline de la Phase 68, edición por secciones— sin obligar a cambiar ningún formulario.
- **D-02:** La misma regla aplica en `create()` **y** en `update()`: un teléfono vacío sobre un paciente que sí tenía número lo deja en `null`. Vaciar el campo es una forma legítima de corregir un número mal cargado. (Ver D-08 para la asimetría deliberada con el portal.)
- **D-03:** El criterio del guard de envío es **falsy tras trim**: bloquea si el teléfono es `null`, string vacío o sólo espacios. No juzga si el número es válido, sólo si existe — el mensaje de error dice "sin teléfono" y eso debe ser literalmente cierto. Sigue cubriendo cualquier fila histórica que hubiera quedado con espacios.
- **D-04:** `telefonoAlternativo` **no** es canal de envío. Si el paciente no tiene `telefono` pero sí alternativo, el guard bloquea igual. Ningún path de WhatsApp lee hoy el alternativo, y hacerlo caer ahí cambiaría la semántica de envío en los 4 paths, obligaría a la Phase 69 a replicar el fallback en la UI y rozaría ENVIO-F02 (canal alternativo), que quedó diferido.

### Validación de contacto en la ficha (`updateContacto`)

- **D-05:** `updateContacto` (`pacientes.service.ts:426-443`, rama `'contacto'` de `updatePacienteSection`) **se relaja pero sigue validando forma**: sin valor → `null`; con valor → sigue exigiendo ≥6 chars. Sin esto, editar la sección Contacto de un paciente sin número devolvería 400 aunque el usuario sólo quisiera tocar el email — y un paciente creado inline en la Phase 68 quedaría con su sección Contacto ineditable.
- **D-06:** El umbral de ≥6 chars vive en **un solo lugar**: el helper `normalizeTelefono()` de D-01, usado por `create`, `update` y `updateContacto`. Una sola definición de "teléfono válido" para todo el módulo. No se mueve al DTO: `updatePacienteSection` recibe `data: any` sin DTO tipado por sección, y crear ese DTO agrandaría la fase.
- **D-07:** `updateEmergencia` (`pacientes.service.ts:445-470`) **no se toca**. El contacto de emergencia (nombre + relación + `contactoEmergenciaTelefono`, los tres obligatorios) es un requisito clínico distinto del teléfono de contacto comercial. Ningún requisito de v1.16 lo menciona.
- **D-08:** **WR-02 se mantiene, con el comentario recontextualizado.** El `pickPresent()` de `paciente-portal.service.ts:690-703` descarta los `null` con la justificación explícita *"forwarding `null` into a non-nullable column (e.g. `telefono`) throws at the DB layer (500)"*. Esa razón deja de ser cierta apenas la columna sea nullable, pero **el comportamiento y su test se conservan**: sólo se reescribe el comentario a "el portal nunca borra datos de contacto". El paciente no puede vaciar su teléfono desde el portal; es el canal por el que la clínica lo contacta.
  - **Asimetría deliberada, no un bug:** el staff puede vaciar el teléfono (D-02), el paciente desde el portal no (D-08). Son dos `updateContacto` distintos en dos services distintos.

### Claude's Discretion

El usuario no seleccionó estas dos áreas — quedan resueltas por mi criterio, no son preguntas abiertas para el planner:

- **D-09 (alcance del guard WA):** el guard va en **los 4 paths** de `whatsapp.service.ts` que empujan `telefono` a la cola, no sólo en los 2 que nombra el roadmap: `sendTemplateMessage` (:229), `sendFreeText` (:279), `sendPresupuestoPdf` (:331) y `retryMessage` (:456). Un `retryMessage` sin guard reabriría exactamente el agujero que ENVIO-01 cierra. Se implementa como helper privado compartido, colocado inmediatamente después del guard de `whatsappOptIn` existente, que ya establece el patrón de forma y ubicación. `presupuestos.service.ts` (:428/:458) es el quinto entrypoint y también lo lleva (ENVIO-02).
- **D-10 (forma del error):** `BadRequestException` con mensaje en español, siguiendo el patrón ya establecido por el guard de `whatsappOptIn`. La Phase 69 deshabilita los botones *antes* de llegar al backend (ENVIO-03), así que este error es una red de seguridad, no el mecanismo primario de UX — no justifica introducir un formato de error estructurado que hoy no existe en ningún otro lado del codebase. Si al planificar la Phase 69 hiciera falta distinguirlo programáticamente, se revisita ahí.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning
- `.planning/ROADMAP.md` §"Phase 67" — goal, 5 success criteria y notas de implementación (incluye la lista de reads backend a auditar)
- `.planning/REQUIREMENTS.md` — TEL-01, ENVIO-01, ENVIO-02 + tabla "Out of Scope" (no hacer `dni` opcional, no backfill de teléfonos)

### Schema y DTO
- `backend/src/prisma/schema.prisma:158` — `telefono String` → pasa a `String?`. Nota: `:159` `telefonoAlternativo` ya es `String?`, y `:231` hay un índice GIN trgm sobre `telefono` (`idx_paciente_telefono_trgm`)
- `backend/src/modules/pacientes/dto/create-paciente.dto.ts:22-23` — `@IsString() telefono: string` → agregar `@IsOptional()`

### Pacientes
- `backend/src/modules/pacientes/pacientes.service.ts:401-424` — `updatePacienteSection`, dispatcher por sección
- `backend/src/modules/pacientes/pacientes.service.ts:426-443` — `updateContacto`, valida `typeof telefono === 'string' && length >= 6` (D-05, D-06)
- `backend/src/modules/pacientes/pacientes.service.ts:445-470` — `updateEmergencia`, no se toca (D-07)
- `backend/src/modules/pacientes/pacientes.service.ts:337-399` — `suggest()`, `$queryRaw` que tipa `telefono: string` en el genérico y usa `LIKE` sobre `p.telefono` en WHERE y en el score

### Envío por WhatsApp
- `backend/src/modules/whatsapp/whatsapp.service.ts:187-235` — `sendTemplateMessage`, patrón de guard de `whatsappOptIn` a replicar
- `backend/src/modules/whatsapp/whatsapp.service.ts:241-284` — `sendFreeText`
- `backend/src/modules/whatsapp/whatsapp.service.ts:290-336` — `sendPresupuestoPdf`
- `backend/src/modules/whatsapp/whatsapp.service.ts:426-462` — `retryMessage`
- `backend/src/modules/presupuestos/presupuestos.service.ts:428, 458` — entrypoint de envío de presupuesto por WA (ENVIO-02)

### Portal del paciente
- `backend/src/modules/paciente-portal/paciente-portal.service.ts:690-703` — `pickPresent()`, WR-02 (D-08)
- `backend/src/modules/paciente-portal/paciente-portal.service.spec.ts:280-288` — test `'WR-02: drops an explicit null so it never reaches a non-nullable column'`. **Debe seguir pasando** (SC#5); sólo cambia el comentario del service, no el assert
- `backend/src/modules/paciente-portal/paciente-portal.service.ts:141-150, 251-268` — lectura y whitelist de `contacto.telefono` expuesto al paciente

### Reads a auditar (de las notas del roadmap)
- `backend/src/modules/pacientes/pacientes.service.ts:166, 973`
- `backend/src/modules/reportes/reportes-financieros.service.ts:522, 563, 599`
- `backend/src/modules/presupuestos/presupuesto-email.service.ts:77`
- `backend/src/modules/presupuestos/presupuesto-pdf.service.ts:143` — ya trata `telefono` como opcional, sirve de referencia

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Guard de `whatsappOptIn`**: los tres `send*` de `whatsapp.service.ts` tienen forma idéntica — `findUnique({ select: { telefono, whatsappOptIn } })` → `NotFoundException('Paciente no encontrado')` → `BadRequestException` en español si falta el opt-in. El guard de teléfono va exactamente ahí, con la misma forma. El `select` ya trae `telefono`: no hace falta tocar la query.
- **`presupuesto-pdf.service.ts:143`** ya trata `telefono` como opcional — es el precedente de cómo se lee un teléfono ausente en este codebase.
- **`pickPresent()`** (`paciente-portal.service.ts:690`) — helper genérico de whitelist + drop de `null`/`undefined`, ya cubierto por tests.

### Established Patterns
- **Errores de negocio = `BadRequestException` con mensaje en español, plano.** No hay códigos de error estructurados en ningún módulo; introducirlos sería un patrón nuevo (ver D-10).
- **Normalización en el service, no en el DTO.** `updatePacienteSection` recibe `data: any` sin DTO por sección, así que el service ya es el lugar donde vive la validación de forma de estos campos.
- **Migraciones Prisma vía `npx prisma migrate dev`** (ver `CLAUDE.md`). `String` → `String?` es una relajación de constraint: no reescribe filas y no toca los teléfonos existentes (SC#2). El índice GIN trgm sobre una columna nullable es válido en Postgres — las filas con `NULL` simplemente no se indexan.

### Integration Points
- **`suggest()`** es el punto de mayor riesgo técnico del schema change: el `$queryRaw` declara `telefono: string` en el genérico de TS (mentira una vez que hay `NULL`) y usa `p.telefono LIKE '%'||$q||'%'` en el WHERE y en el cálculo de score. En SQL, `NULL LIKE 'x'` da `NULL`, no `false` — hay que verificar que un paciente sin teléfono siga apareciendo en el autosuggest y que el orden no se rompa. Es el mismo endpoint del que depende toda la Phase 68.
- **Contrato con la Phase 69:** el criterio de "sin teléfono" que la UI usa para deshabilitar botones (ENVIO-03) y mostrar placeholder (TEL-03) debe ser el mismo de D-03 — falsy tras trim.
- **Contrato con la Phase 68:** el alta inline manda `nombreCompleto` + `dni` sin `telefono`; `POST /pacientes` debe devolver 201.

</code_context>

<specifics>
## Specific Ideas

- La nota del roadmap que dice *"la validación de staging del portal en `pacientes.service.ts:436`"* **está mal atribuida**. `pacientes.service.ts:436` es `updateContacto`, la rama `'contacto'` del editor por secciones de la ficha del **staff**. La validación del portal que importa para SC#5 es otra: WR-02 en `paciente-portal.service.ts:690-703`, con su test en `paciente-portal.service.spec.ts:280-288`. **Son dos sitios distintos y ambos entran en la fase** — el planner debe cubrir los dos, no uno creyendo que es el otro.
- El roadmap dice "los dos entrypoints de envío". Son cinco: cuatro en `whatsapp.service.ts` (incluido `retryMessage`) más el de `presupuestos.service.ts` (ver D-09).

</specifics>

<deferred>
## Deferred Ideas

Ninguna idea nueva surgió en la discusión — se mantuvo dentro del alcance de la fase. Las ideas ya diferidas en REQUIREMENTS.md que rozaron la conversación:

- **ENVIO-F02** (email como canal alternativo cuando no hay teléfono) — rozado al decidir D-04. Sigue diferido.
- **ENVIO-F01** (guard de teléfono en la lista de acción CRM y contacto rápido del kanban) — fuera del alcance del guard, que se limita a los entrypoints de envío WA.
- **FICHA-F01 / F02** (vista e indicador de ficha incompleta) — no se toca; no hay flag `fichaIncompleta` en el schema y agregarlo está explícitamente fuera de alcance.
- **Hacer opcional el contacto de emergencia** — apareció como opción al decidir D-07 y se descartó: es una decisión de producto nueva, fuera de TEL-01/02/03.

</deferred>

---

*Phase: 67-Teléfono Opcional y Guards de Envío (Backend)*
*Context gathered: 2026-08-17*
