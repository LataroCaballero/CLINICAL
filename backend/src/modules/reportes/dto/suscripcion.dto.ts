import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { TipoReporteEmail, FrecuenciaReporte } from '@prisma/client';

export class CreateSuscripcionDto {
  @IsEnum(TipoReporteEmail)
  tipoReporte: TipoReporteEmail;

  @IsEnum(FrecuenciaReporte)
  frecuencia: FrecuenciaReporte;

  @IsOptional()
  @IsEmail()
  emailDestino?: string;
}

export class UpdateSuscripcionDto {
  @IsOptional()
  @IsEnum(FrecuenciaReporte)
  frecuencia?: FrecuenciaReporte;

  @IsOptional()
  @IsEmail()
  emailDestino?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class SendTestReportDto {
  @IsEnum(TipoReporteEmail)
  tipoReporte: TipoReporteEmail;

  @IsOptional()
  @IsEmail()
  emailDestino?: string;
}
