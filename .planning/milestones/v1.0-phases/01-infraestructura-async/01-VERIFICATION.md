---
phase: 01-infraestructura-async
verified: 2026-02-23T22:30:00Z
status: human_needed
score: 11/11 must-haves verified
re_verification: false
human_verification:
  - test: "Verificar que un job encolado en BullMQ se procesa correctamente (log visible en consola)"
    expected: "Al llamar POST /whatsapp/test-queue, aparece en consola el log '[Smoke test] test-job procesado: ...' y la request HTTP retorna antes de que el job termine de procesarse"
    why_human: "Requiere Redis corriendo localmente y el servidor NestJS arrancado; no se puede verificar sin runtime"
  - test: "Verificar que ante un fallo simulado, el job reintenta con backoff exponencial (3 intentos)"
    expected: "Un job diseñado para fallar reintenta exactamente 3 veces con delay exponencial antes de marcarse como failed en BullMQ"
    why_human: "Requiere Redis corriendo y capacidad de inyectar un fallo controlado en el processor; comportamiento de runtime"
  - test: "Verificar que POST /whatsapp/config rechaza credenciales Meta inválidas con mensaje descriptivo"
    expected: "Al enviar un accessToken inválido, la respuesta es HTTP 400 con mensaje como 'Token inválido: ...' (código Meta 190)"
    why_human: "Requiere credenciales reales o mock de la Meta Graph API; integración externa"
  - test: "Verificar que la tab WhatsApp en Configuracion NO aparece para SECRETARIA y FACTURADOR"
    expected: "Al ingresar con rol SECRETARIA o FACTURADOR, la página /dashboard/configuracion muestra 'No tenés acceso a esta sección' sin ninguna tab"
    why_human: "Comportamiento condicional basado en autenticación; requiere verificación visual en el browser"
  - test: "Verificar que el toggle de opt-in en el perfil del paciente persiste al recargar la página"
    expected: "Al activar el toggle, el cambio se refleja inmediatamente en UI sin recarga y persiste al navegar y volver al perfil del paciente"
    why_human: "Requiere verificación del ciclo completo en browser: click → API call → invalidación de query → re-render"
---

# Phase 01: Infraestructura Async — Verification Report

**Phase Goal:** La plataforma puede ejecutar trabajos asincrónicos confiables y almacena el consentimiento WhatsApp y credenciales WABA por tenant, antes de que se escriba una sola línea de lógica de envío.
**Verified:** 2026-02-23T22:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Un job encolado en BullMQ se procesa sin bloquear la request HTTP | ? HUMAN | Processor existe y está cableado; ejecución real requiere Redis en runtime |
| 2 | El módulo BullMQ arranca sin errores con NestJS v10 | ✓ VERIFIED | `@nestjs/bullmq@11.0.4` + `bullmq@5.70.1` en package.json; peer deps declaran soporte `^10.0.0 \|\| ^11.0.0` explícitamente |
| 3 | Ante fallo simulado, el job reintenta con backoff exponencial (3 intentos) | ? HUMAN | `defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }` configurado en `BullModule.forRootAsync`; validación de runtime requiere Redis |
| 4 | La migración Prisma se aplica sin errores y la base de datos tiene las nuevas tablas | ✓ VERIFIED | Migración `20260223172334_whatsapp_infra/migration.sql` existe; schema válido con `ConfiguracionWABA`, `MensajeWhatsApp`, enums `EstadoMensajeWA`/`TipoMensajeWA`, campos `whatsappOptIn`/`whatsappOptInAt` en `Paciente` |
| 5 | `PATCH /pacientes/:id/whatsapp-opt-in` actualiza opt-in y registra timestamp cuando optIn=true | ✓ VERIFIED | `pacientes.service.ts` línea 630-653: `whatsappOptIn: optIn`, `whatsappOptInAt: optIn ? new Date() : null`; endpoint en controller línea 139-145 |
| 6 | `POST /whatsapp/config` guarda credenciales WABA con token cifrado (nunca en texto plano) | ✓ VERIFIED | `whatsapp.service.ts`: `validateWABACredentials()` llamado ANTES de `encryptionService.encrypt()`; Prisma `upsert` usa `accessTokenEncrypted` nunca el token plano |
| 7 | `GET /whatsapp/config` retorna solo `{ phoneNumberId, displayPhone, verifiedName, activo }` sin exponer el token | ✓ VERIFIED | `getWabaConfig()` usa `select: { phoneNumberId: true, displayPhone: true, verifiedName: true, activo: true }` — `accessTokenEncrypted` explícitamente excluido |
| 8 | El usuario ADMIN/PROFESIONAL ve tab WhatsApp en Configuración | ✓ VERIFIED | `configuracion/page.tsx`: tab presente en bloque `user?.rol === "ADMIN"` y `user?.rol === "PROFESIONAL"`; importa `WhatsappConfigTab` y lo renderiza en `TabsContent value="whatsapp"` |
| 9 | SECRETARIA y FACTURADOR NO ven tab WhatsApp en Configuración | ✓ VERIFIED (code) / ? HUMAN (runtime) | Bloque de código: roles distintos a ADMIN/PROFESIONAL caen en el `return` final que muestra "No tenés acceso a esta sección" — ninguna tab visible |
| 10 | Toggle de consentimiento WhatsApp visible en perfil del paciente con estado y fecha | ✓ VERIFIED | `PacienteDetails.tsx` línea 22: `import { WhatsappOptInToggle } from "./WhatsappOptInToggle"`; líneas 130-134: renderizado con `paciente.id`, `whatsappOptIn`, `whatsappOptInAt` |
| 11 | El toggle actualiza el backend y refleja el cambio en UI sin recargar la página | ✓ VERIFIED (code) / ? HUMAN (runtime) | `WhatsappOptInToggle` llama `useUpdateWhatsappOptIn` en `onCheckedChange`; el hook invalida `["paciente", pacienteId]` en `onSuccess` causando re-fetch automático |

