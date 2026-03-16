# Pitfalls Research

**Domain:** Argentine medical clinic SaaS — v1.2 AFIP Real: replacing AfipStubService with real WSAA/WSFEv1/CAEA in a multi-tenant NestJS system
**Researched:** 2026-03-16
**Confidence:** MEDIUM-HIGH (WSAA/WSFEv1 specifics — verified via official AFIP docs and community sources); MEDIUM (CAEA RG 5782/2025 — community sources confirmed, official Boletín Oficial not directly fetched); MEDIUM (multi-tenant isolation patterns — general SaaS patterns applied to AFIP context)

> **Scope:** This document covers pitfalls specific to ADDING real AFIP integration to an existing system that already has a working AfipStubService. Pitfalls from v1.1 (montoPagado audit trail, non-atomic batch close) are already shipped and are not repeated here. The earlier iteration of this file (researched 2026-03-12) covered general AFIP/WSFE domain pitfalls; this version focuses on v1.2 implementation-phase pitfalls that arise when stub becomes real.

---

## Critical Pitfalls

### Pitfall 1: Production punto de venta is not of type RECE/WSFEv1 — FECompUltimoAutorizado returns error silently

**What goes wrong:**
`FECompUltimoAutorizado` — the call that gets the last authorized number before every invoice — will return an error if the `PtoVta` is not registered, inactive, or not of type `RECE` (the WSFEv1 web service type). In homologation this check is not enforced: you can pass any `PtoVta` integer and get a valid stub response. In production, a misconfigured punto de venta returns AFIP error `10000` or `10001` and the system cannot issue a single invoice. This is not surfaced during all of testing because the homologation environment skips most administrative prerequisites.

**Why it happens:**
Homologation does not require the tenant to pre-register their punto de venta as type `RECE` in AFIP's "Administración de Puntos de Venta" portal. Production does. Development teams build and test everything in homologation, configure a `ptoVta: 1` constant, then move to production — where `ptoVta: 1` may not exist, or may be registered as `FACTURADOR WEB` (manual type) rather than `RECE`. The FECompUltimoAutorizado call fails before a single invoice is attempted.

**How to avoid:**
- Add a `verificarPuntoDeVenta(ptoVta, cbteTipo)` step to the onboarding flow that calls `FEParamGetPtosVenta` after the certificate is uploaded and validated. Surface a clear error if the configured `ptoVta` is not in the returned list or is not of type `RECE`.
- Document the administrative steps required of the clinic's accountant before production is enabled: (1) register with RECE regime, (2) create a punto de venta of type `WSFEV1/RECE` in AFIP portal, (3) note the assigned number and provide it during onboarding.
- Store `ptoVta` per-tenant in `ConfiguracionAFIP` (not hardcoded). Validate it against AFIP on first use in production, fail fast with an actionable error if invalid.
- Call `FEDummy` to verify reachability, then `FEParamGetPtosVenta` to verify the punto de venta, before attempting any real invoice. Wrap this in the certificate-upload validation flow.

**Warning signs:**
- `ptoVta: 1` is a constant in the service file.
- No `FEParamGetPtosVenta` call in the onboarding or cert-upload flow.
- Tests only validate in homologation; no smoke test that verifies punto de venta existence after cert upload.

**Phase to address:**
Phase v1.2-A (Certificate + WSAA setup) — validate punto de venta during certificate upload flow, before any invoice path is built.

---

### Pitfall 2: In-memory WSAA token cache is per-instance — multi-tenant tokens are lost on restart or duplicated under horizontal scale

**What goes wrong:**
The AFIP-INTEGRATION.md reference spec documents a `Map<string, AccessTicket>` keyed by `${cuit}:${service}`. This works correctly on a single instance with no restarts. In practice: (a) each NestJS process restart after deploy clears the cache — the first invoice after each deploy triggers a WSAA renewal for every active tenant simultaneously, which may trigger AFIP's "ya posee TA valido" rejection if two instances renew concurrently; (b) with two or more NestJS instances behind a load balancer, each instance maintains its own cache — two instances may independently attempt token renewal for the same CUIT within the same 12-hour window, causing the second renewal to fail with "ya posee TA valido" or both to proceed with different tokens where one becomes invalid.

**Why it happens:**
The `Map` cache is the natural first implementation — simple, works in dev. The multi-instance failure mode only appears in production with a load balancer or after the first rolling deploy.

**How to avoid:**
- Store the access ticket (`token`, `sign`, `expirationTime`) in Redis, keyed by `afip_ta:{cuit}:{service}`. Redis already exists in the project (BullMQ dependency).
- Use a Redis distributed lock (`SET NX PX`) to prevent concurrent token renewal for the same CUIT. The lock prevents the "ya posee TA valido" race: the second instance waits, finds the freshly-cached token from the first, and uses it.
- Set Redis TTL to `expirationTime - now() - 5 minutes` so the cache auto-expires before the token does.
- If Redis is down (the fallback): allow the in-memory fallback but log a warning. Do not block invoicing for Redis unavailability.

**Warning signs:**
- `const ticketCache = new Map<string, AccessTicket>()` is module-level in `wsaa.service.ts`.
- No Redis key for WSAA tokens in the schema or config.
- No distributed lock around token renewal.

**Phase to address:**
Phase v1.2-A (WSAA service) — must be designed with Redis cache from the first commit, not retrofitted.

---

### Pitfall 3: Advisory lock released before AFIP responds — the lock window must cover the full WSFE round-trip

**What goes wrong:**
The advisory lock pattern in AFIP-INTEGRATION.md uses `pg_advisory_xact_lock` inside a Prisma transaction. The lock is designed to serialize `FECompUltimoAutorizado → FECAESolicitar` sequences. A subtle failure: if the transaction is opened, the lock acquired, `FECompUltimoAutorizado` called — and then the WSFE call times out after 30 seconds — the transaction may be rolled back by Prisma's timeout, releasing the lock. A second concurrent request then acquires the lock, calls `FECompUltimoAutorizado` (still gets the same "last" number because the first WSFE call never got a CAE), and submits the same invoice number. If the first WSFE call was actually received by AFIP and is being processed (AFIP is slow but not down), AFIP sees two requests for the same number and rejects one or both.

