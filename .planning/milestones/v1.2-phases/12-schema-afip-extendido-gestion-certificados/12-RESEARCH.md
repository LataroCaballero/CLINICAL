# Phase 12: Schema AFIP Extendido + Gestión de Certificados - Research

**Researched:** 2026-03-16
**Domain:** Prisma schema extension + NestJS CRUD + X.509 cert management + NestJS ScheduleModule
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- CUIT is extracted automatically from the cert CN by the backend — no manual CUIT entry field in the form
- ConfiguracionAFIP.cuit is populated from the CN extracted value and is the source of truth
- There is no existing CUIT field on Profesional to compare against — ConfiguracionAFIP is the sole owner
- After the Admin submits the form, a **preview modal** appears showing: extracted CUIT, cert expiry date, and selected ambiente — Admin confirms before anything is saved
- ptoVta validation via FEParamGetPtosVenta happens inside the same save request (not a separate step)
- If FEParamGetPtosVenta fails (AFIP unavailable): return error to the user — do NOT save without validation. Admin must retry.
- Two textareas: one for PEM certificate content (`-----BEGIN CERTIFICATE-----...`) and one for private key content
- Same pattern as WhatsappConfigTab (text inputs, not file inputs)
- Edit mode: textareas are always empty — cert/key content is never returned to the client for security
- After successful save: form hides and a status view appears showing: CUIT, ptoVta, ambiente, cert expiry date, and status badge. "Actualizar certificado" button to re-enter edit mode.
- New tab **"AFIP"** added to `/dashboard/configuracion` — follows exact WhatsappConfigTab pattern
- Tab is visible to both **ADMIN and PROFESIONAL** roles (each manages their own cert via profesionalId from JWT)
- The AFIP tab has two separate sections: (1) Certificado section with textareas + preview modal, (2) Configuración de facturación section with ptoVta + ambiente, updateable independently without re-uploading the cert (triggers FEParamGetPtosVenta re-validation on save)
- Badge is only shown if a `ConfiguracionAFIP` exists for the selected profesionalId — no badge when unconfigured
- Badge states: verde = OK, amarillo = venciendo pronto (≤30 days to expiry), rojo = vencido
- Badge is **visual only** for the Facturador role — not clickeable, no link to configuration
- Daily cron job using **NestJS ScheduleModule (@Cron)** — not BullMQ
- Sends email to the Admin at 60 days and 30 days before cert expiry
- Uses existing email infrastructure (ConfigClinica.smtpHost or env-level SMTP)

### Claude's Discretion

- Exact Prisma migration name and structure for the extended schema
- Module placement for ConfiguracionAFIP backend logic (new module vs extending finanzas/afip)
- Email template copy for expiry alerts
- Exact error messages for FEParamGetPtosVenta failures
- How to parse PEM CN in Node.js (node-forge already planned for Phase 13 — can use same lib or built-in `crypto.X509Certificate`)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AFIP-01 | Sistema puede almacenar y recuperar el schema AFIP extendido: `ConfiguracionAFIP` (cert+key AES-256-GCM por tenant, cuit, ptoVta, ambiente, certExpiresAt), campos `cae`/`caeFchVto`/`nroComprobante`/`qrData`/`ptoVta` en `Factura`, modelo `CaeaVigente`, enum `EstadoFactura.CAEA_PENDIENTE_INFORMAR` | Schema design section + migration pattern below |
| CERT-01 | Admin puede subir certificado digital y clave privada con validación automática — CUIT del cert CN coincide con el registrado, ptoVta es tipo RECE verificado via `FEParamGetPtosVenta` | `crypto.X509Certificate` CN extraction + FEParamGetPtosVenta SOAP call pattern |
| CERT-02 | Admin puede configurar ambiente (HOMO/PROD), punto de venta, y ver estado del certificado en pantalla dedicada | AfipConfigTab UI + three backend endpoints (GET status, POST cert, PATCH billing) |
| CERT-03 | Sistema envía email al Admin 30 y 60 días antes del vencimiento del certificado | `@Cron` daily scheduler + `PresupuestoEmailService` nodemailer pattern (ConfigClinica SMTP with env fallback) |
| CERT-04 | Facturador ve badge de estado del certificado (OK / venciendo / no configurado) en su home | `GET /afip-config/status` + `Badge` component insertion in `facturador/page.tsx` |
</phase_requirements>

---

## Summary

Phase 12 is a schema extension and CRUD phase with no novel architectural risk. Every pattern it needs already exists in the codebase and can be followed directly. `ConfiguracionWABA` is the exact analog for `ConfiguracionAFIP`. `WhatsappConfigTab.tsx` is the exact UI analog for the new AFIP tab. `PresupuestoEmailService` is the exact analog for the cert-expiry email sender — it uses `nodemailer` directly with `ConfigClinica.smtpHost` falling back to `SMTP_*` env vars, which is exactly the pattern CERT-03 needs.

