# Phase 52: PREOP HC Form + Chip Catalogs - Context

**Gathered:** 2026-06-26
**Status:** Ready for planning

<domain>
## Phase Boundary

El profesional registra una entrada de HC tipo **Prequirúrgico** mediante un formulario estructurado por secciones (no un textarea libre): chips de antecedentes/alergias/medicación con catálogos por profesional y auto-learning vía "Otro", check opcional para desplegar el selector de diagnóstico/tratamiento (el de Primera Consulta), checklist de estudios complementarios, check de consentimiento **informado** con timestamp de auditoría, y la capacidad de compartir el link del portal del paciente (copiar / WhatsApp / QR / email).

**Fuera de scope (otras fases):** StorageService + upload de PDF de consentimiento y links de indicaciones (F53); backend del portal — verificación de identidad por DNI, rate-limit, DTOs estrictos, campos staging (F54); wizard mobile-first del paciente (F55); firma dibujada estampada en PDF y badge de origen en chat (F56); reporte/vista de estudios pendientes (FUT-04, post-v1.12). Esta fase **genera** el token del portal y arma el link, pero el portal frontend **no abre** hasta F55.

</domain>

<decisions>
## Implementation Decisions

### Catálogo de antecedentes patológicos (gap de schema resuelto)
- **D-01:** Crear un modelo nuevo **`AntecedenteCatalogoPro`** siguiendo 1:1 el patrón de `AlergiaCatalogoPro`/`MedicamentoCatalogoPro` (campos: `id`, `nombre`, `activo @default(true)`, `esSistema @default(false)`, `profesionalId` FK a `Profesional`, `@@unique([nombre, profesionalId])`, `@@index([profesionalId, activo])`), más la relación inversa `antecedentesCatalogo AntecedenteCatalogoPro[]` en `Profesional`. Esto satisface PREOP-03/04 (chips desde catálogo del profesional + learning), que el research §Phase 3 no contemplaba (sólo había planificado catálogos de alergias y medicación).
- **D-02:** Esto implica **una migración nueva en esta fase** — F51 fue "big-bang" pero no incluyó el catálogo de antecedentes. La migración crea la tabla `AntecedenteCatalogoPro` + su seed idempotente.
- **D-03:** Seed idempotente (`esSistema: true`, no editable/borrable como sistema) = la lista `PREDEFINED` ya existente en `frontend/src/components/CondicionesChips.tsx`: **Hipertensión, Diabetes, Asma, Enfermedad cardíaca, Obesidad, Artritis, Alergia severa, Hipotiroidismo, Cannabis, Epilepsia.** Coherente con lo que el equipo ya venía usando para condiciones. Reusar el patrón de `catalogo-hc.seed-data.ts`.

### Estructura del formulario (PREOP-01)
- **D-04:** **Una página seccionada** (acordeón/scroll con headers por sección), NO un wizard multi-paso. Secciones: (dx/tratamiento opcional) · Antecedentes · Alergias · Medicación · Estudios complementarios · Consentimiento informado · Compartir link. El wizard mobile-first "Paso X de N" pertenece al **portal del paciente (F55)**, no a la vista de escritorio del staff. "Paso a paso" del roadmap se interpreta como "estructurado por secciones".
- **D-05:** Render del nuevo tipo: `HCCreatorForm` ya tiene el botón "Pre Quirúrgico" mapeado a `TipoEntradaHC.PREOPERATORIO` — hace swap a un nuevo componente `PreoperatorioForm` cuando `tipoSeleccionado === 'pre_quirurgico'` (igual que hoy hace swap a `PrimeraConsultaForm`).

