# Requirements: CLINICAL — v1.12 Prequirúrgico Estructurado + Portal del Paciente

**Defined:** 2026-06-25
**Core Value:** Que un cirujano plástico cierre más cirugías — el sistema hace visible qué pacientes seguir, cuándo y cómo, de la manera más automatizada y simple posible.

## v1 Requirements

Requisitos del milestone v1.12. Cada uno mapea a una fase del roadmap.

### Plantilla HC Prequirúrgico (PREOP)

- [x] **PREOP-01**: Al crear una entrada de HC tipo Prequirúrgico, el profesional ve un formulario estructurado por secciones paso a paso (no un campo de texto libre)
- [x] **PREOP-02**: El profesional puede activar un check opcional "Agregar diagnóstico/tratamiento" que despliega el selector de catálogo zona/diagnóstico/tratamiento (el mismo de Primera Consulta)
- [x] **PREOP-03**: El profesional registra antecedentes patológicos seleccionando chips de un catálogo, con opción "Otro" para ingresar uno que no esté en la lista
- [x] **PREOP-04**: Un antecedente/alergia/medicación nuevo ingresado vía "Otro" se persiste en el catálogo del profesional (learning) y aparece como chip en futuras entradas
- [x] **PREOP-05**: Los antecedentes patológicos seleccionados se guardan también en el perfil del paciente (`condiciones[]`), no sólo en la entrada de HC
- [x] **PREOP-06**: El profesional registra alergias con el mismo patrón de chips + "Otro" + learning, guardadas en el perfil del paciente (`alergias[]`)
- [x] **PREOP-07**: El profesional registra medicación preexistente con el mismo patrón de chips + "Otro" + learning, guardada en el perfil del paciente (`medicacion[]`, campo nuevo)
- [x] **PREOP-08**: El profesional marca con checks los estudios complementarios realizados: Laboratorio, Electrocardiograma e Imágenes (Ecografía, Tomografía, Mamografía, Otro)
- [x] **PREOP-09**: El estado de estudios complementarios se almacena de forma consultable, habilitando un futuro reporte de estudios pendientes
- [x] **PREOP-10**: El profesional marca un check "Paciente informado del consentimiento" que se registra con fecha para auditoría
- [x] **PREOP-11**: Desde la plantilla, el profesional puede compartir el link de autogestión del paciente copiando un link de WhatsApp y mostrando un QR escaneable
- [x] **PREOP-12**: Desde la plantilla, el profesional puede enviar el link de autogestión por email; si el paciente no tiene email, puede cargarlo en el momento (si SMTP no está configurado, la opción de email no se ofrece)

### Portal de Autogestión — Acceso y Datos (PORTAL)

- [x] **PORTAL-01**: Cada paciente tiene un link de autogestión persistente y reutilizable, accesible sin login mediante un token (almacenado hasheado, no en texto plano)
- [ ] **PORTAL-02**: El portal presenta la información paso a paso (wizard), claro y mobile-first, operable por un paciente no técnico
- [ ] **PORTAL-03**: En "Información básica", el paciente revisa y corrige/completa sus datos personales de contacto (teléfono, email, dirección, contacto de emergencia)
- [x] **PORTAL-04**: El paciente NO puede editar obra social ni campos clínicos sensibles desde el portal
- [ ] **PORTAL-05**: En "Información de salud", el paciente auto-reporta adicciones/drogas, enfermedades y tratamientos previos relacionados a la cirugía
- [x] **PORTAL-06**: Los datos de salud auto-reportados quedan registrados como declaración del paciente (respaldo legal) y NO sobrescriben los campos clínicos curados por el profesional — quedan staged para revisión del médico

### Consentimiento e Indicaciones (CONS)

- [x] **CONS-01**: El médico puede subir un PDF de consentimiento desde Configuración (upload a disco local, servido vía `BACKEND_URL`)
- [x] **CONS-02**: El médico puede cargar links de indicaciones por procedimiento desde Configuración
- [ ] **CONS-03**: En el portal, el paciente puede ver y descargar el PDF de consentimiento subido por el médico
- [ ] **CONS-04**: El paciente firma el consentimiento dibujando su firma (signature pad), con fallback si el dispositivo no lo soporta
- [ ] **CONS-05**: La firma dibujada se estampa en el PDF del consentimiento, generando un PDF firmado que se archiva como artefacto legal (separado del template original)
- [ ] **CONS-06**: El consentimiento firmado registra metadata forense de auditoría: fecha/hora, IP, userAgent, versión del consentimiento y hash del PDF
- [ ] **CONS-07**: El paciente marca un check de "informado de indicaciones" (provistas vía link a la web del médico), registrado para auditoría
- [ ] **CONS-08**: El estado de consentimiento firmado del paciente se refleja en el sistema (flag + fecha) visible para el profesional

