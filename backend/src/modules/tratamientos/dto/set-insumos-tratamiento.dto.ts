import {
  IsArray,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InsumoItemDto {
  @IsString()
  productoId: string;

  @IsNumber()
  @Min(0.001)
  cantidad: number;
}

export class SetInsumosTratamientoDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InsumoItemDto)
  insumos: InsumoItemDto[];
}
