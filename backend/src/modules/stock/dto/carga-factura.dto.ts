import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  IsNumber,
  IsPositive,
  Min,
  Max,
  IsEnum,
  IsDateString,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CondicionPagoProveedor } from '@prisma/client';

export enum TipoHonorario {
  FIJO = 'FIJO',
  PORCENTAJE = 'PORCENTAJE',
}

export class CargaFacturaItemDto {
  @IsOptional()
  @IsUUID()
  productoId?: string;

  @ValidateIf((o) => !o.productoId)
  @IsString()
  productoNombre?: string;

  @IsNumber()
  @IsPositive()
  cantidad: number;

  @IsNumber()
  @Min(0)
  precioFactura: number;

  @IsOptional()
  @IsEnum(TipoHonorario)
  tipoHonorario?: TipoHonorario;

  @IsOptional()
  @IsNumber()
  @Min(0)
  honorario?: number;
}

export class CargaFacturaDto {
  @IsOptional()
  @IsUUID()
  proveedorId?: string;

  @ValidateIf((o) => !o.proveedorId)
  @IsString()
  proveedorNombre?: string;

  @IsOptional()
  @IsString()
  numeroFactura?: string;

  @IsOptional()
  @IsDateString()
  fechaFactura?: string;

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CargaFacturaItemDto)
  items: CargaFacturaItemDto[];
}
