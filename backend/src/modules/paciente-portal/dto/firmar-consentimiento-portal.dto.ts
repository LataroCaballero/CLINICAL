import { IsBoolean, IsString, IsUUID } from 'class-validator';

/**
 * Narrow write surface for the patient-portal consent signing endpoint (CONS-04).
 *
 * Declares THREE fields: `zonaId`, `signaturePngDataUrl`, `indicacionesLeidas`.
 * The patient identity (`pacienteId`) is ALWAYS derived from the portal-scoped
 * JWT (`req.user.pacienteId`) in the controller — it is never declared here so
 * it cannot be injected via the request body (D-12, pitfall 12, T-56-12).
 *
 * The `signaturePngDataUrl` is expected to be a `data:image/png;base64,<base64>`
 * data URL. The prefix is stripped server-side in the service before base64
 * decoding and PNG magic-byte validation (T-56-15).
 *
 * Mass-assignment protection (SC#3) is enforced by a `new ValidationPipe({
 * whitelist: true })` per-route in the controller. There is NO global
 * ValidationPipe in this project — the per-route pipe is load-bearing.
 */
export class FirmarConsentimientoPortalDto {
  @IsUUID()
  zonaId: string;

  @IsString()
  signaturePngDataUrl: string; // data URL — prefix stripped server-side

  @IsBoolean()
  indicacionesLeidas: boolean; // must be true; service validates (D-11)
}
