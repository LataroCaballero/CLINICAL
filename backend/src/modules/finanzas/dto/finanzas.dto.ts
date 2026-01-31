import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { MedioPago, TipoFactura, EstadoLiquidacion } from '@prisma/client';

export class CreatePagoDto {
  @IsUUID()
  pacienteId: string;

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
}

export class PagosFiltersDto {
  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @IsOptional()
  @IsEnum(MedioPago)
  medioPago?: MedioPago;

  @IsOptional()
  @IsUUID()
  profesionalId?: string;
}

export class CreateFacturaDto {
  @IsEnum(TipoFactura)
  tipo: TipoFactura;

  @IsOptional()
  @IsString()
  cuit?: string;

  @IsOptional()
  @IsString()
  razonSocial?: string;

  @IsOptional()
  @IsString()
  domicilio?: string;

  @IsOptional()
  @IsString()
  condicionIVA?: string;

  @IsOptional()
  @IsString()
  concepto?: string;

  @IsNumber()
  subtotal: number;

  @IsNumber()
  impuestos: number;

  @IsNumber()
  total: number;

  @IsUUID()
  profesionalId: string;

  @IsOptional()
  @IsUUID()
  movimientoId?: string;

  @IsOptional()
  @IsUUID()
  obraSocialId?: string;

  @IsOptional()
  @IsUUID()
  pacienteId?: string;
}

export class FacturasFiltersDto {
  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @IsOptional()
  @IsEnum(TipoFactura)
  tipo?: TipoFactura;

  @IsOptional()
  @IsUUID()
  profesionalId?: string;
}

export class LiquidacionesFiltersDto {
  @IsOptional()
  @IsEnum(EstadoLiquidacion)
  estadoLiquidacion?: EstadoLiquidacion;

  @IsOptional()
  @IsUUID()
  profesionalId?: string;

  @IsOptional()
  @IsUUID()
  obraSocialId?: string;
}

export class MarcarPracticasPagadasDto {
  @IsArray()
  @IsUUID('4', { each: true })
  practicaIds: string[];
}

export class ReporteFiltersDto {
  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @IsOptional()
  @IsUUID()
  profesionalId?: string;
}
