import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CobrarTurnoDto {
  @IsNumber()
  @IsPositive()
  monto: number;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
