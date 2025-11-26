import { RolUsuario } from '@prisma/client';
export declare class UpdateUsuarioDto {
    nombre?: string;
    apellido?: string;
    email?: string;
    password?: string;
    rol?: RolUsuario;
    telefono?: string;
}
