/**
 * pacientes.service.spec.ts
 * Unit tests for the portal-link encrypt/recover feature (52-09, amplía D-12).
 *
 * Mock strategy:
 * - PrismaService: per-test overrides via jest.fn()
 * - ConfigService: returns FRONTEND_URL = 'http://localhost:3000'
 * - EncryptionService: symmetric mock — encrypt wraps in 'enc(x)', decrypt unwraps
 *   (sufficient to verify round-trip logic without AES overhead)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PacientesService } from './pacientes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../whatsapp/crypto/encryption.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockEncryptionService(): jest.Mocked<EncryptionService> {
  return {
    encrypt: jest.fn((plain: string) => `enc(${plain})`),
    decrypt: jest.fn((stored: string) => {
      const match = stored.match(/^enc\((.+)\)$/);
      if (!match) throw new Error('Invalid encrypted value format — mock decrypt');
      return match[1];
    }),
  } as unknown as jest.Mocked<EncryptionService>;
}

function sha256(value: string): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(value).digest('hex');
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('PacientesService — portal link encrypt/recover (52-09)', () => {
  let service: PacientesService;
  let prisma: jest.Mocked<PrismaService>;
  let encryption: jest.Mocked<EncryptionService>;

  const FRONTEND_URL = 'http://localhost:3000';
  const PACIENTE_ID = 'paciente-uuid-1234';

  beforeEach(async () => {
    const mockPrisma = {
      paciente: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };
    const mockConfigService = {
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'FRONTEND_URL') return FRONTEND_URL;
        return fallback;
      }),
    };
    const mockEnc = mockEncryptionService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PacientesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EncryptionService, useValue: mockEnc },
      ],
    }).compile();

    service = module.get<PacientesService>(PacientesService);
    prisma = module.get(PrismaService);
    encryption = module.get(EncryptionService);
  });

  // ── Caso C: primera generación (sin token) ────────────────────────────────

  describe('generarPortalLink — primera generación (sin token)', () => {
    it('devuelve url con rawUuid y persiste hash + cifrado; alreadyGenerated false', async () => {
      (prisma.paciente.findUnique as jest.Mock).mockResolvedValue({
        portalToken: null,
        portalTokenCifrado: null,
        email: 'test@example.com',
      });
      (prisma.paciente.update as jest.Mock).mockResolvedValue({});

      const result = await service.generarPortalLink(PACIENTE_ID);

      expect(result.alreadyGenerated).toBe(false);
      expect(result.url).toMatch(
        /^http:\/\/localhost:3000\/portal\/[0-9a-f-]{36}$/,
      );

      // El update debe haber sido llamado con hash + cifrado
      const updateCall = (prisma.paciente.update as jest.Mock).mock.calls[0][0];
      const { portalToken, portalTokenCifrado } = updateCall.data;

      // hash = sha256(rawUuid) — verificamos que es 64 chars hex
      expect(portalToken).toMatch(/^[0-9a-f]{64}$/);

      // cifrado es encrypt(rawUuid)
      const rawFromUrl = result.url!.split('/portal/')[1];
      expect(portalTokenCifrado).toBe(`enc(${rawFromUrl})`);

      // round-trip: decrypt(cifrado) === rawUuid
      const decrypted = encryption.decrypt(portalTokenCifrado);
      expect(decrypted).toBe(rawFromUrl);

      // hash es sha256 del raw
      expect(portalToken).toBe(sha256(rawFromUrl));
    });
  });

  // ── Caso A: ya generado con cifrado (alreadyGenerated, url estable) ────────

  describe('generarPortalLink — ya generado con portalToken + cifrado', () => {
    it('devuelve la misma url estable sin escribir BD; alreadyGenerated true', async () => {
      const rawUuid = 'existing-raw-uuid-abc123';
      (prisma.paciente.findUnique as jest.Mock).mockResolvedValue({
        portalToken: sha256(rawUuid),
        portalTokenCifrado: `enc(${rawUuid})`,
        email: 'test@example.com',
      });

      const result = await service.generarPortalLink(PACIENTE_ID);

      expect(result.alreadyGenerated).toBe(true);
      expect(result.url).toBe(`${FRONTEND_URL}/portal/${rawUuid}`);

      // NO debe escribir BD
      expect(prisma.paciente.update).not.toHaveBeenCalled();
    });
  });

  // ── Caso B: legacy (portalToken presente, portalTokenCifrado null) ─────────

  describe('generarPortalLink — legacy (token sin cifrado)', () => {
    it('rota el token: genera nuevo uuid, sobrescribe hash + cifrado; devuelve url nueva; alreadyGenerated false', async () => {
      const oldHash = sha256('old-uuid');
      (prisma.paciente.findUnique as jest.Mock).mockResolvedValue({
        portalToken: oldHash,
        portalTokenCifrado: null,
        email: 'test@example.com',
      });
      (prisma.paciente.update as jest.Mock).mockResolvedValue({});

      const result = await service.generarPortalLink(PACIENTE_ID);

      expect(result.alreadyGenerated).toBe(false);
      expect(result.url).toMatch(/^http:\/\/localhost:3000\/portal\/.+/);

      const updateCall = (prisma.paciente.update as jest.Mock).mock.calls[0][0];
      const { portalToken, portalTokenCifrado } = updateCall.data;

      // El nuevo hash debe ser distinto al viejo
      expect(portalToken).not.toBe(oldHash);
      expect(portalToken).toMatch(/^[0-9a-f]{64}$/);

      // El nuevo cifrado debe usar el nuevo raw
      const rawFromUrl = result.url!.split('/portal/')[1];
      expect(portalTokenCifrado).toBe(`enc(${rawFromUrl})`);
      expect(portalToken).toBe(sha256(rawFromUrl));
    });
  });

  // ── obtenerPortalLink — sólo lectura ──────────────────────────────────────

  describe('obtenerPortalLink', () => {
    it('paciente no encontrado → NotFoundException', async () => {
      (prisma.paciente.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.obtenerPortalLink(PACIENTE_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('con token + cifrado → url estable, alreadyGenerated true, sin escribir BD', async () => {
      const rawUuid = 'stable-raw-uuid-xyz';
      (prisma.paciente.findUnique as jest.Mock).mockResolvedValue({
        portalToken: sha256(rawUuid),
        portalTokenCifrado: `enc(${rawUuid})`,
      });

      const result = await service.obtenerPortalLink(PACIENTE_ID);

      expect(result.url).toBe(`${FRONTEND_URL}/portal/${rawUuid}`);
      expect(result.alreadyGenerated).toBe(true);
      expect(result.legacy).toBeFalsy();
      expect(prisma.paciente.update).not.toHaveBeenCalled();
    });

    it('sin token → url null, alreadyGenerated false', async () => {
      (prisma.paciente.findUnique as jest.Mock).mockResolvedValue({
        portalToken: null,
        portalTokenCifrado: null,
      });

      const result = await service.obtenerPortalLink(PACIENTE_ID);

      expect(result.url).toBeNull();
      expect(result.alreadyGenerated).toBe(false);
      expect(prisma.paciente.update).not.toHaveBeenCalled();
    });

    it('legacy (token sin cifrado) → url null, alreadyGenerated true, legacy true', async () => {
      (prisma.paciente.findUnique as jest.Mock).mockResolvedValue({
        portalToken: sha256('old-uuid'),
        portalTokenCifrado: null,
      });

      const result = await service.obtenerPortalLink(PACIENTE_ID);

      expect(result.url).toBeNull();
      expect(result.alreadyGenerated).toBe(true);
      expect(result.legacy).toBe(true);
      expect(prisma.paciente.update).not.toHaveBeenCalled();
    });

    it('tamper/clave distinta: decrypt throwea → legacy (url null, legacy true), sin 500', async () => {
      (prisma.paciente.findUnique as jest.Mock).mockResolvedValue({
        portalToken: sha256('some-uuid'),
        portalTokenCifrado: 'INVALID_BLOB',
      });
      // El mock decrypt lanza para blobs sin formato enc(x)
      const result = await service.obtenerPortalLink(PACIENTE_ID);

      expect(result.url).toBeNull();
      expect(result.alreadyGenerated).toBe(true);
      expect(result.legacy).toBe(true);
    });
  });

  // ── Seguridad: raw token nunca aparece en logger ──────────────────────────

  describe('seguridad — raw token no se loguea', () => {
    it('generarPortalLink no llama a console.log/console.error con el rawUuid', async () => {
      (prisma.paciente.findUnique as jest.Mock).mockResolvedValue({
        portalToken: null,
        portalTokenCifrado: null,
        email: 'test@example.com',
      });
      (prisma.paciente.update as jest.Mock).mockResolvedValue({});

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await service.generarPortalLink(PACIENTE_ID);
      const rawUuid = result.url!.split('/portal/')[1];

      // Ningún log debe contener el uuid crudo
      for (const call of logSpy.mock.calls) {
        expect(JSON.stringify(call)).not.toContain(rawUuid);
      }
      for (const call of errSpy.mock.calls) {
        expect(JSON.stringify(call)).not.toContain(rawUuid);
      }

      logSpy.mockRestore();
      errSpy.mockRestore();
    });
  });

  // ── getKanban -> computePasosCrm boundary (WR-01/SC#3, INDIC-04) ──────────
  // Ejercita la forma real del select de getKanban (sin take:1) contra
  // computePasosCrm. Atrapa la regresion si se reintroduce take:1 en el
  // select de consentimientosFirmados (61-REVIEW.md WR-01).

  describe('getKanban -> computePasosCrm boundary (WR-01/SC#3)', () => {
    const KANBAN_PACIENTE_ID = 'paciente-kanban-uuid-1';

    function buildKanbanPaciente(overrides: {
      indicacionesLeidasAt: Date | null;
      indicacionesEnviadas: boolean;
      consentimientosFirmados: Array<{
        firmadoAt: Date;
        indicacionesLeidasAt: Date | null;
      }>;
    }) {
      return {
        id: KANBAN_PACIENTE_ID,
        nombreCompleto: 'Paciente Kanban Test',
        fotoUrl: null,
        etapaCRM: 'CONFIRMADO',
        temperatura: null,
        scoreConversion: null,
        tratamiento: null,
        lugarIntervencion: null,
        updatedAt: new Date('2026-06-01'),
        enListaEspera: false,
        comentarioListaEspera: null,
        flujo: null,
        presupuestos: [],
        turnos: [],
        contactos: [],
        autorizaciones: [],
        consentimientoFirmado: false,
        indicacionesEnviadas: overrides.indicacionesEnviadas,
        indicacionesLeidasAt: overrides.indicacionesLeidasAt,
        cirugias: [],
        historiasClinicas: [],
        consentimientosFirmados: overrides.consentimientosFirmados,
      };
    }

    async function getPacienteFromKanban(profesionalId: string, id: string) {
      const result = await service.getKanban(profesionalId);
      const flat = result.flatMap((c) => c.pacientes);
      const found = flat.find((p) => p.id === id);
      if (!found) throw new Error('Paciente no encontrado en resultado de getKanban');
      return found;
    }

    it('Test A (regresion): fila mas reciente indicacionesLeidasAt=null + fila antigua con receipt legacy -> indicacionesPreop completo', async () => {
      (prisma.paciente.findMany as jest.Mock).mockResolvedValue([
        buildKanbanPaciente({
          indicacionesLeidasAt: null,
          indicacionesEnviadas: false,
          consentimientosFirmados: [
            {
              firmadoAt: new Date('2025-01-01'),
              indicacionesLeidasAt: new Date('2025-01-01'),
            },
            {
              firmadoAt: new Date('2026-06-01'),
              indicacionesLeidasAt: null,
            },
          ],
        }),
      ]);

      const paciente = await getPacienteFromKanban('prof-1', KANBAN_PACIENTE_ID);

      expect(paciente.pasos.indicacionesPreop).toBe('completo');
    });

    it('Test B (no-regresion Paso 4): mismo mock multi-zona mantiene consentimiento completo', async () => {
      (prisma.paciente.findMany as jest.Mock).mockResolvedValue([
        buildKanbanPaciente({
          indicacionesLeidasAt: null,
          indicacionesEnviadas: false,
          consentimientosFirmados: [
            {
              firmadoAt: new Date('2025-01-01'),
              indicacionesLeidasAt: new Date('2025-01-01'),
            },
            {
              firmadoAt: new Date('2026-06-01'),
              indicacionesLeidasAt: null,
            },
          ],
        }),
      ]);

      const paciente = await getPacienteFromKanban('prof-1', KANBAN_PACIENTE_ID);

      expect(paciente.pasos.consentimiento).toBe('completo');
    });

    it('Test C (pendiente real): sin receipts en ninguna fuente -> indicacionesPreop pendiente', async () => {
      (prisma.paciente.findMany as jest.Mock).mockResolvedValue([
        buildKanbanPaciente({
          indicacionesLeidasAt: null,
          indicacionesEnviadas: false,
          consentimientosFirmados: [
            {
              firmadoAt: new Date('2025-01-01'),
              indicacionesLeidasAt: null,
            },
            {
              firmadoAt: new Date('2026-06-01'),
              indicacionesLeidasAt: null,
            },
          ],
        }),
      ]);

      const paciente = await getPacienteFromKanban('prof-1', KANBAN_PACIENTE_ID);

      expect(paciente.pasos.indicacionesPreop).toBe('pendiente');
    });
  });
});

// ── getKanban consentimientosFirmados select — source-shape guard (INDIC-04) ─
// Guard estatico (no mockea Prisma, no instancia el service): lee la fuente
// real de pacientes.service.ts y aisla el bloque `consentimientosFirmados: { ... }`
// por balance de llaves desde su llave de apertura, para que el comentario
// documental "Sin take:1" (que precede la llave) no genere falso positivo.
// Cierra el gap de 61-VERIFICATION.md: el test de frontera de 61-04 mockea
// findMany con datos hechos a mano, por lo que reintroducir take:1 en el select
// real dejaria esa suite en verde sin este guard.
describe('getKanban consentimientosFirmados select — source-shape guard (take regression, INDIC-04)', () => {
  it('el bloque consentimientosFirmados no tiene take/orderBy y conserva firmadoAt + indicacionesLeidasAt', () => {
    const sourcePath = join(__dirname, 'pacientes.service.ts');
    const source: string = readFileSync(sourcePath, 'utf8');

    const keyIndex = source.indexOf('consentimientosFirmados:');
    expect(keyIndex).not.toBe(-1);

    const openBraceIndex = source.indexOf('{', keyIndex);
    expect(openBraceIndex).not.toBe(-1);

    let depth = 0;
    let endIndex = -1;
    for (let i = openBraceIndex; i < source.length; i++) {
      const ch = source[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          endIndex = i;
          break;
        }
      }
    }
    expect(endIndex).not.toBe(-1);

    const block = source.slice(openBraceIndex, endIndex + 1);

    // Falsificacion: reintroducir take/orderBy en el select real de
    // consentimientosFirmados (pacientes.service.ts) rompe estos asserts.
    expect(block).not.toMatch(/\btake\b/);
    expect(block).not.toMatch(/\borderBy\b/);

    // No-degradacion del select (T-61-10): solo estos 2 campos, sin ampliar
    // a datos forenses (hash/ip/userAgent/PDF).
    expect(block).toMatch(/firmadoAt/);
    expect(block).toMatch(/indicacionesLeidasAt/);
  });
});
