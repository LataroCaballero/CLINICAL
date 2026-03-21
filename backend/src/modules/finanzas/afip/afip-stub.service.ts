import { Injectable } from '@nestjs/common';
import {
  AfipService,
  EmitirComprobanteParams,
  EmitirComprobanteResult,
} from './afip.interfaces';
import { buildAfipQrUrl } from '../factura-pdf.service';

const MOCK_CAE = '74397704790943' as const;     // 14-digit plausible value
const MOCK_CAE_VENCIMIENTO = '20260323' as const; // Fixed future date

@Injectable()
export class AfipStubService implements AfipService {
  async emitirComprobante(
    params: EmitirComprobanteParams,
  ): Promise<EmitirComprobanteResult> {
    // Deterministic stub QR URL for testing and development
    const qrData = buildAfipQrUrl({
      ver: 1,
      fecha: new Date().toISOString().split('T')[0],
      cuit: 20000000001,
      ptoVta: 1,
      tipoCmp: 6,
      nroCmp: 1,
      importe: 0,
      moneda: 'PES',
      ctz: 1,
      tipoDocRec: 99,
      nroDocRec: 0,
      tipoCodAut: 'E',
      codAut: 74397704790943,
    });

    return {
      cae: MOCK_CAE,
      caeFchVto: MOCK_CAE_VENCIMIENTO,
      cbtDesde: params.cbteDesde,
      cbtHasta: params.cbteHasta,
      resultado: 'A',
      qrData,
    };
  }

  async verificarServicio(): Promise<boolean> {
    return true;
  }
}
