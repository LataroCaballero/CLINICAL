import { IsString } from "class-validator";

export class CreateTratamientoDto {
    @IsString()
    nombre: string;
}
