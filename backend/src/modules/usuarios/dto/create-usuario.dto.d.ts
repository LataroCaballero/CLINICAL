import { RolUsuario } from '@prisma/client';
export declare class CreateUsuarioDto {
    nombre: string;
    apellido: string;
    email: string;
    password: string;
    rol: RolUsuario;
    telefono?: string;
}
