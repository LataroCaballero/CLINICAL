import { IsOptional, IsString, IsInt, Min } from 'class-validator';

export class UpdateProfesionalDto {
  @IsOptional()
  @IsString()
  matricula?: string;

  @IsOptional()
  @IsString()
  especialidad?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  duracionDefault?: number;
}
