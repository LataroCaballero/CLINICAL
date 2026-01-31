import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsUUID,
  IsDateString,
} from 'class-validator';

export class CreateLoteDto {
  @IsUUID()
  productoId: string;

  @IsOptional()
  @IsString()
  lote?: string;

  @IsOptional()
  @IsDateString()
  fechaVencimiento?: string;

  @IsNumber()
  @IsPositive()
  cantidadInicial: number;
}
