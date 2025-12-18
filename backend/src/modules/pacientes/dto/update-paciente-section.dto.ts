import { IsIn, IsObject } from "class-validator";

export class UpdatePacienteSectionDto {
    @IsIn(["personales", "contacto", "emergencia", "cobertura", "clinica", "estado"])
    section: string;

    @IsObject()
    data: Record<string, any>;
}