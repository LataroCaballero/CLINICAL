---
status: diagnosed
phase: 52-preop-hc-form-chip-catalogs
source: [52-01-SUMMARY.md, 52-02-SUMMARY.md, 52-03-SUMMARY.md, 52-04-SUMMARY.md, 52-05-SUMMARY.md, 52-06-SUMMARY.md, 52-07-SUMMARY.md]
started: 2026-06-26T13:52:52Z
updated: 2026-06-26T19:40:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server. Start the backend fresh. Server boots without errors, the AntecedenteCatalogoPro migration is applied (prisma migrate status = up to date), and a primary query (login or catalog list) returns live data.
result: pass

### 2. Open PREOPERATORIO Form
expected: In the HC creator (live turno → Historia Clínica), selecting entry type "pre_quirurgico" / PREOPERATORIO renders a structured seccioned form (Antecedentes, Alergias, Medicación, Estudios, Consentimiento, Compartir link) instead of the generic free-text textarea.
result: pass

### 3. Antecedentes Chips Load & Select
expected: The Antecedentes section shows clickable chips from the per-professional catalog (e.g. Hipertensión, Diabetes, Asma, Obesidad, etc.). Clicking a chip selects it (highlighted); clicking again deselects.
result: pass

### 4. Alergias Chips Load & Select
expected: The Alergias section shows catalog chips. Selecting/deselecting works the same as antecedentes. The catalog auto-seeds on first open if empty.
result: pass

### 5. Medicación Chips Load & Select
expected: The Medicación section shows catalog chips that can be selected/deselected.
result: pass

### 6. "Otro" Custom Value Learning
expected: Each section has an "Otro" chip that opens a text input. Typing a value not in the catalog and pressing Enter adds it as a dashed (unsaved) chip. After saving the PREOP entry and reopening the form, that value now appears as a normal solid catalog chip (it was learned).
result: pass

### 7. Patient Profile Pre-load
expected: Opening the form for a patient who already has condiciones/alergias/medicación on their profile pre-selects those values as chips (solid if in catalog, dashed if not), without any manual action.
result: pass

### 8. Estudios Complementarios Checklist
expected: The Estudios complementarios section offers a Laboratorio checkbox, an ECG checkbox, and an imágenes multi-select (Ecografía, Tomografía, Mamografía, Otro). Selections toggle independently.
result: pass

### 9. Consentimiento Informado Check
expected: A single checkbox labeled about the patient being "informado" of the surgical consent, with a note clarifying it is NOT the signed consent. Checking it is optional.
result: pass

### 10. Optional Diagnóstico/Tratamiento
expected: An "Agregar diagnóstico / tratamiento" checkbox is unchecked by default. Checking it reveals the standard PrimeraConsulta selector (zonas/diagnóstico/tratamiento); unchecking it hides and clears that selection.
result: pass

### 11. Save PREOPERATORIO Entry + Profile Merge
expected: The form is always saveable (even empty). Saving creates a PREOPERATORIO entry in the patient's clinical history with the selected chips, estudios, and consent. The selected antecedentes/alergias/medicación are merged (union, never replacing) into the patient's profile.
result: pass

### 12. Generar & Compartir Portal Link
expected: In the "Compartir link" section, clicking "Generar link del portal" returns a portal URL. Buttons appear to Copiar link (shows "Copiado" feedback), share via WhatsApp (opens contact picker), and Ver QR (renders a scannable QR code). Generating again shows an "already generated" note (same stable link).
result: pass

### 13. Email Portal Link (SMTP-gated)
expected: An email-share control appears only when SMTP is configured on the backend. When shown, it sends the portal link to the patient's email (or prompts for an email if none on file) and reports success/failure. When SMTP is not configured, the email option is hidden.
result: issue
reported: "RE-TEST tras fix 52-08: Si es un paciente que ya generé el link, carga el spinner luego deja de cargar y no pasa nada (el link existente no se muestra → se pierde, no lo puedo compartir). Si es un paciente que NO generé, carga el link con las opciones, pero al enviar por email sale: 'No se pudo enviar el email. Intentá nuevamente en unos minutos.'"
severity: major

## Summary

total: 13
passed: 12
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

