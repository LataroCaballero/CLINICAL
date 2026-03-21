import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../../../prisma/prisma.service';
import { WSAA_SERVICE } from '../../wsaa/wsaa.constants';
import { WsaaServiceInterface } from '../../wsaa/wsaa.interfaces';
import {
  AfipService,
  EmitirComprobanteParams,
  EmitirComprobanteResult,
} from './afip.interfaces';
import { AfipBusinessError, AfipTransientError } from './afip.errors';
import { EstadoFactura } from '@prisma/client';
import { buildAfipQrUrl, toAfipMonedaCodigo } from '../factura-pdf.service';

// Extended params for real service — includes fields not needed by the stub
export interface EmitirComprobanteRealParams extends EmitirComprobanteParams {
  profesionalId: string;
  facturaId: string;
  condicionIVAReceptorId: number; // Mandatory from April 2026 (AFIP error 10242)
  fecha: Date; // Invoice date for CbteFch format
}

@Injectable()
export class AfipRealService implements AfipService {
  private readonly logger = new Logger(AfipRealService.name);

  constructor(
    @Inject(WSAA_SERVICE) private readonly wsaaService: WsaaServiceInterface,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async emitirComprobante(
    params: EmitirComprobanteRealParams,
  ): Promise<EmitirComprobanteResult> {
    const { profesionalId, facturaId, condicionIVAReceptorId, fecha } = params;

    const { token, sign } = await this.wsaaService.getTicket(
      profesionalId,
      'wsfe',
    );

    const cfg = await this.prisma.configuracionAFIP.findUniqueOrThrow({
      where: { profesionalId },
      select: { cuit: true, ptoVta: true, ambiente: true },
    });

    const url =
      cfg.ambiente === 'PRODUCCION'
        ? this.config.get(
            'AFIP_WSFEV1_URL_PROD',
            'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
          )
        : this.config.get(
            'AFIP_WSFEV1_URL_HOMO',
            'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
          );

    const cbteFch = fecha.toISOString().slice(0, 10).replace(/-/g, '');

    // Fetch factura fields needed for QR payload before entering transaction
    const facturaFields = await this.prisma.factura.findUniqueOrThrow({
      where: { id: facturaId },
      select: { moneda: true, tipoCambio: true, total: true, cuit: true },
    });

    return this.prisma.$transaction(
      async (tx) => {
        // Advisory lock — serializes concurrent emissions for same CUIT+ptoVta+cbteTipo
        const lockKey = `${cfg.cuit}:${cfg.ptoVta}:${params.tipoComprobante}`;
        await tx.$queryRawUnsafe(
          `SELECT pg_advisory_xact_lock(hashtext($1))`,
          lockKey,
        );

        // Fetch next sequence number
        const lastNro = await this.getUltimoAutorizado(
          url,
          token,
          sign,
          cfg.cuit,
          cfg.ptoVta,
          params.tipoComprobante,
        );
        const cbteDesde = lastNro + 1;

        // Call FECAESolicitar
        const result = await this.callFECAESolicitar(url, token, sign, cfg.cuit, {
          ...params,
          ptoVta: cfg.ptoVta,
          cbteDesde,
          cbteHasta: cbteDesde,
          cbteFch,
          condicionIVAReceptorId,
        });

        if (result.resultado === 'R') {
          throw new AfipBusinessError(
            result.observaciones ?? ['AFIP rechazó el comprobante.'],
            result,
          );
        }

        // Build QR payload per RG 5616/2024 Anexo II
        const qrPayload = {
          ver: 1,
          fecha: fecha.toISOString().split('T')[0],
          cuit: parseInt(cfg.cuit, 10),
          ptoVta: cfg.ptoVta,
          tipoCmp: params.tipoComprobante,
          nroCmp: result.cbtDesde,
          importe: Number(facturaFields.total),
          moneda: toAfipMonedaCodigo(facturaFields.moneda),
          ctz: Number(facturaFields.tipoCambio),
          tipoDocRec: facturaFields.cuit ? 80 : 99,
          nroDocRec: facturaFields.cuit ? parseInt(facturaFields.cuit, 10) : 0,
          tipoCodAut: 'E' as const,
          codAut: parseInt(result.cae, 10),
        };

        // Persist CAE + nroComprobante + qrData in same transaction
        await tx.factura.update({
          where: { id: facturaId },
          data: {
            cae: result.cae,
            caeFchVto: result.caeFchVto,
            nroComprobante: result.cbtDesde,
            ptoVta: cfg.ptoVta,
            estado: EstadoFactura.EMITIDA,
            qrData: buildAfipQrUrl(qrPayload),
          },
        });

        this.logger.log(
          `CAE emitido — facturaId: ${facturaId}, CAE: ${result.cae}, nro: ${result.cbtDesde}`,
        );

        return result;
      },
      { timeout: 45000 },
    );
  }

  async verificarServicio(): Promise<boolean> {
    // Used by health checks — minimal check: service resolves
    return true;
  }

  // ---- Private SOAP helpers ----

  private async getUltimoAutorizado(
    url: string,
    token: string,
    sign: string,
    cuit: string,
    ptoVta: number,
    cbteTipo: number,
  ): Promise<number> {
    const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FECompUltimoAutorizado>
      <ar:Auth><ar:Token>${token}</ar:Token><ar:Sign>${sign}</ar:Sign><ar:Cuit>${cuit}</ar:Cuit></ar:Auth>
      <ar:PtoVta>${ptoVta}</ar:PtoVta>
      <ar:CbteTipo>${cbteTipo}</ar:CbteTipo>
    </ar:FECompUltimoAutorizado>
  </soapenv:Body>
</soapenv:Envelope>`;

    try {
      const res = await axios.post(url, envelope, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: '',
        },
        timeout: 30_000,
      });
      const match = (res.data as string).match(/<CbteNro>(\d+)<\/CbteNro>/);
      return match ? parseInt(match[1], 10) : 0;
    } catch (err: any) {
      throw new AfipTransientError(
        `FECompUltimoAutorizado failed: ${err.message}`,
      );
    }
  }

  private async callFECAESolicitar(
    url: string,
    token: string,
    sign: string,
    cuit: string,
    p: EmitirComprobanteParams & {
      ptoVta: number;
      cbteDesde: number;
      cbteHasta: number;
      cbteFch: string;
      condicionIVAReceptorId: number;
    },
  ): Promise<EmitirComprobanteResult> {
    const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FECAESolicitar>
      <ar:Auth><ar:Token>${token}</ar:Token><ar:Sign>${sign}</ar:Sign><ar:Cuit>${cuit}</ar:Cuit></ar:Auth>
      <ar:FeCAEReq>
        <ar:FeCabReq>
          <ar:CantReg>1</ar:CantReg>
          <ar:PtoVta>${p.ptoVta}</ar:PtoVta>
          <ar:CbteTipo>${p.tipoComprobante}</ar:CbteTipo>
        </ar:FeCabReq>
        <ar:FeDetReq>
          <ar:FECAEDetRequest>
            <ar:Concepto>${p.concepto}</ar:Concepto>
            <ar:DocTipo>${p.docTipo}</ar:DocTipo>
            <ar:DocNro>${p.docNro}</ar:DocNro>
            <ar:CbteDesde>${p.cbteDesde}</ar:CbteDesde>
            <ar:CbteHasta>${p.cbteHasta}</ar:CbteHasta>
            <ar:CbteFch>${p.cbteFch}</ar:CbteFch>
            <ar:ImpTotal>${p.importeTotal.toFixed(2)}</ar:ImpTotal>
            <ar:ImpTotConc>0</ar:ImpTotConc>
            <ar:ImpNeto>${p.importeNeto.toFixed(2)}</ar:ImpNeto>
            <ar:ImpOpEx>0</ar:ImpOpEx>
            <ar:ImpTrib>0</ar:ImpTrib>
            <ar:ImpIVA>${p.importeIVA.toFixed(2)}</ar:ImpIVA>
            <ar:FchServDesde>${p.cbteFch}</ar:FchServDesde>
            <ar:FchServHasta>${p.cbteFch}</ar:FchServHasta>
            <ar:FchVtoPago>${p.cbteFch}</ar:FchVtoPago>
            <ar:MonId>PES</ar:MonId>
            <ar:MonCotiz>1</ar:MonCotiz>
            <ar:CondicionIVAReceptorId>${p.condicionIVAReceptorId}</ar:CondicionIVAReceptorId>
            <ar:Iva>
              <ar:AlicIva>
                <ar:Id>5</ar:Id>
                <ar:BaseImp>${p.importeNeto.toFixed(2)}</ar:BaseImp>
                <ar:Importe>${p.importeIVA.toFixed(2)}</ar:Importe>
              </ar:AlicIva>
            </ar:Iva>
          </ar:FECAEDetRequest>
        </ar:FeDetReq>
      </ar:FeCAEReq>
    </ar:FECAESolicitar>
  </soapenv:Body>
</soapenv:Envelope>`;

    try {
      const res = await axios.post(url, envelope, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: '',
        },
        timeout: 30_000,
      });

      const xml = res.data as string;

      const resultado = (xml.match(/<Resultado>([AR])<\/Resultado>/) ??
        [])[1] as 'A' | 'R' | undefined;
      const cae =
        (xml.match(/<CAE>(\d{14})<\/CAE>/) ?? [])[1] ?? '';
      const caeFchVto =
        (xml.match(/<CAEFchVto>(\d{8})<\/CAEFchVto>/) ?? [])[1] ?? '';
      const cbtDesde = parseInt(
        (xml.match(/<CbteDesde>(\d+)<\/CbteDesde>/) ?? [])[1] ?? '0',
        10,
      );
      const cbtHasta = parseInt(
        (xml.match(/<CbteHasta>(\d+)<\/CbteHasta>/) ?? [])[1] ?? '0',
        10,
      );

      // Extract observaciones/errors
      const obsMatches = [...xml.matchAll(/<Msg>(.*?)<\/Msg>/g)].map(
        (m) => m[1],
      );

      return {
        cae,
        caeFchVto,
        cbtDesde,
        cbtHasta,
        resultado: resultado ?? 'R',
        observaciones: obsMatches.length > 0 ? obsMatches : undefined,
      };
    } catch (err: any) {
      if (err instanceof AfipBusinessError) throw err;
      throw new AfipTransientError(`FECAESolicitar failed: ${err.message}`);
    }
  }
}
