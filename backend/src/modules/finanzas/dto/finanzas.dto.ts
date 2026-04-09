import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { MedioPago, TipoFactura, EstadoLiquidacion, CondicionIVA } from '@prisma/client';

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
  @IsEnum(CondicionIVA)
  condicionIVAReceptor?: CondicionIVA;

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

export class CreateLoteDto {
  @IsUUID()
  profesionalId: string;

  @IsUUID()
  obraSocialId: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  periodo: string;

  @IsArray()
  @IsUUID('4', { each: true })
  practicaIds: string[];
}

export class SetLimiteMensualDto {
  @IsUUID()
  profesionalId: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'mes must be YYYY-MM' })
  mes: string;

  @IsNumber()
  @IsPositive()
  limite: number;
}

export class ActualizarMontoPagadoDto {
  @IsNumber()
  @IsPositive()
  montoPagado: number;
}

export class UpdateTipoCambioDto {
  @IsNumber()
  @IsPositive()
  tipoCambio: number;
}

// Return DTO — no class-validator decorators needed (read-only response shape)
export class FacturaDetailDto {
  id: string;
  tipo: TipoFactura;
  numero: string;
  fecha: string;
  estado: string;
  cuit: string | null;
  razonSocial: string | null;
  domicilio: string | null;
  concepto: string | null;
  subtotal: number;
  impuestos: number;
  total: number;
  moneda: string;
  tipoCambio: number;
  cae: string | null;
  caeFchVto: string | null;
  nroComprobante: number | null;
  qrData: string | null;
  qrImageDataUrl: string | null;
  ptoVta: number | null;
  profesionalId: string;
  paciente: { id: string; nombreCompleto: string; dni: string } | null;
  obraSocial: { id: string; nombre: string } | null;
  afipError: string | null; // Spanish AFIP error from CaeEmissionProcessor.onFailed (Phase 17)
}
