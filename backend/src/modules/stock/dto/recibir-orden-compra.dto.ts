import {
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsPositive,
  IsUUID,
  IsString,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecepcionItemDto {
  @IsUUID()
  productoId: string;

  @IsNumber()
  @IsPositive()
  cantidadRecibida: number;

  // Datos de lote (opcional, para productos que requieren lote)
  @IsOptional()
  @IsString()
  loteNumero?: string;

  @IsOptional()
  @IsDateString()
  loteFechaVencimiento?: string;
}

export class RecibirOrdenCompraDto {
  @IsOptional()
  @IsDateString()
  fechaRecepcion?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecepcionItemDto)
  items?: RecepcionItemDto[];
}
