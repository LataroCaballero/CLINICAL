import { IsString, IsEnum, IsOptional, IsArray } from 'class-validator';
import { TipoMensajeWA } from '@prisma/client';

export class SendWaMessageDto {
  @IsString() pacienteId: string;
  @IsString() templateName: string;
  @IsString() @IsOptional() languageCode?: string; // default 'es'
  @IsEnum(TipoMensajeWA) tipo: TipoMensajeWA;
  @IsArray() @IsOptional() components?: object[];
}

export class SendWaFreeTextDto {
  @IsString() pacienteId: string;
  @IsString() texto: string;
}