The only external AFIP call in this phase is `FEParamGetPtosVenta` for ptoVta type validation. This is a SOAP 1.1 call using the raw `axios` pattern already documented in `AFIP-INTEGRATION.md`. Because this call requires a valid Access Ticket from WSAA, the save endpoint must transiently use the uploaded cert+key (not yet persisted) to obtain a TA, call `FEParamGetPtosVenta`, validate the ptoVta type, and only then encrypt and persist. This is the most complex single operation in the phase but follows patterns already established in the codebase.

PEM CN extraction uses Node.js built-in `crypto.X509Certificate` (Node 15.6+, zero new dependencies). `@nestjs/schedule` is already installed at v6.1.0 and `ScheduleModule.forRoot()` is already registered in two existing modules — the `AfipConfigModule` must NOT register it again, just declare the `@Injectable()` scheduler class as a provider. The `ReportesModule.EmailService` is NOT exported and is env-var-only — use the `PresupuestoEmailService` nodemailer pattern directly for cert-expiry emails.

**Primary recommendation:** Create a new `AfipConfigModule`. Import `WhatsappModule` to obtain `EncryptionService`. Do not re-register `ScheduleModule.forRoot()`. Use the `PresupuestoEmailService` nodemailer pattern inline for CERT-03 expiry emails. One Prisma migration adds all new models and fields.

---

## Standard Stack

### Core (all already in project — zero new npm installs required)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `@nestjs/schedule` | `^6.1.0` | `@Cron` daily cert-expiry scheduler | Already in `backend/package.json`; `ScheduleModule.forRoot()` already registered in `ReportesModule` and `PacientesModule` |
| `crypto.X509Certificate` | Node built-in | Parse cert PEM, extract subject + notAfter | Available since Node 15.6; zero new dependencies |
| `axios` | Existing | Raw SOAP calls to WSAA + WSFEv1 (FEParamGetPtosVenta) | Already used throughout backend |
| `nodemailer` | Existing | Cert-expiry alert emails | Already used in `PresupuestoEmailService` and `reportes/EmailService` |
| `EncryptionService` | Existing | AES-256-GCM encrypt/decrypt for certPem + keyPem | Lives in `WhatsappModule`, exported from it |
| Prisma | Existing | Schema migration + ORM | Project standard |

### Supporting Frontend Libraries (all already installed)

| Library | Purpose |
|---------|---------|
| `@tanstack/react-query` | `useQuery` / `useMutation` for three new hooks |
| shadcn/ui `Badge`, `Tabs`, `Dialog`, `Textarea` | All present in `frontend/src/components/ui/` |
| `react-hook-form` + `zod` | Form validation in AfipConfigTab |

**No npm installs required for this phase.**

---

## Architecture Patterns

### Recommended Project Structure

```
backend/src/modules/afip-config/
├── afip-config.module.ts          # imports WhatsappModule; NO ScheduleModule.forRoot()
├── afip-config.controller.ts      # GET /afip-config/status, POST /afip-config/cert, PATCH /afip-config/billing
├── afip-config.service.ts         # CN extraction, WSAA+FEParamGetPtosVenta, encrypt+upsert, certStatus logic
├── cert-expiry.scheduler.ts       # @Injectable() with @Cron('0 8 * * *')
└── dto/
    ├── save-cert.dto.ts            # { certPem: string, keyPem: string, ptoVta: number, ambiente: AmbienteAFIP }
    ├── save-billing-config.dto.ts  # { ptoVta: number, ambiente: AmbienteAFIP }
    └── afip-config-status.dto.ts   # Response shape — NEVER includes encrypted fields

frontend/src/app/dashboard/configuracion/components/
└── AfipConfigTab.tsx               # Two sections: Certificado + Configuración de facturación

frontend/src/hooks/
├── useAfipConfig.ts                # GET /afip-config/status
├── useSaveCert.ts                  # POST /afip-config/cert (mutation)
└── useSaveBillingConfig.ts         # PATCH /afip-config/billing (mutation)
```

Add `AfipConfigModule` to the `imports` array in `AppModule`.

---

### Pattern 1: Prisma Schema — ConfiguracionAFIP Model

Direct analog to `ConfiguracionWABA` — same per-profesional singleton structure with `@unique` on profesionalId and encrypted sensitive fields.

```prisma
model ConfiguracionAFIP {
  id                String       @id @default(uuid())
  profesionalId     String       @unique
  cuit              String       // Extracted from cert CN at upload — source of truth
  certPemEncrypted  String       // AES-256-GCM: iv:authTag:ciphertext — NEVER return in API
  keyPemEncrypted   String       // AES-256-GCM: iv:authTag:ciphertext — NEVER return in API
  certExpiresAt     DateTime     // Parsed from cert notAfter at upload time
  ptoVta            Int          // Validated via FEParamGetPtosVenta at save time
  ambiente          AmbienteAFIP @default(HOMOLOGACION)
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  profesional       Profesional  @relation(fields: [profesionalId], references: [id])
}

enum AmbienteAFIP {
  HOMOLOGACION
  PRODUCCION
}
```

Add relation to `Profesional` model (after the existing `configuracionWABA ConfiguracionWABA?` line):

