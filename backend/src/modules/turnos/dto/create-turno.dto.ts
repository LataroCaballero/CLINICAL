import {
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { EstadoTurno } from '@prisma/client';

export class CreateTurnoDto {
  @IsUUID()
  pacienteId!: string;

  @IsUUID()
  profesionalId!: string;

  @IsUUID()
  tipoTurnoId!: string;

  // Enviá ISO string desde el frontend: new Date().toISOString()
  @IsISO8601()
  inicio!: string;

  // Duración en minutos (opcional, si no viene usa duracionDefault del tipoTurno)
  @IsOptional()
  @IsNumber()
  @IsPositive()
  duracionMinutos?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observaciones?: string;

  // MVP: opcional. Si no viene, queda PENDIENTE (por default en Prisma)
  @IsOptional()
  estado?: EstadoTurno;
}
