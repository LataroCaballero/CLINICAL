import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ConsentimientosService {
  private readonly logger = new Logger(ConsentimientosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Uploads a consent PDF for a zona.
   *
   * Security pipeline (D-14, INFRA-03, T-53-06, T-53-08):
   *   1. Ownership guard — zona must belong to profesionalId from JWT scope.
   *   2. Magic-byte validation — buffer must start with '%PDF-' (not client MIME header).
   *      Non-PDF → BadRequestException BEFORE any I/O (nothing persists, D-14).
   *   3. Save to disk via StorageService (UUID filename, D-13).
   *   4. Version roll — prior vigente row set false, new vigente row created (D-05).
   */
  async uploadConsentimiento(
    profesionalId: string,
    zonaId: string,
    buffer: Buffer,
    originalName: string,
  ) {
    // Step 1: Ownership guard (T-53-08)
    const zona = await this.prisma.zonaHC.findUnique({ where: { id: zonaId } });
    if (!zona || zona.profesionalId !== profesionalId) {
      throw new NotFoundException('Zona no encontrada');
    }

    // Step 2: Magic-byte validation (D-14, INFRA-03 / T-53-06)
    // Validates actual buffer content, NOT the client-supplied MIME header.
    // A non-PDF rejected here never reaches StorageService.save — no file persists.
    if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
      throw new BadRequestException('El archivo no es un PDF válido');
    }

    // Step 3: Persist file via StorageService (UUID filename, D-13)
    const filePath = await this.storage.save(buffer, profesionalId);

    // Step 4a: Compute next version number for this zona (D-03 — incremental per zona)
    const maxVersionResult =
      await this.prisma.consentimientoZonaArchivo.aggregate({
        where: { zonaId },
        _max: { version: true },
      });
    const nextVersion = (maxVersionResult._max.version ?? 0) + 1;

    // Step 4b: Version-roll — mark prior vigente=false, create new vigente row (D-05)
    // new row carries nextVersion (D-03)
    const [, createdRow] = await this.prisma.$transaction([
      this.prisma.consentimientoZonaArchivo.updateMany({
        where: { zonaId, vigente: true },
        data: { vigente: false },
      }),
      this.prisma.consentimientoZonaArchivo.create({
        data: {
          zonaId,
          profesionalId,
          path: filePath,
          nombreOriginal: originalName,
          vigente: true,
          version: nextVersion,
        },
      }),
    ]);

    return {
      ...createdRow,
      url: this.storage.getPublicUrl(filePath),
    };
  }

  /**
   * Returns the professional's active ZonaHC list, each with:
   *   - The single vigente consent file (or null if none uploaded yet)
   *   - indicacionesUrl (CONS-02)
   */
  async getZonasConConsentimiento(profesionalId: string) {
    const zonas = await this.prisma.zonaHC.findMany({
      where: { profesionalId, activo: true },
      orderBy: { orden: 'asc' },
      include: {
        consentimientoArchivos: {
          where: { vigente: true },
          orderBy: { uploadedAt: 'desc' },
          take: 1,
        },
      },
    });

    return zonas.map((zona) => {
      const archivo = zona.consentimientoArchivos[0] ?? null;
      return {
        id: zona.id,
        nombre: zona.nombre,
        orden: zona.orden,
        esSistema: zona.esSistema,
        indicacionesUrl: zona.indicacionesUrl ?? null,
        consentimientoVigente: archivo
          ? {
              ...archivo,
              url: this.storage.getPublicUrl(archivo.path),
            }
          : null,
      };
    });
  }
}
