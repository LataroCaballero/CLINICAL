---
status: resolved
phase: 52-preop-hc-form-chip-catalogs
source: [52-01-SUMMARY.md, 52-02-SUMMARY.md, 52-03-SUMMARY.md, 52-04-SUMMARY.md, 52-05-SUMMARY.md, 52-06-SUMMARY.md, 52-07-SUMMARY.md]
started: 2026-06-26T13:52:52Z
updated: 2026-06-26T18:00:00Z
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
reported: "Me aparece la opcion pero me da como un error al querer enviar y me dice direccion no encontrada o algo asi"
severity: major

## Summary

total: 13
passed: 12
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Sending the portal link by email delivers it to the patient's address and reports success"
  status: resolved
  resolution: "Closed by gap-closure plan 52-08 (+ CR-01 hardening). The email path is decoupled from link regeneration: the frontend passes the URL it already holds; the controller validates it (esPortalUrlValida — same-origin + UUID path + no query/fragment) and sends the canonical URL via portalEmail.enviarLinkPortal. No-recipient now returns motivo:'sin_destinatario' with a banner that prompts for an email instead of blaming the address. See 52-VERIFICATION.md gap-closure section. Remaining: live SMTP delivery is a human check."
  reason: "User reported: Me aparece la opcion pero me da como un error al querer enviar y me dice direccion no encontrada o algo asi"
  severity: major
  test: 13
  root_cause: "Email-send endpoint re-calls idempotent generarPortalLink, which returns url:null once a token exists, so the controller short-circuits to {enviado:false} BEFORE ever sending — nodemailer is never called. The 'dirección' wording is the frontend's own generic error banner ('Verificá la dirección'), not an SMTP/address error. Structurally unreachable: the email UI only renders after a link is generated, so portalToken always exists by then and the second generarPortalLink call always returns url:null."
  artifacts:
    - path: "backend/src/modules/pacientes/pacientes.controller.ts"
      issue: "Lines 258-262: re-calls idempotent generarPortalLink and returns {enviado:false} when url is null, before reaching portalEmail.enviarLinkPortal"
    - path: "backend/src/modules/pacientes/pacientes.service.ts"
      issue: "Lines 1025-1048: generarPortalLink is idempotent and the raw UUID is never persisted (D-12), so the URL is unrecoverable on any call after the first"
    - path: "frontend/src/components/live-turno/tabs/hc/SharePortalPanel.tsx"
      issue: "Lines 255-259: misleading 'Verificá la dirección' banner shown whenever enviado===false"
  missing:
    - "Decouple email sending from link regeneration: frontend passes the url it already holds to the email endpoint; controller sends that url (after setEmailSiFalta + email validation) instead of re-deriving it"
    - "Distinguish enviado:false due to not-sent (url null) from a genuine address/SMTP failure so the banner stops blaming the address"
  debug_session: ".planning/debug/portal-link-email-direccion-no-encontrada.md"
