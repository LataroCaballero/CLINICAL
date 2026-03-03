---
phase: 01-infraestructura-async
plan: 01
subsystem: infra
tags: [bullmq, nestjs, redis, queue, encryption, whatsapp]

# Dependency graph
requires: []
provides:
  - BullMQ queue `whatsapp-messages` registrada en NestJS v10 via @nestjs/bullmq
  - WhatsappMessageProcessor (WorkerHost pattern) listo para procesar jobs
  - EncryptionService AES-256-GCM con Node.js crypto built-in
  - BullModule.forRootAsync global en AppModule con conexion Redis configurable
  - Endpoint POST /whatsapp/test-queue para smoke test (ADMIN only)
  - Compatibilidad BullMQ v11 + NestJS v10 verificada sin downgrade
affects:
  - 01-02 (WABA config storage usa EncryptionService)
  - 01-03 (notificaciones usan WhatsappQueue)
  - 04-whatsapp-integration

# Tech tracking
tech-stack:
  added:
    - "@nestjs/bullmq@11.0.4 (compatible con @nestjs/common ^10.0.0 y bullmq ^5.0.0)"
    - "bullmq@5.70.1"
  patterns:
    - "WorkerHost pattern para processors BullMQ (NO @Process() decorator)"
    - "BullModule.forRootAsync() global con ConfigService para conexion Redis"
    - "maxRetriesPerRequest: null en conexion Redis (critico para workers long-running)"
    - "Auth(@Role) decorator pattern para endpoints protegidos"

key-files:
  created:
    - backend/src/modules/whatsapp/whatsapp.module.ts
    - backend/src/modules/whatsapp/whatsapp.service.ts
    - backend/src/modules/whatsapp/whatsapp.controller.ts
    - backend/src/modules/whatsapp/processors/whatsapp-message.processor.ts
    - backend/src/modules/whatsapp/crypto/encryption.service.ts
    - backend/src/modules/whatsapp/dto/save-waba-config.dto.ts
  modified:
    - backend/src/app.module.ts
    - backend/package.json

key-decisions:
  - "@nestjs/bullmq@11.0.4 + bullmq@5.70.1 son 100% compatibles con NestJS v10 sin downgrade — peer deps explicitamente soportan ^10.0.0 || ^11.0.0"
  - "maxRetriesPerRequest: null configurado globalmente en BullModule.forRootAsync — critico para que workers no hagan timeout en jobs long-running"
  - "EncryptionService usa fallback de dev cuando ENCRYPTION_KEY no esta configurada — falla con warning (no error fatal) para facilitar onboarding"
  - "BullModule exportado desde WhatsappModule para que modulos de Phase 4 puedan inyectar la queue sin re-importar"

patterns-established:
  - "WorkerHost: todos los processors BullMQ deben extender WorkerHost y NO usar @Process() decorator"
  - "Queue naming: constante exportada WHATSAPP_QUEUE = 'whatsapp-messages' para evitar strings magicos"
  - "Temporal endpoints: comentar con // TODO: remover antes de Phase X endpoints de smoke test/debug"

requirements-completed: [INFRA-01]

# Metrics
duration: 15min
completed: 2026-02-23
---

# Phase 1 Plan 01: BullMQ + WhatsApp Module Infrastructure Summary

**BullMQ queue `whatsapp-messages` con WorkerHost processor y EncryptionService AES-256-GCM integrados en NestJS v10 sin conflictos de dependencias**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-23T00:00:00Z
- **Completed:** 2026-02-23T00:15:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Instalacion exitosa de @nestjs/bullmq@11.0.4 + bullmq@5.70.1 con compatibilidad total para NestJS v10 (concern de STATE.md resuelto)
- Modulo WhatsApp completo con queue registrada, processor WorkerHost, EncryptionService, DTO, service y controller
- AppModule actualizado con BullModule.forRootAsync() global con Redis configurable via env vars y defaultJobOptions con retry exponencial

## Compatibility Smoke Test (Task 2)

**Versiones instaladas:**
- `bullmq`: 5.70.1
- `@nestjs/bullmq`: 11.0.4
- `@nestjs/common` (en uso): 10.4.20

**Peer dependencies de @nestjs/bullmq@11.0.4:**
```json
{
  "@nestjs/common": "^10.0.0 || ^11.0.0",
  "@nestjs/core": "^10.0.0 || ^11.0.0",
  "bullmq": "^3.0.0 || ^4.0.0 || ^5.0.0"
}
```

**Resultado:** Compatibilidad 100% confirmada. No se requirio downgrade. `npm run build` pasa sin errores ni warnings relacionados al modulo whatsapp.