### Chips + auto-learning (PREOP-03/04/06/07)
- **D-06:** Reusar el patrón de auto-learning de la **Fase 46** 1:1 para las tres secciones (antecedentes, alergias, medicación): aprendizaje **en el backend al guardar** (branch `PREOPERATORIO` en `crearEntrada` → método best-effort tipo `aprenderDesdePreoperatorio()`), **sólo se aprende lo seleccionado** al guardar (un chip "Otro" deseleccionado antes de guardar se descarta), match insensible a mayúsculas/tildes (reusar `normalizarNombre`), upsert a los catálogos per-profesional, e invalidar las queries de catálogo en `onSettled`. Best-effort: si el learning falla, la HC se guarda igual.
- **D-07:** El input "Otro" replica el patrón existente de `PrimeraConsultaForm` (Input debajo del grupo de chips, Enter convierte el texto en chip seleccionado).

### Selector de diagnóstico/tratamiento opcional (PREOP-02)
- **D-08:** Check opcional "Agregar diagnóstico/tratamiento" que despliega el selector zona/diagnóstico/tratamiento — **el mismo de Primera Consulta** (reusar el componente/lógica de `PrimeraConsultaForm`). Colapsado por default.

### Persistencia en el perfil del paciente (PREOP-05/06/07)
- **D-09:** Al **abrir** el formulario, pre-cargar como chips seleccionados los valores ya existentes en el perfil (`Paciente.condiciones[]` → antecedentes, `Paciente.alergias[]`, `Paciente.medicacion[]`). Al **guardar**, hacer **unión-dedup** (NO reemplazar) sobre esos arrays del perfil. Los valores confirmados quedan tanto en el perfil del paciente como en el contenido JSONB de la entrada de HC.
- **Nota:** `medicacion[]` es el campo nuevo (F51); `condiciones[]` y `alergias[]` ya existían. Los campos `*AutoReportada(o)s` (staging del portal) NO se tocan en esta fase — son para F54/F55.

### Estudios complementarios (PREOP-08/09)
- **D-10:** Shape lockeado por **D-09 de F51**: campo `HistoriaClinicaEntrada.estudiosComplementarios Json` con forma estable `{ laboratorio: bool, ecg: bool, imagenes: string[] }`, consultable vía operadores JSON de Postgres (habilita FUT-04 sin backfill). `imagenes[]` guarda los sub-tipos seleccionados: **Ecografía, Tomografía, Mamografía, Otro**. Registrar timestamp de auditoría.

### Consentimiento "informado" vs "firmado" (PREOP-10)
- **D-11:** El check "Paciente informado del consentimiento" (PREOP-10) guarda su timestamp en el **JSONB de la entrada de HC** (p.ej. `consentimientoInformadoAt`), **NO** en `Paciente.consentimientoFirmadoAt`. Son cosas distintas: "informado" = el profesional avisó al paciente (esta fase); "firmado" = la firma dibujada estampada en el PDF (F56, escribe `consentimientoFirmadoAt`). No conflar ambos.

### Compartir link del portal (PREOP-11/12)
- **D-12:** F52 **genera el token real ahora** (no stub): computa `sha256(uuidCrudo).digest('hex')` (64-char hex), persiste el **hash** en `Paciente.portalToken` (campo ya existe desde F51) + `portalTokenGeneradoAt`, y arma la **URL real** con el UUID crudo. El link es real y estable aunque el portal frontend no abra hasta F55. Esto cumple el **Success Criteria #5 de la fase**. F54 reusa ese mismo token (verificación de identidad por DNI, rate-limit) — F52 no debe re-hashear ni regenerar si ya existe.
- **D-13:** UI de compartir desde la plantilla prequirúrgica: **copiar link**, **link de WhatsApp**, **QR escaneable** y **enviar por email**. La opción email **sólo aparece si SMTP está configurado**; si el paciente no tiene email cargado, permitir cargarlo en el momento.
- **PITFALL 12 (research):** el catálogo y el token se scopean SIEMPRE por `profesionalId`/paciente del contexto autenticado (JWT), nunca desde el body del request.

