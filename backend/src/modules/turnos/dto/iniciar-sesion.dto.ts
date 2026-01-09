import { IsISO8601, IsOptional } from 'class-validator';

export class IniciarSesionDto {
  @IsOptional()
  @IsISO8601()
  inicioReal?: string;
}
