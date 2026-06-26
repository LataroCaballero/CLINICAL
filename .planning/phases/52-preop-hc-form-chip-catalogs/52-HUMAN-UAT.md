---
status: partial
phase: 52-preop-hc-form-chip-catalogs
source: [52-VERIFICATION.md]
started: 2026-06-26T20:10:00Z
updated: 2026-06-26T20:10:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Visual: 'Pre Quirúrgico' renderiza el formulario seccionado
expected: Tres secciones de chips (Antecedentes/Alergias/Medicación), checklist de estudios, check de consentimiento y sección Compartir link — sin textarea libre
result: [pending]

### 2. Pre-carga de chips desde el perfil del paciente
expected: Condiciones/alergias preexistentes aparecen como chips pre-seleccionados (sólidos) al abrir el form; los que no están en el catálogo aparecen como chips punteados
result: [pending]

### 3. Flujo "Otro" Enter→chip + aprendizaje
expected: El nuevo valor aparece como chip punteado al instante; al guardar se persiste en el catálogo del profesional y aparece sólido en la próxima apertura
result: [pending]

### 4. SharePortalPanel: render del QR
expected: Se muestra un QR escaneable que codifica la URL del portal
result: [pending]

### 5. SharePortalPanel: botón WhatsApp
expected: Click en 'WhatsApp' abre wa.me con la URL en el parámetro de texto
result: [pending]

### 6. Envío de email (SMTP configurado, paciente sin email)
expected: Aparece el input de email, el profesional puede ingresarlo, el botón dispara el envío; en éxito muestra 'Email enviado correctamente'
result: [pending]

### 7. Re-test UAT Test 13 (Gap B): paciente con link previo
expected: El panel muestra la url existente con botones Copiar/WhatsApp/QR inmediatamente tras el spinner acotado — sin pantalla de Generar atascada ni spinner muerto. Visible la nota 'Este paciente ya tenía un link generado — se muestra el mismo link estable.'
result: [pending]

### 8. Re-test UAT Test 13 (Gap B): idempotencia entre sesiones
expected: Tras generar un link, recargar la página y reabrir SharePortalPanel sigue mostrando la misma url estable (no la pantalla de Generar). El backend recupera la url descifrando portalTokenCifrado (AES-256-GCM con ENCRYPTION_KEY)
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps
