export declare class CreatePacienteDto {
    nombreCompleto: string;
    dni: string;
    fechaNacimiento?: string;
    telefono: string;
    telefonoAlternativo?: string;
    email?: string;
    direccion?: string;
    fotoUrl?: string;
    obraSocialId?: string;
    plan?: string;
    alergias?: string[];
    condiciones?: string[];
    diagnostico?: string;
    tratamiento?: string;
    deriva?: string;
    lugarIntervencion?: string;
    objetivos?: string;
    consentimientoFirmado?: boolean;
}
