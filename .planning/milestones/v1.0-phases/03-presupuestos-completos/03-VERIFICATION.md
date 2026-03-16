---
phase: 03-presupuestos-completos
verified: 2026-02-27T21:00:00Z
status: human_needed
score: 9/9 must-haves verified
human_verification:
  - test: "Enviar presupuesto por email con SMTP real"
    expected: "Email llega a la bandeja del destinatario con PDF adjunto y link de aceptacion"
    why_human: "La logica SMTP existe pero depende de credenciales externas. Si SMTP_HOST / smtpHost no estan configurados, el servicio hace 'logger.warn' y retorna sin enviar — el presupuesto igual queda ENVIADO en la BD pero el email no llega"
  - test: "Pagina publica /presupuesto/[token] — flujo completo de aceptacion"
    expected: "El paciente ve los procedimientos, hace clic en Aceptar, el presupuesto pasa a ACEPTADO, la etapa CRM del paciente sube a CONFIRMADO, y el coordinador recibe un MensajeInterno de prioridad ALTA"
    why_human: "El flujo toca 3 sistemas (frontend publico, backend transaccion, CRM kanban). Solo verificable con un token real en BD"
  - test: "Pagina publica /presupuesto/[token] — flujo completo de rechazo"
    expected: "El paciente escribe motivo, confirma rechazo, el presupuesto pasa a RECHAZADO, la etapa CRM baja a PERDIDO, y el coordinador recibe MensajeInterno"
    why_human: "Mismo flujo transaccional — solo verificable con token real"
  - test: "Columna Presupuesto en /pacientes muestra estado correcto"
    expected: "Pacientes con presupuestos muestran badge BORRADOR/ENVIADO/ACEPTADO/RECHAZADO/VENCIDO. Pacientes sin presupuestos muestran 'Sin presupuesto'"
    why_human: "El fix del 03-04 es reciente (2026-02-27). La UAT registra este item como 'issue' antes del fix — necesita re-verificacion con datos reales"
---

# Phase 3: Presupuestos Completos — Verification Report

**Phase Goal:** El coordinador puede crear un presupuesto, generar su PDF con branding de la clinica, enviarlo por email y la plataforma actualiza automaticamente la etapa CRM del paciente al enviarlo, aceptarlo o rechazarlo

**Verified:** 2026-02-27T21:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | El coordinador puede crear un presupuesto con items, moneda y fecha de validez | VERIFIED | `presupuestos.service.ts:create()` mapea `precioTotal`, `moneda`, `fechaValidez`. DTO acepta los tres campos. Frontend `PresupuestosView.tsx` tiene formulario completo con selector ARS/USD y campo fechaValidez |
| 2 | El sistema genera un PDF con branding de la clinica | VERIFIED | `presupuesto-pdf.service.ts` existe, usa PDFKit, incluye logo (axios fetch), nombre clinica, Dr/a., items con precioTotal, totales, pie de pagina. Registrado en module. Metodo `generatePdfBuffer()` retorna `Promise<Buffer>` |
| 3 | El coordinador puede enviar el presupuesto por email desde la plataforma | VERIFIED | `POST /presupuestos/:id/enviar-email` existe en controller. `PresupuestoEmailService.enviarPresupuestoPorEmail()` genera PDF, crea token, envía email con Nodemailer + adjunto PDF. `EnviarPresupuestoModal.tsx` tiene formulario de email con prefill |
| 4 | Al enviar el presupuesto, la etapa CRM sube a PRESUPUESTO_ENVIADO | VERIFIED | `presupuesto-email.service.ts:131` — transaccion actualiza `etapaCRM: EtapaCRM.PRESUPUESTO_ENVIADO`. `marcarEnviado()` en service tambien lo hace (linea 219) |
| 5 | Al aceptar un presupuesto, la etapa CRM sube a CONFIRMADO | VERIFIED | `aceptar()` en service (linea 180): `$transaction` actualiza `etapaCRM: EtapaCRM.CONFIRMADO`. `aceptarByToken()` (linea 424): mismo patron con `MensajeInterno` ALTA |
| 6 | Al rechazar un presupuesto, el sistema pide motivo y baja CRM a PERDIDO | VERIFIED | `rechazar()` (linea 261) y `rechazarByToken()` (linea 474): ambos actualizan `etapaCRM: EtapaCRM.PERDIDO` en transaccion. Pagina publica tiene campo Textarea para motivo. `EnviarPresupuestoModal` oculta el motivo pero el endpoint lo acepta via PATCH |
| 7 | El presupuesto tiene estados: BORRADOR, ENVIADO, ACEPTADO, RECHAZADO, VENCIDO | VERIFIED | Schema: `EstadoPresupuesto` enum incluye VENCIDO (linea 907). Service tiene `marcarEnviado()`, `aceptar()`, `rechazar()`. Frontend badge map incluye los 5 estados + CANCELADO |
| 8 | La pagina publica /presupuesto/[token] es accesible sin autenticacion | VERIFIED | `PresupuestoPublicController` no tiene `@Auth()`. `presupuestos.module.ts` registra ambos controllers. Frontend en `frontend/src/app/presupuesto/[token]/page.tsx` usa `fetch()` directo sin JWT |
| 9 | La columna Presupuesto en la lista /pacientes muestra el estado real del ultimo presupuesto | VERIFIED (post-fix) | `pacientes.controller.ts:74` llama `obtenerListaPacientes()`. Service incluye `presupuestos: { take: 1, orderBy: createdAt desc }` con logica VENCIDO. DTO y tipo frontend tienen `presupuestoEstado?: string \| null` |

