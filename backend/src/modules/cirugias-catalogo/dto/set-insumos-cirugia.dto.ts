import {
  IsArray,
  IsString,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InsumoItemCirugiaDto {
  @IsString()
  productoId: string;

  @IsNumber()
  @Min(0.001)
  cantidad: number;
}

export class SetInsumosCirugiaDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InsumoItemCirugiaDto)
  insumos: InsumoItemCirugiaDto[];
}
