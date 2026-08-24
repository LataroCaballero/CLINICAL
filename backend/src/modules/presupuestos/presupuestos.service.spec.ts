/**
 * presupuestos.service.spec.ts
 * Unit tests for PresupuestosService::generatePdf()'s telefono nullable
 * passthrough (Phase 67, TEL-01/plan 67-04) — the payload handed to
 * PresupuestoPdfService.generatePdfBuffer() must propagate
 * `paciente.telefono` verbatim (null stays null, no coercion to '' or a
 * placeholder string), now that the (presupuesto.paciente as any) casts
 * were removed.
 *
 * Mock strategy:
 * - PrismaService: presupuesto.findUnique returns a hand-built presupuesto
 *   fixture per test.
 * - CuentasCorrientesService: not exercised by generatePdf(), empty jest.fn().
 * - PresupuestoPdfService: generatePdfBuffer mocked to capture its payload.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PresupuestosService } from './presupuestos.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CuentasCorrientesService } from '../cuentas-corrientes/cuentas-corrientes.service';
import { PresupuestoPdfService } from './presupuesto-pdf.service';

const mockPrisma = {
  presupuesto: {
    findUnique: jest.fn(),
  },
};

const mockCuentasCorrientesService = {
  createMovimiento: jest.fn(),
};

const mockPdfService = {
  generatePdfBuffer: jest.fn().mockResolvedValue(Buffer.from('pdf')),
};

function buildPresupuesto(telefono: string | null) {
  return {
    id: 'presupuesto-1',
    moneda: 'ARS',
    fechaValidez: new Date('2026-09-01'),
    createdAt: new Date('2026-08-01'),
    subtotal: 1000,
    descuentos: 0,
    total: 1000,
    items: [{ descripcion: 'Consulta', precioTotal: 1000, orden: 1 }],
    paciente: {
      id: 'paciente-1',
      nombreCompleto: 'Paciente De Prueba',
      dni: '30111222',
      email: 'paciente@example.com',
      telefono,
    },
    profesional: {
      usuario: { nombre: 'Ana', apellido: 'Gomez' },
      configClinica: {
        nombreClinica: 'Clinica Demo',
        logoUrl: null,
        direccion: null,
        telefono: null,
        emailContacto: null,
        web: null,
        piePaginaTexto: null,
      },
    },
  };
}

describe('PresupuestosService — generatePdf() telefono passthrough (Phase 67, TEL-01)', () => {
  let service: PresupuestosService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPdfService.generatePdfBuffer.mockResolvedValue(Buffer.from('pdf'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresupuestosService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: CuentasCorrientesService,
          useValue: mockCuentasCorrientesService,
        },
        { provide: PresupuestoPdfService, useValue: mockPdfService },
      ],
    }).compile();

    service = module.get<PresupuestosService>(PresupuestosService);
  });

  it('paciente con telefono: null -> no lanza y el payload de generatePdfBuffer tiene paciente.telefono === null', async () => {
    mockPrisma.presupuesto.findUnique.mockResolvedValue(buildPresupuesto(null));

    await expect(service.generatePdf('presupuesto-1')).resolves.toBeDefined();

    const payload = mockPdfService.generatePdfBuffer.mock.calls[0][0];
    expect(payload.paciente.telefono).toBeNull();
  });

  it("paciente con telefono: '1123456789' -> se propaga tal cual", async () => {
    mockPrisma.presupuesto.findUnique.mockResolvedValue(
      buildPresupuesto('1123456789'),
    );

    await service.generatePdf('presupuesto-1');

    const payload = mockPdfService.generatePdfBuffer.mock.calls[0][0];
    expect(payload.paciente.telefono).toBe('1123456789');
  });

  it("presupuesto.findUnique devuelve null -> NotFoundException('Presupuesto no encontrado')", async () => {
    mockPrisma.presupuesto.findUnique.mockResolvedValue(null);

    await expect(service.generatePdf('inexistente')).rejects.toThrow(
      new NotFoundException('Presupuesto no encontrado'),
    );

    expect(mockPdfService.generatePdfBuffer).not.toHaveBeenCalled();
  });
});