**Why it happens:**
Prisma transaction timeouts interact with `pg_advisory_xact_lock` in a way that is not obvious: the lock is held for the duration of the transaction, but a long-running AFIP call inside the transaction may trigger Prisma's default transaction timeout (5 seconds by default in Prisma). This causes the transaction to abort, the lock to release, and a dangling AFIP call that may or may not have been received.

**How to avoid:**
- Set an explicit `timeout` on the Prisma `$transaction` that is longer than the maximum expected AFIP response time. AFIP's documented SLA is 30 seconds; set the transaction timeout to at least 45 seconds: `prisma.$transaction([...], { timeout: 45000 })`.
- Track "in-flight" WSFE calls in a separate DB table (`AfipCaePendiente`) keyed by `(profesionalId, ptoVta, cbteTipo, cbteDesde)`. Before acquiring the advisory lock, check if a pending call exists for this exact number. If it does: (a) wait for it to resolve, or (b) surface "comprobante being processed, try again in 60 seconds".
- On WSFE timeout: do NOT increment the local comprobante state. Log the attempt as `PENDIENTE_AFIP`. A background BullMQ job re-queries `FECompultimAutorizado` every 60 seconds for up to 15 minutes. If AFIP registered the invoice, the background job updates the DB and returns the CAE. If AFIP did not register it, the job marks the attempt as failed and allows retry.
- Never retry a timed-out WSFE call with the same `cbteDesde` automatically — always re-query `FECompUltimoAutorizado` first to confirm whether AFIP recorded the previous attempt.

**Warning signs:**
- No `AfipCaePendiente` table or equivalent "in-flight tracker" in the schema.
- Prisma `$transaction` with no explicit timeout for the WSFE path.
- BullMQ retry for WSFE failures immediately re-sends with the same comprobante number without re-querying `FECompUltimoAutorizado`.

**Phase to address:**
Phase v1.2-B (WSFEv1 real implementation) — the in-flight tracking and timeout handling must be designed before the first real invoice is attempted.

---

### Pitfall 4: CAEA inform deadline is 8 calendar days after period end — missed deadline causes CAEA disqualification

**What goes wrong:**
Under RG 5782/2025, invoices issued under CAEA during a contingency period must be reported to AFIP via `FECAEAInformar` within 8 calendar days after the period ends. A period ends on the 15th (first period) or last day of the month (second period). If the inform step fails silently or is never retried — for example, BullMQ job fails without alerting and is not monitored — AFIP detects the omission and may deny future CAEA requests for that CUIT. Worse: AFIP can determine that the contingency condition is exceeded (more than 5% of invoicing volume over 2 consecutive months or 3 alternating months), which permanently disqualifies the tenant from using CAEA.

**Why it happens:**
The "inform" step is an async cleanup concern that is easy to treat as a low-priority background job. Teams build the CAEA issuance path (which users see) and deprioritize the inform path (which is invisible). BullMQ jobs that fail with no alerting create silent gaps.

**How to avoid:**
- Create a dedicated `CaeaInformJob` in BullMQ for each CAEA period end. Schedule it to run on the 8th calendar day after the period close (e.g., the 23rd for the first period, the 8th of the following month for the second period). Retry up to 72 times with 1-hour intervals to cover transient AFIP unavailability within the 8-day window.
- Store per-tenant CAEA inform status in the DB: `{ caea, periodo, orden, informadoAt, estado: PENDIENTE | INFORMADO | FALLIDO }`. If `estado = FALLIDO` and `informadoAt` exceeds the deadline, trigger a high-priority admin alert.
- Implement a `FECAEAInformar` health check in the FACTURADOR dashboard: show a banner if any uninformed CAEA period is within 3 days of the deadline.
- Also inform unused CAEA periods (even if no invoices were issued under that CAEA — AFIP requires informing that zero comprobantes were emitted too).

**Warning signs:**
- No `CaeaInformacion` table in the schema tracking inform status per period per CUIT.
- BullMQ job for CAEA inform has no DLQ (Dead Letter Queue) or admin alert on failure.
- No monitoring on the 8-day window.

**Phase to address:**
Phase v1.2-C (CAEA contingency) — the inform tracking and alerting must ship with the CAEA feature, not as a later enhancement.

---

### Pitfall 5: CAEA used as primary path after June 2026 — RG 5782/2025 contingency-only restriction

**What goes wrong:**
A common design shortcut is to pre-request a CAEA at the start of each fortnight and use it as the primary invoice path — avoiding the real-time WSFE call altogether. This was a common pattern before RG 5782/2025. From June 1, 2026, CAEA is strictly contingency-only. Using CAEA as primary triggers the 5% volume threshold check: if CAEA invoices exceed 5% of total monthly volume (or the AFIP connection is unavailable less than 5% of the month measured by sucursal), the contingency condition is considered not met, and the tenant is disqualified from future CAEA use.

**Why it happens:**
CAEA pre-request is easier to implement than a robust CAE-first + CAEA-fallback architecture. The "always use CAEA" pattern worked legally before 2026 and some reference implementations still show it.

**How to avoid:**
- Design strictly: CAE online via `FECAESolicitar` is the always-attempted first path. CAEA is only activated when `FECAESolicitar` fails with a network timeout or HTTP 5xx after the configured retry budget (recommendation: 3 attempts with 10-second exponential backoff).
- Track CAEA usage ratio per CUIT per fortnight in the DB. If it exceeds 3% (set threshold below the 5% regulatory limit), alert the admin: "Advertencia: alto porcentaje de comprobantes emitidos en contingencia. Revisar conectividad con AFIP."
- The CAEA pre-fetch cron still runs (you need the code available for contingency), but invoices only use it when the CAE path is unavailable.
- Verify RG 5782/2025 against the official Boletín Oficial before shipping CAEA functionality — the June 2026 effective date was confirmed via community sources (MEDIUM confidence).

