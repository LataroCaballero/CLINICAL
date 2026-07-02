import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO for POST /pacientes/:id/portal-link/email
 *
 * IMPORTANT: There is no global ValidationPipe active in this project
 * (no useGlobalPipes / ValidationPipe in src/). Class-validator decorators
 * below are used ONLY for typing and documentation — they do NOT execute
 * at runtime. The actual validation of `url` is performed explicitly via
 * `PacientesService.validarPortalUrl()` which calls `esPortalUrlValida()`.
 */
export class EnviarPortalLinkEmailDto {
  /**
   * The portal URL already held by the client (generated in a prior request).
   * Validated server-side for same-origin and UUID-path shape (T-52-01).
   */
  @IsString()
  @IsNotEmpty()
  url: string;

  /**
   * Optional email address to capture for patients who have none on file.
   * When provided, `setEmailSiFalta` persists it only if the patient email is null.
   */
  @IsOptional()
  @IsEmail()
  email?: string;
}
