import { PrismaService } from '../../../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
export declare class UsuariosService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        nombre: string;
        apellido: string;
        email: string;
        rol: import(".prisma/client").$Enums.RolUsuario;
        id: string;
        telefono: string;
        createdAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        nombre: string;
        apellido: string;
        email: string;
        rol: import(".prisma/client").$Enums.RolUsuario;
        id: string;
        telefono: string;
        createdAt: Date;
    }>;
    create(dto: CreateUsuarioDto): Promise<{
        nombre: string;
        apellido: string;
        email: string;
        rol: import(".prisma/client").$Enums.RolUsuario;
        id: string;
        telefono: string;
    }>;
    update(id: string, dto: UpdateUsuarioDto): Promise<{
        nombre: string;
        apellido: string;
        email: string;
        rol: import(".prisma/client").$Enums.RolUsuario;
        id: string;
        telefono: string;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
