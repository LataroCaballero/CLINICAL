# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

---

## Milestone: v1.1 — Vista del Facturador

**Shipped:** 2026-03-16
**Phases:** 4 (8–11) | **Plans:** 9 | **Timeline:** 3 days

### What Was Built
- Schema DB extendido con tipos AFIP-ready (CondicionIVA, MonedaFactura, LimiteFacturacionMensual) y campos de auditoría en PracticaRealizada vía migración SQL manual segura
- Documento de referencia técnica AFIP/ARCA de 774 líneas con contrato TypeScript EmitirComprobante — elimina necesidad de re-research para v1.2
- Capa backend de facturación completa: timezone utility getMonthBoundariesART(), 5 métodos FinanzasService con TDD, 7 endpoints nuevos (ADMIN+FACTURADOR), AfipStubService inyectable
- Dashboard exclusivo `/dashboard/facturador` con redirect automático, KPI cards por OS, barra de progreso límite mensual, configuración de límite
- Flujo de liquidación completo: edición inline montoPagado por práctica con estado local, modal de confirmación CerrarLote, transacción atómica `$transaction`

### What Worked
- **TDD RED-GREEN en Phase 9**: escribir tests fallidos primero y luego implementar aceleró la verificación y produjo código más robusto
- **AFIP research como Phase separada**: documentar primero antes de implementar (stub) evitó decisiones de arquitectura tardías; el stub de Phase 9 implementó la interfaz exacta del doc
- **Migración SQL manual**: escribir el SQL a mano (no auto-generado por Prisma) permitió el patrón add-nullable → backfill → NOT NULL → drop que Prisma no habría manejado correctamente
- **profesionalId explícito como convención**: decidir en Phase 9 que FACTURADOR no tiene Profesional record y que profesionalId siempre es parámetro explícito previno problemas de JWT lookup en todas las fases siguientes
- **Velocidad**: 9 planes en 3 días (est. ~57min total de ejecución); milestone cerrado sin blockers reales

### What Was Inefficient
- **ROADMAP.md no actualizado en tiempo real**: Phase 8 estaba marcada `[ ]` en lugar de `[x]` al completarse; los requisitos SCHEMA-01..03 y AFIP-01 nunca se marcaron como completados en REQUIREMENTS.md — requirió reconciliación manual en el archivado
- **STATE.md con datos desactualizados**: el progress quedó en 33% (Phase 9 Plan 01) en lugar de actualizarse al 100%; el campo `last_activity` tampoco se actualizó durante la ejecución
- **Accomplishments vacíos en gsd-tools**: el CLI no pudo extraer one_liners porque los SUMMARY.md no tienen ese campo — requirió edición manual de MILESTONES.md

### Patterns Established
- `getMonthBoundariesART()`: patrón `Date.UTC(year, month-1, 1, 3, 0, 0, 0)` para boundaries ART correctos — replicar en cualquier cálculo de período mensual en finanzas
- Transacción atómica: siempre usar la forma callback de `$transaction(async tx => {...})` cuando el segundo statement necesita el ID del primero (no la forma array)
- Server-side totals: calcular `montoTotal` dentro de `$transaction` desde los datos reales, nunca aceptar del cliente — regla para todos los endpoints financieros
- AfipStubService como contrato: el stub registrado en providers+exports permite swap-out sin cambiar consumidores en v1.2
- `prisma migrate deploy` para entornos sin TTY: documentar el SQL manualmente y aplicar con deploy (diseñado para CI/prod)

### Key Lessons
1. **Actualizar ROADMAP.md y REQUIREMENTS.md dentro del mismo commit de cada plan** — no al final del milestone; la reconciliación tardía crea trabajo extra
2. **La interfaz TypeScript primero**: definir `EmitirComprobanteParams/Result` en el doc de research antes de escribir el stub garantizó alineación; el mismo patrón aplica a cualquier integración externa
3. **Advertir sobre restricciones regulatorias en el research**: documentar explícitamente la restricción CAEA-contingency-only (RG 5782/2025) con flag de verificación evita decisiones incorrectas en v1.2
4. **El rol FACTURADOR como ciudadano de primera clase**: diseñar el dashboard y los endpoints desde el rol (no como extensión del Profesional) simplificó permisos y evitó hacks de JWT lookup

