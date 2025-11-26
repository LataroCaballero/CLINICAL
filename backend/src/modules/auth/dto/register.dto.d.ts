import { RolUsuario } from '@prisma/client';
export declare class RegisterDto {
    nombre: string;
    apellido: string;
    email: string;
    password: string;
    rol: RolUsuario;
}
