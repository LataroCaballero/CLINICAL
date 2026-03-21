import { IsString, IsNotEmpty, IsInt, IsPositive, IsEnum } from 'class-validator';
import { AmbienteAFIP } from '@prisma/client';

export class SaveCertDto {
  @IsString()
  @IsNotEmpty()
  certPem: string;

  @IsString()
  @IsNotEmpty()
  keyPem: string;

  @IsInt()
  @IsPositive()
  ptoVta: number;

  @IsEnum(AmbienteAFIP)
  ambiente: AmbienteAFIP;
}