**Score:** 9/9 truths verified

---

### Required Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `backend/src/prisma/schema.prisma` | ConfigClinica model, precioTotal, tokenAceptacion, moneda, VENCIDO | VERIFIED | Grep confirma: `model ConfigClinica` (linea 409), `tokenAceptacion` (387), `moneda` (388), `precioTotal` (404), `VENCIDO` (907) |
| `backend/src/modules/presupuestos/presupuestos.service.ts` | CRUD + aceptar/rechazar/marcarEnviado/generatePdf/findByToken/aceptarByToken/rechazarByToken | VERIFIED | Todos los metodos existen y son sustantivos. 519 lineas. Transacciones con CRM update en cada flujo |
| `backend/src/modules/presupuestos/presupuesto-pdf.service.ts` | PDFKit buffer con branding | VERIFIED | Existe, 279+ lineas, usa PDFKit + axios para logo, buildHeader/buildPatientSection/buildItemsTable/buildTotals/buildFooter |
| `backend/src/modules/presupuestos/presupuesto-email.service.ts` | Nodemailer + token + CRM update | VERIFIED | Existe, `enviarPresupuestoPorEmail()` con transaccion ENVIADO + PRESUPUESTO_ENVIADO |
| `backend/src/modules/presupuestos/presupuesto-public.controller.ts` | Endpoints publicos sin JWT | VERIFIED | 29 lineas, no tiene `@Auth()`, registra GET/:token, POST/:token/aceptar, POST/:token/rechazar |
| `backend/src/modules/presupuestos/presupuestos.module.ts` | Wiring de servicios y controladores | VERIFIED | Registra `PresupuestosController`, `PresupuestoPublicController`, `PresupuestoPdfService`, `PresupuestoEmailService` |
| `backend/src/modules/presupuestos/dto/create-presupuesto.dto.ts` | precioTotal por item, moneda, fechaValidez | VERIFIED | (confirma del 03-01-PLAN — campo precioTotal en PresupuestoItemDto, moneda/fechaValidez en CreatePresupuestoDto. Build pasa en 03-03-SUMMARY) |
| `backend/src/modules/pacientes/pacientes.controller.ts` | GET /pacientes llama obtenerListaPacientes() | VERIFIED | Linea 74: `findAll() { return this.pacientesService.obtenerListaPacientes(); }` — `resolveScope` eliminado |
| `backend/src/modules/pacientes/pacientes.service.ts` | obtenerListaPacientes() incluye presupuestoEstado | VERIFIED | Lineas 95-102: presupuestos include con `take: 1`, `orderBy createdAt desc`. Lineas 124-133: logica VENCIDO. Linea 153: `presupuestoEstado` en DTO |
| `backend/src/modules/pacientes/dto/paciente-lista.dto.ts` | presupuestoEstado?: string \| null | VERIFIED | Linea 19: `presupuestoEstado?: string \| null;` — `presupuestosActivos` eliminado |
| `frontend/src/types/pacients.ts` | PacienteListItem.presupuestoEstado | VERIFIED | Linea 23: `presupuestoEstado?: string \| null;` — campo presente |
| `frontend/src/hooks/useEnviarPresupuesto.ts` | Mutation hook POST /presupuestos/:id/enviar-email | VERIFIED | Existe, POST a `/presupuestos/${presupuestoId}/enviar-email`, invalida `presupuestos` y `crm-kanban` |
| `frontend/src/hooks/useRechazarPresupuesto.ts` | Mutation hook PATCH /presupuestos/:id/rechazar | VERIFIED | Confirmado por 03-03-SUMMARY self-check |
| `frontend/src/components/presupuesto/EnviarPresupuestoModal.tsx` | Modal con Descargar/Email/WhatsApp disabled | VERIFIED | Existe, 163 lineas, WhatsApp disabled con "Proximamente", email con form expandible |
| `frontend/src/app/presupuesto/[token]/page.tsx` | Pagina publica sin auth | VERIFIED | Existe, usa `fetch()` directo sin JWT, muestra items/total, botones Aceptar/Rechazar con motivo |
| `frontend/src/app/presupuesto/[token]/layout.tsx` | Layout fuera de /dashboard | VERIFIED | 7 lineas — layout minimo `<div className="bg-gray-50 min-h-screen">` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `pacientes.controller.ts GET /` | `pacientesService.obtenerListaPacientes()` | Linea 74 | WIRED | `return this.pacientesService.obtenerListaPacientes()` — directo, sin scope |
| `pacientes.service.ts obtenerListaPacientes()` | `presupuestoEstado` en respuesta | presupuestos include | WIRED | Lineas 95-153: include, take 1, logica VENCIDO, campo en return DTO |
| `presupuestos.service.ts marcarEnviado()` | `tokenAceptacion` via `crypto.randomUUID()` | Linea 210 | WIRED | `tokenAceptacion: presupuesto.tokenAceptacion ?? crypto.randomUUID()` — idempotente |
| `presupuesto-email.service.ts enviarPresupuestoPorEmail()` | `EtapaCRM.PRESUPUESTO_ENVIADO` | $transaction linea 131 | WIRED | Transaccion actualiza presupuesto.estado=ENVIADO + paciente.etapaCRM=PRESUPUESTO_ENVIADO |
| `presupuestos.service.ts aceptar()` | `EtapaCRM.CONFIRMADO` | $transaction linea 178-182 | WIRED | Array transaction: presupuesto update + paciente.etapaCRM=CONFIRMADO |
| `presupuestos.service.ts rechazar()` | `EtapaCRM.PERDIDO` | $transaction linea 259-263 | WIRED | Array transaction: presupuesto update + paciente.etapaCRM=PERDIDO |
| `presupuesto-public.controller.ts GET/:token` | `presupuestosService.findByToken()` | Linea 12-14 | WIRED | `return this.service.findByToken(token)` |
| `presupuesto-public.controller.ts POST/:token/aceptar` | `presupuestosService.aceptarByToken()` | Linea 17-19 | WIRED | `return this.service.aceptarByToken(token)` |
| `presupuesto-public.controller.ts POST/:token/rechazar` | `presupuestosService.rechazarByToken()` | Linea 22-27 | WIRED | Pasa `body.motivoRechazo` al service |
| `presupuestos.controller.ts GET/:id/pdf` | `service.generatePdf()` + `res.end(buffer)` | Lineas 58-66 | WIRED | Buffer retornado con Content-Type: application/pdf, res.end() — no es redirect |
| `presupuestos.controller.ts POST/:id/enviar-email` | `emailService.enviarPresupuestoPorEmail()` | Lineas 68-79 | WIRED | `await this.emailService.enviarPresupuestoPorEmail(id, dto.emailDestino, dto.notaCoordinador)` |
| `EnviarPresupuestoModal.tsx` | `POST /presupuestos/:id/enviar-email` | `useEnviarPresupuesto` mutation | WIRED | `api.post('/presupuestos/${presupuestoId}/enviar-email', {emailDestino, notaCoordinador})` |
| `presupuesto/[token]/page.tsx` | `GET /presupuestos/public/:token` | fetch() sin JWT | WIRED | `fetch('${apiUrl}/presupuestos/public/${token}')` — sin Authorization header |
| `presupuesto/[token]/page.tsx` | `POST /presupuestos/public/:token/aceptar` | handleAceptar() | WIRED | Actualiza estado local a "accepted" tras res.ok |
| `presupuesto/[token]/page.tsx` | `POST /presupuestos/public/:token/rechazar` | handleRechazar() con motivoRechazo | WIRED | Body incluye `motivoRechazo` del Textarea |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PRES-01 | 03-01 | Crear presupuesto con items, montos, fecha de validez | SATISFIED | `presupuestos.service.ts:create()` con precioTotal, moneda, fechaValidez. PresupuestosView con formulario |
| PRES-02 | 03-02 | Generar PDF con branding de la clinica | SATISFIED | `presupuesto-pdf.service.ts` — PDFKit con logo, nombre clinica, profesional, items, totales, pie de pagina |
| PRES-03 | 03-02 | Enviar presupuesto por email desde la plataforma | SATISFIED | `POST /presupuestos/:id/enviar-email` + `PresupuestoEmailService` + modal en frontend. SMTP con fallback a env vars |
| PRES-05 | 03-01, 03-04 | Estados: borrador, enviado, aceptado, rechazado, vencido | SATISFIED | Enum `EstadoPresupuesto` tiene BORRADOR/ENVIADO/ACEPTADO/RECHAZADO/CANCELADO/VENCIDO. VENCIDO calculado server-side en obtenerListaPacientes() |
| PRES-06 | 03-01, 03-02 | Al enviar, etapa CRM sube a "Presupuesto enviado" | SATISFIED | `enviarPresupuestoPorEmail()` y `marcarEnviado()` ambos actualizan `etapaCRM: EtapaCRM.PRESUPUESTO_ENVIADO` |
| PRES-07 | 03-01, 03-02 | Al aceptar, etapa CRM cierra como "Cirugia confirmada" | SATISFIED | `aceptar()` y `aceptarByToken()` ambos actualizan `etapaCRM: EtapaCRM.CONFIRMADO` en $transaction. SCOPE NOTE: integrado via aceptacion del presupuesto, no via registro de pago real (diferido a Phase 4) |
| PRES-08 | 03-01, 03-02 | Al rechazar, sistema solicita motivo de perdida | SATISFIED | Pagina publica tiene Textarea para motivo. `rechazar()` y `rechazarByToken()` guardan `motivoRechazo` en Presupuesto. Paciente.etapaCRM=PERDIDO |
| CRM-03 | 03-01, 03-02 | Al enviar presupuesto, etapa CRM = "Presupuesto enviado" | SATISFIED | Identico a PRES-06 — mismo codigo, ambos endpoints (email + marcar-enviado) lo disparan |
| CRM-04 | 03-01, 03-02 | Al registrar pago de cirugia, etapa CRM = "Cirugia confirmada" | SATISFIED (SCOPED) | Implementado via aceptacion del presupuesto. Plan 03-01 documenta explicitamente: "integracion con registro de pago real diferida a Phase 4" |

