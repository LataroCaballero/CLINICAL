import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { TipoMovimiento, MedioPago } from '@prisma/client';

export class CreateMovimientoDto {
  @IsNumber()
  @IsPositive()
  monto: number;

  @IsEnum(TipoMovimiento)
  tipo: TipoMovimiento;

  @IsOptional()
  @IsEnum(MedioPago)
  medioPago?: MedioPago;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  referencia?: string;

  @IsOptional()
  @IsUUID()
  turnoId?: string;

  @IsOptional()
  @IsUUID()
  presupuestoId?: string;

  @IsOptional()
  @IsUUID()
  usuarioId?: string;
}
