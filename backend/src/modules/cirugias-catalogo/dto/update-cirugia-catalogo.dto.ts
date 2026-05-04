import { PartialType } from '@nestjs/mapped-types';
import { CreateCirugiaCatalogoDto } from './create-cirugia-catalogo.dto';

export class UpdateCirugiaCatalogoDto extends PartialType(CreateCirugiaCatalogoDto) {}
