import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import axios from 'axios';
import { EstadoFactura } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { WSAA_SERVICE } from '../../wsaa/wsaa.constants';
import { WsaaServiceInterface } from '../../wsaa/wsaa.interfaces';
import { AfipBusinessError, AfipTransientError } from './afip.errors';
import { CAEA_INFORMAR_QUEUE } from '../processors/caea-informar.processor';

/**
 * Maps Prisma CondicionIVA enum values to AFIP integer IDs for FECAEARegInformativo.
 * Same mapping as used in AfipRealService for FECAESolicitar.
 * CONSUMIDOR_FINAL=5, RESPONSABLE_INSCRIPTO=1, EXENTO=4, MONOTRIBUTO=6, NO_CATEGORIZADO=7
 */
const CONDICION_IVA_ID_MAP: Record<string, number> = {
  CONSUMIDOR_FINAL: 5,
  RESPONSABLE_INSCRIPTO: 1,
  EXENTO: 4,
  MONOTRIBUTO: 6,
  NO_CATEGORIZADO: 7,
};

@Injectable()
export class CaeaService {
  readonly logger = new Logger(CaeaService.name);

  constructor(
    @Inject(WSAA_SERVICE) private readonly wsaaService: WsaaServiceInterface,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(CAEA_INFORMAR_QUEUE) private readonly caeaInformarQueue: Queue,
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

    // Enqueue the FECAEARegInformativo job with 72 retries over 8 days (fixed 160-min delay).
    // This ensures AFIP is informed within the RG 5782/2025 deadline.
    await this.caeaInformarQueue.add(
      'informar',
      { facturaId, profesionalId },
      { attempts: 72, backoff: { type: 'fixed', delay: 9_600_000 } },
    );

    this.logger.log(
      `CAEA fallback assigned to factura ${facturaId}: CAEA=${caeaVigente.caea} estado=CAEA_PENDIENTE_INFORMAR`,
    );
  }

