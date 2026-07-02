# Phase 53: Storage + Upload + Consent Config - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-26
**Phase:** 53-storage-upload-consent-config
**Areas discussed:** Modelo de indicaciones (CONS-02), Alcance del PDF de consentimiento (CONS-01), Rate limiting (INFRA-02), Servido de archivos (INFRA-03), Modelo de zona, Vínculo cirugía→zona, Versionado de consentimiento, Ubicación UI

---

## Modelo de indicaciones (CONS-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Link por CirugiaCatalogo | Campo indicacionesUrl por cada entrada del catálogo de cirugías | |
| Lista de links en ConfigClinica | Array JSON {nombre, url} en ConfigClinica | |
| Un solo link global | Único campo en ConfigClinica | |

**User's choice:** Free-text — "Los links van a ser por zona de cirugía (ej: todas las cirugías de mamas tienen el mismo link, y así)."
**Notes:** Introdujo el concepto de "zona" como granularidad. Ni por cirugía individual ni global: por zona.

---

## Alcance del PDF de consentimiento (CONS-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Único por profesional, reemplaza | Un campo, re-subir descarta el anterior | |
| Único por profesional, conserva historial | Guarda versiones anteriores | parcial |
| Uno por procedimiento (CirugiaCatalogo) | PDF por cirugía | |

**User's choice:** Free-text — "Se deben conservar, son únicos por profesional, y al igual que las indicaciones es un consentimiento distinto para las distintas zonas (todas las de mamas el mismo consentimiento, y así)."
**Notes:** Mismo eje que indicaciones → por zona. "Se deben conservar" = mantener historial de versiones.

---

## Rate limiting (INFRA-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Global + tier estricto público/upload | APP_GUARD global + @Throttle estricto en público | ✓ (delegado) |
| Global uniforme | Un único límite para toda la API | |
| Sólo endpoints públicos | Throttle solo en público, dashboard sin límite | |

**User's choice:** "Dejalo a tu criterio."
**Notes:** Claude decide. Default: global ttl 60s/100 req + tier estricto (~20/min público, ~10/min upload).

---

## Servido de archivos (INFRA-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Público por URL-UUID + carpeta por tenant | Sin auth, UUID inadivinable, uploads/{profesionalId}/, máx 10MB | ✓ |
| Con guard/token | Servir tras validar auth/token | |
| Público URL-UUID, carpeta plana | Sin subcarpeta por tenant | |

**User's choice:** Público por URL-UUID + carpeta por tenant (Recomendado)
**Notes:** El paciente sin login debe poder bajar el PDF en el portal (fase 56).

---

## Modelo de zona

| Option | Description | Selected |
|--------|-------------|----------|
| Catálogo nuevo editable (ZonaCirugia) | Modelo nuevo por profesional | |
| Lista fija predefinida | Set cerrado provisto por el sistema | |

**User's choice:** Free-text — "Actualmente están las zonas; cuando se carga una entrada de HC de consulta se agrupan los diagnósticos y tratamientos por zonas. Fijate cómo está ahí."
**Notes:** Reutilizar el modelo existente `ZonaHC` (módulo catalogo-hc). No crear modelo nuevo.

---

## Vínculo cirugía→zona

| Option | Description | Selected |
|--------|-------------|----------|
| Agregar zonaId a CirugiaCatalogo ahora | FK CirugiaCatalogo → ZonaHC | ✓ |
| Solo catálogo + config ahora, vincular en portal | Diferir el vínculo a fase 55/56 | |

**User's choice:** Agregar zonaId a CirugiaCatalogo ahora (Recomendado)
**Notes:** —

---

## Versionado de consentimiento

| Option | Description | Selected |
|--------|-------------|----------|
| Sí, conservar historial en disco | Cada PDF por UUID, no se borra; campo apunta al vigente | ✓ |
| No, reemplazar el vigente | Re-subir borra el anterior | |

**User's choice:** Sí, conservar historial en disco (Recomendado)
**Notes:** Respaldo legal. Versionado con UI llega en Phase 56 (FUT-05).

---

## Ubicación UI

| Option | Description | Selected |
|--------|-------------|----------|
| Nueva tab "Consentimientos" que lista las zonas | Sección dedicada en Configuración | ✓ |
| Dentro del tab "Catálogo HC" existente | Agregar controles a cada zona en el editor actual | |

**User's choice:** Nueva tab "Consentimientos" que lista las zonas (Recomendado)
**Notes:** —

---

## Claude's Discretion

- Valores exactos de rate limiting por tier (ttl/limit).
- Estructura de persistencia del historial de consentimientos (tabla de versiones vs. otra estrategia).
- Mecánica de servido estático (ServeStatic vs. controller dedicado de streaming).
- Firma exacta del StorageService más allá de `save(buffer, filename) → relativePath`.

## Deferred Ideas

- Migración a cloud storage (S3/Supabase) — FUT-01.
- Editor rich-text + versionado con UI del consentimiento — FUT-05 / Phase 56.
- Visualización/descarga del PDF, firma, estampado, metadata forense — Phase 56 (CONS-03..08).
- Vínculo paciente→zona en tiempo de portal — Phases 55/56.
