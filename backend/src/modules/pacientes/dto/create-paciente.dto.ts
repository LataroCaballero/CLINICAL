import {
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { EstadoPaciente } from '@prisma/client';

export class CreatePacienteDto {
  // Datos básicos
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

  // Datos médicos
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

  // Consentimientos + indicaciones
  @IsOptional()
  @IsBoolean()
  consentimientoFirmado?: boolean;

  @IsOptional()
  @IsBoolean()
  indicacionesEnviadas?: boolean;

  @IsOptional()
  @IsDateString()
  fechaIndicaciones?: string;

  // Contacto de emergencia
  @IsOptional()
  @IsString()
  contactoEmergenciaNombre?: string;

  @IsOptional()
  @IsString()
  contactoEmergenciaTelefono?: string;

  @IsOptional()
  @IsString()
  contactoEmergenciaRelacion?: string;

  // Profesional asignado
  @IsOptional()
  @IsString()
  profesionalId?: string;

  // Estado inicial del paciente (enum Prisma)
  @IsOptional()
  @IsEnum(EstadoPaciente)
  estado?: EstadoPaciente;
}
