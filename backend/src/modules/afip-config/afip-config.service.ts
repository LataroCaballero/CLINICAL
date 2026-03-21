import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../whatsapp/crypto/encryption.service';
import * as crypto from 'crypto';
import axios from 'axios';
import { AmbienteAFIP } from '@prisma/client';
import { SaveCertDto } from './dto/save-cert.dto';
import { SaveBillingConfigDto } from './dto/save-billing-config.dto';
import { AfipConfigStatusResponse, CertStatus } from './dto/afip-config-status.dto';
import { WSAA_SERVICE } from '../wsaa/wsaa.constants';
import { WsaaServiceInterface } from '../wsaa/wsaa.interfaces';

interface CertInfo {
  cuit: string;
  expiresAt: Date;
}

@Injectable()
export class AfipConfigService {
  private readonly logger = new Logger(AfipConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    @Inject(WSAA_SERVICE) private readonly wsaaService: WsaaServiceInterface,
  ) {}

  extractCertInfo(certPem: string): CertInfo {
    let cert: crypto.X509Certificate;
    try {
      cert = new crypto.X509Certificate(certPem);
    } catch {
      throw new BadRequestException(
        'El certificado no es un PEM válido. Verificá que pegaste el bloque completo incluyendo -----BEGIN CERTIFICATE-----.',
      );
    }

    const subject = cert.subject;
    // Node.js X509Certificate.subject uses newline-separated key=value pairs
    // AFIP production certs use: serialNumber=CUIT 20123456789 (lowercase serialNumber)
    // Some certs use: CN=20123456789
    const cuitMatch =
      subject.match(/serialNumber=CUIT\s+(\d{11})/i) ||
      subject.match(/SERIALNUMBER=CUIT\s+(\d{11})/i) ||
      subject.match(/(?:^|\n)CN=(\d{11})(?:\n|$)/);

    if (!cuitMatch) {
      throw new BadRequestException(
        `No se pudo extraer el CUIT del certificado. Subject: "${subject}". ` +
          'Verificá que el certificado corresponda a uno emitido por AFIP para un CUIT argentino.',
      );
    }

    return {
      cuit: cuitMatch[1],
      expiresAt: new Date(cert.validTo),
    };
  }

  async getStatus(profesionalId: string): Promise<AfipConfigStatusResponse> {
    const cfg = await this.prisma.configuracionAFIP.findUnique({
      where: { profesionalId },
      select: {
        cuit: true,
        ptoVta: true,
        ambiente: true,
        certExpiresAt: true,
        // NEVER select certPemEncrypted or keyPemEncrypted
      },
    });

    if (!cfg) {
      return { configured: false, certStatus: 'NOT_CONFIGURED' };
    }

    const now = new Date();
    const expiresAt = cfg.certExpiresAt;
    const msLeft = expiresAt.getTime() - now.getTime();
    const daysUntilExpiry = Math.floor(msLeft / (1000 * 60 * 60 * 24));

    let certStatus: CertStatus;
    if (daysUntilExpiry < 0) {
      certStatus = 'EXPIRED';
    } else if (daysUntilExpiry <= 30) {
      certStatus = 'EXPIRING_SOON';
    } else {
      certStatus = 'OK';
    }

    return {
      configured: true,
      cuit: cfg.cuit,
      ptoVta: cfg.ptoVta,
      ambiente: cfg.ambiente,
      certExpiresAt: expiresAt.toISOString(),
      certStatus,
      daysUntilExpiry,
    };
  }