**Warning signs:**
- `useCaea: true` as a default configuration flag.
- CAEA pre-fetch cron is the only path in the invoice queue processor.
- No tracking of CAEA vs CAE invoice ratio per period.

**Phase to address:**
Phase v1.2-C (CAEA contingency) — the CAE-first architecture must be enforced from the first design. Verifying the regulation against Boletín Oficial is a pre-implementation gate.

---

### Pitfall 6: CondicionIVAReceptorId omitted or wrong — error 10242 causes full invoice rejection from April 2026

**What goes wrong:**
`CondicionIVAReceptorId` is a mandatory field in `FECAESolicitar` as of April 15, 2025 (RG 5616/2024). From April 1, 2026, AFIP began rejecting all invoices that omit it (AFIP error 10242: "El campo Condicion IVA receptor no es un valor valido / es obligatorio"). In the existing codebase, `AfipStubService.emitirComprobante()` accepts `condicionIVAReceptorId` in the interface but returns a fake CAE regardless of its value. If the real WSFEv1 service is wired up with a misconfigured or null `condicionIVAReceptorId`, every invoice fails at the AFIP level — not at the validation level — meaning the BullMQ job will retry indefinitely without resolving.

**Why it happens:**
The stub accepts any value, so integration tests pass. The mismatch between the Prisma enum (`CondicionIVA`) and the AFIP integer IDs requires a mapping lookup that is easy to skip. Clinics whose accountant hasn't configured the fiscal condition for the obras sociales they bill will have `null` or a default that maps incorrectly.

**How to avoid:**
- Implement `CONDICION_IVA_TO_AFIP_ID` mapping table (defined in AFIP-INTEGRATION.md Section 3) in the real `AfipService`. Throw a `BadRequestException` if the Prisma enum value has no mapping, before any WSFE call is made.
- Add a validation step in the invoice creation flow: check that `condicionIVAReceptor` is set on the `Factura` before enqueuing the BullMQ job. Surface the validation error to the FACTURADOR immediately — do not silently enqueue and fail later.
- Use `FEParamGetCondicionIvaReceptor` in the onboarding flow to fetch and cache the current list of valid AFIP IDs. Compare against the local mapping to detect if AFIP adds new values the system doesn't know about.
- For bulk invoicing (obras sociales): validate `condicionIVAReceptorId` for all records in the batch before starting the queue. Do not process 50 invoices and find out on the 1st that the condition is wrong.

**Warning signs:**
- `condicionIVAReceptorId` is passed through from the request without validation in the service.
- No `CONDICION_IVA_TO_AFIP_ID` lookup object exists in the codebase.
- BullMQ job retries WSFE calls that failed with error 10242 (this will never succeed — 10242 is a data error, not a transient failure).

**Phase to address:**
Phase v1.2-B (WSFEv1) — implement mapping and pre-queue validation before the first real invoice. Add AFIP error 10242 to the "do not retry" error class list in BullMQ.

---

### Pitfall 7: BullMQ retries AFIP business-rule rejections indefinitely — conflating transient failures with permanent rejections

**What goes wrong:**
BullMQ exponential backoff is designed for transient failures (network timeouts, HTTP 503). AFIP WSFEv1 returns HTTP 200 for business-rule rejections — errors like 10016 (wrong comprobante number), 10242 (invalid CondicionIVA), and rejection (`resultado: 'R'`) are embedded in the SOAP response body, not the HTTP status code. If the BullMQ job fails on any exception (including a parsed AFIP business rejection), it will retry up to N times — burning through the retry budget on errors that will never succeed, while locking up the queue and delaying the notification to the FACTURADOR.

**Why it happens:**
The natural pattern is `try { callAfip() } catch (e) { throw e }` which causes BullMQ to retry on any exception. Teams don't initially distinguish between "AFIP is down" (transient, retry) and "AFIP rejected the data" (permanent, do not retry).

**How to avoid:**
- Create an `AfipBusinessError` class that extends `Error` with a `code: number` field. Throw it for all AFIP application-level errors (parsed from the SOAP response, not from HTTP status).
- In BullMQ's `onFailed` hook or a custom backoff function: if `error instanceof AfipBusinessError`, set `attempts = maxAttempts` to move the job to DLQ immediately. Do not retry.
- Create an exhaustive "do not retry" error code list: `[10016, 10242, 10243, 10044]` (sequencing errors and data validation errors). These should always go straight to DLQ with an actionable error message stored in the DB.
- Create a "retry" error class for: network timeouts, HTTP 5xx from AFIP, WSAA token expired (which is auto-recovered), and SOAP infrastructure errors.
- Store the AFIP error code and message on the `Factura` record when a job is moved to DLQ, so the FACTURADOR sees an actionable Spanish-language error in the UI.

**Warning signs:**
- Single `catch (e) { throw e }` with no error type discrimination in the WSFE job processor.
- No DLQ configured for the invoice queue in BullMQ.
- `resultado: 'R'` from AFIP is logged but the job does not throw — the invoice is silently marked as "processed" with a rejected CAE.

**Phase to address:**
Phase v1.2-B (WSFEv1) — error classification must be implemented alongside the first real WSFE call. The DLQ and FACTURADOR error UI must ship in the same phase.

---

### Pitfall 8: openssl smime subprocess leaks private key material on filesystem during TRA signing

**What goes wrong:**
The AFIP-INTEGRATION.md Section 2 documents the `openssl smime -sign` subprocess approach for PKCS#7 signing. The implementation writes the decrypted private key to a temp file (`/tmp/afip-XXXXXX/key.pem`) before calling `execSync`. If the process crashes, is killed with SIGKILL, or the `finally` block is skipped for any reason (including an uncaught exception in the `try` block before cleanup), the plaintext private key persists on disk. In a containerized environment, the `/tmp` directory may be shared across processes or persist between container restarts.

