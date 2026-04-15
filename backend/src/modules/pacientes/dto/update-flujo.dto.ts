import { IsEnum } from 'class-validator';
import { FlujoPaciente } from '@prisma/client';

export class UpdateFlujoDto {
  @IsEnum(FlujoPaciente)
  flujo: FlujoPaciente;
}
