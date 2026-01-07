import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { RolUsuario } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        rol: true,
        telefono: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        rol: true,
        telefono: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async create(dto: CreateUsuarioDto) {
    // Verificar email único
    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Usar transacción para crear usuario y profesional si corresponde
    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          nombre: dto.nombre,
          apellido: dto.apellido,
          email: dto.email,
          telefono: dto.telefono,
          rol: dto.rol,
          passwordHash,
        },
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true,
          rol: true,
          telefono: true,
        },
      });

      // Crear registro en tabla correspondiente según el rol
      if (dto.rol === RolUsuario.PROFESIONAL) {
        await tx.profesional.create({
          data: {
            usuarioId: usuario.id,
          },
        });
      } else if (dto.rol === RolUsuario.SECRETARIA) {
        await tx.secretaria.create({
          data: {
            usuarioId: usuario.id,
          },
        });
      }

      return usuario;
    });
  }

  async update(id: string, dto: UpdateUsuarioDto) {
    const data: any = { ...dto };

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
      delete data.password;
    }

    return this.prisma.usuario.update({
      where: { id },
      data,
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        rol: true,
        telefono: true,
      },
    });
  }

  async remove(id: string) {
    // Primero verificar que el usuario existe y obtener su rol
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true, rol: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Usar transacción para eliminar registros relacionados
    await this.prisma.$transaction(async (tx) => {
      // Eliminar tokens de refresh y sesiones
      await tx.refreshToken.deleteMany({ where: { userId: id } });
      await tx.authSession.deleteMany({ where: { userId: id } });

      // Eliminar registro según el rol
      if (usuario.rol === RolUsuario.PROFESIONAL) {
        await tx.profesional.deleteMany({ where: { usuarioId: id } });
      } else if (usuario.rol === RolUsuario.SECRETARIA) {
        await tx.secretaria.deleteMany({ where: { usuarioId: id } });
      }

      // Finalmente eliminar el usuario
      await tx.usuario.delete({ where: { id } });
    });

    return { message: 'Usuario eliminado' };
  }
}
