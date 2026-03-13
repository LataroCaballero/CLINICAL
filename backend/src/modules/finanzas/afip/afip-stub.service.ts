import { Injectable } from '@nestjs/common';
import {
  AfipService,
  EmitirComprobanteParams,
  EmitirComprobanteResult,
} from './afip.interfaces';

const MOCK_CAE = '74397704790943' as const;     // 14-digit plausible value
const MOCK_CAE_VENCIMIENTO = '20260323' as const; // Fixed future date

@Injectable()
export class AfipStubService implements AfipService {
  async emitirComprobante(
    params: EmitirComprobanteParams,
  ): Promise<EmitirComprobanteResult> {
    return {
      cae: MOCK_CAE,
      caeFchVto: MOCK_CAE_VENCIMIENTO,
      cbtDesde: params.cbteDesde,
      cbtHasta: params.cbteHasta,
      resultado: 'A',
    };
  }

  async verificarServicio(): Promise<boolean> {
    return true;
  }
}
