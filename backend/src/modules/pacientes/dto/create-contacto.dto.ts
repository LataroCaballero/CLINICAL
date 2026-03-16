import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { TipoContacto, EtapaCRM, TemperaturaPaciente } from '@prisma/client';

export class CreateContactoDto {
  @IsEnum(TipoContacto)
  tipo: TipoContacto;

  @IsOptional()
  @IsString()
  nota?: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsEnum(EtapaCRM)
  etapaCRM?: EtapaCRM;

  @IsOptional()
  @IsEnum(TemperaturaPaciente)
  temperatura?: TemperaturaPaciente;

  @IsOptional()
  @IsDateString()
  proximaAccionFecha?: string;
}