### Claude's Discretion
- Nombre exacto del método de learning en backend y dónde vive (catalogo-hc.service vs historia-clinica.service) — seguir lo que hizo F46.
- Shape exacto del payload que transporta los ítems nuevos al backend (flags en DTO vs detección server-side por ausencia de id de catálogo) — como en F46.
- Estilo visual del acordeón/secciones y de los chips; estilo del chip "nuevo" antes de guardar (borde punteado/ícono) — patrón F46.
- Key/nombre exacto del campo de timestamp del consentimiento informado dentro del JSONB.
- Librería de QR a usar (no hay una instalada todavía).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning / requisitos
- `.planning/ROADMAP.md` §"Phase 52: PREOP HC Form + Chip Catalogs" — goal, depends-on (F51), requirements PREOP-01..12, Success Criteria 1–5 (OJO SC#5 = link copiable/QR/email, satisfecho por D-12/D-13).
- `.planning/REQUIREMENTS.md` — PREOP-01 a PREOP-12 (texto completo) + sección "Out of Scope" (vista de estudios pendientes diferida a FUT-04; sólo se almacena el estado en esta fase).

### Research del milestone
- `.planning/research/SUMMARY.md` §"Phase 3 — Catalogs API + PREOPERATORIO HC Form" — patrón de CRUD de catálogos (copia de ZonaHC), branch `PREOPERATORIO` en `crearEntrada`, `aprenderDesde…()` best-effort, shape del JSONB `contenido`. **DESVIACIONES:** (a) los estudios van en campo `Json` dedicado consultable, no embebidos en `contenido` (D-09 de F51); (b) antecedentes AHORA sí tiene catálogo per-profesional `AntecedenteCatalogoPro` (D-01), el research sólo había previsto alergias/medicación.
- `.planning/research/PITFALLS.md` — pitfall 1 (token hasheado desde su creación), pitfall 12 (catálogo/token scopeados al `profesionalId` del JWT, nunca del body).

### Contexto de fases previas
- `.planning/phases/51-schema-foundation-chat-fix/51-CONTEXT.md` — D-07 (seed de catálogos AlergiaCatalogoPro/MedicamentoCatalogoPro), D-09 (estudios en `Json` dedicado, shape `{laboratorio, ecg, imagenes[]}`), y patrón de catálogo a copiar.
- `.planning/phases/46-auto-aprendizaje-via-otros/46-CONTEXT.md` — patrón de auto-learning vía "Otro" (momento del aprendizaje, only-selected, normalización/dedup, invalidación de query). Base de D-06/D-07.

### Código a tocar / reusar
- `backend/src/prisma/schema.prisma` — agregar `AntecedenteCatalogoPro` + relación en `Profesional`; modelos `AlergiaCatalogoPro` (1432), `MedicamentoCatalogoPro` (1446), `Paciente` (`alergias`/`condiciones`/`medicacion`/`portalToken`/`portalTokenGeneradoAt`, líneas ~213-220), `HistoriaClinicaEntrada` (`estudiosComplementarios`, `tipoEntrada`, líneas 291-318), enum `TipoEntradaHC.PREOPERATORIO` (1187-1193).
- `backend/src/modules/catalogo-hc/catalogo-hc.service.ts` y `catalogo-hc.seed-data.ts` — patrón de catálogo per-profesional + seed idempotente + `normalizarNombre`. Copiar para AntecedenteCatalogoPro y para el learning de las 3 secciones.
- `backend/src/modules/historia-clinica/historia-clinica.service.ts` — `crearEntrada()`: agregar branch `PREOPERATORIO` (construcción del JSONB, learning best-effort post-save, merge unión-dedup al perfil del paciente, timestamp de consentimiento informado, estudios Json).
- `frontend/src/components/live-turno/tabs/hc/HCCreatorForm.tsx` — swap a `PreoperatorioForm` cuando `tipoSeleccionado === 'pre_quirurgico'` (PLANTILLA_TO_TIPO_ENTRADA ya mapea a `PREOPERATORIO`).
- `frontend/src/components/live-turno/tabs/hc/PrimeraConsultaForm.tsx` — patrón input "Otro" Enter→chip + selector zona/dx/tratamiento reusable (PREOP-02).
- `frontend/src/components/CondicionesChips.tsx` — `PREDEFINED` es la fuente del seed de antecedentes (D-03).
- `frontend/src/hooks/useCreateHistoriaClinicaEntry.ts` — invalidación de catálogos en `onSettled`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Patrón catálogo per-profesional** (`catalogo-hc`): `esSistema`/`activo`/`profesionalId` + `@@unique([nombre, profesionalId])` + seed idempotente. Reusar para `AntecedenteCatalogoPro` y como base del learning de las 3 secciones.
- **`AlergiaCatalogoPro` + `MedicamentoCatalogoPro`** ya existen y seedeados (F51): Penicilina/Látex/AINEs/Yodo/Contraste · Anticoagulantes/Corticoides/Metformina/Levotiroxina/Aspirina/Enalapril.
- **`normalizarNombre`** (F44/F46): NFD + strip de tildes para match insensible y dedup.
- **`PrimeraConsultaForm`**: patrón input "Otro" Enter→chip y selector zona/dx/tratamiento (reusable directo para PREOP-02).
- **`HCCreatorForm`**: ya tiene el botón "Pre Quirúrgico" y el mapeo a `PREOPERATORIO` — sólo falta el componente destino.
- **Campos de `Paciente`**: `alergias[]`, `condiciones[]` (existían), `medicacion[]` (nuevo F51), `portalToken` (hash), `portalTokenGeneradoAt` — todos ya en schema.
- **`HistoriaClinicaEntrada.estudiosComplementarios Json`** y `tipoEntrada` ya existen.

### Established Patterns
- Learning best-effort fuera/después de la transacción con warn-log (F46/F44); nunca bloquear el guardado por el catálogo.
- Invalidación `onSettled` por key prefix (v1.7+) para refrescar catálogos.
- Multi-tenant por `profesionalId` efectivo; catálogos y token scopeados al contexto autenticado (PITFALL 12).
- Token de portal: `sha256(uuid)` hex de 64 chars en DB, UUID crudo sólo en la URL (PITFALL 1).

### Integration Points
- **Migración nueva** para `AntecedenteCatalogoPro` (+ seed) — única migración de esta fase.
- `historia-clinica.service.crearEntrada()` — branch `PREOPERATORIO`: JSONB + learning + merge al perfil + estudios + consentimiento informado + (eventual) generación de token.
- Generación de token del portal: nuevo endpoint/servicio que computa el hash y persiste en `Paciente` (reusado luego por F54).
- Frontend `PreoperatorioForm` nuevo, colgado de `HCCreatorForm`.

</code_context>

<specifics>
## Specific Ideas

- Mantener **consistencia** entre las tres secciones de chips (antecedentes/alergias/medicación): mismo patrón de catálogo per-pro + "Otro" + learning — por eso se creó `AntecedenteCatalogoPro` aunque implique una migración extra, en vez de dejar antecedentes como lista hardcodeada sin learning.
- Separación explícita **"informado" (F52) vs "firmado" (F56)** — no reutilizar `consentimientoFirmadoAt` para el check de esta fase.
- El link del portal debe ser **real y estable desde F52** (token hasheado generado ya), para que F54/F55 lo reusen sin regenerar y para cumplir SC#5 de la fase.

</specifics>

<deferred>
## Deferred Ideas

- **Reporte/vista de estudios complementarios pendientes** (FUT-04) — fuera de v1.12; esta fase sólo deja el estado consultable (`estudiosComplementarios Json`) para habilitarlo después sin migración.
- **`adicciones[]`** — el research mencionaba un campo de adicciones en el JSONB; no es requisito explícito de v1.12. Sólo agregarlo si surge naturalmente como sub-sección de antecedentes; no es parte del scope comprometido.
- Verificación de identidad por DNI, rate-limit y DTOs estrictos del portal — **F54**. F52 sólo genera el token.

None of the above were folded into this phase — discussion stayed within scope.

</deferred>

---

*Phase: 52-preop-hc-form-chip-catalogs*
*Context gathered: 2026-06-26*