```prisma
  configuracionAFIP  ConfiguracionAFIP?
```

---

### Pattern 2: Prisma Schema — Extended Factura Fields

Add to the existing `Factura` model in the same migration. All fields nullable — Phase 14 populates them on real CAE emission.

```prisma
// Add inside model Factura { ... }
  cae              String?   // 14-digit CAE from AFIP (null until real emission in Phase 14)
  caeFchVto        String?   // CAE expiry 'YYYYMMDD'
  nroComprobante   Int?      // Sequential invoice number assigned at emission
  qrData           String?   // Full AFIP QR URL (Phase 15 renders this as a QR code)
  ptoVta           Int?      // Point of sale used for emission
```

Do NOT add `@unique` on `nroComprobante` alone. Uniqueness requires a composite `(profesionalId, ptoVta, cbteTipo, nroComprobante)` — that constraint belongs in Phase 14.

---

### Pattern 3: Prisma Schema — CaeaVigente Model and EstadoFactura Extension

```prisma
model CaeaVigente {
  id            String      @id @default(uuid())
  profesionalId String
  cuit          String
  caea          String      // The CAEA code from AFIP
  periodo       String      // 'YYYYMM'
  orden         Int         // 1 = first half (days 1–15), 2 = second half (days 16–end)
  fchVigDesde   String      // Period start 'YYYYMMDD'
  fchVigHasta   String      // Period end 'YYYYMMDD'
  fchTopeInf    String      // Last date to inform invoices under this CAEA 'YYYYMMDD'
  createdAt     DateTime    @default(now())
  profesional   Profesional @relation(fields: [profesionalId], references: [id])

  @@unique([profesionalId, periodo, orden])
  @@index([profesionalId, fchVigHasta])
}
```

Add relation to `Profesional` model:

```prisma
  caeaVigentes  CaeaVigente[]
```

Extend `EstadoFactura` enum (add one value to existing `EMITIDA`/`ANULADA`):

```prisma
enum EstadoFactura {
  EMITIDA
  ANULADA
  CAEA_PENDIENTE_INFORMAR  // Issued under CAEA contingency — must be informed to AFIP within 8 days
}
```

After `npx prisma generate`, search for exhaustive switch statements over `EstadoFactura` in the backend and add a handler for `CAEA_PENDIENTE_INFORMAR`. Most likely location: `finanzas.service.ts`.

---

### Pattern 4: X.509 CN Extraction — Node.js Built-in

```typescript
// Source: Node.js official crypto docs — crypto.X509Certificate (Node 15.6+)
// Location: afip-config.service.ts

import * as crypto from 'crypto';

interface CertInfo {
  cuit: string;
  expiresAt: Date;
}

extractCertInfo(certPem: string): CertInfo {
  let cert: crypto.X509Certificate;
  try {
    cert = new crypto.X509Certificate(certPem);
  } catch {
    throw new BadRequestException(
      'El certificado no es un PEM válido. Verificá que pegaste el bloque completo incluyendo -----BEGIN CERTIFICATE-----.',
    );
  }

  // AFIP issues certs with subject in these formats — handle both:
  //   "SERIALNUMBER=CUIT 20123456789\nCN=Nombre Apellido\nO=AFIP\nC=AR"
  //   "CN=20123456789\nO=AFIP\nC=AR"
  const subject = cert.subject;
  const cuitMatch =
    subject.match(/SERIALNUMBER=CUIT\s+(\d{11})/i) ||
    subject.match(/CN=(\d{11})/);

  if (!cuitMatch) {
    throw new BadRequestException(
      `No se pudo extraer el CUIT del certificado. Subject: "${subject}". ` +
      'Verificá que el certificado corresponda a uno emitido por AFIP para un CUIT argentino.',
    );
  }

  // cert.validTo is a string like "Mar 20 10:00:00 2028 GMT"
  return {
    cuit: cuitMatch[1],
    expiresAt: new Date(cert.validTo),
  };
}
```

---

### Pattern 5: FEParamGetPtosVenta SOAP Validation on Cert Save

The save-cert endpoint performs this sequence entirely in-memory (cert not yet persisted) before encrypting and writing to DB:

1. `extractCertInfo(certPem)` — CUIT + expiry
2. Build TRA XML → sign via `openssl smime -sign` subprocess (same as AFIP-INTEGRATION.md Section 2) → call WSAA → receive Access Ticket
3. Call `FEParamGetPtosVenta` with TA + CUIT
4. Parse response to confirm the requested `ptoVta` exists with `EmisionTipo = 'CAE'`
5. If valid: `encryption.encrypt(certPem)` + `encryption.encrypt(keyPem)` → upsert `ConfiguracionAFIP`

