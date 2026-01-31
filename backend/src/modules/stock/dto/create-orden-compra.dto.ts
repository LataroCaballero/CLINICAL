import {
  IsUUID,
  IsArray,
  ValidateNested,
  IsNumber,
  IsPositive,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrdenCompraItemDto {
  @IsUUID()
  productoId: string;

  @IsNumber()
  @IsPositive()
  cantidad: number;

  @IsNumber()
  @Min(0)
  precioUnitario: number;
}

export class CreateOrdenCompraDto {
  @IsUUID()
  proveedorId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrdenCompraItemDto)
  items: OrdenCompraItemDto[];
}
