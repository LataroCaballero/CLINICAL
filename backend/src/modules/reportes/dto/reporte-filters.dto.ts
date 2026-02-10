import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum Agrupacion {
  DIA = 'dia',
  SEMANA = 'semana',
  MES = 'mes',
}

/**
 * Filtros base para la mayoría de reportes
 */
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

/**
 * Filtros para reporte de turnos con agrupación
 */
export class ReporteTurnosFiltersDto extends ReporteFiltersDto {
  @IsOptional()
  @IsEnum(Agrupacion)
  agrupacion?: Agrupacion = Agrupacion.DIA;
}

/**
 * Filtros para reporte de ausentismo
 */
export class ReporteAusentismoFiltersDto extends ReporteFiltersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(100)
  limite?: number = 20;
}

/**
 * Filtros para ranking de procedimientos
 */
export class ReporteProcedimientosFiltersDto extends ReporteFiltersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(100)
  limite?: number = 20;
}

/**
 * Filtros para reporte de ingresos
 */
export class ReporteIngresosFiltersDto extends ReporteFiltersDto {
  @IsOptional()
  @IsUUID()
  obraSocialId?: string;

  @IsOptional()
  @IsEnum(Agrupacion)
  agrupacion?: Agrupacion = Agrupacion.DIA;
}

/**
 * Filtros para reporte de cuentas por cobrar
 */
export class ReporteCuentasPorCobrarFiltersDto {
  @IsOptional()
  @IsUUID()
  profesionalId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  soloVencidas?: boolean = false;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(500)
  limite?: number = 100;
}

/**
 * Filtros para reporte de morosidad
 */
export class ReporteMorosidadFiltersDto {
  @IsOptional()
  @IsUUID()
  profesionalId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  diasVencimiento?: number = 30;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(500)
  limite?: number = 100;
}

/**
 * Filtros para dashboard
 */
export class DashboardFiltersDto {
  @IsOptional()
  @IsUUID()
  profesionalId?: string;
}
