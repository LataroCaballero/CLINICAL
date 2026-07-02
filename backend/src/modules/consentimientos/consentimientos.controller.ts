import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Param,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ConsentimientosService } from './consentimientos.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { RolUsuario } from '@prisma/client';

// Minimal multer file shape — avoids requiring @types/multer as an explicit dep
// (multer ships as a transitive dep of @nestjs/platform-express, types may not be installed)
interface MulterFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Controller('consentimientos')
@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA')
export class ConsentimientosController {
  constructor(
    private readonly service: ConsentimientosService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Resolves profesionalId from JWT scope.
   * Copied from catalogo-hc.controller.ts — pattern: copy, not extract to shared.
   *
   * Rules (T-53-08):
   *   - PROFESIONAL: ID comes from DB lookup (usuarioId in JWT).
   *   - SECRETARIA / ADMIN: ID must be passed as query param (never body).
   *   - profesionalId is NEVER read from the request body.
   */
  private async getProfesionalId(
    user: any,
    targetProfesionalId?: string,
  ): Promise<string> {
    if (
      (user.rol === RolUsuario.SECRETARIA || user.rol === RolUsuario.ADMIN) &&
      targetProfesionalId
    ) {
      return targetProfesionalId;
    }

    if (user.rol !== RolUsuario.PROFESIONAL) {
      throw new ForbiddenException(
        'Se requiere profesionalId para gestionar consentimientos',
      );
    }

    const profesional = await this.prisma.profesional.findUnique({
      where: { usuarioId: user.userId },
    });

    if (!profesional) {
      throw new ForbiddenException('Perfil profesional no encontrado');
    }

    return profesional.id;
  }

  /**
   * POST /consentimientos/zonas/:zonaId/pdf
   *
   * Uploads a consent PDF for the given zona. Enforces:
   *   - 10 MB file size cap (D-11, T-53-07) via FileInterceptor limits.
   *   - memoryStorage so file.buffer is available without disk temp files.
   *   - Magic-byte validation delegated to service (D-14, T-53-06).
   *   - Ownership scoped to JWT-resolved profesionalId (T-53-08).
   */
  @Post('zonas/:zonaId/pdf')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB cap (D-11)
    }),
  )
  async uploadPdf(
    @Param('zonaId') zonaId: string,
    @UploadedFile() file: MulterFile,
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.service.uploadConsentimiento(
      pid,
      zonaId,
      file.buffer,
      file.originalname,
    );
  }

  /**
   * GET /consentimientos/zonas
   *
   * Returns the professional's active zonas with their vigente consent and indicacionesUrl.
   */
  @Get('zonas')
  async getZonasConConsentimiento(
    @Req() req: any,
    @Query('profesionalId') profesionalId?: string,
  ) {
    const pid = await this.getProfesionalId(req.user, profesionalId);
    return this.service.getZonasConConsentimiento(pid);
  }
}
