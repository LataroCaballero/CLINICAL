import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

/**
 * Narrow staged-health DTO for the patient portal (D-13, PORTAL-06).
 *
 * Confined to the `*AutoReportad*` staging keys (schema.prisma:221-224). It NEVER
 * declares the curated clinical fields (`alergias`, `condiciones`, `medicacion`)
 * so a patient self-report can never overwrite staff-curated clinical data.
 * Enforced as a whitelist by a per-route `ValidationPipe({ whitelist: true })`
 * in Plan 03 (no global pipe exists in this project).
 */
export class UpdateSaludStagedDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alergiasAutoReportadas?: string[];

  @IsOptional()
  @IsObject()
  antecedentesAutoReportados?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medicacionAutoReportada?: string[];

  @IsOptional()
  @IsString()
  tratamientosPreviosAutoReportados?: string;
}
