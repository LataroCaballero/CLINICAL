import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsPositive,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { TipoMovimientoStock } from '@prisma/client';

export class CreateMovimientoStockDto {
  @IsUUID()
  productoId: string;

  @IsEnum(TipoMovimientoStock)
  tipo: TipoMovimientoStock;

  @IsNumber()
  @IsPositive()
  cantidad: number;

  @IsOptional()
  @IsString()
  motivo?: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  // Referencias opcionales para trazabilidad
  @IsOptional()
  @IsUUID()
  loteId?: string;

  @IsOptional()
  @IsUUID()
  ordenCompraId?: string;

  @IsOptional()
  @IsUUID()
  practicaId?: string;

  // Para crear lote nuevo en movimientos de entrada
  @IsOptional()
  @IsString()
  loteNumero?: string;

  @IsOptional()
  @IsDateString()
  loteFechaVencimiento?: string;

  // Para actualizar precio de venta en ingresos
  @IsOptional()
  @IsNumber()
  nuevoPrecio?: number;
}
