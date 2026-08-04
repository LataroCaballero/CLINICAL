import { Test, TestingModule } from '@nestjs/testing';
import {
  resolverNuevoFlujo,
  resolverTipoEntrada,
  resolverTipoTurnoSync,
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

describe('resolverTipoTurnoSync', () => {
  // HCSYNC-01: primera_vez → 'Consulta' (D-03 rango 0)
  it("primera_vez + 'Control' → 'Consulta'", () => {
    expect(resolverTipoTurnoSync('primera_vez', 'Control', false)).toBe(
      'Consulta',
    );
  });

  it('primera_vez + null → \'Consulta\'', () => {
    expect(resolverTipoTurnoSync('primera_vez', null, false)).toBe(
      'Consulta',
    );
  });

  it("primera_vez + 'Consulta' → null (no-op, ya está)", () => {
    expect(
      resolverTipoTurnoSync('primera_vez', 'Consulta', false),
    ).toBeNull();
  });

  it("primera_vez + 'Tratamiento' → null (no degrada, D-01)", () => {
    expect(
      resolverTipoTurnoSync('primera_vez', 'Tratamiento', false),
    ).toBeNull();
  });

  it("primera_vez + 'Pre-Quirúrgico' → null", () => {
    expect(
      resolverTipoTurnoSync('primera_vez', 'Pre-Quirúrgico', false),
    ).toBeNull();
  });

  // HCSYNC-02: tratamiento_en_consultorio → 'Tratamiento'
  it("tratamiento_en_consultorio + 'Consulta' → 'Tratamiento'", () => {
    expect(
      resolverTipoTurnoSync('tratamiento_en_consultorio', 'Consulta', false),
    ).toBe('Tratamiento');
  });

  it("tratamiento_en_consultorio + 'Control' → 'Tratamiento'", () => {
    expect(
      resolverTipoTurnoSync('tratamiento_en_consultorio', 'Control', false),
    ).toBe('Tratamiento');
  });

  it("tratamiento_en_consultorio + null → 'Tratamiento'", () => {
    expect(
      resolverTipoTurnoSync('tratamiento_en_consultorio', null, false),
    ).toBe('Tratamiento');
  });

  it("tratamiento_en_consultorio + 'Tratamiento' → null (no-op)", () => {
    expect(
      resolverTipoTurnoSync(
        'tratamiento_en_consultorio',
        'Tratamiento',
        false,
      ),
    ).toBeNull();
  });

  it("tratamiento_en_consultorio + 'Pre-Quirúrgico' → null (no degrada)", () => {
    expect(
      resolverTipoTurnoSync(
        'tratamiento_en_consultorio',
        'Pre-Quirúrgico',
        false,
      ),
    ).toBeNull();
  });

  // HCSYNC-03: pre_quirurgico → 'Pre-Quirúrgico' (tope)
  it("pre_quirurgico + 'Consulta' → 'Pre-Quirúrgico'", () => {
    expect(
      resolverTipoTurnoSync('pre_quirurgico', 'Consulta', false),
    ).toBe('Pre-Quirúrgico');
  });

  it("pre_quirurgico + 'Control' → 'Pre-Quirúrgico'", () => {
    expect(resolverTipoTurnoSync('pre_quirurgico', 'Control', false)).toBe(
      'Pre-Quirúrgico',
    );
  });

  it("pre_quirurgico + 'Pre-Quirúrgico' → null (no-op tope)", () => {
    expect(
      resolverTipoTurnoSync('pre_quirurgico', 'Pre-Quirúrgico', false),
    ).toBeNull();
  });

  // D-02: turno de cirugía protegido — nunca se toca, sea cual sea la plantilla
  it('esCirugia=true (pre_quirurgico) → null (sentinel protegido D-02)', () => {
    expect(
      resolverTipoTurnoSync('pre_quirurgico', 'Consulta', true),
    ).toBeNull();
  });

  it('esCirugia=true (tratamiento_en_consultorio) → null (sentinel protegido D-02)', () => {
    expect(
      resolverTipoTurnoSync('tratamiento_en_consultorio', 'Control', true),
    ).toBeNull();
  });

  it('esCirugia=true (primera_vez) → null (sentinel protegido D-02)', () => {
    expect(resolverTipoTurnoSync('primera_vez', null, true)).toBeNull();
  });

  // D-07: plantillas sin sync
  it("plantilla 'control' → null (sin sync, D-07)", () => {
    expect(resolverTipoTurnoSync('control', 'Consulta', false)).toBeNull();
  });

  it("plantilla 'practica' → null (sin sync, D-07)", () => {
    expect(resolverTipoTurnoSync('practica', 'Consulta', false)).toBeNull();
  });

  it("plantilla 'libre' → null (sin sync, D-07)", () => {
    expect(resolverTipoTurnoSync('libre', 'Control', false)).toBeNull();
  });

  it('plantilla undefined → null (sin sync, D-07)', () => {
    expect(resolverTipoTurnoSync(undefined, 'Consulta', false)).toBeNull();
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
