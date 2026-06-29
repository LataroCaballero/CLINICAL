import * as os from 'os';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { BadRequestException } from '@nestjs/common';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;
  let uploadDir: string;
  const originalUploadDir = process.env.UPLOAD_DIR;

  beforeEach(async () => {
    // Use a unique temp directory per test run
    uploadDir = path.join(os.tmpdir(), `storage-test-${Date.now()}`);
    process.env.UPLOAD_DIR = uploadDir;
    // Re-instantiate so the service picks up the new UPLOAD_DIR
    service = new StorageService();
  });

  afterEach(async () => {
    // Restore env
    if (originalUploadDir === undefined) {
      delete process.env.UPLOAD_DIR;
    } else {
      process.env.UPLOAD_DIR = originalUploadDir;
    }
    // Clean up temp dir
    try {
      await fs.rm(uploadDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  describe('save()', () => {
    it('should create the directory and write a file, returning a relative path', async () => {
      const buffer = Buffer.from('test pdf content');
      const profesionalId = 'prof-abc-123';

      const relativePath = await service.save(buffer, profesionalId);

      // Return value format: {profesionalId}/{uuid}.pdf
      expect(relativePath).toMatch(
        new RegExp(`^${profesionalId}/[0-9a-f-]{36}\\.pdf$`),
      );

      // File should actually exist on disk
      const absolutePath = path.join(uploadDir, relativePath);
      const fileExists = await fs
        .access(absolutePath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('should write file content correctly', async () => {
      const content = 'specific pdf content';
      const buffer = Buffer.from(content);
      const profesionalId = 'prof-def-456';

      const relativePath = await service.save(buffer, profesionalId);
      const absolutePath = path.join(uploadDir, relativePath);

      const fileContent = await fs.readFile(absolutePath);
      expect(fileContent.toString()).toBe(content);
    });

    it('should create different UUID filenames for each call', async () => {
      const buffer = Buffer.from('test');
      const profesionalId = 'prof-uuid-test';

      const path1 = await service.save(buffer, profesionalId);
      const path2 = await service.save(buffer, profesionalId);

      expect(path1).not.toBe(path2);
    });

    it('should support a custom extension via originalExt', async () => {
      const buffer = Buffer.from('test content');
      const profesionalId = 'prof-ext-test';

      const relativePath = await service.save(buffer, profesionalId, '.pdf');

      expect(relativePath).toMatch(/\.pdf$/);
    });

    it('should use forward slashes in the returned path', async () => {
      const buffer = Buffer.from('test');
      const profesionalId = 'prof-slash-test';

      const relativePath = await service.save(buffer, profesionalId);

      expect(relativePath).toContain('/');
      expect(relativePath).not.toContain('\\');
    });
  });

  describe('resolvePath()', () => {
    it('should return an absolute path inside the uploads root', async () => {
      // Create a file first so the path exists
      const buffer = Buffer.from('test');
      const relativePath = await service.save(buffer, 'prof-resolve-test');

      const absolutePath = service.resolvePath(relativePath);

      expect(path.isAbsolute(absolutePath)).toBe(true);
      expect(absolutePath.startsWith(uploadDir)).toBe(true);
    });

    it('should throw BadRequestException for path traversal with ../', () => {
      expect(() => service.resolvePath('../escape')).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for path traversal with encoded ../', () => {
      expect(() => service.resolvePath('../../etc/passwd')).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for absolute paths', () => {
      expect(() => service.resolvePath('/etc/passwd')).toThrow(BadRequestException);
    });

    it('should NOT throw for a valid relative path', async () => {
      const buffer = Buffer.from('test');
      const relativePath = await service.save(buffer, 'prof-valid');

      expect(() => service.resolvePath(relativePath)).not.toThrow();
    });
  });

  describe('getPublicUrl()', () => {
    it('should return the correct public URL using BACKEND_URL env var', () => {
      process.env.BACKEND_URL = 'https://api.example.com';

      const url = service.getPublicUrl('prof-123/uuid-abc.pdf');

      expect(url).toBe('https://api.example.com/uploads/prof-123/uuid-abc.pdf');
      delete process.env.BACKEND_URL;
    });

    it('should use http://localhost:3001 fallback when BACKEND_URL is not set', () => {
      delete process.env.BACKEND_URL;

      const url = service.getPublicUrl('prof-456/uuid-xyz.pdf');

      expect(url).toBe('http://localhost:3001/uploads/prof-456/uuid-xyz.pdf');
    });
  });

  describe('readFile()', () => {
    it('should read a file that was previously saved', async () => {
      const content = 'original pdf content';
      const buffer = Buffer.from(content);
      const profesionalId = 'prof-read-test';

      const relativePath = await service.save(buffer, profesionalId);
      const readBuffer = await service.readFile(relativePath);

      expect(readBuffer.toString()).toBe(content);
    });

    it('should throw for path traversal in readFile', async () => {
      await expect(service.readFile('../escape')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