**Why it happens:**
`execSync` requires filesystem access. The reference implementation includes a `finally { fs.rmSync(...) }` block, but this protection is not sufficient in all crash scenarios (SIGKILL bypasses `finally`; filesystem errors in `rmSync` can prevent cleanup).

**How to avoid:**
- Prefer `node-forge` over the `openssl smime` subprocess approach for the AFIP TRA signing. `node-forge` keeps the private key fully in-process memory — no temp files, no filesystem exposure. The risk of `node-forge` not producing AFIP-compatible CMS was flagged in AFIP-INTEGRATION.md as MEDIUM confidence; test this in homologation before committing.
- If `openssl smime` is retained: use `mkdtemp` in a directory with `chmod 700`, process-private temp paths (include PID in the path), and add a signal handler for `SIGTERM` that triggers cleanup. Additionally, run the container's `/tmp` as a `tmpfs` mount (in-memory filesystem that is not persisted).
- Never log the `keyPem` string — ensure the decrypted key only flows through the signing function and is not accessible via `console.log`, `Logger.debug`, or error messages.
- Add a test: after `signTRA()` completes (including simulated exception), verify no `*.pem` files remain in `/tmp`.

**Warning signs:**
- `openssl smime` subprocess is implemented without a SIGTERM cleanup handler.
- Decrypted `keyPem` value appears in any log output.
- No test for temp file cleanup after exception.

**Phase to address:**
Phase v1.2-A (WSAA service) — the signing approach decision must be made and security properties verified before the service handles real private keys.

---

### Pitfall 9: Multi-tenant CUIT cross-contamination in the WSAA token cache key

**What goes wrong:**
The token cache key in AFIP-INTEGRATION.md is `${cuit}:${service}`. If the CUIT stored in `ConfiguracionAFIP.cuit` does not exactly match the CUIT embedded in the X.509 certificate's Common Name (CN) or Subject, WSAA will authenticate the certificate but reject the Auth object in subsequent WSFEv1 calls with "CUITs distintos" or similar. Worse: if two tenants share the same CUIT (which should not happen but can occur during misconfigured onboarding — e.g., a clinic configured twice), their tokens are merged under the same cache key. Tenant A's token may be used to sign Tenant B's invoices under Tenant B's CUIT — producing invoices on Tenant A's certificate but Tenant B's CUIT, which AFIP will reject or, if AFIP somehow accepts them, creates a regulatory violation.

**Why it happens:**
CUIT is entered manually during onboarding. A typo, a copied-and-pasted wrong CUIT, or a test CUIT (20409378472, used for homologation) accidentally deployed to production creates a mismatch. The cache key uses the stored CUIT, but the Auth object in WSFEv1 uses the same stored CUIT — both will be consistently wrong, causing all invoices for that tenant to fail. The more dangerous scenario is the shared-CUIT case, which is a data integrity problem.

**How to avoid:**
- On certificate upload: parse the `certPem` with `node-forge` or `openssl x509 -subject` to extract the CN/SERIALNUMBER field, which AFIP encodes as `CUIT {11-digit-cuit}`. Compare the extracted CUIT against the CUIT entered during onboarding. Reject the upload if they differ.
- Add a DB constraint: `cuit` in `ConfiguracionAFIP` must be unique across all tenants in the system (`@@unique([cuit])`). This prevents two tenants sharing the same CUIT.
- In the WSAA cache key, use `profesionalId` as an additional discriminator: `afip_ta:{profesionalId}:{cuit}:{service}`. This ensures that even if a CUIT is misconfigured the same on two records (before the constraint catches it), the cache doesn't merge them.
- Add an integration test: create two `ConfiguracionAFIP` records with different `profesionalId` but verify that a CUIT collision triggers a DB constraint error before it reaches the WSAA layer.

**Warning signs:**
- No CUIT validation against the certificate's CN field during upload.
- No unique constraint on `ConfiguracionAFIP.cuit`.
- WSAA cache key is only `${cuit}:${service}` without the tenant identifier.

**Phase to address:**
Phase v1.2-A (certificate upload and onboarding) — CUIT validation must be part of the upload handler, before any token request.

---

### Pitfall 10: Certificate expiry causes all pending invoices to fail with no recovery path

**What goes wrong:**
AFIP X.509 certificates expire (production certificates typically have a 2-year validity). When a certificate expires, `WSAA LoginCms` rejects the TRA with `"CMS: Error verificando firma"` or `"Certificado vencido"`. All subsequent invoice attempts for that tenant fail immediately. If BullMQ jobs for that tenant are queued (e.g., end-of-month billing run), every job fails and moves to DLQ. Invoices that were queued before expiry but processed after are permanently lost unless manually recovered. The FACTURADOR sees a generic error and does not know why — there is no UI surface for "your certificate is expired."

**Why it happens:**
Certificate expiry is a slow-moving emergency. The `certExpiresAt` field was defined in AFIP-INTEGRATION.md as a recommended storage field but without specifying what the system should do as that date approaches. The failure mode feels like a bug (the service stopped working) rather than an expected lifecycle event.

**How to avoid:**
- Implement a scheduled job (NestJS `@nestjs/schedule`, daily cron) that queries all `ConfiguracionAFIP` records and emits an alert for any where `certExpiresAt < now + 60 days`. Escalate to a critical alert at `< 14 days`.
- Surface the certificate expiry date in the FACTURADOR configuration panel: "Certificado AFIP: válido hasta {fecha}. Contactá a tu contador para renovarlo."
- On every WSAA call: if the WSAA error is certificate-expired, mark the `ConfiguracionAFIP.estado` as `CERTIFICADO_VENCIDO` and immediately stop all invoice processing for that tenant. Surface a dashboard banner: "Certificado AFIP vencido. La facturación electrónica está suspendida. Contactá a tu contador."
- Before the DLQ strategy: any invoice job that fails due to `CERTIFICADO_VENCIDO` should be parked in a `ESPERANDO_CERTIFICADO` status (not retried, not discarded) so it can be reprocessed once the new certificate is uploaded.
- Provide a "reprocess parked invoices" admin action that triggers after a new valid certificate is uploaded and verified.