### Cost Observations
- Model: claude-sonnet-4-6 (balanced profile)
- Sessions: ~9 plan executions
- Notable: Phase 9 Plan 03 (AfipStubService) completada en 1m 27s — los planes más pequeños y bien definidos son los más eficientes

---

## Milestone: v1.2 — AFIP Real

**Shipped:** 2026-03-31
**Phases:** 8 (12–19) | **Plans:** 24 | **Timeline:** 50 days (2026-02-09 → 2026-03-31)

### What Was Built
- Schema AFIP completo por tenant: ConfiguracionAFIP con cert+key AES-256-GCM, CaeaVigente, campos AFIP en Factura, scheduler de alertas de vencimiento de certificado
- WSAA Token Service: firma CMS in-process con node-forge (sin openssl subprocess, sin exposición de clave en /tmp), Redis cache por CUIT con async-mutex, ~11hs TTL
- Emisión CAE real via WSFEv1: pg_advisory_xact_lock dentro de $transaction(45000ms), clasificación AfipBusinessError → DLQ inmediato vs AfipTransientError → backoff exponencial
- QR AFIP obligatorio (RG 5616/2024): URL base64 con 13 campos en Factura.qrData, embebido en PDF con PDFKit, FacturaDetailModal con CAE + QR + USD tipoCambio con link BNA
- CAEA contingency mode: cron bimensual prefetch, fallback automático en AfipUnavailableException, FECAEAInformar con 72 reintentos distribuidos en ventana 8 días, email de deadline alert
- CAE Emission UX + error display: useEmitirFactura, polling TanStack Query por estado, panel de errores AFIP en español — incluyendo corrección de 2 bugs lógicos detectados por integration checker

### What Worked
- **TDD RED-GREEN estricto para cada plan**: Test N (RED en plan -01, GREEN en plan -02) detectó el BUG-1 del audit antes de que fuera un problema de producción. El patrón "spec primero" fue especialmente valioso para el integration layer (WSAA + CAEA)
- **Audit + integration checker antes de cerrar milestone**: el gsd-integration-checker detectó BUG-1 y BUG-2 en CAE-03 que los verificadores de fase no habían visto — los bugs eran de lógica correcta en código correcto estructuralmente. El audit pagó su costo
- **Decimal phases para gap closure (18, 19)**: insertar phases posteriores al audit para cerrar gaps específicos sin renumerar fue limpio y mantuvo la trazabilidad REQ → PHASE → PLAN
- **DI token pattern (AFIP_SERVICE, WSAA_SERVICE)**: permitió swap real/stub sin cambiar callers; USE_AFIP_STUB=true fue valioso en desarrollo sin acceso a homologación
- **Decisions log granular en STATE.md**: 60+ decisiones documentadas con contexto evitaron re-investigar el mismo tema en planes posteriores (ej. namespace SOAP ar:, advisory lock timeout, mock de signTra)

### What Was Inefficient
- **Ciclos de audit prolongados**: dos rounds de audit (v1.2-primera, v1.2-segunda) con phases intermedias. El segundo audit fue necesario porque el integration checker encontró bugs que el verifier de fase perdió. Lección: integration checker debe correr antes del primer "passed" del verifier
- **CAE-03 fue el req más costoso**: necesitó planes en Phase 14 + 17 + 18 para estar completo — la feature parecía simple (mostrar error) pero los bugs de lógica (guard incorrecto + condición modal incompleta) requirieron TDD dedicado
- **getCierreMensual facturaId (Phase 19)**: la deuda técnica de "null cast temporal" de Phase 17 terminó necesitando su propia phase. La extensión era pequeña pero el overhead de planning/execution fue el mismo. Considerar incluir extensiones pequeñas como tasks dentro del plan padre
- **MILESTONES.md accomplishments vacíos (de nuevo)**: mismo problema que v1.1 — gsd-tools no puede extraer one_liners del formato de SUMMARY.md actual. Requirió edición manual

