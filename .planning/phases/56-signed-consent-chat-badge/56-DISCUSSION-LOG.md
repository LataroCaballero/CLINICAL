# Phase 56: Signed Consent + Chat Badge - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-01
**Phase:** 56-signed-consent-chat-badge
**Areas discussed:** Estampado del PDF firmado, Registro forense (modelo y cardinalidad), Resolución del consentimiento + estados vacíos, Check informado de indicaciones (CONS-07), Cross-ref todo CR-01

---

## Estampado del PDF firmado

### Visual del PDF firmado
| Option | Description | Selected |
|--------|-------------|----------|
| Página de firma anexada al final | Se agrega una última página "Constancia de firma" al PDF original | |
| Firma estampada sobre la última página | La firma se superpone en la última página del PDF original | ✓ |
| Vos decidís | El planner elige según librería | |

### Metadata forense: dónde queda
| Option | Description | Selected |
|--------|-------------|----------|
| Visible en el PDF + en la BD | Recuadro forense impreso en la página de la firma + registro en BD | ✓ |
| Solo en la BD | PDF muestra solo la firma; los 5 campos solo en BD | |

### Identificación de la "versión del consentimiento"
| Option | Description | Selected |
|--------|-------------|----------|
| Referencia al archivo (id + uploadedAt) | La versión = id del ConsentimientoZonaArchivo vigente | |
| Número de versión incremental | Campo `version Int` incremental por zona + migración/backfill | ✓ |
| Vos decidís | El planner elige | |

**Notes:** Se aclaró que el hash SHA-256 es del PDF firmado final y por lo tanto NO puede imprimirse dentro de sí mismo (circular). El recuadro visible imprime fecha/IP/userAgent/versión; el hash va solo en BD.

---

## Registro forense: modelo y cardinalidad

### Modelo
| Option | Description | Selected |
|--------|-------------|----------|
| Modelo dedicado nuevo | ConsentimientoFirmado con ip/userAgent/versión/hash/firmadoAt/path/indicacionesLeidasAt | ✓ |
| Reusar Archivo + campos en Paciente | Menos tablas, mezcla forense con archivos genéricos | |

### Cardinalidad
| Option | Description | Selected |
|--------|-------------|----------|
| Uno por zona/cirugía (varios por paciente) | Un registro por zona firmada; historial completo | ✓ |
| Uno por paciente (se sobrescribe) | Un único vigente; pierde rastro de previos | |

### Inmutabilidad y re-firma
| Option | Description | Selected |
|--------|-------------|----------|
| Artefacto inmutable + permite nueva firma | Inmutable; re-firma sobre versión nueva genera registro adicional | |
| Inmutable, sin re-firma en esta fase | Inmutable; zona firmada se muestra como "firmada", sin re-firma | ✓ |
| Vos decidís | El planner define | |

---

## Resolución del consentimiento + estados vacíos

### Cómo resuelve qué consentimiento firmar
| Option | Description | Selected |
|--------|-------------|----------|
| Vía próxima cirugía → zona | Toma la próxima cirugía → zonaId → consentimiento vigente | |
| Todas las zonas con cirugía pendiente | Lista todas las zonas pendientes y pide firmar cada una | ✓ |
| Vos decidís | El planner define la cadena | |

### Estados vacíos
| Option | Description | Selected |
|--------|-------------|----------|
| Mensaje claro por caso, sin firma | Mensaje humano por caso (sin cirugía/sin zona/sin PDF); no ofrece canvas | ✓ |
| Fallback a link genérico de contacto | Además, ofrecer canal de contacto | |
| Vos decidís | El planner define copy/comportamiento | |

---

## Check "informado de indicaciones" (CONS-07)

### Gating
| Option | Description | Selected |
|--------|-------------|----------|
| Obligatorio antes de firmar | Debe tildar "leí las indicaciones" para habilitar la firma | ✓ |
| Independiente / opcional | Registro aparte; puede firmar sin tildar | |
| Solo si la zona tiene link | Obligatorio solo cuando hay indicacionesUrl | |

### Registro + caso sin link
| Option | Description | Selected |
|--------|-------------|----------|
| Registro forense + check genérico si no hay link | `indicacionesLeidasAt` en ConsentimientoFirmado; check genérico si no hay link | ✓ |
| Registro forense + se omite si no hay link | Timestamp en forense; sin check si no hay link | |
| Vos decidís | El planner define | |

---

## Cross-ref todo CR-01

### ¿Foldear CR-01 (validación stored-XSS de indicacionesUrl) a F56?
| Option | Description | Selected |
|--------|-------------|----------|
| Sí, foldear a F56 | Incluir el fix de validación como parte de F56 | |
| No, mantener aparte | Blocker separado; planner trata indicacionesUrl como no confiable | ✓ |

**Notes:** CR-01 pasa de reviewed-en-F55 a blocker real en F56 (primer render del link al paciente). Usuario decidió no foldearlo; queda registrado en CONTEXT.md como Reviewed Todo con nota mandatoria para el planner (tratar indicacionesUrl como URL no confiable / validar protocolo http-https).

---

## Claude's Discretion

- Librería de estampado sobre PDF existente (pdf-lib u otra) y mecánica del render firma PNG → PDF.
- Layout/posición del recuadro forense y de la firma en la última página.
- Nombre/campos/índices finales del modelo `ConsentimientoFirmado`.
- Criterio para setear el flag agregado `Paciente.consentimientoFirmado`.
- Fallback de `signature_pad` si el dispositivo no soporta canvas.
- Ícono y tono exacto del badge "Paciente" del chat (teal locked).
- Estrategia de backfill del `version Int`.

## Deferred Ideas

- Re-firma sobre versión nueva del consentimiento → fase futura.
- UI de versionado del consentimiento → FUT-05.
- Migración a cloud storage del PDF firmado → FUT-01.