**Warning signs:**
- No scheduled job checking `certExpiresAt`.
- No `estado` field on `ConfiguracionAFIP` to distinguish `ACTIVO` vs `VENCIDO`.
- Certificate-expired WSAA errors are treated identically to transient network errors (BullMQ retries indefinitely).

**Phase to address:**
Phase v1.2-A (certificate management) — the expiry alert and the "parked invoice" recovery path must be implemented before production certificates are issued. This is a lifecycle that will materialize in production on a predictable schedule.

---

### Pitfall 11: Homologation environment differences cause false confidence in test coverage

**What goes wrong:**
The homologation environment (`wswhomo.afip.gov.ar`) differs from production in several ways that create false confidence:

1. **Punto de venta not required**: homologation accepts any `PtoVta` integer; production requires the PtoVta to be registered as type `RECE`.
2. **RECE regime adhesion not required**: production requires the clinic to have joined the electronic invoicing regime; homologation skips this check.
3. **CAEs are fake**: homologation CAEs have no fiscal validity and never appear in AFIP's public voucher verification service. A test suite that only validates "CAE was received" in homologation does not confirm the invoice is valid.
4. **CondicionIVAReceptorId enforcement timeline**: homologation may accept invoices without the field longer than production does — the enforcement schedule differs.
5. **CAEA in homologation**: homologation CAEA testing uses different period dates; a CAEA requested for the current fortnight in homologation may not match the expected period in integration tests if the test date logic is wrong.
6. **ARCA URL change**: AFIP rebranded to ARCA; some homologation endpoints are now under `wswhomo.arca.gob.ar` instead of `wswhomo.afip.gov.ar`. Both may work transiently during the transition, creating environment-specific URLs that break depending on which one is hardcoded.

**Why it happens:**
Teams test only in homologation (the correct practice during development) but assume the environment is a perfect mirror of production. The differences listed above are documented in AFIP developer manuals but easy to miss.

**How to avoid:**
- Create a pre-production smoke test suite that runs against a production CUIT in a "dry run" mode: (a) call `FEDummy` to verify reachability, (b) call `FEParamGetPtosVenta` to verify punto de venta exists and is type `RECE`, (c) call `FECompUltimoAutorizado` to verify the sequence returns a valid number. Do not emit a real invoice during the smoke test.
- Use the AFIP's public voucher verification (`https://serviciosweb.afip.gob.ar/genericos/comprobantes/`) to verify at least one production invoice after go-live.
- Store AFIP endpoint URLs in environment configuration, never hardcoded. Provide a migration guide if ARCA URL changes require updating.
- Add a test that explicitly validates the `CondicionIVAReceptorId` mapping for all enum values before any production invoice is attempted.

**Warning signs:**
- Production AFIP URLs hardcoded in service files.
- Test suite only runs against homologation; no smoke test checklist for production readiness.
- No verification of punto de venta type in the onboarding flow.

**Phase to address:**
Phase v1.2-B (WSFEv1) — define and run the production readiness smoke test before enabling real invoicing for any tenant.

---

### Pitfall 12: USD invoice MonCotiz is stale or zero — causes AFIP rejection or incorrect tax records

**What goes wrong:**
For USD invoices, `MonCotiz` must be the BNA selling exchange rate (`tipo vendedor divisa`) of the business day prior to the invoice date. If `MonCotiz` is `0`, `null`, or `1` (the ARS default), AFIP will reject the invoice or accept it with an incorrect tax base. This creates an audit problem: the IVA is calculated on the wrong amount. AFIP has no correction mechanism — a rejected invoice must be re-submitted with the correct rate, and an accepted-but-incorrect invoice requires a Nota de Crédito to reverse.

**Why it happens:**
The BNA does not have an official API. AFIP-INTEGRATION.md recommends manual entry as the safest approach. If the FACTURADOR creates a USD invoice without entering the rate (or enters it incorrectly), the invoice proceeds with a wrong value. The stub never validates this because it returns a fake CAE regardless.

**How to avoid:**
- `tipoCambio` must be non-nullable and greater than zero for any `Factura.moneda = USD`. Enforce this with a Prisma constraint or Zod validation before the record is created — not at WSFE submission time.
- In the invoice creation UI: when `moneda = USD` is selected, show a mandatory `tipoCambio` field with a link to `https://www.bna.com.ar/Personas` (BNA exchange rates) and today's date pre-filled. Do not allow form submission without a value.
- Add a service-layer guard in the real `AfipService`: if `monId = 'DOL'` and `monCotiz <= 0`, throw a `BadRequestException` before calling WSFE.
- If automated BNA rate fetching is added as an enhancement: cache the fetched rate for the business day, but always allow the FACTURADOR to override it. Store both the fetched rate and the user-confirmed rate with timestamps.

**Warning signs:**
- `tipoCambio` is nullable in the `Factura` schema with no constraint for USD invoices.
- No UI validation that requires `tipoCambio` when `moneda = USD`.
- `monCotiz` defaults to `1.0` for all currencies in the WSFE request builder.

