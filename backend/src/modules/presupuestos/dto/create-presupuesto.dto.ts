import {
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PresupuestoItemDto {
  @IsString()
  descripcion: string;

  @IsNumber()
  @IsPositive()
  precioTotal: number;
}

export class CreatePresupuestoDto {
  @IsUUID()
  pacienteId: string;

  @IsUUID()
  profesionalId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PresupuestoItemDto)
  items: PresupuestoItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  descuentos?: number;

  @IsOptional()
  @IsIn(['ARS', 'USD'])
  moneda?: string;

  @IsOptional()
  @IsDateString()
  fechaValidez?: string;
}