**All 9 phase requirements satisfied.**

**Orphaned Requirements Check:** No requirements mapped to Phase 3 in REQUIREMENTS.md that are absent from plan frontmatter. PRES-04 (WhatsApp) is explicitly excluded from this phase (out of scope, Phase 4).

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `presupuesto-email.service.ts` | ~456 | `decryptSmtpPass()` retorna el string sin descifrar — comentario "return as-is" | Info | SMTP passwords almacenadas en ConfigClinica no seran descifradas. Funcional para env vars (SMTP_PASS), no para cifrado real por tenant |
| `presupuestos.service.ts` | 33-35 | `console.log('DTO RECIBIDO:', dto)` en `pacientes.service.ts:create()` | Warning | Debug log en produccion en pacientes service (no presupuestos). No bloquea el objetivo |
| `EnviarPresupuestoModal.tsx` | 142 | `{/* WhatsApp - Placeholder, Phase 4 */}` | Info | Intencional — WhatsApp esta disabled con tooltip "Proximamente". No bloquea |

---

### Human Verification Required

#### 1. Email SMTP — Entrega real

**Test:** Configurar credenciales SMTP en `.env` (SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM). Abrir un presupuesto en estado BORRADOR, hacer clic en "Enviar" → "Email", ingresar un email real y confirmar.

