import { IsOptional, IsDateString } from 'class-validator';

export class DiagnosticoDto {
  zonas: string[];
  subzonas: string[];
  otroTexto?: string;
}

export class TratamientoItemDto {
  nombre: string;
  tratamientoId?: string;
  precio: number;
}

export class CodigoPracticaEntradaDto {
  codigo: string;
  descripcion: string;
  monto?: number;
  coseguro?: number;
}

export class AutorizacionEntradaDto {
  obraSocialId: string;
  codigos: CodigoPracticaEntradaDto[];
}

export class CreateEntradaDto {
  tipo: 'primera_vez' | 'pre_quirurgico' | 'control' | 'practica' | 'libre';
  // Para primera_vez
  diagnostico?: DiagnosticoDto;
  tratamientos?: TratamientoItemDto[];
  comentario?: string;
  presupuestoId?: string;
  presupuestoTotal?: number;
  autorizaciones?: AutorizacionEntradaDto[];
  // Para tipos libres
  texto?: string;

  @IsOptional()
  @IsDateString()
  fecha?: string; // ISO date string para entradas retroactivas (YYYY-MM-DD o ISO 8601 completo)
}