# --- Gap A (re-opened on re-test): email send still fails → RESOLVED (infra/DNS) ---
- truth: "Sending the portal link by email delivers it to the patient's address and reports success"
  status: resolved
  resolution: "RESOLVED by user (2026-06-26): infra cause confirmed — DNS for the SMTP host was misconfigured, so nodemailer's sendMail threw at runtime (host unreachable), which the service caught and collapsed into motivo:'envio_fallido'. After fixing the DNS config the email now sends correctly. This matches the diagnosis: code path was correct post-52-08; the failure was environmental (isSmtpConfigured only checks var presence, not reachability). No code change required for delivery. OPTIONAL hardening still open: surface the real SMTP error code instead of the generic banner so a future misconfig is diagnosable from the UI."
  reason: "User reported on re-test (after 52-08): para un paciente sin link previo, el link y las opciones cargan bien, pero al enviar por email sale 'No se pudo enviar el email. Intentá nuevamente en unos minutos.' (mensaje de error genérico de envío, NO el de 'dirección' anterior). Fix 52-08 cambió el síntoma pero el envío sigue fallando."
  severity: major
  test: 13
  prior_resolution: "52-08 + CR-01 decoupled email sending from link regeneration (frontend passes the URL it holds; controller validates via validarPortalUrl and sends via portalEmail.enviarLinkPortal). That removed the 'verificá la dirección' false error, but live send still returns enviado:false → motivo:'envio_fallido' → generic retry banner."
  root_cause: "The controller now correctly reaches portalEmail.enviarLinkPortal (portal-email.service.ts:56), which calls nodemailer transporter.sendMail. That call THROWS at runtime → caught at line 81-84 → logger.error → returns false → controller returns {enviado:false, motivo:'envio_fallido'} → frontend shows the generic 'No se pudo enviar el email' banner (SharePortalPanel.tsx:266-270). isSmtpConfigured() (line 45-50) only checks SMTP_HOST/USER/PASS are PRESENT, not that they authenticate or that the host is reachable — so the email UI renders (vars present) but the real SMTP handshake/auth/send fails. The actual nodemailer error is swallowed (logged only) and never surfaced to the operator, making it undiagnosable from the UI. Likely infra cause (bad/missing creds, Gmail app-password required, secure/port mismatch, or SMTP_FROM not an authorized sender) — needs the backend log line + .env SMTP_* shape to pinpoint."
  artifacts:
    - path: "backend/src/modules/pacientes/portal-email.service.ts"
      issue: "Lines 56-85: sendMail failure is caught and only logged; real error reason never returned. Lines 45-50: isSmtpConfigured() checks var presence, not reachability/auth (no transporter.verify())."
    - path: "frontend/src/components/live-turno/tabs/hc/SharePortalPanel.tsx"
      issue: "Lines 266-270: 'envio_fallido' shows a generic retry banner that masks the real (config) cause."
  missing:
    - "Surface the real SMTP failure reason: return/log the nodemailer error code (EAUTH, ECONNECTION, ETLS, etc.) so the operator can act, instead of a blanket 'intentá en unos minutos'."
    - "Optionally gate the email UI on transporter.verify() (real reachability) rather than mere env-var presence, so a misconfigured SMTP hides the button instead of failing on click."
    - "HUMAN/INFRA: verify SMTP_HOST/PORT/USER/PASS/SMTP_FROM are correct and the provider accepts the from-address (app-password for Gmail, secure:true for port 465)."
  debug_session: ".planning/debug/portal-link-email-direccion-no-encontrada.md"

# --- Gap B (new regression): existing-link patient shows nothing (link unrecoverable) ---
- truth: "Opening the share panel for a patient who already generated a portal link shows that existing link with the share options, so it can still be copied/shared"
  status: failed
  reason: "User reported on re-test: si el paciente YA generó el link, el spinner carga, deja de cargar y no pasa nada — el link existente no se muestra, queda inaccesible / se pierde y no se puede compartir. Solicitud explícita: si ya tiene link, mostrarlo igual para poder compartirlo."
  severity: major
  test: 13
  root_cause: "FUNDAMENTAL conflict with decision D-12. The portal token is stored as a SHA-256 hash only (schema.prisma:217 'portalToken String? // SHA-256 hash, never plaintext'); the raw UUID is NEVER persisted (pacientes.service.ts:1057-1061). generarPortalLink is idempotent: if a token already exists it returns {url:null, alreadyGenerated:true} (service line 1052-1054) WITHOUT the URL. The plaintext URL (/portal/{rawUuid}) is therefore returned exactly ONCE — at first generation — and only held in React local state (SharePortalPanel.tsx:17). On any later page load the state starts null; clicking Generar returns url:null, so `if (result.url)` (line 44) is false, `url` stays null, and the component re-renders the pre-generation branch (line 103-134) → spinner → nothing. The shareable link is unrecoverable after the first session. A 'share link' whose link can never be re-displayed is structurally broken; fixing it requires reversing or amending D-12 (hash-only storage) — a real architecture decision."
  artifacts:
    - path: "backend/src/modules/pacientes/pacientes.service.ts"
      issue: "Lines 1052-1075: generarPortalLink returns url:null for existing tokens; raw UUID discarded after first call, so the plaintext URL is unrecoverable."
    - path: "backend/src/prisma/schema.prisma"
      issue: "Line 217: portalToken stores SHA-256 hash only (D-12) — by design the plaintext link cannot be reconstructed from the DB."
    - path: "frontend/src/components/live-turno/tabs/hc/SharePortalPanel.tsx"
      issue: "Lines 39-52 + 103-134: relies on result.url which is null on every call after the first; no path to display a pre-existing link, so the panel is stuck on the generate screen."
  decision: "RESOLVED by user (2026-06-26): Option 2 — recoverable encrypted storage. Persist the raw portal token encrypted with AES-256-GCM using ENCRYPTION_KEY (reuse the WABA-token encryption infra). The link stays stable and re-displayable; DB lookups continue to use the SHA-256 hash (portalToken). This amends D-12 (raw token is now stored, but encrypted at rest, not plaintext)."
  missing:
    - "Add an encrypted-token column (e.g. portalTokenCifrado String?) to Paciente; on first generation store BOTH the SHA-256 hash (for lookup) and the AES-256-GCM-encrypted raw UUID (for recovery). Migration required."
    - "generarPortalLink (or a dedicated GET endpoint): when a token already exists, decrypt portalTokenCifrado and return the existing URL with alreadyGenerated:true (instead of url:null)."
    - "SharePortalPanel: render the existing link + share options whenever the backend returns a url, including the alreadyGenerated case; never get stuck on the generate screen when a token exists."
    - "Reuse the existing AES-256-GCM helper used for WABA accessTokenEncrypted; do not introduce a second crypto scheme."
  debug_session: ".planning/debug/portal-link-email-direccion-no-encontrada.md"
