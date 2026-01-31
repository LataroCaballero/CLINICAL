import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsPositive,
  Min,
} from 'class-validator';
import { TipoProducto } from '@prisma/client';

export class CreateProductoDto {
  @IsString()
  nombre: string;

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

  @IsEnum(TipoProducto)
  tipo: TipoProducto;

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

  // Datos iniciales de inventario (opcionales, para crear inventario al mismo tiempo)
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockInicial?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockMinimo?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioActual?: number;

  // Datos de lote inicial (cuando requiereLote es true)
  @IsOptional()
  @IsString()
  loteNumero?: string;

  @IsOptional()
  @IsString()
  loteFechaVencimiento?: string;
}
