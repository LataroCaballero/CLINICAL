import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class CerrarSesionDto {
  @IsOptional()
  @IsISO8601()
  finReal?: string;

  @IsOptional()
  @IsUUID()
  entradaHCId?: string;
}
