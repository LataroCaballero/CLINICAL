import {
  IsArray,
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
  @Min(1)
  cantidad: number;

  @IsNumber()
  @IsPositive()
  precioUnitario: number;
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
}