### Limpieza de Chat y Caja de Consultas (CHAT)

- [x] **CHAT-01**: El scheduler de seguimiento CRM deja de generar mensajes duplicados diarios para la misma tarea (marcado de notificada / dedupe)
- [x] **CHAT-02**: Los mensajes automáticos de "Seguimiento CRM" existentes se limpian del chat en el mismo release que el fix, sin perder datos legítimos ni romper read-receipts
- [ ] **CHAT-03**: El chat distingue origen de mensaje (paciente / staff / sistema) para que las consultas reales del paciente no se pierdan en el ruido
- [ ] **CHAT-04**: Desde el portal, el paciente puede escribir consultas que llegan al chat del médico (`MensajeInterno` con origen paciente)

### Infraestructura (INFRA)

- [x] **INFRA-01**: Existe un `StorageService` de almacenamiento de archivos con backend en disco local, diseñado para poder cambiar a cloud storage (S3/Supabase) más adelante sin reescribir consumidores
- [x] **INFRA-02**: Los endpoints públicos del portal (y del portal de presupuestos existente) están protegidos con rate limiting (`ThrottlerModule` cableado)
- [x] **INFRA-03**: El upload de archivos valida tipo MIME y tamaño y previene path traversal; los archivos se sirven de forma segura

## v2 Requirements

Diferidos a futuro. Reconocidos pero fuera del roadmap actual.

### Futuro

- **FUT-01**: Migración a cloud storage (S3/Supabase) para archivos subidos
- **FUT-02**: Medicación estructurada (nombre + dosis + frecuencia) en lugar de chips de texto libre
- **FUT-03**: Envío automático del link de autogestión por la propia app (más allá de copiar WhatsApp / QR / email)
- **FUT-04**: Vista/reporte de estudios complementarios pendientes para el coordinador
- **FUT-05**: Editor rich-text y versionado con UI para el documento de consentimiento
- **FUT-06**: Revisión/confirmación in-app por el médico de los datos staged del portal hacia la HC

## Out of Scope

Excluidos explícitamente. Documentado para prevenir scope creep.

| Feature | Reason |
|---------|--------|
| Login/registro de paciente con rol PACIENTE | Se usa token persistente sin login — menor fricción para un paciente no técnico; el rol PACIENTE queda dormido para el futuro |
| Firma electrónica avanzada certificada (con certificado digital) | Firma dibujada + audit trail (fecha/IP/userAgent/versión/hash) es defendible bajo Ley 25506 para v1.12 |
| Editar obra social y campos clínicos desde el portal | Los maneja secretaria/médico; el portal sólo toca datos de contacto y auto-reporte de salud staged |
| Cloud storage en v1.12 | Disco local ahora; cloud diferido a FUT-01 |
| Vista de estudios pendientes en v1.12 | Sólo se almacena el estado (PREOP-09); la vista/reporte se difiere a FUT-04 |

## Traceability

Qué fases cubren qué requisitos.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CHAT-01 | Phase 51 | Complete |
| CHAT-02 | Phase 51 | Complete |
| PREOP-01 | Phase 52 | Complete |
| PREOP-02 | Phase 52 | Complete |
| PREOP-03 | Phase 52 | Complete |
| PREOP-04 | Phase 52 | Complete |
| PREOP-05 | Phase 52 | Complete |
| PREOP-06 | Phase 52 | Complete |
| PREOP-07 | Phase 52 | Complete |
| PREOP-08 | Phase 52 | Complete |
| PREOP-09 | Phase 52 | Complete |
| PREOP-10 | Phase 52 | Complete |
| PREOP-11 | Phase 52 | Complete |
| PREOP-12 | Phase 52 | Complete |
| INFRA-01 | Phase 53 | Complete |
| INFRA-02 | Phase 53 | Complete |
| INFRA-03 | Phase 53 | Complete |
| CONS-01 | Phase 53 | Complete |
| CONS-02 | Phase 53 | Complete |
| PORTAL-01 | Phase 54 | Complete |
| PORTAL-04 | Phase 54 | Complete |
| PORTAL-06 | Phase 54 | Complete |
| PORTAL-02 | Phase 55 | Pending |
| PORTAL-03 | Phase 55 | Pending |
| PORTAL-05 | Phase 55 | Pending |
| CHAT-04 | Phase 55 | Pending |
| CONS-03 | Phase 56 | Pending |
| CONS-04 | Phase 56 | Pending |
| CONS-05 | Phase 56 | Pending |
| CONS-06 | Phase 56 | Pending |
| CONS-07 | Phase 56 | Pending |
| CONS-08 | Phase 56 | Pending |
| CHAT-03 | Phase 56 | Pending |

**Coverage:**
- v1 requirements: 33 total
- Mapped to phases: 33/33 ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-25*
*Last updated: 2026-06-25 — traceability complete after roadmap creation*