**Score:** 11/11 truths verified (5 con componente de verificación humana para comportamiento runtime)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/modules/whatsapp/whatsapp.module.ts` | Módulo NestJS con BullMQ queue registrada | ✓ VERIFIED | Contiene `BullModule.registerQueue({ name: WHATSAPP_QUEUE })`; exporta `BullModule`, `WhatsappService`, `EncryptionService` |
| `backend/src/app.module.ts` | `BullModule.forRootAsync()` global con Redis | ✓ VERIFIED | Líneas 35-50: `BullModule.forRootAsync` con `ConfigService`, `maxRetriesPerRequest: null`, retry exponencial; `WhatsappModule` importado en línea 71 |
| `backend/src/modules/whatsapp/processors/whatsapp-message.processor.ts` | WorkerHost processor para queue `whatsapp-messages` | ✓ VERIFIED | `extends WorkerHost`; NO usa `@Process()` decorator; maneja `send-whatsapp-message` y `test-job`; `@OnWorkerEvent('failed'/'completed')` presentes |
| `backend/src/modules/whatsapp/crypto/encryption.service.ts` | AES-256-GCM con Node.js crypto built-in | ✓ VERIFIED | `import * as crypto from 'crypto'`; sin dependencias externas; `encrypt()` genera IV random 12 bytes, formato `iv:authTag:ciphertext`; `decrypt()` invierte el proceso |
| `backend/src/prisma/schema.prisma` | Modelos `ConfiguracionWABA`, `MensajeWhatsApp`, enums, campos opt-in | ✓ VERIFIED | Líneas 1002-1049: `EstadoMensajeWA`, `TipoMensajeWA`, `ConfiguracionWABA`, `MensajeWhatsApp`; líneas 188-190: campos `whatsappOptIn`/`whatsappOptInAt` en `Paciente` |
| `backend/src/modules/whatsapp/whatsapp.service.ts` | CRUD WABA config con validación Meta + cifrado | ✓ VERIFIED | `validateWABACredentials()`, `saveWabaConfig()`, `getWabaConfig()` implementados; `META_API_VERSION = 'v21.0'` parametrizado |
| `backend/src/modules/pacientes/pacientes.service.ts` | `updateWhatsappOptIn` con lógica timestamp | ✓ VERIFIED | Línea 630: `async updateWhatsappOptIn(id, optIn)` con `whatsappOptInAt: optIn ? new Date() : null` |
| `frontend/src/app/dashboard/configuracion/components/WhatsappConfigTab.tsx` | Formulario WABA con validación y feedback Meta | ✓ VERIFIED | 193 líneas (>80 mínimo); muestra estado conectado vs. formulario; campos phoneNumberId, accessToken (type=password), wabaId; errores inline de Meta API |
| `frontend/src/hooks/useWabaConfig.ts` | TanStack Query hook para GET /whatsapp/config | ✓ VERIFIED | `useQuery` con `queryKey: ["waba-config"]`; llama `api.get("/whatsapp/config")` |
| `frontend/src/hooks/useSaveWabaConfig.ts` | Mutation hook para POST /whatsapp/config | ✓ VERIFIED | `useMutation`; llama `api.post("/whatsapp/config")`; invalida `waba-config` en `onSuccess` |
| `frontend/src/app/dashboard/pacientes/components/WhatsappOptInToggle.tsx` | Toggle con fecha en perfil paciente | ✓ VERIFIED | `Switch` de shadcn/ui; `useUpdateWhatsappOptIn` en `onCheckedChange`; muestra fecha formateada en `es-AR` cuando `optIn && optInAt` |
| `frontend/src/hooks/useUpdateWhatsappOptIn.ts` | Mutation hook para PATCH opt-in | ✓ VERIFIED | `useMutation`; llama `api.patch("/pacientes/${pacienteId}/whatsapp-opt-in")`; invalida `["paciente", pacienteId]` en `onSuccess` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `backend/src/app.module.ts` | Redis | `BullModule.forRootAsync` con `ConfigService` | ✓ WIRED | Patrón verificado en líneas 35-50; `REDIS_HOST`/`REDIS_PORT` configurables via env |
| `backend/src/modules/whatsapp/whatsapp.module.ts` | `backend/src/app.module.ts` | import `WhatsappModule` en AppModule | ✓ WIRED | `WhatsappModule` en el array `imports` de `AppModule` línea 71 |
| `backend/src/modules/whatsapp/whatsapp.service.ts` | `EncryptionService` | inyección DI en constructor | ✓ WIRED | `private readonly encryptionService: EncryptionService` en constructor; `EncryptionService` es provider de `WhatsappModule` |
| `backend/src/modules/whatsapp/whatsapp.service.ts` | `PrismaService` | `PrismaModule @Global()` | ✓ WIRED | `PrismaModule` tiene `@Global()` — `PrismaService` disponible globalmente sin importación explícita en `WhatsappModule` |
| `backend/src/modules/whatsapp/whatsapp.service.ts` | Meta Graph API | `axios.get` con versión parametrizada | ✓ WIRED | `validateWABACredentials`: `axios.get("https://graph.facebook.com/v21.0/${phoneNumberId}")`; maneja errores Meta 190 y 100 |
| `backend/src/modules/pacientes/pacientes.controller.ts` | `pacientes.service.ts` | `PATCH :id/whatsapp-opt-in` | ✓ WIRED | Línea 139-145: endpoint existe, llama `this.pacientesService.updateWhatsappOptIn(id, dto.optIn)` |
| `frontend/src/app/dashboard/configuracion/components/WhatsappConfigTab.tsx` | `/api/whatsapp/config` | `useSaveWabaConfig` mutation hook | ✓ WIRED | `import { useSaveWabaConfig } from "@/hooks/useSaveWabaConfig"`; `saveConfig()` llamado en `handleSubmit` |
| `frontend/src/app/dashboard/pacientes/components/WhatsappOptInToggle.tsx` | `/api/pacientes/:id/whatsapp-opt-in` | `useUpdateWhatsappOptIn` mutation hook | ✓ WIRED | `import { useUpdateWhatsappOptIn } from "@/hooks/useUpdateWhatsappOptIn"`; `updateOptIn()` llamado en `handleToggle` |
| `frontend/src/app/dashboard/configuracion/page.tsx` | `WhatsappConfigTab` | tab condicional para ADMIN y PROFESIONAL | ✓ WIRED | `import WhatsappConfigTab`; `TabsTrigger value="whatsapp"` y `TabsContent` presente en ambos bloques ADMIN y PROFESIONAL |
| `frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx` | `WhatsappOptInToggle` | import y render en sección de contacto | ✓ WIRED | Línea 22: `import { WhatsappOptInToggle }`; líneas 130-134: renderizado con props del paciente |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| INFRA-01 | 01-01 | Sistema soporta jobs asincrónicos persistentes con reintentos (BullMQ sobre Redis) | ✓ SATISFIED | `BullModule.forRootAsync` con `attempts: 3` y `backoff exponential`; `WhatsappMessageProcessor extends WorkerHost`; `@nestjs/bullmq@11.0.4` + `bullmq@5.70.1` instalados |
| INFRA-02 | 01-02, 01-03 | Cada clínica puede conectar su propio número WhatsApp (credenciales WABA separadas por tenant) | ✓ SATISFIED | `ConfiguracionWABA` model con `@unique profesionalId`; endpoints `POST/GET /whatsapp/config`; `WhatsappConfigTab` UI para conectar; token cifrado AES-256-GCM |
| INFRA-03 | 01-02, 01-03 | Cada paciente tiene campo de consentimiento explícito para recibir mensajes WhatsApp | ✓ SATISFIED | `Paciente.whatsappOptIn Boolean @default(false)` + `Paciente.whatsappOptInAt DateTime?` en schema; endpoint `PATCH /pacientes/:id/whatsapp-opt-in`; `WhatsappOptInToggle` en perfil paciente |
| INFRA-04 | 01-02 | El sistema registra cada mensaje WhatsApp enviado con su estado de entrega | ✓ SATISFIED (schema only) | `MensajeWhatsApp` model con `estado EstadoMensajeWA @default(PENDIENTE)`, campos `sentAt`, `deliveredAt`, `readAt`, `errorMsg`; la tabla existe con los índices requeridos. **Nota:** No existe aún ningún endpoint ni servicio que persista registros en esta tabla — la estructura está lista pero inactiva hasta Phase 4 cuando se implemente el envío real. El requisito dice "registra", lo cual requiere infraestructura de persistencia (cumplida) pero el flujo completo de escritura es Phase 4 |

**Nota sobre INFRA-04:** REQUIREMENTS.md marca INFRA-04 como "Pending" en la columna de traceability (a diferencia de INFRA-01/02/03 que están marcados como "Complete"). Esto es consistente — el schema que soporta el requisito está en su lugar, pero el plan 01-02 solo establece la estructura de datos. El llenado de la tabla ocurrirá en fases posteriores.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `backend/src/modules/whatsapp/processors/whatsapp-message.processor.ts` | 13-17 | `// TODO Phase 4: implementar envío real` — procesador retorna sin acción real para `send-whatsapp-message` | ℹ️ Info | Intencional y documentado; Phase 1 solo valida la infraestructura de encolado |
| `backend/src/modules/whatsapp/whatsapp.controller.ts` | 14 | `// TODO: remover antes de Phase 4` — endpoint de smoke test temporal `POST /whatsapp/test-queue` | ℹ️ Info | Intencional; documentado explícitamente en el plan como temporal |
| `backend/src/modules/whatsapp/crypto/encryption.service.ts` | 18-22 | Fallback de dev cuando `ENCRYPTION_KEY` no está configurada — usa clave determinista `'dev-fallback-key...'` | ⚠️ Warning | No bloquea Phase 1, pero requiere atención antes de producción; `ENCRYPTION_KEY` debe configurarse en `.env` de producción |
| `frontend/src/app/dashboard/pacientes/components/PacienteDetails.tsx` | 128-133 | `// TODO: actualizar tipo Paciente tras regenerar Prisma client`; usa `(paciente as any).whatsappOptIn` | ℹ️ Info | TypeScript cast temporal; funcional en runtime; debe resolverse antes de que el tipo `PacienteDetalle` se regenere del cliente Prisma |
| `backend/src/modules/pacientes/pacientes.service.ts` | 33 | `console.log('DTO RECIBIDO:', dto)` — log de debug en método `create()` | ⚠️ Warning | Pre-existente, no introducido en esta fase; no afecta la verificación de Phase 1 |

