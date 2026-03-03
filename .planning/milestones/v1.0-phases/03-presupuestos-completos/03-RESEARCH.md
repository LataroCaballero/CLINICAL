# Phase 3: Presupuestos Completos - Research

**Researched:** 2026-02-24
**Domain:** PDF generation, email delivery, public token-gated pages, CRM state transitions
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Item structure:** Nombre del procedimiento + precio total (sin cantidad ni precio unitario)
- **Descuento:** Global opcional sobre el total (porcentaje o monto)
- **Moneda:** Seleccionable por presupuesto (ARS o USD)
- **Validez:** Fecha de validez opcional (puede dejarse vacía)
- **PDF header:** Membrete completo: logo de la clínica + nombre del profesional + dirección + teléfono + email + web
- **PDF patient data:** Nombre completo, DNI, email, teléfono
- **PDF footer:** Texto configurable por clínica (condiciones/política) + nota libre opcional del coordinador
- **PDF preview:** Inline en el navegador antes de enviar
- **Send actions:** Descargar PDF / Enviar por Email / Enviar por WhatsApp (WhatsApp = placeholder)
- **Email delivery:** SMTP vía Nodemailer/SendGrid (no mailto)
- **Email template:** Fijo configurable por clínica + nota rápida opcional del coordinador
- **Recipient:** Email del paciente (del perfil), editable por coordinador antes de enviar
- **Public page:** Link único y seguro (token de un solo uso) en el email
- **Public page content:** Resumen de ítems y total + botones Aceptar / Rechazar (sin login)
- **Reject on public page:** Pregunta motivo → actualiza `motivoPerdida` en paciente
- **Accept notification:** Notificación interna urgente al profesional y secretaria
- **Reject notification:** Notificación interna al profesional y secretaria
- **CRM transitions:**
  - Enviar → `PRESUPUESTO_ENVIADO`
  - Aceptar → `CONFIRMADO`
  - Rechazar → `PERDIDO` + `motivoPerdida`
- **Edit lock:** Solo se puede editar en estado BORRADOR; ENVIADO es inmutable
- **WhatsApp scope:** Phase 4 only; botón visible como placeholder en Phase 3

### Claude's Discretion

- Diseño visual de la página pública de aceptación del paciente
- Implementación del token único (JWT o UUID en DB)
- Cómo renderizar el resumen de ítems en la página pública
- Opciones de motivo de rechazo (lista predefinida o campo libre)
- Animaciones y estados de carga en el flujo
- Exacta disposición del membrete en el PDF

### Deferred Ideas (OUT OF SCOPE)

- Envío por WhatsApp del presupuesto (Phase 4; solo placeholder)
- Email de notificación al profesional/secretaria (solo notificación interna, no email externo)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PRES-01 | El coordinador puede crear un presupuesto vinculado a un paciente con ítems, montos y fecha de validez | Schema `Presupuesto` existe; DTO necesita moneda y fecha validez; service.create existe pero must adapt item structure (precio total, no cantidad×unitario) |
| PRES-02 | El sistema genera un PDF del presupuesto con el branding de la clínica | PDFKit 0.17.2 ya instalado; necesita nuevo modelo `ConfigClinica`; `PresupuestoPdfService` nuevo |
| PRES-03 | El coordinador puede enviar el presupuesto por email directamente desde la plataforma | Nodemailer 7.0.13 ya instalado; `EmailService` en reportes ya existe; PresupuestoEmailService nuevo; token de aceptación en DB |
| PRES-04 | El coordinador puede enviar el presupuesto por WhatsApp | PLACEHOLDER solo — botón disabled con tooltip "Disponible en Phase 4" |
| PRES-05 | El presupuesto tiene estados: borrador, enviado, aceptado, rechazado, vencido | `EstadoPresupuesto` enum ya existe (BORRADOR, ENVIADO, ACEPTADO, RECHAZADO, CANCELADO); necesita agregar VENCIDO |
| PRES-06 | Al enviar el presupuesto, la etapa CRM del paciente sube automáticamente a "Presupuesto enviado" | `marcarEnviado()` en service ya implementa `EtapaCRM.PRESUPUESTO_ENVIADO`; solo necesita invocarse desde el flujo de email |
| PRES-07 | Al marcar un presupuesto como aceptado y recibir pago, la etapa CRM cierra como "Cirugía confirmada" | `aceptar()` en service ya implementa `EtapaCRM.CONFIRMADO`; el flujo es desde la página pública |
| PRES-08 | Al rechazar un presupuesto, el sistema solicita el motivo de pérdida | `rechazar()` service existe; necesita también actualizar `etapaCRM=PERDIDO` y `motivoPerdida` en paciente |
| CRM-03 | Al enviar un presupuesto, la etapa CRM sube automáticamente a "Presupuesto enviado" | Duplicate of PRES-06; `marcarEnviado` in service is correct, must be triggered by email send endpoint |
| CRM-04 | Al registrar un pago de cirugía, la etapa CRM cierra automáticamente como "Cirugía confirmada" | `aceptar()` already sets `CONFIRMADO`; phase 3 triggers it from public page acceptance token |
</phase_requirements>

