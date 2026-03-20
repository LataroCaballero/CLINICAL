import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AmbienteAFIP } from '@prisma/client';
import * as forge from 'node-forge';
import axios from 'axios';
import { Mutex } from 'async-mutex';
import type Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../whatsapp/crypto/encryption.service';
import { WSAA_REDIS_CLIENT } from './wsaa.constants';
import { AccessTicket, WsaaServiceInterface } from './wsaa.interfaces';

interface LoadedConfig {
  cuit: string;
  certPem: string;
  keyPem: string;
  ambiente: AmbienteAFIP;
}

@Injectable()
export class WsaaService implements WsaaServiceInterface {
  private readonly logger = new Logger(WsaaService.name);

  /** Per-"profesionalId:cuit" mutex to prevent concurrent WSAA calls */
  private readonly mutexMap = new Map<string, Mutex>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly config: ConfigService,
    @Inject(WSAA_REDIS_CLIENT) private readonly redis: Redis | null,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async getTicket(profesionalId: string, service: string): Promise<AccessTicket> {
    const cfg = await this.loadConfig(profesionalId);
    const mutexKey = `${profesionalId}:${cfg.cuit}`;
    const redisKey = `afip_ta:${profesionalId}:${cfg.cuit}:${service}`;

    const mutex = this.getOrCreateMutex(mutexKey);

    return mutex.runExclusive(async () => {
      // 1. Check Redis cache
      const cached = await this.redisSafeGet(redisKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as {
            token: string;
            sign: string;
            expiresAt: string;
          };
          return {
            token: parsed.token,
            sign: parsed.sign,
            expiresAt: new Date(parsed.expiresAt),
          };
        } catch {
          this.logger.warn(`Failed to parse cached WSAA ticket for key ${redisKey}`);
        }
      }

      // 2. Call WSAA
      const ticket = await this.callWsaa(cfg.certPem, cfg.keyPem, cfg.ambiente, service);

      // 3. Store in Redis with TTL = expiresAt - now - 5min (guard against negative TTL)
      const ttlSeconds = Math.floor(
        (ticket.expiresAt.getTime() - Date.now()) / 1000 - 300,
      );
      if (ttlSeconds > 0) {
        await this.redisSafeSet(redisKey, JSON.stringify(ticket), ttlSeconds);
      } else {
        this.logger.warn(
          `Skipping Redis SET for ${redisKey} — TTL would be ${ttlSeconds}s (ticket expiring soon)`,
        );
      }

      return ticket;
    });
  }

  async getTicketTransient(
    certPem: string,
    keyPem: string,
    ambiente: AmbienteAFIP,
    service: string,
  ): Promise<AccessTicket> {
    // No mutex, no Redis — direct WSAA call with provided credentials
    return this.callWsaa(certPem, keyPem, ambiente, service);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async loadConfig(profesionalId: string): Promise<LoadedConfig> {
    const cfg = await this.prisma.configuracionAFIP.findUniqueOrThrow({
      where: { profesionalId },
      select: {
        cuit: true,
        certPemEncrypted: true,
        keyPemEncrypted: true,
        ambiente: true,
      },
    });

    return {
      cuit: cfg.cuit,
      certPem: this.encryption.decrypt(cfg.certPemEncrypted),
      keyPem: this.encryption.decrypt(cfg.keyPemEncrypted),
      ambiente: cfg.ambiente,
    };
  }

  private getOrCreateMutex(key: string): Mutex {
    if (!this.mutexMap.has(key)) {
      this.mutexMap.set(key, new Mutex());
    }
    return this.mutexMap.get(key)!;
  }

  private buildTra(service: string): string {
    const now = new Date();
    const expiry = new Date(now.getTime() + 600_000); // 10 minutes
    const fmt = (d: Date) => d.toISOString().replace('Z', '-03:00');
    return (
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<loginTicketRequest version="1.0">` +
      `<header>` +
      `<uniqueId>${Date.now()}</uniqueId>` +
      `<generationTime>${fmt(now)}</generationTime>` +
      `<expirationTime>${fmt(expiry)}</expirationTime>` +
      `</header>` +
      `<service>${service}</service>` +
      `</loginTicketRequest>`
    );
  }

  /**
   * Signs TRA XML using node-forge CMS (PKCS#7 SignedData).
   * Returns base64-encoded DER bytes (CMS envelope).
   *
   * CRITICAL: detached: false — AFIP requires content embedded in the envelope.
   */
  signTra(traXml: string, certPem: string, keyPem: string): string {
    const cert = forge.pki.certificateFromPem(certPem);
    const key = forge.pki.privateKeyFromPem(keyPem);

    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(traXml, 'utf8');
    p7.addCertificate(cert);
    p7.addSigner({
      key,
      certificate: cert,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
        { type: forge.pki.oids.messageDigest },
        { type: forge.pki.oids.signingTime, value: new Date().toISOString() },
      ],
    });
    p7.sign({ detached: false });

    return Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), 'binary').toString('base64');
  }

  private async callWsaa(
    certPem: string,
    keyPem: string,
    ambiente: AmbienteAFIP,
    service: string,
  ): Promise<AccessTicket> {
    const wsaaUrl =
      ambiente === AmbienteAFIP.PRODUCCION
        ? (this.config.get<string>('AFIP_WSAA_URL_PROD') ??
          'https://wsaa.afip.gov.ar/ws/services/LoginCms')
        : (this.config.get<string>('AFIP_WSAA_URL_HOMO') ??
          'https://wsaahomo.afip.gov.ar/ws/services/LoginCms');

    const tra = this.buildTra(service);
    const cms = this.signTra(tra, certPem, keyPem);

    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>` +
      `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" ` +
      `xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov/">` +
      `<soapenv:Header/>` +
      `<soapenv:Body>` +
      `<wsaa:loginCms><wsaa:in0>${cms}</wsaa:in0></wsaa:loginCms>` +
      `</soapenv:Body>` +
      `</soapenv:Envelope>`;

    // Errors (network, 5xx) bubble up — callers handle retry logic
    const res = await axios.post(wsaaUrl, soapEnvelope, {
      headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '' },
      timeout: 15_000,
    });

    const xml: string = res.data;
    const tokenMatch = xml.match(/<token>([\s\S]*?)<\/token>/);
    const signMatch = xml.match(/<sign>([\s\S]*?)<\/sign>/);
    const expiryMatch = xml.match(/<expirationTime>([\s\S]*?)<\/expirationTime>/);

    if (!tokenMatch || !signMatch || !expiryMatch) {
      throw new Error(
        `WSAA response missing token/sign/expirationTime. Raw response: ${xml.slice(0, 500)}`,
      );
    }

    // AFIP returns times like "2026-03-20T10:00:00-03:00" — Date parses this correctly
    const expiresAt = new Date(expiryMatch[1].trim());

    return {
      token: tokenMatch[1],
      sign: signMatch[1],
      expiresAt,
    };
  }

  private async redisSafeGet(key: string): Promise<string | null> {
    if (!this.redis) return null;
    try {
      return await this.redis.get(key);
    } catch (err) {
      this.logger.warn(`Redis GET failed for key ${key}: ${String(err)}`);
      return null;
    }
  }

  private async redisSafeSet(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.set(key, value, 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`Redis SET failed for key ${key}: ${String(err)}`);
    }
  }
}