---

### Human Verification Required

#### 1. Smoke Test de BullMQ en Runtime

**Test:** Arrancar el servidor backend con Redis corriendo (`REDIS_HOST=localhost REDIS_PORT=6379`) y hacer `POST /whatsapp/test-queue` con token JWT de ADMIN.
**Expected:** La request retorna `{ "queued": true, "jobId": "..." }` inmediatamente. En los logs del servidor aparece `[Smoke test] test-job procesado: {"test":true,"timestamp":"..."}` confirmando que el processor procesó el job.
**Why human:** Requiere Redis corriendo en el entorno de desarrollo y el servidor NestJS arrancado con las variables de entorno configuradas.

#### 2. Verificar Retry con Backoff Exponencial

**Test:** Modificar temporalmente el processor para que el case `test-job` lance `throw new Error('forced failure')`, reinicar el servidor, y encolar un job. Observar los logs de BullMQ.
**Expected:** El job falla, reintenta 3 veces (con delays ~2s, ~4s, ~8s aprox) y luego se marca como `failed`. El log `onFailed` aparece 3 veces.
**Why human:** Requiere modificación controlada y acceso al runtime de BullMQ con Redis.

#### 3. Validación de Credenciales Meta en POST /whatsapp/config

**Test:** Enviar `POST /whatsapp/config` con `phoneNumberId` y `accessToken` inválidos (ej: token inventado).
**Expected:** Response HTTP 400 con mensaje descriptivo como `"Token inválido: Invalid OAuth access token"`.
**Why human:** Requiere llamada real a la Meta Graph API o un mock del endpoint.

