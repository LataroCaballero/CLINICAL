import { IsString, IsOptional, IsNumber, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTratamientoDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  precio?: number;

  @IsOptional()
  @IsString()
  indicaciones?: string;

  @IsOptional()
  @IsString()
  procedimiento?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  duracionMinutos?: number;
}
