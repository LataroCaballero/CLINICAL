import { Test, TestingModule } from '@nestjs/testing';
import {
  resolverNuevoFlujo,
  resolverTipoEntrada,
} from './historia-clinica.flujo.helpers';
import { HistoriaClinicaService } from './historia-clinica.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CatalogoHCService } from '../catalogo-hc/catalogo-hc.service';

describe('resolverNuevoFlujo', () => {
  // Test 1: CONSULTA_CIRUGIA + PENDIENTE → CIRUGIA
  it('CONSULTA_CIRUGIA + PENDIENTE → CIRUGIA', () => {
    expect(resolverNuevoFlujo('CONSULTA_CIRUGIA', 'PENDIENTE', false)).toBe(
      'CIRUGIA',
    );
  });

  // Test 2: CONSULTA_CIRUGIA + CIRUGIA → null (sin cambio)
  it('CONSULTA_CIRUGIA + CIRUGIA → null (sin cambio)', () => {
    expect(resolverNuevoFlujo('CONSULTA_CIRUGIA', 'CIRUGIA', false)).toBeNull();
  });

  // Test 3: TRATAMIENTO + PENDIENTE → TRATAMIENTO
  it('TRATAMIENTO + PENDIENTE → TRATAMIENTO', () => {
    expect(resolverNuevoFlujo('TRATAMIENTO', 'PENDIENTE', false)).toBe(
      'TRATAMIENTO',
    );
  });

  // Test 4: TRATAMIENTO + CIRUGIA → null (dual-state preservado, HC-04)
  it('TRATAMIENTO + CIRUGIA → null (dual-state preservado)', () => {
    expect(resolverNuevoFlujo('TRATAMIENTO', 'CIRUGIA', false)).toBeNull();
  });

  // Test 5: TRATAMIENTO + TRATAMIENTO → null
  it('TRATAMIENTO + TRATAMIENTO → null', () => {
    expect(resolverNuevoFlujo('TRATAMIENTO', 'TRATAMIENTO', false)).toBeNull();
  });

  // Test 6: CONTROL + PENDIENTE → null
  it('CONTROL + PENDIENTE → null', () => {
    expect(resolverNuevoFlujo('CONTROL', 'PENDIENTE', false)).toBeNull();
  });

  // Test 7: SEGUIMIENTO + PENDIENTE → null
  it('SEGUIMIENTO + PENDIENTE → null', () => {
    expect(resolverNuevoFlujo('SEGUIMIENTO', 'PENDIENTE', false)).toBeNull();
  });

  // Test 8: PREOPERATORIO + PENDIENTE → null
  it('PREOPERATORIO + PENDIENTE → null', () => {
    expect(resolverNuevoFlujo('PREOPERATORIO', 'PENDIENTE', false)).toBeNull();
  });

  // Test 9: esCirugia guard — CONSULTA_CIRUGIA + PENDIENTE + esCirugia=true → null
  it('esCirugia=true omite el cambio de flujo (criterio 5)', () => {
    expect(
      resolverNuevoFlujo('CONSULTA_CIRUGIA', 'PENDIENTE', true),
    ).toBeNull();
  });

  // Test 10: tipoEntrada undefined → null (entradas legacy / sin clasificar)
  it('tipoEntrada undefined → null (entradas legacy)', () => {
    expect(resolverNuevoFlujo(undefined, 'PENDIENTE', false)).toBeNull();
  });

  // Test 11 (EMBUDO-09/D-09): TRATAMIENTO + null → TRATAMIENTO (lead nuevo EMBUDO-07)
  it('TRATAMIENTO + null → TRATAMIENTO (lead nuevo sin flujo asignado, D-09)', () => {
    expect(resolverNuevoFlujo('TRATAMIENTO', null, false)).toBe('TRATAMIENTO');
  });
});

describe('resolverTipoEntrada', () => {
  // D-08: tratamiento_en_consultorio fuerza TRATAMIENTO, sin importar dto.tipoEntrada
  it("tratamiento_en_consultorio + undefined → 'TRATAMIENTO'", () => {
    expect(resolverTipoEntrada('tratamiento_en_consultorio', undefined)).toBe(
      'TRATAMIENTO',
    );
  });

  // Comportamiento pre-existente: pre_quirurgico fuerza PREOPERATORIO
  it("pre_quirurgico + cualquier valor → 'PREOPERATORIO'", () => {
    expect(resolverTipoEntrada('pre_quirurgico', 'CONTROL')).toBe(
      'PREOPERATORIO',
    );
  });

  // Respeta dto.tipoEntrada para otros discriminadores de UI
  it("primera_vez + 'CONTROL' → 'CONTROL' (respeta dto.tipoEntrada)", () => {
    expect(resolverTipoEntrada('primera_vez', 'CONTROL')).toBe('CONTROL');
  });

  // Sin discriminador conocido ni tipoEntrada explícito → undefined
  it('otro + undefined → undefined', () => {
    expect(resolverTipoEntrada('otro', undefined)).toBeUndefined();
  });
});