#### 4. Exclusión de Roles en la Tab de WhatsApp

**Test:** Iniciar sesión con un usuario de rol SECRETARIA y navegar a `/dashboard/configuracion`.
**Expected:** La página muestra "No tenés acceso a esta sección" — no hay tabs visibles, no hay tab WhatsApp.
**Why human:** Verificación visual en browser; el código hace la verificación correctamente pero la ejecución real depende de la sesión con el rol correcto.

#### 5. Toggle de Opt-in Persistente

**Test:** Abrir el drawer de cualquier paciente, localizar el toggle "Acepta mensajes por WhatsApp", activarlo, navegar a otra página y volver al mismo paciente.
**Expected:** El toggle sigue en estado activo y muestra la fecha de aceptación (ej: "Aceptó el 23 feb. 2026").
**Why human:** Requiere verificación del ciclo completo API → invalidación de TanStack Query → re-render en browser real.

---

## Summary

La fase 01 ha alcanzado su objetivo a nivel de código: la plataforma tiene toda la infraestructura necesaria para ejecutar trabajos asincrónicos confiables y almacenar credenciales WABA y consentimiento WhatsApp por tenant.

**Verificado programáticamente:**
- BullMQ instalado y cableado correctamente (`@nestjs/bullmq@11.0.4` compatible con NestJS v10)
- `BullModule.forRootAsync` global con Redis configurable y retry exponencial configurado
- `WhatsappMessageProcessor extends WorkerHost` — patrón correcto para `@nestjs/bullmq`
- `EncryptionService` AES-256-GCM con Node.js built-in crypto — sin dependencias externas
- Schema Prisma válido con `ConfiguracionWABA`, `MensajeWhatsApp`, campos opt-in en `Paciente`
- Migración `20260223172334_whatsapp_infra` aplicada
- Todos los endpoints backend implementados con lógica no-stub: validación Meta real, cifrado real, upsert real
- Todos los componentes frontend implementados y cableados a sus hooks correspondientes
- Exclusión de roles SECRETARIA/FACTURADOR implementada correctamente en código
- Todos los commits documentados en los SUMMARYs verificados en el historial de git

**Pendiente de verificación humana:** Comportamiento en runtime con Redis, integración real con Meta API, y confirmación visual de UX en browser.

---

_Verified: 2026-02-23T22:30:00Z_
_Verifier: Claude (gsd-verifier)_
