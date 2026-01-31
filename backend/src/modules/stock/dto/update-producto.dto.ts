import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { TipoProducto } from '@prisma/client';

export class UpdateProductoDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  imagenUrl?: string;

  @IsOptional()
  @IsEnum(TipoProducto)
  tipo?: TipoProducto;

  @IsOptional()
  @IsString()
  unidadMedida?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costoBase?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioSugerido?: number;

  @IsOptional()
  @IsBoolean()
  requiereLote?: boolean;

  @IsOptional()
  @IsBoolean()
  descuentaStock?: boolean;
}