  async saveCert(
    profesionalId: string,
    dto: SaveCertDto,
  ): Promise<AfipConfigStatusResponse> {
    const { cuit, expiresAt } = this.extractCertInfo(dto.certPem);

    // Obtain access ticket from WSAA using the uploaded cert+key (not yet persisted)
    const { token, sign } = await this.wsaaService.getTicketTransient(
      dto.certPem,
      dto.keyPem,
      dto.ambiente,
      'wsfe',
    );

    // Validate ptoVta type via FEParamGetPtosVenta
    await this.validatePtoVta(token, sign, cuit, dto.ptoVta, dto.ambiente);

    // Encrypt and persist
    const certPemEncrypted = this.encryption.encrypt(dto.certPem);
    const keyPemEncrypted = this.encryption.encrypt(dto.keyPem);

    await this.prisma.configuracionAFIP.upsert({
      where: { profesionalId },
      create: {
        profesionalId,
        cuit,
        certPemEncrypted,
        keyPemEncrypted,
        certExpiresAt: expiresAt,
        ptoVta: dto.ptoVta,
        ambiente: dto.ambiente,
      },
      update: {
        cuit,
        certPemEncrypted,
        keyPemEncrypted,
        certExpiresAt: expiresAt,
        ptoVta: dto.ptoVta,
        ambiente: dto.ambiente,
      },
    });

    // Warm Redis cache — first invoice emission will hit cache, not WSAA
    try {
      await this.wsaaService.getTicket(profesionalId, 'wsfe');
    } catch (err) {
      this.logger.warn('Cache warm failed after cert save — non-blocking', err);
    }

    return this.getStatus(profesionalId);
  }

  async saveBillingConfig(
    profesionalId: string,
    dto: SaveBillingConfigDto,
  ): Promise<AfipConfigStatusResponse> {
    const cfg = await this.prisma.configuracionAFIP.findUniqueOrThrow({
      where: { profesionalId },
    });
    const certPem = this.encryption.decrypt(cfg.certPemEncrypted);
    const keyPem = this.encryption.decrypt(cfg.keyPemEncrypted);

    const { token, sign } = await this.wsaaService.getTicketTransient(certPem, keyPem, dto.ambiente, 'wsfe');
    await this.validatePtoVta(token, sign, cfg.cuit, dto.ptoVta, dto.ambiente);

    await this.prisma.configuracionAFIP.update({
      where: { profesionalId },
      data: { ptoVta: dto.ptoVta, ambiente: dto.ambiente },
    });

    return this.getStatus(profesionalId);
  }

  private async validatePtoVta(
    token: string,
    sign: string,
    cuit: string,
    ptoVta: number,
    ambiente: AmbienteAFIP,
  ): Promise<void> {
    const wsfev1Url =
      ambiente === 'PRODUCCION'
        ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx'
        : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx';

    const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/><soapenv:Body><ar:FEParamGetPtosVenta><ar:Auth><ar:Token>${token}</ar:Token><ar:Sign>${sign}</ar:Sign><ar:Cuit>${cuit}</ar:Cuit></ar:Auth></ar:FEParamGetPtosVenta></soapenv:Body>
</soapenv:Envelope>`;

    let xml: string;
    try {
      const res = await axios.post(wsfev1Url, envelope, {
        headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '' },
        timeout: 10_000,
      });
      xml = res.data;
    } catch {
      throw new ServiceUnavailableException(
        'AFIP no está disponible. Intentá guardar nuevamente en unos minutos.',
      );
    }

    // NOTE: Verify element name against live WSDL during integration testing.
    // Fetch: https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL and grep for EmisionTipo/TipoEmision.
    // The pattern below handles both known variants.
    const emTipoMatch = xml.match(
      /<(?:EmisionTipo|TipoEmision)>(.*?)<\/(?:EmisionTipo|TipoEmision)>/g,
    );
    const nroMatch = xml.match(/<Nro>(\d+)<\/Nro>/g);

    if (!emTipoMatch || !nroMatch) {
      throw new BadRequestException(
        `El punto de venta ${ptoVta} no existe o no es de tipo RECE (CAE). ` +
          'Verificá en el portal AFIP que el punto de venta esté habilitado como tipo RECE.',
      );
    }

    const entries = nroMatch.map((n, i) => ({
      nro: parseInt(n.replace(/<\/?Nro>/g, '')),
      tipo: (emTipoMatch[i] || '').replace(/<[^>]+>/g, ''),
    }));

    const matched = entries.find((e) => e.nro === ptoVta);
    if (!matched || matched.tipo !== 'CAE') {
      throw new BadRequestException(
        `El punto de venta ${ptoVta} no existe o no es de tipo RECE (CAE). ` +
          'Verificá en el portal AFIP que el punto de venta esté habilitado como tipo RECE.',
      );
    }
  }
}
