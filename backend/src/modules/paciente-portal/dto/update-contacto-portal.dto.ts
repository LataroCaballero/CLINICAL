import { IsEmail, IsOptional, IsString } from 'class-validator';

/**
 * Narrow contact-data DTO for the patient portal (D-11, PORTAL-04).
 *
 * Declares ONLY contact fields, every one optional. It deliberately omits all
 * clinical, insurance, identity and CRM-routing fields. The protection surface
 * (SC#3) is only enforced once a per-route `new ValidationPipe({ whitelist: true })`
 * is wired in Plan 03 — there is NO global ValidationPipe in this project
 * (D-12: whitelist, no forbidNonWhitelisted, prohibited fields silently ignored).
 */
export class UpdateContactoPortalDto {
  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  telefonoAlternativo?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  contactoEmergenciaNombre?: string;

  @IsOptional()
  @IsString()
  contactoEmergenciaTelefono?: string;

  @IsOptional()
  @IsString()
  contactoEmergenciaRelacion?: string;
}
