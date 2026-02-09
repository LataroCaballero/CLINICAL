import {
  IsNumber,
  IsPositive,
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { MedioPago } from '@prisma/client';

export class RegistrarPagoProveedorDto {
  @IsNumber()
  @IsPositive()
  monto: number;

  @IsEnum(MedioPago)
  medioPago: MedioPago;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  referencia?: string;

  @IsOptional()
  @IsUUID()
  ordenCompraId?: string;
}
