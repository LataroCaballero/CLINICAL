import { IsString, MinLength } from 'class-validator';

export class CreateDiagnosticoDto {
  @IsString()
  @MinLength(2)
  nombre: string;
}
