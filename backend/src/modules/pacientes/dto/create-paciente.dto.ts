import {
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export class CreatePacienteDto {
  @IsString()
  nombreCompleto: string;

  @IsString()
  dni: string;

  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;

  @IsString()
  telefono: string;

  @IsOptional()
  @IsString()
  telefonoAlternativo?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  fotoUrl?: string;

  // Obra social
  @IsOptional()
  @IsString()
  obraSocialId?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  // Alergias y condiciones
  @IsOptional()
  @IsArray()
  alergias?: string[];

  @IsOptional()
  @IsArray()
  condiciones?: string[];

  @IsOptional()
  @IsString()
  diagnostico?: string;

  @IsOptional()
  @IsString()
  tratamiento?: string;

  @IsOptional()
  @IsString()
  deriva?: string;

  @IsOptional()
  @IsString()
  lugarIntervencion?: string;

  @IsOptional()
  @IsString()
  objetivos?: string;

  @IsOptional()
  @IsBoolean()
  consentimientoFirmado?: boolean;
}
