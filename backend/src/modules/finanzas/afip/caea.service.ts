import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { EstadoFactura } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { WSAA_SERVICE } from '../../wsaa/wsaa.constants';
import { WsaaServiceInterface } from '../../wsaa/wsaa.interfaces';
import { AfipBusinessError, AfipTransientError } from './afip.errors';

@Injectable()
export class CaeaService {
  readonly logger = new Logger(CaeaService.name);

  constructor(
    @Inject(WSAA_SERVICE) private readonly wsaaService: WsaaServiceInterface,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Calls FECAEASolicitar SOAP and upserts the resulting CaeaVigente row.
   * Throws AfipBusinessError if AFIP returns Resultado='R'.
   * Throws AfipTransientError if the HTTP call fails (network error, timeout, etc.).
   */
  async solicitarYPersistir(
    profesionalId: string,
    periodo: string,
    orden: 1 | 2,
  ): Promise<void> {
    const { token, sign } = await this.wsaaService.getTicket(profesionalId, 'wsfe');

    const cfg = await this.prisma.configuracionAFIP.findUniqueOrThrow({
      where: { profesionalId },
      select: { cuit: true, ptoVta: true, ambiente: true },
    });

    const url = this.buildWsfev1Url(cfg.ambiente);

    const envelope = this.buildFECAEASolicitarEnvelope(token, sign, cfg.cuit, periodo, orden);

    let xml: string;
    try {
      const res = await axios.post(url, envelope, {
        headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '' },
        timeout: 30_000,
      });
      xml = res.data as string;
    } catch (err: any) {
      throw new AfipTransientError(
        `FECAEASolicitar network error: ${err?.message ?? String(err)}`,
      );
    }

    const resultado = (xml.match(/<Resultado>([AR])<\/Resultado>/) ?? [])[1] ?? '';
    if (resultado === 'R') {
      const msgMatches = [...xml.matchAll(/<Msg>(.*?)<\/Msg>/g)].map((m) => m[1]);
      throw new AfipBusinessError(
        msgMatches.length > 0 ? msgMatches : ['AFIP rechazó la solicitud CAEA.'],
        {} as any,
      );
    }

    const caea = (xml.match(/<CAEA>(\w{14})<\/CAEA>/) ?? [])[1] ?? '';
    const fchVigDesde = (xml.match(/<FchVigDesde>(\d{8})<\/FchVigDesde>/) ?? [])[1] ?? '';
    const fchVigHasta = (xml.match(/<FchVigHasta>(\d{8})<\/FchVigHasta>/) ?? [])[1] ?? '';
    const fchTopeInf = (xml.match(/<FchTopeInf>(\d{8})<\/FchTopeInf>/) ?? [])[1] ?? '';

    await this.prisma.caeaVigente.upsert({
      where: {
        profesionalId_periodo_orden: {
          profesionalId,
          periodo,
          orden: Number(orden),
        },
      },
      create: {
        profesionalId,
        cuit: cfg.cuit,
        caea,
        periodo,
        orden: Number(orden),
        fchVigDesde,
        fchVigHasta,
        fchTopeInf,
      },
      update: {
        caea,
        fchVigDesde,
        fchVigHasta,
        fchTopeInf,
      },
    });

    this.logger.log(
      `CAEA ${caea} upserted for profesional ${profesionalId} periodo ${periodo} orden ${orden}`,
    );
  }

  /**
   * Assigns the current CaeaVigente to an invoice in EMISION_PENDIENTE state,
   * transitioning it to CAEA_PENDIENTE_INFORMAR.
   * If no valid CaeaVigente exists for today, logs error and returns without updating.
   */
  async asignarCaeaFallback(facturaId: string, profesionalId: string): Promise<void> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const caeaVigente = await this.prisma.caeaVigente.findFirst({
      where: {
        profesionalId,
        fchVigDesde: { lte: today },
        fchVigHasta: { gte: today },
      },
    });

    if (!caeaVigente) {
      this.logger.error(
        `No CaeaVigente found for profesional ${profesionalId} on ${today} — Factura ${facturaId} left in EMISION_PENDIENTE`,
      );
      return;
    }

    const cbteFchHsGen = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);

    await this.prisma.factura.update({
      where: { id: facturaId },
      data: {
        cae: caeaVigente.caea,
        estado: EstadoFactura.CAEA_PENDIENTE_INFORMAR,
        cbteFchHsGen,
      },
    });

    this.logger.log(
      `CAEA fallback assigned to factura ${facturaId}: CAEA=${caeaVigente.caea} estado=CAEA_PENDIENTE_INFORMAR`,
    );
  }

  /**
   * Stub shell — full implementation in Plan 03.
   * Calls FECAEARegInformativo to inform a CAEA_PENDIENTE_INFORMAR invoice to AFIP.
   */
  async informarFactura(facturaId: string, profesionalId: string): Promise<void> {
    void facturaId;
    void profesionalId;
    throw new Error('Not implemented — implemented in Plan 03');
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildWsfev1Url(ambiente: string): string {
    return ambiente === 'PRODUCCION'
      ? this.config.get(
          'AFIP_WSFEV1_URL_PROD',
          'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
        )
      : this.config.get(
          'AFIP_WSFEV1_URL_HOMO',
          'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
        );
  }

  private buildFECAEASolicitarEnvelope(
    token: string,
    sign: string,
    cuit: string,
    periodo: string,
    orden: 1 | 2,
  ): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FECAEASolicitar>
      <ar:Auth><ar:Token>${token}</ar:Token><ar:Sign>${sign}</ar:Sign><ar:Cuit>${cuit}</ar:Cuit></ar:Auth>
      <ar:Periodo>${periodo}</ar:Periodo>
      <ar:Orden>${orden}</ar:Orden>
    </ar:FECAEASolicitar>
  </soapenv:Body>
</soapenv:Envelope>`;
  }
}
