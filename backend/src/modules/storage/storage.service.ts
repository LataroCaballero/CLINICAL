import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadsRoot: string;

  constructor() {
    this.uploadsRoot =
      process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');
  }

  /**
   * Saves a buffer to disk under uploads/{profesionalId}/{uuid}{ext}.
   * Returns the relative path "{profesionalId}/{uuid}.pdf" (forward slashes, D-13).
   * Never uses the client's original filename (D-13).
   */
  async save(
    buffer: Buffer,
    profesionalId: string,
    originalExt = '.pdf',
  ): Promise<string> {
    const dir = path.join(this.uploadsRoot, profesionalId);
    await fs.mkdir(dir, { recursive: true });

    const filename = `${randomUUID()}${originalExt}`;
    await fs.writeFile(path.join(dir, filename), buffer);

    // Return with forward slashes regardless of OS (D-10 / INFRA-01)
    return `${profesionalId}/${filename}`;
  }

  /**
   * Resolves a relative path to an absolute path inside the uploads root.
   * Throws BadRequestException if the resolved path escapes the root (D-10).
   */
  resolvePath(relativePath: string): string {
    // Reject absolute paths before any normalization
    if (path.isAbsolute(relativePath)) {
      throw new BadRequestException('Ruta inválida');
    }

    const normalized = path.normalize(relativePath);

    // After normalization, check for leading '..' segments
    if (normalized.startsWith('..')) {
      throw new BadRequestException('Ruta inválida');
    }

    const absolute = path.resolve(this.uploadsRoot, normalized);

    // Double-check: the relative portion from root must not start with '..'
    // This catches edge cases like symlink attacks or OS-specific normalization issues
    const rel = path.relative(this.uploadsRoot, absolute);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new BadRequestException('Ruta inválida');
    }

    return absolute;
  }

  /**
   * Reads a stored file and returns its contents as a Buffer.
   * Uses resolvePath internally — traversal attempts will throw BadRequestException.
   */
  async readFile(relativePath: string): Promise<Buffer> {
    return fs.readFile(this.resolvePath(relativePath));
  }

  /**
   * Returns the public URL for a stored file.
   * Uses BACKEND_URL env var with http://localhost:3001 fallback (D-09).
   */
  getPublicUrl(relativePath: string): string {
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001';
    if (!process.env.BACKEND_URL) {
      this.logger.warn(
        'BACKEND_URL is not set — using http://localhost:3001. Meta cannot fetch PDFs from localhost in production.',
      );
    }
    return `${backendUrl}/uploads/${relativePath}`;
  }
}
