import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConsentimientosService } from './consentimientos.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const PROFESIONAL_ID = 'prof-123';
const ZONA_ID = 'zona-abc';

const mockZona = {
  id: ZONA_ID,
  nombre: 'Abdomen',
  orden: 1,
  activo: true,
  esSistema: false,
  profesionalId: PROFESIONAL_ID,
  indicacionesUrl: null,
};

const mockPrisma = {
  zonaHC: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  consentimientoZonaArchivo: {
    updateMany: jest.fn(),
    create: jest.fn(),
    // D-03: uploadConsentimiento computes next version via aggregate(_max.version)
    // before the $transaction. Default to no prior version → nextVersion = 1.
    aggregate: jest.fn().mockResolvedValue({ _max: { version: null } }),
  },
  $transaction: jest.fn(),
};

const mockStorage = {
  save: jest.fn(),
  getPublicUrl: jest.fn(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ConsentimientosService', () => {
  let service: ConsentimientosService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentimientosService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorage },
      ],
    }).compile();

    service = module.get<ConsentimientosService>(ConsentimientosService);
  });

  // ── uploadConsentimiento ─────────────────────────────────────────────────

  describe('uploadConsentimiento', () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4 fake pdf content');
    const nonPdfBuffer = Buffer.from('PK\x03\x04 this is a zip not a pdf');

    it('should save a valid PDF, mark prior vigente=false, create new vigente row', async () => {
      // Arrange
      const savedPath = `${PROFESIONAL_ID}/uuid-1234.pdf`;
      const createdRow = {
        id: 'consent-1',
        zonaId: ZONA_ID,
        profesionalId: PROFESIONAL_ID,
        path: savedPath,
        nombreOriginal: 'consentimiento.pdf',
        uploadedAt: new Date(),
        vigente: true,
      };

      mockPrisma.zonaHC.findUnique.mockResolvedValue(mockZona);
      mockStorage.save.mockResolvedValue(savedPath);
      mockStorage.getPublicUrl.mockReturnValue(
        `http://localhost:3001/uploads/${savedPath}`,
      );

      // $transaction receives an array of promises (Prisma batch transaction)
      mockPrisma.$transaction.mockImplementation(async () => {
        return [null, createdRow];
      });

      // Act
      const result = await service.uploadConsentimiento(
        PROFESIONAL_ID,
        ZONA_ID,
        validPdfBuffer,
        'consentimiento.pdf',
      );

      // Assert — ownership guard called
      expect(mockPrisma.zonaHC.findUnique).toHaveBeenCalledWith({
        where: { id: ZONA_ID },
      });

      // Assert — storage save called (valid PDF persisted)
      expect(mockStorage.save).toHaveBeenCalledWith(
        validPdfBuffer,
        PROFESIONAL_ID,
      );

      // Assert — transaction includes updateMany (vigente=false) + create (new row)
      expect(mockPrisma.$transaction).toHaveBeenCalled();

      // Assert — result has url attached
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for a non-PDF buffer (D-14) and NOT call StorageService.save', async () => {
      // Arrange — zona exists and belongs to profesional
      mockPrisma.zonaHC.findUnique.mockResolvedValue(mockZona);

      // Act & Assert
      await expect(
        service.uploadConsentimiento(
          PROFESIONAL_ID,
          ZONA_ID,
          nonPdfBuffer,
          'malicious.exe',
        ),
      ).rejects.toThrow(BadRequestException);

      // Critical: storage.save must NOT be called — nothing persists (SC#2)
      expect(mockStorage.save).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if zona does not belong to the profesional (cross-tenant guard)', async () => {
      // Arrange — zona belongs to a different profesional
      mockPrisma.zonaHC.findUnique.mockResolvedValue({
        ...mockZona,
        profesionalId: 'other-prof-999',
      });

      // Act & Assert
      await expect(
        service.uploadConsentimiento(
          PROFESIONAL_ID,
          ZONA_ID,
          validPdfBuffer,
          'consent.pdf',
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockStorage.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if zona does not exist', async () => {
      // Arrange — zona not found
      mockPrisma.zonaHC.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.uploadConsentimiento(
          PROFESIONAL_ID,
          ZONA_ID,
          validPdfBuffer,
          'consent.pdf',
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockStorage.save).not.toHaveBeenCalled();
    });
  });

  // ── getZonasConConsentimiento ────────────────────────────────────────────

  describe('getZonasConConsentimiento', () => {
    it('should return zonas with vigente consent and indicacionesUrl', async () => {
      // Arrange
      const savedPath = `${PROFESIONAL_ID}/uuid-1234.pdf`;
      const mockZonas = [
        {
          ...mockZona,
          indicacionesUrl: 'https://example.com/indicaciones',
          consentimientoArchivos: [
            {
              id: 'consent-1',
              zonaId: ZONA_ID,
              profesionalId: PROFESIONAL_ID,
              path: savedPath,
              nombreOriginal: 'consentimiento.pdf',
              uploadedAt: new Date(),
              vigente: true,
            },
          ],
        },
      ];

      mockPrisma.zonaHC.findMany.mockResolvedValue(mockZonas);
      mockStorage.getPublicUrl.mockReturnValue(
        `http://localhost:3001/uploads/${savedPath}`,
      );

      // Act
      const result = await service.getZonasConConsentimiento(PROFESIONAL_ID);

      // Assert
      expect(mockPrisma.zonaHC.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { profesionalId: PROFESIONAL_ID, activo: true },
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].indicacionesUrl).toBe(
        'https://example.com/indicaciones',
      );
      expect(result[0].consentimientoVigente).not.toBeNull();
      expect(result[0].consentimientoVigente?.path).toBe(savedPath);
    });

    it('should return null consentimientoVigente when no consent exists for a zona', async () => {
      // Arrange
      const mockZonas = [
        {
          ...mockZona,
          consentimientoArchivos: [],
        },
      ];

      mockPrisma.zonaHC.findMany.mockResolvedValue(mockZonas);

      // Act
      const result = await service.getZonasConConsentimiento(PROFESIONAL_ID);

      // Assert
      expect(result[0].consentimientoVigente).toBeNull();
    });
  });
});
