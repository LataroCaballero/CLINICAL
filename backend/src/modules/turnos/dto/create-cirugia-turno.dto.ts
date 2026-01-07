import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { TipoAnestesia } from '@prisma/client';

export class CreateCirugiaTurnoDto {
  @IsString()
  pacienteId: string;

  @IsString()
  profesionalId: string;

  @IsDateString()
  fecha: string;

  @IsString()
  horaInicio: string;

  @IsString()
  procedimiento: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsEnum(TipoAnestesia)
  tipoAnestesia?: TipoAnestesia;

  @IsOptional()
  @IsString()
  quirofano?: string;

  @IsOptional()
  @IsString()
  ayudante?: string;

  @IsOptional()
  @IsString()
  anestesiologo?: string;

  @IsOptional()
  @IsString()
  notasPreoperatorias?: string;

  @IsOptional()
  duracionMinutos?: number;
}
