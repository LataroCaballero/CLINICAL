# Phase 12: Schema AFIP Extendido + Gestión de Certificados - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Add the extended AFIP schema to Prisma (ConfiguracionAFIP model, Factura new fields: cae/caeFchVto/nroComprobante/qrData/ptoVta, CaeaVigente model, EstadoFactura.CAEA_PENDIENTE_INFORMAR enum) and build the admin/profesional UI to upload and manage digital certificates per tenant. No actual AFIP SOAP calls for CAE issuance — that's Phase 13+. The only AFIP call in this phase is FEParamGetPtosVenta for ptoVta validation at cert save time.

</domain>

<decisions>
## Implementation Decisions

### CUIT registration flow
- CUIT is extracted automatically from the cert CN by the backend — no manual CUIT entry field in the form
- ConfiguracionAFIP.cuit is populated from the CN extracted value and is the source of truth
- There is no existing CUIT field on Profesional to compare against — ConfiguracionAFIP is the sole owner
- After the Admin submits the form, a **preview modal** appears showing: extracted CUIT, cert expiry date, and selected ambiente — Admin confirms before anything is saved
- ptoVta validation via FEParamGetPtosVenta happens inside the same save request (not a separate step)
- If FEParamGetPtosVenta fails (AFIP unavailable): return error to the user — do NOT save without validation. Admin must retry.

### Cert upload format
- Two textareas: one for PEM certificate content (`-----BEGIN CERTIFICATE-----...`) and one for private key content
- Same pattern as WhatsappConfigTab (text inputs, not file inputs)
- Edit mode: textareas are always empty — cert/key content is never returned to the client for security
- After successful save: form hides and a status view appears showing: CUIT, ptoVta, ambiente, cert expiry date, and status badge. "Actualizar certificado" button to re-enter edit mode.

### Admin UI placement
- New tab **"AFIP"** added to `/dashboard/configuracion` — follows exact WhatsappConfigTab pattern
- Tab is visible to both **ADMIN and PROFESIONAL** roles (each manages their own cert via profesionalId from JWT)
- The AFIP tab has **two separate sections**:
  1. **Certificado** section: textareas for cert PEM + private key, confirms via preview modal. Can only update cert by uploading the full new pair.
  2. **Configuración de facturación** section: ptoVta (number input) + ambiente selector (HOMO/PROD). Can be updated independently without re-uploading the cert (triggers FEParamGetPtosVenta re-validation on save).

### Badge on Facturador home
- Badge is only shown if a `ConfiguracionAFIP` exists for the selected profesionalId — no badge when unconfigured
- Badge states: verde = OK, amarillo = venciendo pronto (≤30 days to expiry), rojo = vencido
- The 30-day threshold aligns with the second email alert
- Badge is **visual only** for the Facturador role — not clickeable, no link to configuration

### Cert expiry email scheduler
- Daily cron job using **NestJS ScheduleModule (@Cron)** — not BullMQ
- Sends email to the Admin at 60 days and 30 days before cert expiry
- Uses existing email infrastructure (ConfigClinica.smtpHost or env-level SMTP)

### Claude's Discretion
- Exact Prisma migration name and structure for the extended schema
- Module placement for ConfiguracionAFIP backend logic (new module vs extending finanzas/afip)
- Email template copy for expiry alerts
- Exact error messages for FEParamGetPtosVenta failures
- How to parse PEM CN in Node.js (node-forge already planned for Phase 13 — can use same lib or built-in `crypto.X509Certificate`)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EncryptionService` (`backend/src/modules/whatsapp/crypto/encryption.service.ts`): AES-256-GCM encrypt/decrypt — use directly for cert PEM and private key storage in ConfiguracionAFIP
- `ConfiguracionWABA` model in schema.prisma: direct analog for `ConfiguracionAFIP` — same per-profesional singleton pattern with encrypted sensitive field
- `WhatsappConfigTab.tsx` (`frontend/src/app/dashboard/configuracion/components/WhatsappConfigTab.tsx`): exact UI pattern to follow — card with status view vs form toggle, Badge component, toast for errors
- `Badge` component: already used in facturador home — same for cert status badge
- `AlertModule` exists at `backend/src/modules/alertas/` — check if it has email infrastructure before reaching for MailerModule directly

### Established Patterns
- Config tab added to `configuracion/page.tsx` Tabs component for both ADMIN and PROFESIONAL sections (add to both)
- `TanStack Query` hooks in `frontend/src/hooks/` — new hooks: `useAfipConfig`, `useSaveAfipConfig`, `useAfipCertStatus`
- Per-profesional singleton relations on Profesional: `configuracionWABA ConfiguracionWABA?` — add `configuracionAFIP ConfiguracionAFIP?`
- Enums defined at bottom of `schema.prisma` (add `EstadoFactura.CAEA_PENDIENTE_INFORMAR` as enum extension)
- Prisma migrate deploy pattern (not migrate dev) for CI/prod safety

### Integration Points
- `configuracion/page.tsx`: add `<TabsTrigger value="afip">AFIP</TabsTrigger>` and `<TabsContent value="afip">` in both ADMIN and PROFESIONAL views
- `Factura` model: add `cae`, `caeFchVto`, `nroComprobante`, `qrData`, `ptoVta` fields in a single migration
- `Profesional` model: add `configuracionAFIP ConfiguracionAFIP?` relation
- Facturador home (`frontend/src/app/dashboard/facturador/page.tsx`): add cert status badge above the existing KPIs section, only if cert data is loaded
- `EncryptionService` is currently in `WhatsappModule` — for Phase 12 it needs to be accessible to the new AfipConfig module (either move to a shared module or inject via exports)

</code_context>

<specifics>
## Specific Ideas

- For PEM CN parsing in Node.js: `crypto.X509Certificate` (built-in Node 15.6+) can parse a PEM cert and extract the `subject` string containing the CUIT — no need to wait for node-forge from Phase 13
- CUIT in CN is typically in format `CN=20123456789` or `CUIT 20123456789` depending on how AFIP issues it — backend should handle both patterns
- The preview modal (before final save) should show ambiente in a prominent way — saving as PROD when HOMO was intended is a critical mistake

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-schema-afip-extendido-gestion-certificados*
*Context gathered: 2026-03-16*