  /**
   * Calls FECAEARegInformativo SOAP to inform a CAEA_PENDIENTE_INFORMAR invoice to AFIP.
   * On Resultado=A transitions the Factura to EMITIDA.
   * On Resultado=R throws AfipBusinessError (processor wraps as UnrecoverableError).
   * On network/timeout errors throws AfipTransientError for BullMQ retry.
   */
  async informarFactura(facturaId: string, profesionalId: string): Promise<void> {
    const { token, sign } = await this.wsaaService.getTicket(profesionalId, 'wsfe');

    const cfg = await this.prisma.configuracionAFIP.findUniqueOrThrow({
      where: { profesionalId },
      select: { cuit: true, ptoVta: true, ambiente: true },
    });

    const factura = await this.prisma.factura.findUniqueOrThrow({
      where: { id: facturaId },
      select: {
        cae: true,
        nroComprobante: true,
        ptoVta: true,
        cbteFchHsGen: true,
        total: true,
        subtotal: true,
        impuestos: true,
        condicionIVAReceptor: true,
        tipo: true,
        cuit: true,
        fecha: true,
      },
    });

    const url = this.buildWsfev1Url(cfg.ambiente);
    const cbteFch = factura.fecha.toISOString().slice(0, 10).replace(/-/g, '');
    const condicionIVAReceptorId =
      CONDICION_IVA_ID_MAP[factura.condicionIVAReceptor as string] ?? 5;
    // Factura A (tipo 1) for RESPONSABLE_INSCRIPTO; Factura B (tipo 6) for all others.
    // Schema TipoFactura only tracks FACTURA vs RECIBO, not A/B sub-type.
    const cbteTipo = factura.condicionIVAReceptor === 'RESPONSABLE_INSCRIPTO' ? 1 : 6;

    const envelope = this.buildFECAEARegInformativoEnvelope({
      token,
      sign,
      cuit: cfg.cuit,
      ptoVta: factura.ptoVta ?? cfg.ptoVta,
      cbteTipo,
      cbteNro: factura.nroComprobante ?? 0,
      cbteFch,
      impTotal: Number(factura.total),
      impNeto: Number(factura.subtotal),
      impIVA: Number(factura.impuestos),
      condicionIVAReceptorId,
      caea: factura.cae!,
      cbteFchHsGen: factura.cbteFchHsGen!,
      docNro: factura.cuit ? parseInt(factura.cuit, 10) : 0,
      docTipo: factura.cuit ? 80 : 99,
    });

    try {
      const res = await axios.post(url, envelope, {
        headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '' },
        timeout: 30_000,
      });
      const xml = res.data as string;
      const resultado = (xml.match(/<Resultado>([AR])<\/Resultado>/) ?? [])[1];

      if (resultado === 'R') {
        const msgs = [...xml.matchAll(/<Msg>(.*?)<\/Msg>/g)].map((m) => m[1]);
        throw new AfipBusinessError(
          msgs.length ? msgs : ['CAEA inform rechazado por AFIP.'],
          {} as any,
        );
      }

      await this.prisma.factura.update({
        where: { id: facturaId },
        data: { estado: EstadoFactura.EMITIDA },
      });

      this.logger.log(`CAEA informado OK — facturaId: ${facturaId}`);
    } catch (err: any) {
      if (err instanceof AfipBusinessError) throw err;
      throw new AfipTransientError(`FECAEARegInformativo failed: ${err.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildFECAEARegInformativoEnvelope(p: {
    token: string;
    sign: string;
    cuit: string;
    ptoVta: number;
    cbteTipo: number;
    cbteNro: number;
    cbteFch: string;
    impTotal: number;
    impNeto: number;
    impIVA: number;
    condicionIVAReceptorId: number;
    caea: string;
    cbteFchHsGen: string;
    docNro: number;
    docTipo: number;
  }): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FECAEARegInformativo>
      <ar:Auth><ar:Token>${p.token}</ar:Token><ar:Sign>${p.sign}</ar:Sign><ar:Cuit>${p.cuit}</ar:Cuit></ar:Auth>
      <ar:FeCAEARegInfReq>
        <ar:FeCabReq>
          <ar:CantReg>1</ar:CantReg>
          <ar:PtoVta>${p.ptoVta}</ar:PtoVta>
          <ar:CbteTipo>${p.cbteTipo}</ar:CbteTipo>
        </ar:FeCabReq>
        <ar:FeDetReq>
          <ar:FECAEADetRequest>
            <ar:Concepto>1</ar:Concepto>
            <ar:DocTipo>${p.docTipo}</ar:DocTipo>
            <ar:DocNro>${p.docNro}</ar:DocNro>
            <ar:CbteDesde>${p.cbteNro}</ar:CbteDesde>
            <ar:CbteHasta>${p.cbteNro}</ar:CbteHasta>
            <ar:CbteFch>${p.cbteFch}</ar:CbteFch>
            <ar:ImpTotal>${p.impTotal.toFixed(2)}</ar:ImpTotal>
            <ar:ImpTotConc>0.00</ar:ImpTotConc>
            <ar:ImpNeto>${p.impNeto.toFixed(2)}</ar:ImpNeto>
            <ar:ImpOpEx>0.00</ar:ImpOpEx>
            <ar:ImpIVA>${p.impIVA.toFixed(2)}</ar:ImpIVA>
            <ar:ImpTrib>0.00</ar:ImpTrib>
            <ar:MonId>PES</ar:MonId>
            <ar:MonCotiz>1</ar:MonCotiz>
            <ar:CondicionIVAReceptorId>${p.condicionIVAReceptorId}</ar:CondicionIVAReceptorId>
            <ar:CAEA>${p.caea}</ar:CAEA>
            <ar:CbteFchHsGen>${p.cbteFchHsGen}</ar:CbteFchHsGen>
            <ar:Iva>
              <ar:AlicIva>
                <ar:Id>5</ar:Id>
                <ar:BaseImp>${p.impNeto.toFixed(2)}</ar:BaseImp>
                <ar:Importe>${p.impIVA.toFixed(2)}</ar:Importe>
              </ar:AlicIva>
            </ar:Iva>
          </ar:FECAEADetRequest>
        </ar:FeDetReq>
      </ar:FeCAEARegInfReq>
    </ar:FECAEARegInformativo>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

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
