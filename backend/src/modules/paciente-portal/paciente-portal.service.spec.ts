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
  },
};

const mockJwt = {
  sign: jest.fn(),
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
      await expect(service.verificar(RAW_TOKEN, '99999999')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(mockPrisma.paciente.update.mock.calls[0][0].data.portalIntentosFallidos).toBe(1);

      // 2nd failure: counter 1 → 2 (NOT reset back to 1)
      mockPrisma.paciente.findUnique.mockResolvedValueOnce({
        ...basePaciente,
        portalIntentosFallidos: 1,
        portalBloqueadoHasta: null,
      });
      await expect(service.verificar(RAW_TOKEN, '99999999')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(mockPrisma.paciente.update.mock.calls[1][0].data.portalIntentosFallidos).toBe(2);
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
      expect((thrown as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);

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
      expect((thrown as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(mockPrisma.paciente.update).not.toHaveBeenCalled();
    });

    it('after an expired block a wrong DNI retries from a reset counter (block-duration model, D-03)', async () => {
      mockPrisma.paciente.findUnique.mockResolvedValue({
        ...basePaciente,
        portalIntentosFallidos: 3,
        portalBloqueadoHasta: new Date(Date.now() - 60_000), // expired
      });
      await expect(service.verificar(RAW_TOKEN, '99999999')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
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
});