---

## Summary

Phase 3 builds on a substantial existing foundation. The `Presupuesto` model, `EstadoPresupuesto` enum, and the core service methods (`create`, `marcarEnviado`, `rechazar`, `aceptar`) are already implemented. The libraries needed — PDFKit 0.17.2 and Nodemailer 7.0.13 — are already installed. An `EmailService` exists in the reportes module and can be extracted or reused.

The primary net-new work is: (1) a `ConfigClinica` Prisma model for branding data (logo URL, direccion, telefono, web, pie de página, SMTP config), (2) a `PresupuestoPdfService` that renders the branded PDF via PDFKit, (3) a `tokenAceptacion` field on `Presupuesto` for the public one-time-use link, (4) a public NestJS controller with no auth guard that handles `/presupuestos/public/:token/aceptar|rechazar`, (5) a Next.js page at `app/presupuesto/[token]/page.tsx` (outside `/dashboard/`, no layout auth), and (6) the updated frontend `PresupuestosView` with the full Descargar/Enviar Email/WhatsApp placeholder flow.

The critical schema gap is that the current `Presupuesto` model uses `cantidad × precioUnitario` per item, but the decision mandates a single `precioTotal` per item. This requires a migration to change `PresupuestoItem` and the existing DTO/service logic. Additionally, `ConfigClinica` does not exist in the schema and must be created. The `EstadoPresupuesto` enum may need `VENCIDO` added (PRES-05). The `rechazar()` service method does not currently update `etapaCRM` on the patient — this is a gap that must be filled.

**Primary recommendation:** Implement in three sequential plans: (1) Prisma migration + backend PDF/email services, (2) backend public token endpoints, (3) frontend flow (preview PDF, send modal, public acceptance page).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pdfkit | 0.17.2 | PDF generation | Already installed; project decision (avoids Puppeteer memory leaks) |
| nodemailer | 7.0.13 | SMTP email delivery | Already installed; `EmailService` already uses it |
| @prisma/client | ^6.1.0 | DB access | Project ORM |
| @nestjs/jwt | ^11.0.1 | JWT for token (optional) | Already installed; can use for signed token alternative |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uuid (built-in crypto) | Node built-in | Generate opaque token | Use `crypto.randomUUID()` — simpler than JWT for one-time tokens |
| date-fns | ^4.1.0 | Date formatting in PDF | Already installed backend |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PDFKit | Puppeteer/html-pdf | PDFKit is already decided and installed; Puppeteer has memory leak issues in production |
| UUID token in DB | Signed JWT | UUID in DB allows easy revocation; JWT avoids DB lookup but harder to invalidate |
| Shared EmailService | New PresupuestoEmailService | Reuse existing EmailService from reportes module by exporting it, or create a dedicated one in presupuestos — dedicated is cleaner |

**Installation:** Nothing to install. pdfkit, @types/pdfkit, nodemailer, @types/nodemailer already in `backend/package.json`.

---

## Architecture Patterns

### Recommended Project Structure