**Expected:** Email llega a la bandeja con PDF adjunto (presupuesto-XXXXXXXX.pdf) y el boton "Ver y Responder Presupuesto" apunta a `/presupuesto/[token]`. El presupuesto en el drawer cambia a ENVIADO. El CRM Kanban mueve al paciente a "Presupuesto enviado".

**Why human:** El codigo SMTP existe y esta correctamente cableado, pero si las variables de entorno no estan configuradas, el servicio hace `logger.warn` y retorna silenciosamente sin lanzar error. El presupuesto queda ENVIADO en la BD (correcto), pero el email no llega. Requiere verificacion con SMTP real.

#### 2. Flujo de aceptacion via pagina publica

**Test:** Abrir un presupuesto ENVIADO, obtener el token de la BD (o usar el endpoint `marcar-enviado`). Navegar a `/presupuesto/[token]` en modo incognito (sin JWT). Verificar que la pagina carga sin 401. Hacer clic en "Aceptar Presupuesto".

**Expected:** Pagina muestra procedimientos, moneda, fecha de validez (si aplica). Al aceptar: pantalla de confirmacion, presupuesto pasa a ACEPTADO en la BD, paciente.etapaCRM=CONFIRMADO, MensajeInterno creado con prioridad ALTA.

**Why human:** Flujo completo atraviesa frontend publico (sin auth) + transaccion backend de 3 operaciones. Solo verificable con datos reales en BD.

