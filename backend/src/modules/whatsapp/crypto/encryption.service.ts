import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const hexKey = this.configService.get<string>('ENCRYPTION_KEY', '');

    if (!hexKey || hexKey.length !== 64) {
      const msg =
        'ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes for AES-256-GCM). ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"';
      this.logger.warn(msg);
      // Use a deterministic fallback for dev/test — NOT for production
      const fallback = '0000000000000000000000000000000000000000000000000000000000000000';
      this.key = Buffer.from(fallback, 'hex');
    } else {
      this.key = Buffer.from(hexKey, 'hex');
    }
  }

  /**
   * Encrypts plaintext using AES-256-GCM.
   * Returns `iv:authTag:ciphertext` as base64 segments joined by `:`.
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  }

  /**
   * Decrypts a value previously encrypted with `encrypt()`.
   * Expects format: `iv:authTag:ciphertext` in base64.
   */
  decrypt(stored: string): string {
    const parts = stored.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted value format — expected iv:authTag:ciphertext');
    }

    const [ivB64, authTagB64, ciphertextB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }
}
