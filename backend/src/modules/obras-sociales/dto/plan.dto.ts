import { IsString } from "class-validator";

export class CreatePlanDto {
    @IsString()
    nombre: string;

    @IsString()
    cobertura?: string;
}
