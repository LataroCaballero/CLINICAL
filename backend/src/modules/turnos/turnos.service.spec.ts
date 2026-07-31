/**
 * turnos.service.spec.ts
 * Unit tests for Phase 63 Plan 02 (EMBUDO-08) — el estado del embudo CRM
 * refleja el ciclo quirurgico automaticamente.
 *
 * Mock strategy (replicado de pacientes.service.spec.ts):
 * - PrismaService: per-test overrides via jest.fn(), incluyendo un mock de
 *   $transaction que ejecuta el callback contra un `tx` con los mismos
 *   jest.fn() que el cliente raiz (cirugia/turno/paciente/contactoLog).
 * - CuentasCorrientesService: no se ejercita en estos tests, mock vacio.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { TurnosService } from './turnos.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CuentasCorrientesService } from '../cuentas-corrientes/cuentas-corrientes.service';
import { EtapaCRM, EstadoCirugia, EstadoTurno } from '@prisma/client';
import { CreateCirugiaTurnoDto } from './dto/create-cirugia-turno.dto';

function buildTxMocks() {
  return {
    cirugia: {
      create: jest.fn().mockResolvedValue({ id: 'cirugia-1', estado: EstadoCirugia.PROGRAMADA }),
      update: jest.fn(),
    },
    turno: {
      create: jest.fn().mockResolvedValue({ id: 'turno-1' }),
      update: jest.fn(),
    },
    paciente: {
      update: jest.fn().mockResolvedValue({ id: 'paciente-1' }),
    },
    contactoLog: {
      create: jest.fn().mockResolvedValue({ id: 'contacto-1' }),
    },
  };
}

function buildCirugiaDto(overrides: Partial<CreateCirugiaTurnoDto> = {}): CreateCirugiaTurnoDto {
  return {
    pacienteId: 'paciente-1',
    profesionalId: 'profesional-1',
    fecha: '2026-08-15',
    horaInicio: '09:00',
    procedimiento: 'Rinoplastia',
    ...overrides,
  } as CreateCirugiaTurnoDto;
}

describe('TurnosService', () => {
  let service: TurnosService;
  let prisma: jest.Mocked<PrismaService>;
  let tx: ReturnType<typeof buildTxMocks>;

  beforeEach(async () => {
    tx = buildTxMocks();

    const mockPrisma = {
      paciente: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      profesional: {
        findUnique: jest.fn(),
      },
      tipoTurno: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      turno: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      contactoLog: {
        create: jest.fn(),
      },
      cirugia: {
        update: jest.fn(),
      },
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(tx)),
    };

    const mockCuentasCorrientes = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TurnosService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CuentasCorrientesService, useValue: mockCuentasCorrientes },
      ],
    }).compile();

    service = module.get<TurnosService>(TurnosService);
    prisma = module.get(PrismaService);
  });

  // ── crearTurnoCirugia -> CONFIRMADO (D-04) ────────────────────────────────
  describe('crearTurnoCirugia — confirma al paciente dentro de la transaccion (D-04)', () => {
    beforeEach(() => {
      (prisma.paciente.findUnique as jest.Mock).mockResolvedValue({ id: 'paciente-1' });
      (prisma.profesional.findUnique as jest.Mock).mockResolvedValue({ id: 'profesional-1' });
      (prisma.tipoTurno.findFirst as jest.Mock).mockResolvedValue({
        id: 'tipo-cirugia-1',
        esCirugia: true,
        duracionDefault: 120,
      });
      (prisma.turno.findFirst as jest.Mock).mockResolvedValue(null);
    });

    it('Test A: invoca tx.paciente.update con where.id === dto.pacienteId y data.etapaCRM === CONFIRMADO', async () => {
      const dto = buildCirugiaDto();

      await service.crearTurnoCirugia(dto);

      expect(tx.paciente.update).toHaveBeenCalledTimes(1);
      const callArg = (tx.paciente.update as jest.Mock).mock.calls[0][0];
      expect(callArg.where.id).toBe(dto.pacienteId);
      expect(callArg.data.etapaCRM).toBe(EtapaCRM.CONFIRMADO);
    });

    it('Test B: la confirmacion NO depende de que exista presupuesto aceptado (el dto no lo incluye)', async () => {
      const dto = buildCirugiaDto();
      expect((dto as unknown as Record<string, unknown>).presupuesto).toBeUndefined();

      await service.crearTurnoCirugia(dto);

      const callArg = (tx.paciente.update as jest.Mock).mock.calls[0][0];
      expect(callArg.data.etapaCRM).toBe(EtapaCRM.CONFIRMADO);
    });

    it('la escritura usa el cliente tx de la transaccion existente (this.prisma.paciente.update NO se invoca)', async () => {
      const dto = buildCirugiaDto();

      await service.crearTurnoCirugia(dto);

      expect(prisma.paciente.update).not.toHaveBeenCalled();
    });
  });
});
