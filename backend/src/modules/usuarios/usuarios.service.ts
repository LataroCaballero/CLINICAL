import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { RolUsuario } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CatalogoHCService } from '../catalogo-hc/catalogo-hc.service';

@Injectable()
export class UsuariosService {
  private readonly logger = new Logger(UsuariosService.name);

  constructor(
    private prisma: PrismaService,
    private readonly catalogoHCService: CatalogoHCService,
  ) {}

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
    const { usuario, profesionalId } = await this.prisma.$transaction(
      async (tx) => {
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

        let profesionalId: string | undefined;

        // Crear registro en tabla correspondiente según el rol
        if (dto.rol === RolUsuario.PROFESIONAL) {
          const profesional = await tx.profesional.create({
            data: {
              usuarioId: usuario.id,
            },
          });
          profesionalId = profesional.id;
        } else if (dto.rol === RolUsuario.SECRETARIA) {
          await tx.secretaria.create({
            data: {
              usuarioId: usuario.id,
            },
          });
        }

        return { usuario, profesionalId };
      },
    );

    // After transaction commits, seed the catalog for new professionals.
    // The seed runs OUTSIDE the transaction to avoid long tx duration.
    // Failure is non-blocking — lazy seed via GET covers any failure.
    if (dto.rol === RolUsuario.PROFESIONAL && profesionalId) {
      try {
        await this.catalogoHCService.seedCatalogoInicial(profesionalId);
      } catch (err) {
        this.logger.warn(
          `seedCatalogoInicial falló para profesional ${profesionalId}: ${err?.message}. El lazy seed del GET cubre este fallo.`,
        );
      }
    }

    return usuario;
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
