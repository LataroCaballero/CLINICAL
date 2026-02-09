import {
  IsUUID,
  IsArray,
  ValidateNested,
  IsNumber,
  IsPositive,
  Min,
  Max,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CondicionPagoProveedor } from '@prisma/client';

export class OrdenCompraItemDto {
  @IsUUID()
  productoId: string;

  @IsNumber()
  @IsPositive()
  cantidad: number;

  @IsNumber()
  @Min(0)
  precioUnitario: number;
}

export class CreateOrdenCompraDto {
  @IsUUID()
  proveedorId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrdenCompraItemDto)
  items: OrdenCompraItemDto[];

  @IsOptional()
  @IsEnum(CondicionPagoProveedor)
  condicionPago?: CondicionPagoProveedor;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  cantidadCuotas?: number;

  @IsOptional()
  @IsDateString()
  fechaPrimerVencimiento?: string;
}