**Phase to address:**
Phase v1.2-B (WSFEv1) — add the currency+rate guard in the service before the BullMQ job is enqueued, not inside the job processor.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| In-memory WSAA token cache (Map) | Simple, works in dev | Lost on restart; race condition under horizontal scale; "ya posee TA valido" errors in production | Only in single-instance dev; never in production |
| Hardcoded `ptoVta: 1` for all tenants | No per-tenant config needed | Every tenant needs a distinct punto de venta in AFIP; shared PtoVta causes AFIP rejection or sequence number collision across CUITs | Never — PtoVta is per-CUIT, per-tenant |
| Single BullMQ retry policy for all AFIP errors | One retry config to maintain | Business-rule rejections (10016, 10242) are retried forever wasting jobs; transient failures get same treatment as permanent ones | Never — error classification is a first-class requirement |
| CAEA as primary invoice path | Avoids real-time WSFE dependency | Violates RG 5782/2025 from June 2026; tenant loses CAEA access if 5% threshold exceeded | Never after June 2026 |
| Skip openssl temp file cleanup on exception path | Simpler error handling | Private key persists on disk after crash | Never — use node-forge or ensure cleanup on all exit paths |
| MonCotiz default to 1.0 for all currencies | No BNA API needed | USD invoices submitted with wrong rate — Nota de Crédito required to correct; audit exposure | Never — must validate before submission |
| No CAEA inform job monitoring | Simpler background infrastructure | Silent inform deadline miss → tenant disqualified from CAEA → no contingency option during outages | Never — inform is a regulatory obligation |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| WSAA (PKCS#7 signing) | Using Node's `crypto.createSign()` directly | `createSign()` produces a raw PKCS#1 signature, not a CMS SignedData structure. Use `node-forge` `pkcs7.createSignedData()` or `openssl smime -sign` subprocess |
| WSAA (clock skew) | Server running without NTP sync | WSAA validates `generationTime` within a few seconds of its own clock. Server clock drift > 5 seconds causes "Fecha de generación inválida" rejection. Verify NTP is configured in container/host |
| WSFEv1 (SOAP response) | Treating HTTP 200 as success | WSFE returns HTTP 200 for both success and business rejections. Must parse `FECAESolicitarResult.Errors` and check `Resultado` field (`A` = approved, `R` = rejected) |
| WSFEv1 (error 10016) | Incrementing local comprobante counter after any failure | Error 10016 means the sequence number submitted doesn't match AFIP's expected next number. Recovery: call `FECompUltimoAutorizado` to get AFIP's authoritative last number, resync, retry once |
| WSFEv1 (error 10242) | Retrying the same call after error 10242 | Error 10242 (CondicionIVAReceptor invalid/missing) is a permanent data error. Retrying will fail every time. Move to DLQ immediately; surface actionable error to FACTURADOR |
| WSAA + WSFEv1 (production only) | Using homologation certificate in production URL | WSAA homologation certificate is rejected by production WSAA. Each environment requires its own certificate obtained via the corresponding portal |
| CAEA inform | Informing used comprobantes only | AFIP requires informing that zero comprobantes were issued under a CAEA even if the period had no contingency events. Missing this triggers the same "omission" penalty |
| AFIP SOAP namespace | Using wrong namespace for WSFEv1 vs WSAA | WSAA uses `http://wsaa.view.sua.dvadac.desein.afip.gov`; WSFEv1 uses `http://ar.gov.afip.dif.FEV1/`. Mixing them causes hard-to-debug "invalid namespace" SOAP faults |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Synchronous WSFE HTTP call in NestJS request handler | Invoice endpoint hangs up to 30s; user retries; duplicate attempt | Use BullMQ job with idempotency key; return 202 Accepted; poll for result | On any AFIP latency spike (month-end congestion is known) |
| Acquiring advisory lock outside the Prisma `$transaction` | Lock released early; concurrent requests see same "last authorized" number | Always acquire `pg_advisory_xact_lock` inside the same `$transaction` that covers the WSFE call; set `timeout: 45000` on the transaction | First concurrent invoice attempt |
| WSAA token renewal on every invoice | 12-hour token refreshed once per call; rate-limited by AFIP | Cache token in Redis with TTL = expiry − 5 min; acquire Redis lock before renewal to prevent concurrent renewal for same CUIT | At any concurrent billing run |
| Calling `FEParamGetCondicionIvaReceptor` on every invoice | Extra round-trip per invoice; AFIP rate limits on paramGetters | Cache the result in Redis with a 24-hour TTL; only refresh if a 10242 error is received with an unknown code | At any invoicing rate above 1/minute |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Decrypted `keyPem` appearing in any log output | Private key exfiltration via log aggregation (Datadog, CloudWatch, etc.) | Treat `keyPem` as a secret; never pass it to `Logger`, `console.log`, or error messages; add a log scrubber test |
| Storing `certPemEncrypted` / `keyPemEncrypted` in API responses | Client-side certificate exposure | Never include these fields in any DTO or API response. Use `select: { certPemEncrypted: false }` in all Prisma queries that might be serialized to JSON |
| Using the homologation test CUIT (20409378472) in production config | Invoices pass local validation but AFIP rejects them; if they somehow pass, they are under a non-clinic CUIT | Add a guard in `AfipService` that throws if the configured CUIT matches the known test CUITs in a non-homologation environment |
| Per-tenant `ConfiguracionAFIP` accessible via FACTURADOR role | Certificate upload/download exposed to billing role | Certificate management must be ADMIN-only. FACTURADOR role should never receive certificate-related endpoints |
| No unique constraint on `ConfiguracionAFIP.cuit` | Two tenants configured with the same CUIT; token cache merges them; invoices emitted under wrong CUIT | Add `@@unique([cuit])` constraint to `ConfiguracionAFIP`; validate CUIT extracted from cert CN against stored CUIT on upload |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| WSFE SOAP error codes surfaced as-is to FACTURADOR | "Error 10242" is meaningless; FACTURADOR escalates to developer unnecessarily | Map all known AFIP error codes to plain Spanish: "El campo condición IVA del receptor es obligatorio. Verificá la configuración fiscal de esta obra social." |
| No distinction between "queued" and "emitted" invoice state | FACTURADOR assumes invoice is done when it enters the queue; does not follow up if BullMQ job fails | Three visible states in the UI: `EN PROCESO` (queued/processing), `EMITIDO` (CAE received), `ERROR` (job failed with actionable message) |
| Certificate expiry surfaced only when an invoice fails | FACTURADOR discovers expired cert during month-end billing run; accountant needs days to renew | Show certificate expiry date in FACTURADOR config panel; send email alert 60 days and 14 days before expiry |
| CAEA mode activated with no user notification | Invoices are issued under contingency without FACTURADOR knowing; they don't monitor the inform deadline | Show persistent dashboard banner when CAEA is active; include inform deadline countdown |
| Bulk re-process of parked invoices with no confirmation | FACTURADOR re-submits parked invoices after new cert upload without verifying the data is still current | Require FACTURADOR to review parked invoices list before re-processing; highlight any that are past their intended billing period |

---

## "Looks Done But Isn't" Checklist

- [ ] **WSAA token caching:** Token is obtained and cached — verify it is stored in Redis (not in-memory Map), keyed by `{profesionalId}:{cuit}:{service}`, with TTL set to expiry minus 5 minutes, and a distributed lock preventing concurrent renewal for same CUIT
- [ ] **Certificate upload:** Certificate file accepted — verify (a) CUIT extracted from cert CN matches stored CUIT, (b) `FEDummy` called against production WSAA to validate cert, (c) `FEParamGetPtosVenta` called to verify `ptoVta` exists and is type `RECE`, (d) `certExpiresAt` parsed from cert `notAfter` field and stored
- [ ] **CondicionIVAReceptorId mapping:** Invoice submits in homologation — verify `CONDICION_IVA_TO_AFIP_ID` lookup is present and throws `BadRequestException` for unmapped values, not silently passes null to WSFE
- [ ] **Advisory lock scope:** Invoice emits without error — verify the `pg_advisory_xact_lock` is acquired inside the same `prisma.$transaction` that covers the WSFE call, and the transaction `timeout` is >= 45 seconds
- [ ] **BullMQ error classification:** Invoice job fails — verify AFIP business errors (10016, 10242, `resultado: 'R'`) move to DLQ immediately without retrying; verify transient errors (timeout, 5xx) are retried with exponential backoff
- [ ] **CAEA inform job:** CAEA issued in contingency — verify a `CaeaInformJob` is scheduled for the period-end + 8 days, with retry up to the deadline, and moves to admin alert (not silent DLQ) if it fails past the deadline
- [ ] **CAEA usage ratio tracking:** Contingency mode activated — verify the CAEA vs CAE ratio is tracked per-tenant per-fortnight and alerts at 3% threshold
- [ ] **USD invoice MonCotiz:** USD invoice created — verify `tipoCambio > 0` is enforced before the BullMQ job is enqueued, not inside the job
- [ ] **Certificate expiry monitoring:** System has `ConfiguracionAFIP` records — verify a daily cron checks all expiry dates and sends alerts at 60 days and 14 days
- [ ] **Private key cleanup:** `signTRA()` called — verify no `*.pem` files remain in `/tmp` after function returns normally or throws

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Punto de venta not registered as RECE in production | MEDIUM (1–3 business days) | 1. Clinic accountant registers a new PtoVta as type `WSFEV1/RECE` in AFIP portal. 2. Admin updates `ConfiguracionAFIP.ptoVta`. 3. Run smoke test to confirm. 4. Re-process any failed invoices. |
| Comprobante numbering gap (concurrent advisory lock failure) | HIGH | 1. Stop all invoice emission for affected tenant immediately. 2. Call `FECompUltimoAutorizado` to get AFIP's authoritative last number. 3. If gap: contact AFIP soporte técnico (sri@arca.gov.ar). 4. Re-sync `ConfiguracionAFIP.ultimoComprobanteLocal` (if tracked). 5. Add/fix advisory lock to prevent recurrence. |
| CAEA inform deadline missed | HIGH | 1. Attempt to inform via `FECAEAInformar` even after the 8-day window — AFIP may accept late submissions with a penalty. 2. If AFIP denies future CAEA: notify clinic that contingency mode is unavailable. 3. Implement stronger monitoring to prevent recurrence. |
| WSAA token "ya posee TA valido" under horizontal scale | LOW | 1. Implement Redis distributed lock around token renewal. 2. Stagger deployment restarts to avoid simultaneous renewal. 3. In the short term, reduce instance count during cert renewal window. |
| Certificate expires mid-billing-run | MEDIUM (1–3 business days) | 1. Mark `ConfiguracionAFIP.estado = CERTIFICADO_VENCIDO`. 2. Park all queued invoice jobs in `ESPERANDO_CERTIFICADO` status. 3. Clinic accountant renews cert via AFIP portal. 4. Admin uploads new cert; system validates against WSAA. 5. Trigger "reprocess parked invoices" action. |
| Private key leaked via log (openssl temp file) | CRITICAL | 1. Revoke the certificate immediately via AFIP "Administrador de Certificados Digitales". 2. Generate a new key pair. 3. Obtain and upload a new certificate. 4. Purge affected log files from all aggregators. 5. Assess whether unauthorized invoices were emitted under the compromised key. |
| Wrong MonCotiz on accepted USD invoice | HIGH | 1. Issue a Nota de Crédito (`CbteTipo = 3` for FC-A, `8` for FC-B, `13` for FC-C) to reverse the original invoice. 2. Re-emit the invoice with the correct exchange rate. 3. Nota de Crédito must reference the original comprobante via `CbteAsoc`. Requires accountant sign-off. |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Punto de venta not type RECE in production | Phase v1.2-A (cert upload flow) | Smoke test: `FEParamGetPtosVenta` returns the configured PtoVta as type `RECE` after cert upload |
| In-memory WSAA token cache — multi-instance race | Phase v1.2-A (WSAA service) | Integration test: two concurrent token requests for same CUIT result in one WSAA call, one Redis-cached token |
| Advisory lock released before WSFE responds | Phase v1.2-B (WSFEv1 service) | Load test: 10 concurrent invoice requests for same PtoVta result in sequential comprobante numbers with no gaps |
| CAEA inform deadline miss | Phase v1.2-C (CAEA service) | Integration test: CAEA issued in contingency period → `CaeaInformJob` scheduled → inform job calls `FECAEAInformar` before day 8 |
| CAEA used as primary path (RG 5782/2025) | Phase v1.2-C (CAEA service) | Code review: `FECAESolicitar` is always attempted first; CAEA only activated on WSFE failure |
| CondicionIVAReceptorId omitted (error 10242) | Phase v1.2-B (WSFEv1 service) | Unit test: null/unmapped `condicionIVAReceptor` throws `BadRequestException` before any BullMQ job is enqueued |
| BullMQ retries permanent AFIP rejections | Phase v1.2-B (WSFEv1 job processor) | Integration test: job with error 10242 moves to DLQ on first failure; job with timeout error retries up to N times |
| openssl temp file leaks private key | Phase v1.2-A (WSAA PKCS#7 signing) | Test: `signTRA()` called, exception thrown mid-execution → no `*.pem` files in `/tmp`; use node-forge if subprocess risk unacceptable |
| Multi-tenant CUIT cross-contamination | Phase v1.2-A (cert upload + DB schema) | DB constraint test: inserting two `ConfiguracionAFIP` rows with same `cuit` fails; cert upload validates CUIT against cert CN |
| Certificate expiry silent failure | Phase v1.2-A (cert management) | Cron test: `ConfiguracionAFIP` row with `certExpiresAt = now + 30 days` triggers alert; WSAA cert-expired error sets status to `CERTIFICADO_VENCIDO` |
| Homologation false confidence | Phase v1.2-B (pre-production checklist) | Production readiness checklist: `FEDummy`, `FEParamGetPtosVenta`, `FECompUltimoAutorizado` all pass against production before first real invoice |
| USD MonCotiz stale or zero | Phase v1.2-B (invoice creation service) | Unit test: USD invoice with `tipoCambio = 0` throws before enqueueing; UI field required when `moneda = USD` |

---

## Sources

- [AFIP WSFE Manual del Desarrollador COMPG v4.0](https://www.afip.gob.ar/fe/documentos/manual-desarrollador-ARCA-COMPG-v4-0.pdf) — HIGH confidence (official AFIP documentation)
- [AFIP WSAA Manual del Desarrollador](https://www.afip.gob.ar/ws/WSAA/WSAAmanualDev.pdf) — HIGH confidence (official AFIP documentation)
- [AFIP WSAA Documentación — Certificados](https://www.afip.gob.ar/ws/documentacion/certificados.asp) — HIGH confidence (official AFIP portal)
- [AFIP — Acciones para consumir un WebService de Factura Electrónica](https://www.afip.gob.ar/fe/documentos/AccionesarealizarparaconsumirunWebservicedeFacturaElectr.pdf) — HIGH confidence (official AFIP prerequisite guide)
- [AfipSDK — Error 10242: El campo Condicion IVA receptor](https://afipsdk.com/blog/factura-electronica-solucion-a-error-10242/) — MEDIUM-HIGH confidence (SDK blog with AFIP error code reference, verified against RG 5616/2024)
- [AfipSDK — Error 10016: Número de comprobante](https://afipsdk.com/blog/factura-electronica-solucion-a-error-10016/) — MEDIUM confidence (SDK blog post-mortem)
- [Contadores en Red — CAEA se limita a contingencias desde junio 2026](https://contadoresenred.com/facturacion-uso-del-caea-se-limita-su-uso-para-contingencias/) — MEDIUM confidence (accounting community, RG 5782/2025 summary)
- [Estudio Piccinini — CAEA: nuevo procedimiento para su emisión](https://www.estudiopiccinini.com.ar/tributario/comprobantes-c-a-e-a-nuevo-procedimiento-para-su-emision/) — MEDIUM confidence (Argentine accounting firm analysis of RG 5782/2025)
- [AFIP FAQ — CAEA](https://servicioscf.afip.gob.ar/publico/abc/ABCpaso2.aspx?cat=3222) — HIGH confidence (official AFIP FAQ)
- [ARCA — Regímenes especiales: procedimientos CAEA](https://www.afip.gob.ar/fe/regimenes-especiales/procedimientos.asp) — HIGH confidence (official AFIP)
- [SistemasAgiles — FacturaElectronicaCAEAnticipado](https://www.sistemasagiles.com.ar/trac/wiki/FacturaElectronicaCAEAnticipado) — MEDIUM confidence (community AFIP developer wiki)
- [Blog Facturante — Qué es CAEA en AFIP](https://blog.facturante.com/que-es-caea-en-afip/) — MEDIUM confidence (AFIP SaaS provider blog)
- [Finnegans KB — Configurar entorno homologación AFIP/ARCA](https://bc.finneg.com/t/como-configurar-el-entorno-de-homologacion-de-afip-arca/4533) — MEDIUM confidence (ERP provider knowledge base)
- [PostgreSQL — Advisory Locks documentation](https://www.postgresql.org/docs/current/explicit-locking.html) — HIGH confidence (official PostgreSQL docs)
- [BullMQ — Retrying failing jobs](https://docs.bullmq.io/guide/retrying-failing-jobs) — HIGH confidence (official BullMQ docs)
- [ARCA RG 5616/2024 — Normativa oficial](https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-5616-2024-407369/texto) — HIGH confidence (official Argentine government registry)
- [pyafipws community — Error 10242 CondicionIVAReceptor](https://groups.google.com/g/pyafipws/c/Ts7_jHioBwc/m/mRz7U6zyEAAJ) — MEDIUM confidence (developer community discussion)

---

*Pitfalls research for: v1.2 AFIP Real — adding real WSAA/WSFEv1/CAEA to existing multi-tenant NestJS system with AfipStubService*
*Researched: 2026-03-16*
*Supersedes: previous PITFALLS.md (2026-03-12) which covered v1.1-era general domain pitfalls*
