import { AfipStubService } from './afip-stub.service';
import { EmitirComprobanteParams } from './afip.interfaces';

describe('AfipStubService', () => {
  let service: AfipStubService;

  const mockParams: EmitirComprobanteParams = {
    cuitEmisor: '20123456789',
    puntoVenta: 1,
    tipoComprobante: 6,
    cbteDesde: 42,
    cbteHasta: 42,
    importeTotal: 1000,
    importeNeto: 826.45,
    importeIVA: 173.55,
    concepto: 2,
    docTipo: 96,
    docNro: '30123456',
    periodo: '202603',
  };

  beforeEach(() => {
    service = new AfipStubService();
  });

  it('emitirComprobante returns resultado === "A"', async () => {
    const result = await service.emitirComprobante(mockParams);
    expect(result.resultado).toBe('A');
  });

  it('emitirComprobante returns cae with length === 14', async () => {
    const result = await service.emitirComprobante(mockParams);
    expect(result.cae).toHaveLength(14);
  });

  it('emitirComprobante echoes cbteDesde back as cbtDesde', async () => {
    const result = await service.emitirComprobante(mockParams);
    expect(result.cbtDesde).toBe(mockParams.cbteDesde);
  });

  it('emitirComprobante echoes cbteHasta back as cbtHasta', async () => {
    const result = await service.emitirComprobante(mockParams);
    expect(result.cbtHasta).toBe(mockParams.cbteHasta);
  });

  it('verificarServicio resolves to true', async () => {
    const result = await service.verificarServicio();
    expect(result).toBe(true);
  });
});