```typescript
// Source: AFIP-INTEGRATION.md Section 6

// Environment-aware endpoints
const WSAA_URL = ambiente === 'PRODUCCION'
  ? 'https://wsaa.afip.gov.ar/ws/services/LoginCms'
  : 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms';

const WSFEV1_URL = ambiente === 'PRODUCCION'
  ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx'
  : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx';

// FEParamGetPtosVenta SOAP envelope
const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FEParamGetPtosVenta>
      <ar:Auth>
        <ar:Token>${token}</ar:Token>
        <ar:Sign>${sign}</ar:Sign>
        <ar:Cuit>${cuit}</ar:Cuit>
      </ar:Auth>
    </ar:FEParamGetPtosVenta>
  </soapenv:Body>
</soapenv:Envelope>`;

const response = await axios.post(WSFEV1_URL, envelope, {
  headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '' },
  timeout: 10_000,
});

// Validate ptoVta type in response
// If not found or EmisionTipo != 'CAE':
//   throw new BadRequestException(`El punto de venta ${ptoVta} no existe o no es de tipo RECE (CAE).`)
// On axios timeout or AFIP 5xx:
//   throw new ServiceUnavailableException('AFIP no está disponible. Intentá guardar nuevamente en unos minutos.')
```

The `PATCH /afip-config/billing` endpoint (update ptoVta/ambiente independently) decrypts the existing cert from DB, runs the same WSAA + FEParamGetPtosVenta validation with the new values, then updates.

---

### Pattern 6: Module Wiring — EncryptionService Access

`EncryptionService` is in `WhatsappModule` exports. Import `WhatsappModule` in `AfipConfigModule`.

```typescript
// afip-config.module.ts
import { Module } from '@nestjs/common';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { AfipConfigController } from './afip-config.controller';
import { AfipConfigService } from './afip-config.service';
import { CertExpiryScheduler } from './cert-expiry.scheduler';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [WhatsappModule],
  // DO NOT add ScheduleModule.forRoot() — already registered globally via ReportesModule and PacientesModule
  controllers: [AfipConfigController],
  providers: [AfipConfigService, CertExpiryScheduler, PrismaService],
  exports: [AfipConfigService],
})
export class AfipConfigModule {}
```

---

### Pattern 7: Cert-Expiry Cron and Email

`ScheduleModule.forRoot()` is already registered by `ReportesModule` and `PacientesModule`. The `@Cron` decorator works as long as `forRoot()` is registered anywhere in the app — which it is. `CertExpiryScheduler` is just a provider class.

For email, follow `PresupuestoEmailService` exactly: `nodemailer.createTransport()` with ConfigClinica SMTP fields falling back to env vars. Do NOT use `ReportesModule.EmailService` — it is not exported and ignores `ConfigClinica.smtpHost`.

```typescript
// cert-expiry.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class CertExpiryScheduler {
  private readonly logger = new Logger(CertExpiryScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Cron('0 8 * * *') // 8 AM daily (server timezone)
  async checkCertExpiry(): Promise<void> {
    const now = new Date();
    const in60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const expiring = await this.prisma.configuracionAFIP.findMany({
      where: { certExpiresAt: { lte: in60, gte: now } },
      include: {
        profesional: {
          include: { usuario: true, configClinica: true },
        },
      },
    });

    for (const cfg of expiring) {
      const daysLeft = Math.floor(
        (cfg.certExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      // Guard: only send at exactly 60d, 30d, and daily for the last ≤5 days
      if (daysLeft === 60 || daysLeft === 30 || daysLeft <= 5) {
        await this.sendAlert(cfg, daysLeft);
      }
    }
  }

  private async sendAlert(cfg: any, daysLeft: number): Promise<void> {
    const cc = cfg.profesional.configClinica;
    const host  = cc?.smtpHost ?? this.config.get('SMTP_HOST');
    const port  = cc?.smtpPort ?? this.config.get<number>('SMTP_PORT', 587);
    const user  = cc?.smtpUser ?? this.config.get('SMTP_USER');
    const pass  = this.config.get('SMTP_PASS'); // env fallback; ConfigClinica pass decryption is out of scope
    const from  = cc?.smtpFrom ?? this.config.get('SMTP_FROM', 'noreply@clinical.com');
    const to    = cfg.profesional.usuario.email;

    if (!host || !user || !pass) {
      this.logger.warn(`SMTP no configurado — alerta de vencimiento no enviada a ${to}`);
      return;
    }

    const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    const urgency = daysLeft <= 5 ? 'URGENTE: ' : '';
    const expiryStr = cfg.certExpiresAt.toLocaleDateString('es-AR');

    await transporter.sendMail({
      from: `Clinical AFIP <${from}>`,
      to,
      subject: `${urgency}Certificado AFIP vence en ${daysLeft} días — CUIT ${cfg.cuit}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#dc2626;">Certificado AFIP próximo a vencer</h2>
          <p>El certificado digital AFIP vencerá en <strong>${daysLeft} días</strong> (${expiryStr}).</p>
          <table style="border-collapse:collapse;width:100%;margin:16px 0;">
            <tr><td style="padding:8px;color:#666;">CUIT</td><td style="padding:8px;font-weight:bold;">${cfg.cuit}</td></tr>
            <tr><td style="padding:8px;color:#666;">Ambiente</td><td style="padding:8px;">${cfg.ambiente}</td></tr>
            <tr><td style="padding:8px;color:#666;">Vencimiento</td><td style="padding:8px;">${expiryStr}</td></tr>
          </table>
          <p>Accedé a <strong>Configuración → AFIP</strong> en Clinical para cargar el certificado renovado.</p>
          <p style="color:#999;font-size:12px;">Email generado automáticamente por Clinical.</p>
        </div>`,
    });

    this.logger.log(`Alerta de vencimiento enviada a ${to} — ${daysLeft}d restantes CUIT ${cfg.cuit}`);
  }
}
```

---

### Pattern 8: AfipConfigStatusResponse Shape (CERT-02, CERT-04)

```typescript
// afip-config-status.dto.ts — NEVER includes certPemEncrypted or keyPemEncrypted

export type CertStatus = 'OK' | 'EXPIRING_SOON' | 'EXPIRED' | 'NOT_CONFIGURED';

export interface AfipConfigStatusResponse {
  configured: boolean;
  cuit?: string;
  ptoVta?: number;
  ambiente?: 'HOMOLOGACION' | 'PRODUCCION';
  certExpiresAt?: string;       // ISO date string
  certStatus: CertStatus;
  daysUntilExpiry?: number;
}

// certStatus computed in service:
// NOT_CONFIGURED  — no ConfiguracionAFIP row for this profesionalId
// EXPIRED         — certExpiresAt < now
// EXPIRING_SOON   — certExpiresAt between now and now+30d (aligns with 30d email threshold)
// OK              — certExpiresAt > now+30d
```

Endpoint: `GET /afip-config/status` reads `profesionalId` from the JWT payload directly (same as all per-profesional endpoints in the project). No query param needed.

---

### Pattern 9: Tab Integration in configuracion/page.tsx

The ADMIN view `<TabsList>` currently has 4 items; the PROFESIONAL view has 8 items in a `grid-cols-8`. Update PROFESIONAL to `grid-cols-9`.

```tsx
// ADMIN view — add inside existing TabsList and after existing TabsContent blocks:
<TabsTrigger value="afip">AFIP</TabsTrigger>
// ...
<TabsContent value="afip" className="mt-6">
  <AfipConfigTab />
</TabsContent>

// PROFESIONAL view — change grid-cols-8 to grid-cols-9, then add:
<TabsTrigger value="afip">AFIP</TabsTrigger>
// ...
<TabsContent value="afip" className="mt-6">
  <AfipConfigTab />
</TabsContent>
```

---

### Pattern 10: Facturador Badge Insertion (facturador/page.tsx)

Insert above the existing first `<section>` (Prácticas pendientes). Badge renders only when `certStatus?.configured === true`.

```tsx
const { data: certStatus } = useAfipConfig();

{certStatus?.configured && (
  <div className="flex items-center gap-2 mb-2">
    <span className="text-sm text-gray-500">Certificado AFIP:</span>
    <Badge
      className={
        certStatus.certStatus === 'OK'
          ? 'bg-green-600 hover:bg-green-600 text-white'
          : certStatus.certStatus === 'EXPIRING_SOON'
          ? 'bg-yellow-500 hover:bg-yellow-500 text-white'
          : 'bg-red-600 hover:bg-red-600 text-white'
      }
    >
      {certStatus.certStatus === 'OK' && 'Certificado activo'}
      {certStatus.certStatus === 'EXPIRING_SOON' && `Vence en ${certStatus.daysUntilExpiry}d`}
      {certStatus.certStatus === 'EXPIRED' && 'Certificado vencido'}
    </Badge>
  </div>
)}
```

---

### Anti-Patterns to Avoid

- **Never return `certPemEncrypted` or `keyPemEncrypted` in any DTO.** The status endpoint returns only metadata.
- **Never save cert without FEParamGetPtosVenta validation.** Return HTTP 503 on AFIP unavailability — do not silently skip.
- **Never register `ScheduleModule.forRoot()` in `AfipConfigModule`.** Already registered by `ReportesModule` and `PacientesModule`; adding it again is a latent source of cron double-firing bugs.
- **Never use `ReportesModule.EmailService` for cert-expiry emails.** It is not exported from `ReportesModule` and only reads env-var SMTP — it ignores `ConfigClinica.smtpHost`.
- **Never introduce an in-memory `Map` for WSAA token cache here.** Phase 12 calls WSAA only at cert-save time (rare, admin-triggered). Phase 13 introduces Redis-backed caching for the per-invoice token flow.
- **Never send expiry alert emails on every daily cron run.** Guard with `daysLeft === 60 || daysLeft === 30 || daysLeft <= 5`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AES-256-GCM encryption | Custom crypto logic | `EncryptionService` from WhatsappModule | Already tested in production; `iv:authTag:ciphertext` format is established |
| X.509 parsing | Manual PEM regex | `crypto.X509Certificate` (Node built-in) | Zero new deps; extracts `subject` and `validTo`; handles all standard cert formats |
| SOAP HTTP call | Third-party `soap` npm | `axios` with string template | `soap` npm fails on AFIP endpoints; raw axios is already used throughout the backend |
| Scheduled job | `setInterval` or BullMQ | `@Cron` from `@nestjs/schedule` | Already installed; already in use in `ReportesSchedulerService` |
| Email sending | New mail module | `nodemailer` inline (PresupuestoEmailService pattern) | Already used; same ConfigClinica SMTP + env fallback chain |
| Tab UI structure | Custom component | Existing shadcn/ui `Tabs` in `configuracion/page.tsx` | Already wired; just add trigger + content |

---

## Common Pitfalls

### Pitfall 1: WSAA + FEParamGetPtosVenta Latency on Save
**What goes wrong:** The cert-save endpoint takes 5–15 seconds (two sequential SOAP calls to AFIP) and the frontend appears to hang.
**Why it happens:** WSAA and WSFEv1 are external SOAP services with variable latency, especially in homologacion.
**How to avoid:** Set `axios` `timeout: 10_000` on each SOAP call. Show a loading state in the frontend with copy such as "Validando con AFIP...". Return HTTP 503 with a user-readable message on timeout.
**Warning signs:** Frontend spinner runs for >15s; backend logs `ETIMEDOUT` or `ECONNRESET` on axios call.

### Pitfall 2: AFIP PEM Subject Format Variability
**What goes wrong:** CUIT extraction regex matches nothing for certs issued through certain AFIP portals.
**Why it happens:** Different AFIP issuing portals produce different `subject` field formats.
**How to avoid:** Handle both `SERIALNUMBER=CUIT 20123456789` and `CN=20123456789` patterns. Log the raw `cert.subject` string in the `BadRequestException` message — this is the most useful debugging signal for support.
**Warning signs:** "No se pudo extraer el CUIT" error for a cert the user believes is valid.

### Pitfall 3: WhatsappModule BullMQ Queue Dependency in Dev
**What goes wrong:** Importing `WhatsappModule` into `AfipConfigModule` pulls in the BullMQ WhatsApp queue registration. In dev environments where Redis is not running, app startup fails.
**Why it happens:** `WhatsappModule` registers `BullModule.registerQueue({ name: WHATSAPP_QUEUE })`. `BullModule.forRootAsync` in `AppModule` handles the global connection, but the queue still requires Redis reachable at startup.
**How to avoid:** Redis is already required by `WhatsappModule` which is imported globally in `AppModule` — so this is not a new requirement. Dev environments must already have Redis running. Document this in the task.
**Warning signs:** `Error: Redis connection refused` at startup — but this would already exist before Phase 12.

### Pitfall 4: EstadoFactura Enum Extension Breaking Exhaustive Checks
**What goes wrong:** After adding `CAEA_PENDIENTE_INFORMAR` and running `npx prisma generate`, TypeScript reports errors on exhaustive switch statements that previously covered all `EstadoFactura` values.
**Why it happens:** TypeScript exhaustiveness checks; Prisma-generated union types.
**How to avoid:** After migration + generate, run `npx tsc --noEmit` from `backend/`. Find all `EstadoFactura` switch usages and add `case 'CAEA_PENDIENTE_INFORMAR':` handlers. Most likely location: `finanzas.service.ts`.
**Warning signs:** `npm run build` fails with `Type 'CAEA_PENDIENTE_INFORMAR' is not assignable to type 'never'`.

### Pitfall 5: New Factura Fields Added as Non-Nullable
**What goes wrong:** Migration fails because existing `Factura` rows cannot satisfy a NOT NULL constraint.
**Why it happens:** Production DB already has Factura rows without AFIP data.
**How to avoid:** All five new Factura fields (`cae`, `caeFchVto`, `nroComprobante`, `qrData`, `ptoVta`) must be nullable. Phase 14 populates them on emission.
**Warning signs:** `npx prisma migrate dev` fails with `column ... of relation ... contains null values`.

### Pitfall 6: ScheduleModule Registered a Third Time
**What goes wrong:** Cron fires multiple times per tick, or NestJS logs schedule metadata conflicts.
**Why it happens:** `ScheduleModule.forRoot()` is already called in `ReportesModule` and `PacientesModule`. Adding it in `AfipConfigModule` creates a third registration.
**How to avoid:** Do NOT add `ScheduleModule.forRoot()` to `AfipConfigModule`. The `@Cron()` decorator on `CertExpiryScheduler` works because `ScheduleModule.forRoot()` is already registered globally.
**Warning signs:** Cron fires twice on the same tick; NestJS logs about duplicate scheduler metadata.

### Pitfall 7: Expiry Alert Email Spam
**What goes wrong:** Admin receives a daily cert-expiry email for 60 consecutive days before expiry.
**Why it happens:** The `@Cron` runs daily; without a threshold guard it sends on every run once `certExpiresAt <= now + 60d`.
**How to avoid:** Guard with `daysLeft === 60 || daysLeft === 30 || daysLeft <= 5` before calling `sendAlert()`. This produces exactly 2 scheduled alerts (60d and 30d) plus a daily urgent window in the last 5 days.
**Warning signs:** Admin complains of daily emails; logs show `sendMail` called every day.

---

## Code Examples

### Migration Command

```bash
# From backend/ directory — single migration for all AFIP schema changes
npx prisma migrate dev --name add_afip_extendido_schema
npx prisma generate
```

### TanStack Query Hook (follows useWabaConfig.ts exactly)

```typescript
// frontend/src/hooks/useAfipConfig.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AfipConfigStatusResponse } from "@/types/afip";

export function useAfipConfig() {
  return useQuery<AfipConfigStatusResponse>({
    queryKey: ["afip-config-status"],
    queryFn: async () => {
      const res = await api.get("/afip-config/status");
      return res.data;
    },
  });
}
```

### Controller Endpoint Summary

```typescript
// GET /afip-config/status
// Auth: JWT. Reads profesionalId from JWT payload.
// Returns: AfipConfigStatusResponse — NEVER includes encrypted fields.
// Used by: AfipConfigTab (form vs status view toggle) and facturador/page.tsx (badge).

// POST /afip-config/cert
// Body: SaveCertDto { certPem, keyPem, ptoVta, ambiente }
// Flow: extractCertInfo → WSAA → FEParamGetPtosVenta → encrypt → prisma.configuracionAFIP.upsert
// HTTP 400: invalid PEM, CUIT not extractable, ptoVta not RECE type
// HTTP 503: AFIP unavailable (timeout or 5xx)

// PATCH /afip-config/billing
// Body: SaveBillingConfigDto { ptoVta, ambiente }
// Flow: load + decrypt existing cert → WSAA → FEParamGetPtosVenta → update ptoVta + ambiente
// Same error handling as POST /afip-config/cert
```

---

## State of the Art

| Before Phase 12 | After Phase 12 | Impact on Future Phases |
|-----------------|----------------|------------------------|
| `EstadoFactura`: EMITIDA, ANULADA | + `CAEA_PENDIENTE_INFORMAR` | Phase 16 CAEA contingency mode uses this state |
| `Factura` has no AFIP fields | + cae, caeFchVto, nroComprobante, qrData, ptoVta (nullable) | Phase 14 populates them on real CAE emission |
| No `ConfiguracionAFIP` model | New per-tenant singleton with encrypted cert+key | Phase 13 WSAAService reads this to sign TRAs |
| No `CaeaVigente` model | New model with (profesionalId, periodo, orden) uniqueness | Phase 16 CAEA cron writes here |
| `EncryptionService` accessible only in WhatsappModule | Still in WhatsappModule; AfipConfigModule imports it | Phase 13 AfipService also needs it — same import path |

---

## Open Questions

1. **ConfigClinica `smtpPassEncrypted` decryption in `CertExpiryScheduler`**
   - What we know: `PresupuestoEmailService.decryptSmtpPass()` is a stub that returns the encrypted value as-is (comment: "will be wired in future"). The cert-expiry scheduler has the same gap.
   - What's unclear: Whether ConfigClinica SMTP with an encrypted password is used in production. The env-var fallback (`SMTP_PASS`) is the safe path.
   - Recommendation: Use env-var SMTP as the primary path for Phase 12. The ConfigClinica SMTP password decryption gap is pre-existing and out of Phase 12 scope.

2. **FEParamGetPtosVenta response element name for emission type**
   - What we know: The response contains per-ptoVta records with an emission type field; value `'CAE'` means RECE type (online). This is from AFIP-INTEGRATION.md (community-verified against spec, March 2026).
   - What's unclear: Whether the XML element is `EmisionTipo`, `TipoEmision`, or another variant.
   - Recommendation: When implementing the SOAP response parser, fetch the live WSDL from `https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL` and grep for the element name. A 5-minute check during Wave 2, not a planning blocker.

---

## Validation Architecture

> `workflow.nyquist_validation` key is absent from `.planning/config.json` — treating as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest (NestJS default) |
| Config file | `backend/package.json` `"test"` script |
| Quick run command | `cd backend && npm test -- --testPathPattern=afip-config --passWithNoTests` |
| Full suite command | `cd backend && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AFIP-01 | Prisma client types include `ConfiguracionAFIP`, `CaeaVigente`, Factura AFIP fields, `CAEA_PENDIENTE_INFORMAR` after migration | Type check | `cd backend && npx tsc --noEmit` | ❌ Wave 0 — after migration |
| CERT-01 | `extractCertInfo()` returns correct CUIT from valid AFIP-format PEM (both subject formats) | Unit | `cd backend && npm test -- --testPathPattern=afip-config.service` | ❌ Wave 0 |
| CERT-01 | `extractCertInfo()` throws `BadRequestException` for malformed PEM | Unit | same | ❌ Wave 0 |
| CERT-01 | FEParamGetPtosVenta called with correct SOAP envelope (axios mocked) | Unit | same | ❌ Wave 0 |
| CERT-01 | Invalid ptoVta type returns HTTP 400 | Unit | same | ❌ Wave 0 |
| CERT-02 | `GET /afip-config/status` response never includes `certPemEncrypted` or `keyPemEncrypted` | Unit | same | ❌ Wave 0 |
| CERT-03 | `checkCertExpiry()` calls `sendAlert` at 60d and 30d but NOT at 45d | Unit (mock Date, mock nodemailer) | `cd backend && npm test -- --testPathPattern=cert-expiry.scheduler` | ❌ Wave 0 |
| CERT-04 | `certStatus: 'EXPIRING_SOON'` computed when `certExpiresAt` is 15 days from now | Unit | `cd backend && npm test -- --testPathPattern=afip-config.service` | ❌ Wave 0 |
| CERT-04 | `configured: false` returned when no `ConfiguracionAFIP` row exists | Unit | same | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd backend && npm test -- --testPathPattern=afip-config --passWithNoTests`
- **Per wave merge:** `cd backend && npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `backend/src/modules/afip-config/afip-config.service.spec.ts` — covers CERT-01, CERT-02, CERT-04
- [ ] `backend/src/modules/afip-config/cert-expiry.scheduler.spec.ts` — covers CERT-03
- [ ] Prisma migration: `cd backend && npx prisma migrate dev --name add_afip_extendido_schema`
- [ ] `npx prisma generate` after migration — required for TypeScript type checks on new models
- [ ] Check for exhaustive switch breaks: `grep -r "EstadoFactura" backend/src/ --include="*.ts"` after generate

*(No framework install needed — `@nestjs/schedule` v6.1.0 already in `backend/package.json`.)*

---

## Sources

### Primary (HIGH confidence — read directly from codebase)

- `backend/src/prisma/schema.prisma` — current schema; confirmed `ConfiguracionWABA` as direct analog, `EstadoFactura` enum at lines 927–930, `Factura` model, `Profesional` relations
- `backend/src/modules/whatsapp/crypto/encryption.service.ts` — AES-256-GCM `iv:authTag:ciphertext` format confirmed; `encrypt()` / `decrypt()` signatures verified
- `backend/src/modules/whatsapp/whatsapp.module.ts` — `EncryptionService` confirmed in `exports` array
- `backend/src/modules/presupuestos/presupuesto-email.service.ts` — ConfigClinica SMTP + env-var fallback pattern confirmed; direct analog for CERT-03 email
- `backend/src/modules/reportes/services/email.service.ts` — confirmed uses env-var SMTP only; not the right pattern for ConfigClinica-aware sending
- `backend/src/modules/reportes/reportes.module.ts` — confirmed `ScheduleModule.forRoot()` already registered; `EmailService` NOT in exports
- `backend/src/modules/pacientes/pacientes.module.ts` — confirmed second `ScheduleModule.forRoot()` registration; @Cron is already globally active
- `backend/src/modules/finanzas/finanzas.module.ts` — confirmed `AfipStubService` lives in FinanzasModule; AfipConfig is a separate concern
- `backend/src/app.module.ts` — confirmed `WhatsappModule` already in global imports; AppModule structure
- `backend/package.json` — confirmed `"@nestjs/schedule": "^6.1.0"` already installed
- `frontend/src/app/dashboard/configuracion/page.tsx` — confirmed ADMIN (4 tabs) and PROFESIONAL (8 tabs, `grid-cols-8`) views
- `frontend/src/app/dashboard/facturador/page.tsx` — confirmed `Badge` already imported; insertion point above first section identified
- `frontend/src/hooks/useWabaConfig.ts` — direct analog for `useAfipConfig.ts`
- `.planning/phases/12-schema-afip-extendido-gestion-certificados/12-CONTEXT.md` — all locked decisions
- `.planning/research/AFIP-INTEGRATION.md` — WSAA endpoints, FEParamGetPtosVenta SOAP envelope, EncryptionService spec, cert storage design (MEDIUM-HIGH confidence per its own header)
- `.planning/REQUIREMENTS.md` — AFIP-01, CERT-01 through CERT-04 verbatim requirement text

### Secondary (MEDIUM confidence)

- Node.js official docs — `crypto.X509Certificate`: `subject`, `validTo` properties; available since Node 15.6

### Tertiary (LOW confidence — verify during implementation)

- FEParamGetPtosVenta response XML element name for emission type (`EmisionTipo` vs `TipoEmision`) — from AFIP-INTEGRATION.md community sources; verify against live WSDL before writing the response parser

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every dependency confirmed in `package.json` and source files; zero new installs needed
- Architecture: HIGH — all analogs (`ConfiguracionWABA`, `WhatsappConfigTab`, `PresupuestoEmailService`, `useWabaConfig`) verified by reading actual source
- Pitfalls: HIGH — derived from confirmed runtime state (ScheduleModule registered twice, EmailService not exported, existing Factura rows requiring nullable fields)
- WSAA/FEParamGetPtosVenta behavior: MEDIUM — from AFIP-INTEGRATION.md (spec-derived, not live-tested in this project)

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (AFIP endpoints stable; all identified npm dependencies stable)
