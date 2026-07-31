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
import {
  EtapaCRM,
  EstadoCirugia,
  EstadoTurno,
  TemperaturaPaciente,
} from '@prisma/client';
import { CreateCirugiaTurnoDto } from './dto/create-cirugia-turno.dto';
import { CreateTurnoDto } from './dto/create-turno.dto';

function buildTxMocks() {
  return {
    cirugia: {
      create: jest.fn().mockResolvedValue({
        id: 'cirugia-1',
        estado: EstadoCirugia.PROGRAMADA,
      }),
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

function buildCirugiaDto(
  overrides: Partial<CreateCirugiaTurnoDto> = {},
): CreateCirugiaTurnoDto {
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
        create: jest.fn(),
        update: jest.fn(),
      },
      tipoTurnoProfesional: {
        findUnique: jest.fn(),
      },
      contactoLog: {
        create: jest.fn(),
      },
      cirugia: {
        update: jest.fn(),
      },
      // Soporta ambas formas de $transaction: callback (crearTurnoCirugia, usa
      // el `tx` mock) y array (cancelarTurno, D-07 — cada elemento ya es la
      // promesa devuelta por el mock raiz correspondiente).
      $transaction: jest.fn((arg: unknown) =>
        Array.isArray(arg)
          ? Promise.all(arg)
          : (arg as (tx: unknown) => unknown)(tx),
      ),
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
      (prisma.paciente.findUnique as jest.Mock).mockResolvedValue({
        id: 'paciente-1',
      });
      (prisma.profesional.findUnique as jest.Mock).mockResolvedValue({
        id: 'profesional-1',
      });
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
      expect(
        (dto as unknown as Record<string, unknown>).presupuesto,
      ).toBeUndefined();

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

  // ── crearTurno — guard selectivo de degradacion (D-05/D-06) ──────────────
  describe('crearTurno — guard selectivo de degradacion de etapas avanzadas (D-05/D-06)', () => {
    function buildTurnoDto(
      overrides: Partial<CreateTurnoDto> = {},
    ): CreateTurnoDto {
      return {
        pacienteId: 'paciente-1',
        profesionalId: 'profesional-1',
        tipoTurnoId: 'tipo-turno-1',
        inicio: '2026-08-15T13:00:00.000Z',
        ...overrides,
      } as CreateTurnoDto;
    }

    function mockPacienteFindUnique(pacienteCRM: {
      etapaCRM: EtapaCRM | null;
      profesionalId?: string | null;
      flujo?: string | null;
    }) {
      (prisma.paciente.findUnique as jest.Mock).mockImplementation(
        (args: { select?: Record<string, boolean> }) => {
          if (args?.select?.id) {
            return Promise.resolve({ id: 'paciente-1' });
          }
          return Promise.resolve({
            etapaCRM: pacienteCRM.etapaCRM,
            profesionalId: pacienteCRM.profesionalId ?? 'profesional-1',
            flujo: pacienteCRM.flujo ?? null,
          });
        },
      );
    }

    function mockTipoTurno(nombre: string) {
      (prisma.tipoTurno.findUnique as jest.Mock).mockResolvedValue({
        id: 'tipo-turno-1',
        nombre,
        duracionDefault: 30,
        flujoPaciente: null,
      });
    }

    beforeEach(() => {
      (prisma.profesional.findUnique as jest.Mock).mockResolvedValue({
        id: 'profesional-1',
      });
      (prisma.turno.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.turno.create as jest.Mock).mockResolvedValue({
        id: 'turno-nuevo-1',
      });
      (prisma.contactoLog.create as jest.Mock).mockResolvedValue({
        id: 'contacto-1',
      });
      (
        prisma.tipoTurnoProfesional as unknown as { findUnique: jest.Mock }
      ).findUnique.mockResolvedValue(null);
    });

    it('Test A: paciente CONFIRMADO + turno NO Consulta -> paciente.update de etapaCRM NO se invoca', async () => {
      mockPacienteFindUnique({ etapaCRM: EtapaCRM.CONFIRMADO });
      mockTipoTurno('Control');

      await service.crearTurno(buildTurnoDto());

      const etapaWrites = (
        prisma.paciente.update as jest.Mock
      ).mock.calls.filter((call) => call[0]?.data?.etapaCRM !== undefined);
      expect(etapaWrites).toHaveLength(0);
    });

    it('Test B: paciente PROCEDIMIENTO_REALIZADO + turno NO Consulta -> etapaCRM se mantiene (no degrada)', async () => {
      mockPacienteFindUnique({ etapaCRM: EtapaCRM.PROCEDIMIENTO_REALIZADO });
      mockTipoTurno('Tratamiento');

      await service.crearTurno(buildTurnoDto());

      const etapaWrites = (
        prisma.paciente.update as jest.Mock
      ).mock.calls.filter((call) => call[0]?.data?.etapaCRM !== undefined);
      expect(etapaWrites).toHaveLength(0);
    });

    it("Test C: paciente CONFIRMADO + turno tipoTurno.nombre==='Consulta' -> etapaCRM se setea a TURNO_AGENDADO (D-06)", async () => {
      mockPacienteFindUnique({ etapaCRM: EtapaCRM.CONFIRMADO });
      mockTipoTurno('Consulta');

      await service.crearTurno(buildTurnoDto());

      const etapaWrites = (
        prisma.paciente.update as jest.Mock
      ).mock.calls.filter((call) => call[0]?.data?.etapaCRM !== undefined);
      expect(etapaWrites).toHaveLength(1);
      expect(etapaWrites[0][0].data.etapaCRM).toBe(EtapaCRM.TURNO_AGENDADO);
    });

    it('Test D: paciente CONSULTADO (no avanzada) + turno cualquiera -> etapaCRM se setea a TURNO_AGENDADO', async () => {
      mockPacienteFindUnique({ etapaCRM: EtapaCRM.CONSULTADO });
      mockTipoTurno('Control');

      await service.crearTurno(buildTurnoDto());

      const etapaWrites = (
        prisma.paciente.update as jest.Mock
      ).mock.calls.filter((call) => call[0]?.data?.etapaCRM !== undefined);
      expect(etapaWrites).toHaveLength(1);
      expect(etapaWrites[0][0].data.etapaCRM).toBe(EtapaCRM.TURNO_AGENDADO);
    });

    it('Test E: paciente PERDIDO + turno NO Consulta -> etapaCRM se setea a TURNO_AGENDADO (PERDIDO sigue reactivando)', async () => {
      mockPacienteFindUnique({ etapaCRM: EtapaCRM.PERDIDO });
      mockTipoTurno('Pre-Quirúrgico');

      await service.crearTurno(buildTurnoDto());

      const etapaWrites = (
        prisma.paciente.update as jest.Mock
      ).mock.calls.filter((call) => call[0]?.data?.etapaCRM !== undefined);
      expect(etapaWrites).toHaveLength(1);
      expect(etapaWrites[0][0].data.etapaCRM).toBe(EtapaCRM.TURNO_AGENDADO);
    });
  });

  // ── cancelarTurno — mantiene CONFIRMADO + recontacto (D-07) ──────────────
  describe('cancelarTurno — mantiene CONFIRMADO + CALIENTE + recontacto en cirugia (D-07)', () => {
    it('Test A (cirugia): esCirugia=true -> cancela turno, cancela cirugia, temperatura=CALIENTE, contactoLog con profesionalId del turno, SIN escritura de etapaCRM', async () => {
      (prisma.turno.findUnique as jest.Mock).mockResolvedValue({
        id: 'turno-1',
        estado: EstadoTurno.PENDIENTE,
        esCirugia: true,
        cirugiaId: 'cirugia-1',
        pacienteId: 'paciente-1',
        profesionalId: 'profesional-1',
      });
      (prisma.turno.update as jest.Mock).mockResolvedValue({
        id: 'turno-1',
        estado: EstadoTurno.CANCELADO,
      });
      (prisma.cirugia.update as jest.Mock).mockResolvedValue({
        id: 'cirugia-1',
      });
      (prisma.paciente.update as jest.Mock).mockResolvedValue({
        id: 'paciente-1',
      });
      (prisma.contactoLog.create as jest.Mock).mockResolvedValue({
        id: 'contacto-1',
      });

      await service.cancelarTurno('turno-1');

      expect(prisma.turno.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'turno-1' },
          data: expect.objectContaining({ estado: EstadoTurno.CANCELADO }),
        }),
      );
      expect(prisma.cirugia.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cirugia-1' },
          data: expect.objectContaining({ estado: EstadoCirugia.CANCELADA }),
        }),
      );
      expect(prisma.paciente.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'paciente-1' },
          data: expect.objectContaining({
            temperatura: TemperaturaPaciente.CALIENTE,
          }),
        }),
      );
      const pacienteUpdateArg = (prisma.paciente.update as jest.Mock).mock
        .calls[0][0];
      expect(pacienteUpdateArg.data.etapaCRM).toBeUndefined();

      expect(prisma.contactoLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pacienteId: 'paciente-1',
            profesionalId: 'profesional-1',
          }),
        }),
      );
    });

    it('Test B (no cirugia): esCirugia=false -> solo cancela el turno, sin tocar cirugia/temperatura/etapaCRM', async () => {
      (prisma.turno.findUnique as jest.Mock).mockResolvedValue({
        id: 'turno-2',
        estado: EstadoTurno.PENDIENTE,
        esCirugia: false,
        cirugiaId: null,
        pacienteId: 'paciente-2',
        profesionalId: 'profesional-1',
      });
      (prisma.turno.update as jest.Mock).mockResolvedValue({
        id: 'turno-2',
        estado: EstadoTurno.CANCELADO,
      });

      await service.cancelarTurno('turno-2');

      expect(prisma.turno.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'turno-2' },
          data: expect.objectContaining({ estado: EstadoTurno.CANCELADO }),
        }),
      );
      expect(prisma.cirugia.update).not.toHaveBeenCalled();
      expect(prisma.paciente.update).not.toHaveBeenCalled();
      expect(prisma.contactoLog.create).not.toHaveBeenCalled();
    });
  });
});
