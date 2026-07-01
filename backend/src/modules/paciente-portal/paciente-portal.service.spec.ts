import { Test, TestingModule } from '@nestjs/testing';
import {
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PacientePortalService } from './paciente-portal.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ConsentStampService } from '../consentimientos/consent-stamp.service';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const PAC_ID = 'pac-1';
const RAW_TOKEN = 'raw-uuid-token';

const basePaciente = {
  id: PAC_ID,
  dni: '12.345.678',
  portalIntentosFallidos: 0,
  portalBloqueadoHasta: null as Date | null,
};

const mockPrisma = {
  paciente: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  cirugia: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  mensajeInterno: {
    create: jest.fn(),
  },
  // 56-09: consent resolver unions surgery zonas + HC-entry zonas.
  historiaClinica: {
    findMany: jest.fn(),
  },
  zonaHC: {
    findMany: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn(),
};

// 56-04 injected StorageService (constructor index [2]) to build consent pdfUrls.
const mockStorage = {
  getPublicUrl: jest.fn(),
  save: jest.fn(),
};

// 56-05 injected ConsentStampService (constructor index [3]) to stamp signatures.
const mockStamp = {
  validatePng: jest.fn(),
  stampSignature: jest.fn(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PacientePortalService', () => {
  let service: PacientePortalService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.paciente.update.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PacientePortalService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: StorageService, useValue: mockStorage },
        { provide: ConsentStampService, useValue: mockStamp },
      ],
    }).compile();

    service = module.get<PacientePortalService>(PacientePortalService);
  });

  // ── token lookup ──────────────────────────────────────────────────────────

  describe('preVerify / token lookup', () => {
    it('throws NotFoundException (no patient data) for an unknown token', async () => {
      mockPrisma.paciente.findUnique.mockResolvedValue(null);
      await expect(service.preVerify(RAW_TOKEN)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('looks up by the SHA-256 hash of the raw token, never the raw value', async () => {
      mockPrisma.paciente.findUnique.mockResolvedValue({ ...basePaciente });
      await service.preVerify(RAW_TOKEN);
      const whereArg = mockPrisma.paciente.findUnique.mock.calls[0][0].where;
      expect(whereArg.portalToken).toHaveLength(64); // sha256 hex
      expect(whereArg.portalToken).not.toBe(RAW_TOKEN);
    });

    it('reports bloqueado=true when the block is still in the future', async () => {
      mockPrisma.paciente.findUnique.mockResolvedValue({
        ...basePaciente,
        portalBloqueadoHasta: new Date(Date.now() + 60_000),
      });
      await expect(service.preVerify(RAW_TOKEN)).resolves.toEqual({
        existe: true,
        bloqueado: true,
      });
    });
  });

  // ── verificar: brute-force lock ─────────────────────────────────────────────

  describe('verificar', () => {
    it('1st/2nd wrong DNI throw Unauthorized and accumulate the counter without resetting it', async () => {
      // 1st failure: counter 0 → 1
      mockPrisma.paciente.findUnique.mockResolvedValueOnce({
        ...basePaciente,
        portalIntentosFallidos: 0,
        portalBloqueadoHasta: null,
      });
      await expect(
        service.verificar(RAW_TOKEN, '99999999'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(
        mockPrisma.paciente.update.mock.calls[0][0].data.portalIntentosFallidos,
      ).toBe(1);

      // 2nd failure: counter 1 → 2 (NOT reset back to 1)
      mockPrisma.paciente.findUnique.mockResolvedValueOnce({
        ...basePaciente,
        portalIntentosFallidos: 1,
        portalBloqueadoHasta: null,
      });
      await expect(
        service.verificar(RAW_TOKEN, '99999999'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(
        mockPrisma.paciente.update.mock.calls[1][0].data.portalIntentosFallidos,
      ).toBe(2);
    });

    it('3rd consecutive wrong DNI sets a ~15-min block and throws 429', async () => {
      mockPrisma.paciente.findUnique.mockResolvedValue({
        ...basePaciente,
        portalIntentosFallidos: 2,
        portalBloqueadoHasta: null,
      });
      const before = Date.now();
      let thrown: unknown;
      try {
        await service.verificar(RAW_TOKEN, '99999999');
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeInstanceOf(HttpException);
      expect((thrown as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );

      const data = mockPrisma.paciente.update.mock.calls[0][0].data;
      expect(data.portalIntentosFallidos).toBe(3);
      const blockMs = (data.portalBloqueadoHasta as Date).getTime() - before;
      expect(blockMs).toBeGreaterThan(14 * 60 * 1000);
      expect(blockMs).toBeLessThanOrEqual(15 * 60 * 1000 + 1000);
    });

    it('throws 429 immediately (before any DNI check) while the block is active', async () => {
      mockPrisma.paciente.findUnique.mockResolvedValue({
        ...basePaciente,
        portalIntentosFallidos: 3,
        portalBloqueadoHasta: new Date(Date.now() + 60_000),
      });
      let thrown: unknown;
      try {
        await service.verificar(RAW_TOKEN, '12345678'); // even a correct DNI is blocked
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeInstanceOf(HttpException);
      expect((thrown as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
      expect(mockPrisma.paciente.update).not.toHaveBeenCalled();
    });

    it('after an expired block a wrong DNI retries from a reset counter (block-duration model, D-03)', async () => {
      mockPrisma.paciente.findUnique.mockResolvedValue({
        ...basePaciente,
        portalIntentosFallidos: 3,
        portalBloqueadoHasta: new Date(Date.now() - 60_000), // expired
      });
      await expect(
        service.verificar(RAW_TOKEN, '99999999'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      const data = mockPrisma.paciente.update.mock.calls[0][0].data;
      expect(data.portalIntentosFallidos).toBe(1); // reset from 3 → fresh attempt 1
      expect(data.portalBloqueadoHasta).toBeNull();
    });

    it('correct DNI resets the counter, clears the block and returns a portal-scoped JWT', async () => {
      mockPrisma.paciente.findUnique.mockResolvedValue({
        ...basePaciente,
        portalIntentosFallidos: 2,
        portalBloqueadoHasta: null,
      });
      mockJwt.sign.mockReturnValue('signed.portal.jwt');

      const result = await service.verificar(RAW_TOKEN, '12345678');

      expect(result).toBe('signed.portal.jwt');
      const data = mockPrisma.paciente.update.mock.calls[0][0].data;
      expect(data.portalIntentosFallidos).toBe(0);
      expect(data.portalBloqueadoHasta).toBeNull();
      expect(mockJwt.sign.mock.calls[0][0]).toMatchObject({
        sub: PAC_ID,
        scope: 'portal-paciente',
      });
    });

    it('rejects a patient whose stored DNI normalizes to blank (no DNI on file)', async () => {
      mockPrisma.paciente.findUnique.mockResolvedValue({
        ...basePaciente,
        dni: '   ',
        portalIntentosFallidos: 0,
        portalBloqueadoHasta: null,
      });
      await expect(service.verificar(RAW_TOKEN, '   ')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(mockPrisma.paciente.update).not.toHaveBeenCalled();
    });
  });

  // ── confined write methods ──────────────────────────────────────────────────

  describe('updateContacto', () => {
    it('forwards only contact keys to the prisma update data object', async () => {
      const dto = {
        telefono: '111',
        email: 'a@b.com',
        // attacker-injected non-contact keys (defense in depth — no pipe in test)
        dni: '99999999',
        obraSocialId: 'os-evil',
        etapaCRM: 'GANADO',
      } as never;

      await service.updateContacto(PAC_ID, dto);

      const data = mockPrisma.paciente.update.mock.calls[0][0].data;
      expect(data).toEqual({ telefono: '111', email: 'a@b.com' });
      expect(data).not.toHaveProperty('dni');
      expect(data).not.toHaveProperty('obraSocialId');
      expect(data).not.toHaveProperty('etapaCRM');
    });

    it('CR-01: scopes the returned payload via select to safe contact fields only', async () => {
      await service.updateContacto(PAC_ID, { telefono: '111' } as never);

      const select = mockPrisma.paciente.update.mock.calls[0][0].select;
      expect(select).toBeDefined();
      // never echo back protected columns the portal exists to hide
      expect(select).not.toHaveProperty('portalToken');
      expect(select).not.toHaveProperty('portalTokenCifrado');
      expect(select).not.toHaveProperty('etapaCRM');
      expect(select).not.toHaveProperty('alergias');
      expect(select.telefono).toBe(true);
    });

    it('WR-02: drops an explicit null so it never reaches a non-nullable column', async () => {
      await service.updateContacto(PAC_ID, {
        telefono: null,
        email: 'a@b.com',
      } as never);

      const data = mockPrisma.paciente.update.mock.calls[0][0].data;
      expect(data).toEqual({ email: 'a@b.com' });
      expect(data).not.toHaveProperty('telefono');
    });
  });

  describe('updateSaludStaged', () => {
    it('writes only the *AutoReportad* staging keys, never curated clinical fields', async () => {
      const dto = {
        alergiasAutoReportadas: ['polen'],
        medicacionAutoReportada: ['ibuprofeno'],
        // attacker-injected curated clinical keys must NOT reach prisma (SC#4)
        alergias: ['curated'],
        condiciones: ['curated'],
        medicacion: ['curated'],
      } as never;

      await service.updateSaludStaged(PAC_ID, dto);

      const data = mockPrisma.paciente.update.mock.calls[0][0].data;
      expect(data).toEqual({
        alergiasAutoReportadas: ['polen'],
        medicacionAutoReportada: ['ibuprofeno'],
      });
      expect(data).not.toHaveProperty('alergias');
      expect(data).not.toHaveProperty('condiciones');
      expect(data).not.toHaveProperty('medicacion');
    });

    it('CR-01: scopes the returned payload via select to the four staged keys only', async () => {
      await service.updateSaludStaged(PAC_ID, {
        alergiasAutoReportadas: ['polen'],
      } as never);

      const select = mockPrisma.paciente.update.mock.calls[0][0].select;
      expect(select).toEqual({
        alergiasAutoReportadas: true,
        antecedentesAutoReportados: true,
        medicacionAutoReportada: true,
        tratamientosPreviosAutoReportados: true,
      });
      expect(select).not.toHaveProperty('alergias');
      expect(select).not.toHaveProperty('portalTokenCifrado');
    });
  });

  describe('verificar — malformed input (WR-01)', () => {
    it('rejects a non-string DNI as 401 instead of throwing a 500', async () => {
      mockPrisma.paciente.findUnique.mockResolvedValue({
        ...basePaciente,
        portalIntentosFallidos: 0,
        portalBloqueadoHasta: null,
      });
      await expect(
        service.verificar(RAW_TOKEN, {} as never),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ── crearConsulta (CHAT-04) ───────────────────────────────────────────────

  describe('crearConsulta', () => {
    const MSG = 'Hola doctor, tengo una consulta.';

    beforeEach(() => {
      // Paciente exists
      mockPrisma.paciente.findUnique.mockResolvedValue({ id: PAC_ID });
      // mensajeInterno.create returns the scoped payload
      mockPrisma.mensajeInterno.create.mockResolvedValue({
        id: 'msg-1',
        createdAt: new Date(),
      });
    });

    it('calls mensajeInterno.create with origenPaciente=true, autorId=null and the pacienteId argument', async () => {
      await service.crearConsulta(PAC_ID, { mensaje: MSG });

      expect(mockPrisma.mensajeInterno.create).toHaveBeenCalledTimes(1);
      const createCall = mockPrisma.mensajeInterno.create.mock.calls[0][0];
      expect(createCall.data.origenPaciente).toBe(true);
      expect(createCall.data.autorId).toBeNull();
      expect(createCall.data.pacienteId).toBe(PAC_ID);
      expect(createCall.data.mensaje).toBe(MSG);
    });

    it('derives pacienteId from the argument, never from the dto', async () => {
      const dto = {
        mensaje: MSG,
        // attacker-injected pacienteId in dto must NOT reach the create call
        pacienteId: 'evil-id',
      } as never;

      await service.crearConsulta(PAC_ID, dto);

      const createCall = mockPrisma.mensajeInterno.create.mock.calls[0][0];
      expect(createCall.data.pacienteId).toBe(PAC_ID);
      expect(createCall.data.pacienteId).not.toBe('evil-id');
    });

    it('returns a scoped payload with id and createdAt only', async () => {
      const result = await service.crearConsulta(PAC_ID, { mensaje: MSG });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('createdAt');
    });

    it('throws NotFoundException when the paciente does not exist', async () => {
      mockPrisma.paciente.findUnique.mockResolvedValue(null);

      await expect(
        service.crearConsulta('non-existent-id', { mensaje: MSG }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPrisma.mensajeInterno.create).not.toHaveBeenCalled();
    });
  });

  // ── getConsentimientosParaFirmar (56-04 + 56-09 union) ──────────────────────
  describe('getConsentimientosParaFirmar', () => {
    const zonaSignable = (id: string, nombre: string) => ({
      id,
      nombre,
      indicacionesUrl: null,
      consentimientoArchivos: [
        { id: `arch-${id}`, path: `p/${id}.pdf`, version: 1 },
      ],
      consentimientosFirmados: [],
    });

    beforeEach(() => {
      // Default: no surgeries, no HC, no zonas — overridden per test.
      mockPrisma.cirugia.findMany.mockResolvedValue([]);
      mockPrisma.historiaClinica.findMany.mockResolvedValue([]);
      mockPrisma.zonaHC.findMany.mockResolvedValue([]);
      mockStorage.getPublicUrl.mockImplementation((p: string) => `http://x/${p}`);
    });

    it('returns SIN_CIRUGIA when neither a pending surgery nor an HC zona exists', async () => {
      const res = await service.getConsentimientosParaFirmar(PAC_ID);
      expect(res).toEqual([{ estado: 'SIN_CIRUGIA' }]);
    });

    it('resolves a signable consent from an HC zona even with NO programmed surgery (56-09)', async () => {
      mockPrisma.cirugia.findMany.mockResolvedValue([]);
      mockPrisma.historiaClinica.findMany.mockResolvedValue([
        { entradas: [{ contenido: { zonas: [{ zonaId: 'z1' }] } }] },
      ]);
      mockPrisma.zonaHC.findMany.mockResolvedValue([zonaSignable('z1', 'Mamas')]);

      const res = await service.getConsentimientosParaFirmar(PAC_ID);

      // zonaHC was queried for exactly the HC-derived id.
      expect(mockPrisma.zonaHC.findMany.mock.calls[0][0].where.id.in).toEqual([
        'z1',
      ]);
      expect(res).toHaveLength(1);
      expect(res[0]).toMatchObject({ estado: 'PARA_FIRMAR', zonaId: 'z1' });
    });

    it('deduplicates a zona reachable from BOTH a surgery and the HC (D-08)', async () => {
      mockPrisma.cirugia.findMany.mockResolvedValue([
        { cirugiaCatalogo: { zonaId: 'z1' } },
      ]);
      mockPrisma.historiaClinica.findMany.mockResolvedValue([
        { entradas: [{ contenido: { zonas: [{ zonaId: 'z1' }] } }] },
      ]);
      mockPrisma.zonaHC.findMany.mockResolvedValue([zonaSignable('z1', 'Mamas')]);

      const res = await service.getConsentimientosParaFirmar(PAC_ID);

      // Union deduped to a single zonaId before the classify query.
      expect(mockPrisma.zonaHC.findMany.mock.calls[0][0].where.id.in).toEqual([
        'z1',
      ]);
      expect(res).toHaveLength(1);
      expect(res[0]).toMatchObject({ estado: 'PARA_FIRMAR', zonaId: 'z1' });
    });

    it('emits SIN_CATALOGO for a pending surgery with no catalog link, alongside HC zonas', async () => {
      mockPrisma.cirugia.findMany.mockResolvedValue([{ cirugiaCatalogo: null }]);
      mockPrisma.historiaClinica.findMany.mockResolvedValue([
        { entradas: [{ contenido: { zonas: [{ zonaId: 'z2' }] } }] },
      ]);
      mockPrisma.zonaHC.findMany.mockResolvedValue([zonaSignable('z2', 'Abdomen')]);

      const res = await service.getConsentimientosParaFirmar(PAC_ID);

      expect(res).toEqual(
        expect.arrayContaining([
          { estado: 'SIN_CATALOGO' },
          expect.objectContaining({ estado: 'PARA_FIRMAR', zonaId: 'z2' }),
        ]),
      );
    });
  });
});
