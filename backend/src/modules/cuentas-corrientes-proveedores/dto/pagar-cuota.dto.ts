import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MedioPago } from '@prisma/client';

export class PagarCuotaDto {
  @IsEnum(MedioPago)
  medioPago: MedioPago;

  @IsOptional()
  @IsString()
  referencia?: string;
}
