import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  IsNumber,
  IsPositive,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VentaProductoItemDto {
  @IsUUID()
  productoId: string;

  @IsNumber()
  @IsPositive()
  cantidad: number;

  @IsNumber()
  @Min(0)
  precioUnitario: number;
}

export class CreateVentaProductoDto {
  @IsOptional()
  @IsUUID()
  pacienteId?: string;

  @IsString()
  medioPago: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  descuento?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VentaProductoItemDto)
  items: VentaProductoItemDto[];
}
