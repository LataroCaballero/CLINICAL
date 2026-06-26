---
status: resolved
trigger: "UAT Test 13 — portal-link email send fails with 'dirección no encontrada o algo así' after link already generated"
created: 2026-06-26T00:00:00Z
updated: 2026-06-26T18:00:00Z
resolution: "Fixed by gap-closure plan 52-08 + CR-01 hardening. Root cause confirmed: email-send endpoint re-derived the URL via idempotent generarPortalLink (url:null once a token exists). Fix: frontend passes the held URL; controller validates and sends the canonical URL. See .planning/phases/52-preop-hc-form-chip-catalogs/52-VERIFICATION.md."
---

## Current Focus

hypothesis: CONFIRMED — email endpoint re-calls generarPortalLink, which is idempotent and returns url:null once a token exists, so endpoint short-circuits to { enviado:false } and the email is never sent. Frontend surfaces this as the generic "No se pudo enviar el email. Verificá la dirección..." banner (the word "dirección" = user's "dirección no encontrada").
test: read full data flow across controller, service, hook, panel
expecting: url:null on second generarPortalLink call → enviado:false → frontend error banner
next_action: report diagnosis (goal: find_root_cause_only, do not fix)

## Symptoms

expected: Clicking "Enviar link por email" emails the portal link to the patient and shows success.
actual: Throws/shows an error mentioning "dirección no encontrada o algo así". Email never sent.
errors: Frontend banner: "No se pudo enviar el email. Verificá la dirección e intenta nuevamente."
reproduction: 1) Open Compartir link in PREOPERATORIO. 2) Generate portal link (Test 12). 3) Click Enviar link por email (Test 13). 4) Error.
started: Always — feature is structurally unreachable in success state.

## Eliminated

- hypothesis: nodemailer "No recipients defined" because to=undefined/empty
  evidence: Code never reaches enviarLinkPortal — it returns { enviado:false } at controller line 261 before the send. The "address" wording comes from the frontend banner, not nodemailer.
  timestamp: 2026-06-26

- hypothesis: SMTP misconfiguration
  evidence: Email UI only renders when smtpConfigured=true; user confirmed the option appeared. isSmtpConfigured passes.
  timestamp: 2026-06-26

- hypothesis: Frontend fails to pass the typed email
  evidence: SharePortalPanel lines 75-82 correctly pass emailToSend. Not the cause; the send is short-circuited server-side regardless.
  timestamp: 2026-06-26

## Evidence

- checked: controller enviarPortalLinkEmail (pacientes.controller.ts:249-280)
  found: Line 258 re-calls generarPortalLink(id); line 259-262 returns { enviado:false } when url is null. Send code below never runs.
  implication: Whenever a token already exists, email is never sent.

- checked: service generarPortalLink (pacientes.service.ts:1016-1049)
  found: If paciente.portalToken exists, returns { url:null, alreadyGenerated:true } (D-12). Raw UUID never persisted, only SHA-256 hash — URL is unrecoverable on subsequent calls.
  implication: Second call can never produce a URL to email.

- checked: SharePortalPanel render gating (SharePortalPanel.tsx:97-128, 206-261)
  found: Email section only renders inside the `url` available branch — i.e., AFTER a link is generated. So a token always exists by the time the email button is reachable.
  implication: The email path is deterministically unreachable in success; 100% reproducible deadlock.

- checked: frontend error surfacing (SharePortalPanel.tsx:83-91, 255-259)
  found: enviado:false → setEmailError(true) → banner "No se pudo enviar el email. Verificá la dirección e intenta nuevamente."
  implication: The word "dirección" matches the user's paraphrase "dirección no encontrada". This is the app's own banner, not a real SMTP address error.

## Resolution

root_cause: The email-send endpoint depends on generarPortalLink to obtain the URL, but that method is idempotent (D-12): once a portalToken exists it returns url:null and the raw UUID is never persisted, so the URL cannot be reconstructed. Because the UI only exposes the email button after the link is generated, every email attempt hits the already-generated path → controller returns { enviado:false } at pacientes.controller.ts:259-262 without sending → frontend shows the generic "Verificá la dirección" error.
fix: NOT APPLIED (diagnose-only)
verification: n/a
files_changed: []
