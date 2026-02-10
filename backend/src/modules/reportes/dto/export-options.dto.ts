import {
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  FormatoExportacion,
  TipoReporte,
  FrecuenciaEnvio,
} from '../types/reportes.types';
import { ReporteFiltersDto } from './reporte-filters.dto';

/**
 * Opciones para exportar un reporte
 */
export class ExportOptionsDto {
  @IsEnum([
    'dashboard',
    'turnos',
    'ausentismo',
    'ocupacion',
    'procedimientos',
    'ventas-productos',
    'ingresos',
    'ingresos-profesional',
    'ingresos-obra-social',
    'ingresos-prestacion',
    'cuentas-por-cobrar',
    'morosidad',
    'pagos-pendientes',
  ])
  tipoReporte: TipoReporte;

  @IsEnum(['json', 'csv', 'pdf'])
  formato: FormatoExportacion;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ReporteFiltersDto)
  filtros?: ReporteFiltersDto;

  @IsOptional()
  @IsString()
  titulo?: string;
}

/**
 * Opciones para programar envío de reporte por email
 */
export class ProgramarEnvioDto {
  @IsEnum([
    'dashboard',
    'turnos',
    'ausentismo',
    'ocupacion',
    'procedimientos',
    'ventas-productos',
    'ingresos',
    'ingresos-profesional',
    'ingresos-obra-social',
    'ingresos-prestacion',
    'cuentas-por-cobrar',
    'morosidad',
    'pagos-pendientes',
  ])
  tipoReporte: TipoReporte;

  @IsEnum(['json', 'csv', 'pdf'])
  formato: FormatoExportacion;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ReporteFiltersDto)
  filtros?: ReporteFiltersDto;

  @IsEmail()
  email: string;

  @IsEnum(['diario', 'semanal', 'mensual'])
  frecuencia: FrecuenciaEnvio;
}
