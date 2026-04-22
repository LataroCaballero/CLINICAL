import { IsString, IsOptional, IsNumber, IsInt, Min } from 'class-validator';

export class CreateCirugiaCatalogoDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioARS?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioUSD?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  duracionMinutos?: number;
}
