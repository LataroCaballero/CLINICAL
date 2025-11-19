import { IsOptional, IsString, MinLength } from 'class-validator';

export class SearchPacienteDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  q?: string; // nombre, dni, teléfono

  @IsOptional()
  @IsString()
  dni?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  nombre?: string;
}