// ─── crearEntrada wiring (Task 2, D-08/D-09/D-10) ─────────────────────────────
// Verifies resolverTipoEntrada/resolverNuevoFlujo are actually wired into
// crearEntrada's tx.historiaClinicaEntrada.create and tx.paciente.update calls.
describe('HistoriaClinicaService.crearEntrada — wiring D-08/D-09/D-10', () => {
  let service: HistoriaClinicaService;
  let mockPrisma: {
    profesional: { findFirst: jest.Mock };
    historiaClinica: { findFirst: jest.Mock; create: jest.Mock };
    historiaClinicaEntrada: { create: jest.Mock };
    paciente: { findUnique: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };

  const PACIENTE_ID = 'paciente-1';
  const PROFESIONAL_ID = 'profesional-1';
  const HISTORIA_ID = 'historia-1';

  beforeEach(async () => {
    mockPrisma = {
      profesional: { findFirst: jest.fn() },
      historiaClinica: {
        findFirst: jest.fn().mockResolvedValue({ id: HISTORIA_ID }),
        create: jest.fn(),
      },
      historiaClinicaEntrada: {
        create: jest.fn().mockResolvedValue({ id: 'entrada-1' }),
      },
      paciente: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn(),
    };
    // Interactive transaction: run the callback against the same mock (tx === prisma shape)
    mockPrisma.$transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
      cb(mockPrisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistoriaClinicaService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: CatalogoHCService,
          useValue: {
            aprenderDesdeZonas: jest.fn(),
            aprenderDesdePreoperatorio: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HistoriaClinicaService>(HistoriaClinicaService);
  });

  it('tratamiento_en_consultorio fuerza tipoEntrada=TRATAMIENTO independiente de dto.tipoEntrada (D-08)', async () => {
    mockPrisma.paciente.findUnique.mockResolvedValue({ flujo: 'PENDIENTE' });

    await service.crearEntrada(
      PACIENTE_ID,
      {
        tipo: 'tratamiento_en_consultorio',
        tipoEntrada: 'CONTROL', // client sends a mismatched value — must be overridden
      } as never,
      PROFESIONAL_ID,
    );

    expect(mockPrisma.historiaClinicaEntrada.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tipoEntrada: 'TRATAMIENTO' }),
      }),
    );
  });

  it('paciente flujo=PENDIENTE + tratamiento_en_consultorio → flujo=TRATAMIENTO + etapaCRM=null (D-09/D-10)', async () => {
    mockPrisma.paciente.findUnique.mockResolvedValue({ flujo: 'PENDIENTE' });

    await service.crearEntrada(
      PACIENTE_ID,
      { tipo: 'tratamiento_en_consultorio' } as never,
      PROFESIONAL_ID,
    );

    expect(mockPrisma.paciente.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          flujo: 'TRATAMIENTO',
          etapaCRM: null,
        }),
      }),
    );
  });

  it('paciente flujo=CIRUGIA + tratamiento_en_consultorio → NO se toca flujo/etapaCRM (D-09, candidato quirúrgico se queda)', async () => {
    mockPrisma.paciente.findUnique.mockResolvedValue({ flujo: 'CIRUGIA' });

    await service.crearEntrada(
      PACIENTE_ID,
      { tipo: 'tratamiento_en_consultorio' } as never,
      PROFESIONAL_ID,
    );

    expect(mockPrisma.paciente.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ flujo: 'TRATAMIENTO' }),
      }),
    );
  });

  it('pre_quirurgico sigue guardando tipoEntrada=PREOPERATORIO (no regresión)', async () => {
    // pre_quirurgico también dispara el merge de perfil (union-dedup) que hace un
    // segundo paciente.findUnique seleccionando condiciones/alergias/medicacion.
    mockPrisma.paciente.findUnique.mockResolvedValue({
      flujo: 'PENDIENTE',
      condiciones: [],
      alergias: [],
      medicacion: [],
    });

    await service.crearEntrada(
      PACIENTE_ID,
      { tipo: 'pre_quirurgico' } as never,
      PROFESIONAL_ID,
    );

    expect(mockPrisma.historiaClinicaEntrada.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tipoEntrada: 'PREOPERATORIO' }),
      }),
    );
  });
});
