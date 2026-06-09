import {
  IsOptional,
  IsDateString,
  IsArray,
  IsBoolean,
  IsString,
  IsEnum,
} from 'class-validator';

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
  tipo:
    | 'primera_vez'
    | 'pre_quirurgico'
    | 'control'
    | 'practica'
    | 'tratamiento_en_consultorio'
    | 'libre';

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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tratamientoIds?: string[]; // IDs of selected Tratamiento catalog items

  @IsOptional()
  @IsBoolean()
  consumirInsumos?: boolean; // Whether to create OrdenConsumo

  @IsOptional()
  @IsString()
  turnoId?: string; // Present when called from LiveTurno, null from PatientDrawer

  @IsOptional()
  @IsEnum(['CONSULTA_CIRUGIA', 'TRATAMIENTO', 'CONTROL', 'SEGUIMIENTO', 'PREOPERATORIO'])
  tipoEntrada?: 'CONSULTA_CIRUGIA' | 'TRATAMIENTO' | 'CONTROL' | 'SEGUIMIENTO' | 'PREOPERATORIO';
}
