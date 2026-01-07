import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { TipoMovimiento } from '@prisma/client';

export class CreateMovimientoDto {
  @IsNumber()
  @IsPositive()
  monto: number;

  @IsEnum(TipoMovimiento)
  tipo: TipoMovimiento;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsUUID()
  turnoId?: string;

  @IsOptional()
  @IsUUID()
  presupuestoId?: string;
}
