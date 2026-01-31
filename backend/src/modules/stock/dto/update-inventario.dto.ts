import { IsOptional, IsNumber, Min } from 'class-validator';

export class UpdateInventarioDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockMinimo?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioActual?: number;
}
