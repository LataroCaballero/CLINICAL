import { IsISO8601, IsOptional, IsUUID } from "class-validator";

export class FindTurnosDto {
    @IsOptional()
    @IsUUID()
    pacienteId?: string;

    @IsOptional()
    @IsUUID()
    profesionalId?: string;

    // Fecha base para agenda o filtros (ISO)
    @IsOptional()
    @IsISO8601()
    desde?: string;
}