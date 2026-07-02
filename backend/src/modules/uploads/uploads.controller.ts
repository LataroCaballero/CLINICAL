import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { StorageService } from '../storage/storage.service';

/**
 * Public file-serving controller for uploaded PDFs.
 *
 * No @Auth() — intentionally public per D-09.
 * Security: unguessable UUID filename + Content-Disposition: attachment + strict throttle.
 *
 * Class-level @Throttle applies the strict public tier (20 req/min) on top of the global
 * ThrottlerGuard (100 req/60s). Both public routes (presupuestos/public and this one) must
 * carry this strict tier (D-08).
 */
@Throttle({ default: { ttl: 60000, limit: 20 } })
@Controller('uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  /**
   * GET /uploads/:profesionalId/:filename
   * Streams a stored PDF with Content-Disposition: attachment (D-15).
   * Path-traversal attempts are rejected via StorageService.resolvePath (D-10).
   */
  @Get(':profesionalId/:filename')
  async serveFile(
    @Param('profesionalId') profesionalId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const relativePath = `${profesionalId}/${filename}`;

    let buffer: Buffer;
    try {
      // readFile internally calls resolvePath, which throws BadRequestException on traversal
      buffer = await this.storage.readFile(relativePath);
    } catch (err: any) {
      if (err?.code === 'ENOENT') {
        throw new NotFoundException('Archivo no encontrado');
      }
      // Re-throw BadRequestException (path traversal) and any other errors as-is
      throw err;
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