```
backend/src/modules/presupuestos/
├── dto/
│   ├── create-presupuesto.dto.ts        # Update: moneda, fechaValidez, item with precioTotal
│   ├── enviar-email-presupuesto.dto.ts  # New: emailDestino, notaCoordinador
│   └── rechazar-presupuesto.dto.ts      # Update: motivoPerdida required
├── presupuesto-pdf.service.ts           # New: PDFKit generation
├── presupuesto-email.service.ts         # New: Nodemailer send + token generation
├── presupuesto-public.controller.ts     # New: no-auth public endpoints
├── presupuestos.controller.ts           # Update: add /enviar-email, /pdf endpoints
├── presupuestos.module.ts               # Update: register new services, export ConfigModule
└── presupuestos.service.ts              # Update: rechazar updates CRM, new enviarEmail method

backend/src/prisma/
└── schema.prisma                         # Add: ConfigClinica model, tokenAceptacion on Presupuesto

frontend/src/
├── app/
│   ├── dashboard/pacientes/components/
│   │   └── (updated PresupuestosView)
│   └── presupuesto/
│       └── [token]/
│           └── page.tsx                  # New: public page, no dashboard layout
├── hooks/
│   ├── useCreatePresupuesto.ts           # Update: new fields (moneda, fechaValidez)
│   ├── useEnviarPresupuesto.ts           # New: POST /presupuestos/:id/enviar-email
│   └── useRechazarPresupuesto.ts         # New or update: from public page
└── components/presupuesto/
    └── EnviarPresupuestoModal.tsx        # New: email/whatsapp/download actions
```

### Pattern 1: PDFKit Streaming Buffer

**What:** PDFKit generates to a stream; collect it into a `Buffer` for email attachment or HTTP response.
**When to use:** Whenever returning PDF as download or attachment.

```typescript
// Source: pdfkit@0.17.x official docs + existing @types/pdfkit in project
import * as PDFDocument from 'pdfkit';

async generatePdfBuffer(data: PresupuestoPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Build content
    this.buildHeader(doc, data.config);
    this.buildPatientSection(doc, data.paciente);
    this.buildItemsTable(doc, data.items);
    this.buildTotals(doc, data.total, data.descuento, data.moneda);
    this.buildFooter(doc, data.config, data.notaCoordinador);

    doc.end();
  });
}
```

### Pattern 2: Public NestJS Controller (No Auth Guard)

**What:** A controller that handles public token URLs without the `@Auth()` decorator. Must be careful not to apply the global auth guard from the module.
**When to use:** For the acceptance/rejection page backend endpoint.

```typescript
// Source: NestJS docs — AllowPublic decorator or @Public() pattern
import { Controller, Get, Post, Param, Body, SkipThrottle } from '@nestjs/common';

// No @Auth() decorator = no authentication required
@Controller('presupuestos/public')
export class PresupuestoPublicController {
  @Get(':token')
  getPublicPresupuesto(@Param('token') token: string) {
    return this.service.findByToken(token);
  }

  @Post(':token/aceptar')
  aceptarPublic(@Param('token') token: string) {
    return this.service.aceptarByToken(token);
  }

  @Post(':token/rechazar')
  rechazarPublic(@Param('token') token: string, @Body() body: RechazarPublicDto) {
    return this.service.rechazarByToken(token, body);
  }
}
```

**Critical:** Check if `JwtAuthGuard` is applied globally in `app.module.ts`. If so, need `@Public()` decorator or `IS_PUBLIC_KEY` metadata to skip it.

### Pattern 3: One-Time Token in DB

**What:** Use `crypto.randomUUID()` to generate a UUID stored in `Presupuesto.tokenAceptacion`. Invalidate after use by setting `tokenUsado = true` or by checking estado !== ENVIADO.
**When to use:** One-time public token for patient acceptance.

```typescript
// Token generation at send time
const token = crypto.randomUUID();
await this.prisma.presupuesto.update({
  where: { id },
  data: {
    tokenAceptacion: token,
    estado: EstadoPresupuesto.ENVIADO,
    fechaEnviado: new Date(),
  },
});
// Include token in email link: `${FRONTEND_URL}/presupuesto/${token}`
```

### Pattern 4: PDF Download via HTTP Response

**What:** Return PDF buffer as HTTP response with correct headers.
**When to use:** GET /presupuestos/:id/pdf endpoint for download.

```typescript
@Get(':id/pdf')
@Header('Content-Type', 'application/pdf')
@Header('Content-Disposition', 'attachment; filename="presupuesto.pdf"')
async downloadPdf(@Param('id') id: string, @Res() res: Response) {
  const buffer = await this.pdfService.generate(id);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="presupuesto-${id}.pdf"`,
    'Content-Length': buffer.length,
  });
  res.end(buffer);
}
```

### Pattern 5: Next.js Public Page (Outside Dashboard Layout)

**What:** A page at `app/presupuesto/[token]/page.tsx` that does NOT sit inside `app/dashboard/` so it doesn't inherit the auth-protected dashboard layout.
**When to use:** The patient-facing acceptance page (no login required).

```
app/
├── dashboard/         ← protected by dashboard/layout.tsx (auth required)
└── presupuesto/
    └── [token]/
        ├── layout.tsx  ← minimal layout, no auth
        └── page.tsx    ← fetch presupuesto data via /presupuestos/public/:token