### Patterns Established
- `pg_advisory_xact_lock(hashtext(cuit:ptoVta:cbteTipo))` dentro de `$transaction({ timeout: 45000 })`: patrón estándar para serializar operaciones AFIP que requieren numeración secuencial sin duplicados
- `WSAA_SERVICE` / `AFIP_SERVICE` DI tokens: patrón string-constant + useFactory(env) para swap real/stub. Replicar para cualquier integración externa que tenga modo desarrollo
- Redis cache key format `afip_ta:{profesionalId}:{cuit}:{service}` con TTL = `floor((expiresAt-now)/1000 - 300)`: patrón para caché de tokens OAuth/AFIP con margen de seguridad
- `prisma.X.update` antes del guard condicional en `onFailed`: cualquier persistencia de estado de error debe ser incondicional (no dentro de `if attemptsMade >= maxAttempts`) para cubrir UnrecoverableError
- Modal condition inclusiva para estados transitorios: al mostrar información de error, incluir todos los estados intermedios relevantes, no solo el estado terminal

### Key Lessons
1. **Integration checker como parte del verify, no del audit**: correr gsd-integration-checker al verificar cada phase (no solo al auditear el milestone) habría detectado BUG-1/BUG-2 antes de necesitar Phase 18
2. **"Null cast temporal" siempre se convierte en deuda real**: la decisión de Phase 17 de abrir modal con facturaId=null como "deferred tech debt" terminó siendo Phase 19. Si la fix es <1 plan, incluirla en el plan actual
3. **El audit paga su costo cuando hay integración cross-service**: WSAA → FinanzasModule → BullMQ → CaeaService es una cadena con N puntos de falla; el integration checker encontró bugs que el analysis estático y los unit tests no cubren
4. **node-forge para firma CMS in-process es la decisión correcta para self-hosted**: evita subprocess, exposición de /tmp, y dependencia en openssl del sistema operativo. Patrón aplicable a cualquier integración que requiera criptografía en el proceso
5. **CAEA como phase separada de CAE fue correcto**: la complejidad regulatoria (RG 5782/2025, ventana 8 días, 72 reintentos) justificó su propio ciclo TDD y verification

### Cost Observations
- Model: claude-sonnet-4-6 (balanced profile) + claude-opus-4-6 para phases de research
- Sessions: ~24 plan executions + 2 audit rounds + 1 integration check
- Notable: Phase 14 (WSFEv1) fue la más densa en contexto — 4 planes secuenciales con dependencias estrictas entre spec, implementación, processor y wiring

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Timeline | Avg/Plan | Key Change |
|-----------|--------|-------|----------|----------|------------|
| v1.0 CRM Conversión | 9 | 23 | 8 días | ~21min | Baseline |
| v1.1 Vista Facturador | 4 | 9 | 3 días | ~6min est. | Planes más pequeños y focalizados |
| v1.2 AFIP Real | 8 | 24 | 50 días | ~variable | Complejidad regulatoria + audit rounds; 2 gap-closure phases |

### Cumulative Quality

| Milestone | Tests added | Coverage est. | New deps |
|-----------|-------------|---------------|----------|
| v1.0 | ~minimal | <6% | BullMQ (ya existía) |
| v1.1 | 9 TDD tests (timezone + service) | <6% | ninguna |
| v1.2 | ~40+ TDD tests (WSAA, AfipReal, CAEA, processor) | <10% | node-forge 1.3.3, qrcode 1.5.4, async-mutex |

### Recurring Process Debt

| Issue | v1.0 | v1.1 | v1.2 | Fix |
|-------|------|------|------|-----|
| MILESTONES.md accomplishments vacíos | — | ✗ | ✗ | Actualizar formato SUMMARY.md con `one_liner:` field |
| STATE.md progress desactualizado durante ejecución | — | ✗ | parcial | GSD executor actualiza STATE al final de cada plan |
| Integration bugs detectados tarde (audit, no verify) | — | — | ✗ | Correr integration checker en verify de cada phase |
