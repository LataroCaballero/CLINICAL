import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class EnviarEmailPresupuestoDto {
  @IsEmail()
  emailDestino: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notaCoordinador?: string;
}