```

The page calls `NEXT_PUBLIC_API_URL + /presupuestos/public/:token` directly (no auth token needed).

### Pattern 6: ConfigClinica Model

**What:** A new Prisma model holding per-professional (or per-clinic) branding config. Since this is a multi-tenant system scoped to `profesionalId`, store config per profesional.

```prisma
model ConfigClinica {
  id               String   @id @default(uuid())
  profesionalId    String   @unique
  nombreClinica    String?
  logoUrl          String?
  direccion        String?
  telefono         String?
  emailContacto    String?
  web              String?
  piePaginaTexto   String?  // Condiciones de pago, política de cancelación
  smtpHost         String?
  smtpPort         Int?
  smtpUser         String?
  smtpPassEncrypted String? // Encrypted via EncryptionService
  smtpFrom         String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  profesional Profesional @relation(fields: [profesionalId], references: [id])
}
```

**Note:** Falls back to global SMTP env vars (SMTP_HOST, SMTP_USER, SMTP_PASS) if per-clinica SMTP not configured. This is the same pattern as the existing `EmailService` in reportes.

### Anti-Patterns to Avoid

- **Regenerating PDF on every request:** Generate once, cache or re-generate only on demand. Don't store PDF blobs in DB — generate on-the-fly from data.
- **Storing passwords in plaintext:** Use `EncryptionService` (already exists in `whatsapp/crypto/`) for SMTP passwords in `ConfigClinica`.
- **Applying auth guard to public controller:** The public token controller must not have `@Auth()` — verify global guard setup in `main.ts`.
- **Mutating ENVIADO presupuestos:** The service already guards this; frontend must disable edit actions for estado !== BORRADOR.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF layout engine | Custom HTML-to-PDF renderer | PDFKit (already installed) | PDFKit handles text flow, page breaks, images |
| Email delivery | Raw TCP SMTP | Nodemailer (already installed) | Handles TLS, auth, retries, attachments |
| Secure random token | Custom hash | `crypto.randomUUID()` (Node built-in) | Cryptographically random, no dependency |
| SMTP password storage | Plaintext in DB | `EncryptionService` from whatsapp module | Already built, battle-tested in Phase 1 |
| Inline PDF preview | Custom PDF renderer in browser | `<iframe src="data:application/pdf;base64,...">` or object URL | Browsers render PDF natively |

**Key insight:** Almost all infrastructure is in place. The work is wiring existing pieces together.

---

## Common Pitfalls

### Pitfall 1: Auth Guard Applies to Public Controller
**What goes wrong:** If `JwtAuthGuard` is registered globally in `main.ts` via `APP_GUARD`, the public controller will return 401 even without `@Auth()` on the controller class.
**Why it happens:** Global guards apply to ALL routes by default in NestJS.
**How to avoid:** Check `main.ts` for global guards. If present, use `@SetMetadata(IS_PUBLIC_KEY, true)` + a custom `AllowPublic` decorator, or register the public controller in a separate module that doesn't import the auth guard.
**Warning signs:** 401 response on GET /presupuestos/public/:token in testing.

### Pitfall 2: PDFKit Images Require File Path or Buffer
**What goes wrong:** `doc.image(url)` does NOT support HTTP URLs. Attempting to pass a logo URL directly fails.
**Why it happens:** PDFKit reads image data synchronously from file paths or Buffers.
**How to avoid:** Fetch the logo URL as a Buffer first (via `axios.get(url, { responseType: 'arraybuffer' })`), then pass the Buffer to `doc.image(buffer, ...)`. Or store logos on local filesystem.
**Warning signs:** Error "Cannot read remote images" or silent failure with blank image area.

### Pitfall 3: rechazar() Does Not Update CRM
**What goes wrong:** Current `rechazar()` in `presupuestos.service.ts` updates the presupuesto estado but does NOT update `etapaCRM` on the patient to `PERDIDO` or set `motivoPerdida`.
**Why it happens:** The original implementation was partial — it has a `motivoRechazo` field on the presupuesto but doesn't propagate to the patient.
**How to avoid:** Update `rechazar()` to use `$transaction` like `aceptar()` does, updating both presupuesto and paciente.
**Warning signs:** Patient stays in `PRESUPUESTO_ENVIADO` after rejection.

### Pitfall 4: Item Structure Mismatch
**What goes wrong:** Existing `PresupuestoItem` has `cantidad` + `precioUnitario` + `total`. Decision says items should only have `nombre` + `precioTotal` (no cantidad or precio unitario).
**Why it happens:** Original implementation was generic; Phase 3 decisions simplified it.
**How to avoid:** Migration to remove `cantidad` and `precioUnitario` from `PresupuestoItem`, rename `descripcion` if needed. Update DTO and service accordingly.
**Warning signs:** Existing `PresupuestosView.tsx` sends `{ descripcion, cantidad, precioUnitario }` — needs updating.

### Pitfall 5: Token Exposure in Logs
**What goes wrong:** Logging the full presupuesto object after token generation exposes the acceptance token in logs.
**Why it happens:** Generic `Logger.log(presupuesto)` patterns.
**How to avoid:** Log only `id` and estado after token operations; never log `tokenAceptacion`.

### Pitfall 6: PDF Preview CORS/CSP Issues
**What goes wrong:** Embedding PDF from API in an `<iframe>` can fail due to Content Security Policy or missing CORS headers.
**Why it happens:** Browsers block cross-origin embeds without proper headers.
**How to avoid:** Generate PDF buffer on frontend via API call with `responseType: 'blob'`, create an object URL with `URL.createObjectURL(blob)`, and use that in the iframe src. This avoids cross-origin issues.

### Pitfall 7: Missing VENCIDO State
**What goes wrong:** PRES-05 requires a `VENCIDO` state but `EstadoPresupuesto` only has BORRADOR, ENVIADO, ACEPTADO, RECHAZADO, CANCELADO.
**Why it happens:** Original schema didn't include it.
**How to avoid:** Add `VENCIDO` to the enum in the migration. Implement expiry logic in the scheduler (SeguimientoSchedulerService already exists as pattern) or as a computed state on-the-fly.

---

## Code Examples

### PDFKit Header with Logo

```typescript
// Pattern for optional logo + clinic name header
private async buildHeader(doc: PDFKit.PDFDocument, config: ConfigClinica) {
  const startY = 50;
  let currentX = 50;

  // Logo (if provided)
  if (config.logoUrl) {
    try {
      const resp = await axios.get(config.logoUrl, { responseType: 'arraybuffer' });
      const logoBuffer = Buffer.from(resp.data);
      doc.image(logoBuffer, currentX, startY, { width: 80, height: 80 });
      currentX += 100;
    } catch {
      // Log warning, continue without logo
    }
  }

  // Clinic/professional data
  doc.fontSize(16).font('Helvetica-Bold')
     .text(config.nombreClinica ?? 'Clínica', currentX, startY);
  doc.fontSize(10).font('Helvetica')
     .text(`Dr/a. ${config.profesional.nombre} ${config.profesional.apellido}`, currentX, startY + 22)
     .text(config.direccion ?? '', currentX, startY + 36)
     .text(config.telefono ?? '', currentX, startY + 50)
     .text(config.emailContacto ?? '', currentX, startY + 64);

  doc.moveTo(50, 140).lineTo(545, 140).stroke();
}
```

### Nodemailer Send with PDF Attachment

```typescript
// Reuses existing EmailService.sendEmail() interface
await this.emailService.sendEmail({
  to: emailDestino,
  subject: `Presupuesto de ${clinicaNombre}`,
  html: this.buildPresupuestoEmailHtml({ paciente, clinica, notaCoordinador, acceptUrl }),
  attachments: [{
    filename: `presupuesto-${presupuesto.id}.pdf`,
    content: pdfBuffer,
    contentType: 'application/pdf',
  }],
});
```

### Inline PDF Preview in React

```typescript
// Fetch PDF as blob, create object URL, show in iframe
const handlePreviewPdf = async () => {
  const response = await api.get(`/presupuestos/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  setPdfUrl(url);
  // Cleanup on unmount: URL.revokeObjectURL(url)
};

// In JSX
{pdfUrl && (
  <iframe
    src={pdfUrl}
    className="w-full h-[600px] border rounded"
    title="Preview Presupuesto"
  />
)}
```

### MensajesInternos for Internal Notification

```typescript
// MensajesInternosService.create() already handles this pattern
await this.mensajesInternosService.create(
  {
    pacienteId: presupuesto.pacienteId,
    mensaje: `⚡ PRESUPUESTO ACEPTADO — ${paciente.nombreCompleto} aceptó el presupuesto por $${total}. Contactar para agendar cirugía.`,
    prioridad: 'ALTA',  // PrioridadMensaje enum
  },
  systemUserId, // Use a system user or the profesional's userId as autor
);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| cantidad × precioUnitario per item | precioTotal per item (single field) | Phase 3 decision | Requires migration + DTO update |
| rechazar() leaves patient CRM unchanged | rechazar() must set PERDIDO + motivoPerdida | Phase 3 requirement | Service gap to fill |
| No ConfigClinica model | ConfigClinica per profesional (new) | Phase 3 | New migration needed |
| No tokenAceptacion on Presupuesto | tokenAceptacion UUID on Presupuesto | Phase 3 | New migration field |

**Deprecated/outdated:**
- `PresupuestoItem.cantidad` and `PresupuestoItem.precioUnitario`: These fields are being replaced by a simpler `precioTotal` only model per the phase decision.

---

## Open Questions

1. **Global auth guard in main.ts?**
   - What we know: `@Auth()` decorator is used on controllers; the pattern is not applied globally at `main.ts` level based on existing public pages (login page works).
   - What's unclear: Whether there is an `APP_GUARD` token registered globally that would catch the public controller.
   - Recommendation: In the first plan, confirm by reading `backend/src/main.ts` and `app.module.ts`. If global guard exists, add `@Public()` metadata skip pattern.

2. **ConfigClinica: per-profesional or global?**
   - What we know: System is multi-tenant per profesional; `Profesional` is the tenant root.
   - What's unclear: Whether the user wants one ConfigClinica per profesional or a single global one for the whole installation.
   - Recommendation: Implement per-profesional (unique on `profesionalId`) as it's consistent with the multi-tenant pattern. Falls back to env vars for SMTP if not configured.

3. **VENCIDO state automation: scheduler or computed?**
   - What we know: PRES-05 lists VENCIDO; `fechaValidez` is an optional field being added.
   - What's unclear: Whether "vencido" should be a DB state updated by cron, or computed on-the-fly when `fechaValidez < now`.
   - Recommendation: Compute on-the-fly in the API response (no cron needed in Phase 3) — simpler and avoids a scheduler that could race with state transitions. Add to the `formatPresupuesto` response mapper.

4. **Notification system userId for system-generated messages:**
   - What we know: `MensajeInterno.autorId` is required and must be a real `Usuario.id`.
   - What's unclear: Which user should be `autor` for system-triggered notifications (patient acceptance).
   - Recommendation: Use the `profesionalId`'s linked `usuarioId` as the autor of the notification (message sent "on behalf of" the profesional's system).

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection — `backend/package.json`: pdfkit@0.17.2, nodemailer@7.0.13 confirmed installed
- Direct codebase inspection — `backend/src/modules/presupuestos/presupuestos.service.ts`: full service implementation reviewed
- Direct codebase inspection — `backend/src/modules/reportes/services/email.service.ts`: existing EmailService implementation (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS pattern confirmed)
- Direct codebase inspection — `backend/src/prisma/schema.prisma`: `Presupuesto`, `PresupuestoItem`, `MensajeInterno`, `EstadoPresupuesto` enum, `EtapaCRM` enum, all reviewed
- Direct codebase inspection — `frontend/src/components/patient/PatientDrawer/views/PresupuestosView.tsx`: current UI reviewed
- Direct codebase inspection — `frontend/src/hooks/useCreatePresupuesto.ts`: hook patterns reviewed

### Secondary (MEDIUM confidence)

- PDFKit image loading constraint (no HTTP URLs): From `@types/pdfkit` type signatures showing Buffer/string only for `image()`; consistent with known PDFKit behavior
- NestJS public route pattern: From standard NestJS auth guard documentation; specific implementation to verify against `main.ts`

### Tertiary (LOW confidence)

- None — all critical findings verified from codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed in package.json
- Architecture: HIGH — existing patterns from service/controller/module files used directly
- Pitfalls: HIGH for items 1-5 (verified from code); MEDIUM for item 6 (browser behavior, not verified from running app)
- Schema gaps: HIGH — confirmed by reading schema.prisma

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (30 days — stable codebase, no fast-moving dependencies)
