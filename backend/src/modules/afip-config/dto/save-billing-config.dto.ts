import { IsInt, IsPositive, IsEnum } from 'class-validator';
import { AmbienteAFIP } from '@prisma/client';

export class SaveBillingConfigDto {
  @IsInt()
  @IsPositive()
  ptoVta: number;

  @IsEnum(AmbienteAFIP)
  ambiente: AmbienteAFIP;
}