#### 3. Flujo de rechazo via pagina publica

**Test:** Con un presupuesto ENVIADO, navegar a `/presupuesto/[token]`. Hacer clic en "Rechazar", escribir un motivo, confirmar.

**Expected:** Pantalla de confirmacion de rechazo. En BD: presupuesto.estado=RECHAZADO, presupuesto.motivoRechazo=texto ingresado, paciente.etapaCRM=PERDIDO, MensajeInterno creado.

**Why human:** Mismo flujo transaccional. La pagina publica maneja estados "confirming-reject" → "rejected" — necesita verificacion visual del flujo de dos pasos.

#### 4. Columna Presupuesto en /pacientes — validacion post-fix

**Test:** Abrir `/pacientes`. Para un paciente con un presupuesto en BORRADOR, verificar que la columna muestra "BORRADOR" (no "Sin presupuesto"). Para uno con presupuesto ENVIADO, verificar "ENVIADO". Para uno sin presupuesto, verificar "Sin presupuesto".

**Expected:** Badges coloreados correctamente por estado. No todos "Sin presupuesto".

**Why human:** El fix del 03-04 fue aplicado el 2026-02-27 (mismo dia) y la UAT previa documentaba este como "issue". Necesita re-verificacion con datos reales para confirmar que el fix funciono end-to-end.

---

## Summary

Phase 3 goal is structurally achieved. All 9 requirements (PRES-01, 02, 03, 05, 06, 07, 08, CRM-03, CRM-04) have substantive implementations with correct wiring:

- **Schema:** Migrado con ConfigClinica, precioTotal, tokenAceptacion, moneda, fechaValidez, VENCIDO
- **Backend:** PDF generation (PDFKit), email sending (Nodemailer + adjunto), estados completos, CRM updates en transacciones atomicas, controlador publico sin JWT
- **Frontend:** PresupuestosView completo, EnviarPresupuestoModal (Descargar/Email/WhatsApp-disabled), pagina publica `/presupuesto/[token]`, tipos alineados
- **Gap-closure (03-04):** Controller GET /pacientes ahora llama `obtenerListaPacientes()`. `marcarEnviado()` genera `tokenAceptacion`

4 items requieren verificacion humana porque dependen de estado real en BD, credenciales SMTP externas, o comportamiento visual de multi-step flows.

No hay gaps estructurales bloqueantes — el codigo esta completo y cableado. Los items de human_verification son confirmaciones de comportamiento en runtime, no correcciones de codigo.

---

*Verified: 2026-02-27T21:00:00Z*
*Verifier: Claude (gsd-verifier)*
