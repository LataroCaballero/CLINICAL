import { IsOptional, IsInt, Min, Max, IsString, Matches } from 'class-validator';

export class ConfigTipoTurnoItemDto {
  @IsString()
  tipoTurnoId: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  duracionMinutos?: number | null;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'colorHex debe ser un color hexadecimal válido (#RRGGBB)' })
  colorHex?: string | null;
}
