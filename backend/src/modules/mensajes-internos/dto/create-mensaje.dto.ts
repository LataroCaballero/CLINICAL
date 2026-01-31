import { IsUUID, IsString, IsEnum, MaxLength } from 'class-validator';

export enum PrioridadMensaje {
  ALTA = 'ALTA',
  MEDIA = 'MEDIA',
  BAJA = 'BAJA',
}

export class CreateMensajeDto {
  @IsUUID()
  pacienteId: string;

  @IsString()
  @MaxLength(2000)
  mensaje: string;

  @IsEnum(PrioridadMensaje)
  prioridad: PrioridadMensaje = PrioridadMensaje.MEDIA;
}