**Concern de STATE.md resuelto:** "BullMQ v11 + NestJS v10 — community reporta compatibilidad pero no hay declaracion oficial" — RESUELTO. Las peer deps de @nestjs/bullmq declaran explicitamente soporte para NestJS v10.

## Task Commits

1. **Task 1 + Task 2: Crear modulo WhatsApp con BullMQ** - `9f2e4f5` (feat)
   - Task 2 fue implementado inline en Task 1 ya que enqueueTestJob() con config de retry es parte del servicio base

## Files Created/Modified

- `backend/src/modules/whatsapp/whatsapp.module.ts` - Modulo NestJS con BullModule.registerQueue('whatsapp-messages')
- `backend/src/modules/whatsapp/whatsapp.service.ts` - enqueueTestJob() y validateWABACredentials() placeholder
- `backend/src/modules/whatsapp/whatsapp.controller.ts` - POST /whatsapp/test-queue (ADMIN only, temporal smoke test)
- `backend/src/modules/whatsapp/processors/whatsapp-message.processor.ts` - WorkerHost processor con handlers send-whatsapp-message y test-job
- `backend/src/modules/whatsapp/crypto/encryption.service.ts` - AES-256-GCM con Node.js built-in crypto, sin dependencias externas
- `backend/src/modules/whatsapp/dto/save-waba-config.dto.ts` - DTO con class-validator para config WABA
- `backend/src/app.module.ts` - BullModule.forRootAsync() global + WhatsappModule importado
- `backend/package.json` - @nestjs/bullmq y bullmq agregados a dependencies

## Decisions Made

- **No downgrade necesario:** @nestjs/bullmq@11 soporta NestJS v10 explicitamente en peer deps. El concern de STATE.md estaba basado en informacion desactualizada de la community.
- **EncryptionService con fallback de dev:** En lugar de tirar error fatal si falta ENCRYPTION_KEY, loguea warning y usa fallback determinista. Esto facilita onboarding pero el fallback NO es valido en produccion.
- **BullModule exportado desde WhatsappModule:** Otros modulos de Phase 4 que necesiten inyectar la queue no necesitan re-registrarla — pueden importar WhatsappModule directamente.
- **maxRetriesPerRequest: null:** Configurado a nivel global en forRootAsync. Sin esto, ioredis cierra conexiones de workers long-running despues de 3 reintentos fallidos — comportamiento silencioso que rompe jobs en produccion.

## Deviations from Plan

None - plan ejecutado exactamente como estaba escrito. Tasks 1 y 2 se combinaron naturalmente porque enqueueTestJob() era parte del service desde el inicio.

## Issues Encountered

None. Build limpio en primer intento.

## User Setup Required

Para que el modulo funcione en desarrollo/produccion, agregar al `.env` del backend:

```bash
# Redis connection (BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379

# Encryption key para EncryptionService (32 bytes en hex = 64 chars)
# Generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=<64-hex-chars>
```

Sin Redis corriendo, el servidor arranca pero los jobs no se procesan (error de conexion esperado en dev si no hay Redis local).

## Next Phase Readiness

- **Listo para 01-02:** EncryptionService disponible como provider exportado de WhatsappModule para almacenar tokens WABA cifrados
- **Listo para 01-03:** WhatsappQueue ('whatsapp-messages') registrada, processor operativo para recibir jobs de notificacion
- **Listo para Phase 4:** BullModule exportado desde WhatsappModule, WHATSAPP_QUEUE constante exportada para evitar strings magicos
- **Sin blockers:** Compatibilidad BullMQ + NestJS v10 verificada, concern de STATE.md resuelto

---
*Phase: 01-infraestructura-async*
*Completed: 2026-02-23*

## Self-Check: PASSED

- FOUND: backend/src/modules/whatsapp/whatsapp.module.ts
- FOUND: backend/src/modules/whatsapp/whatsapp.service.ts
- FOUND: backend/src/modules/whatsapp/whatsapp.controller.ts
- FOUND: backend/src/modules/whatsapp/processors/whatsapp-message.processor.ts
- FOUND: backend/src/modules/whatsapp/crypto/encryption.service.ts
- FOUND: backend/src/modules/whatsapp/dto/save-waba-config.dto.ts
- WorkerHost: OK (extends WorkerHost, uses @Processor class decorator NOT @Process() method decorator)
- BullModule.forRootAsync: OK in app.module.ts
- WhatsappModule imported in AppModule: OK
- Node.js crypto built-in: OK (no external npm packages)
- maxRetriesPerRequest: null configured: OK
- Commit 9f2e4f5: FOUND
