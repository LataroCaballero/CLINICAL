/**
 * whatsapp.service.spec.ts
 * Unit tests for the 4 telefono guards wired into WhatsappService (Phase 67,
 * ENVIO-01/02) — requireTelefonoParaEnvio() must fail closed on
 * sendTemplateMessage/sendFreeText/sendPresupuestoPdf/retryMessage before
 * touching Meta, before creating a MensajeWhatsApp record, and before
 * enqueuing a job on the BullMQ queue.
 *
 * Mock strategy:
 * - Queue: getQueueToken(WHATSAPP_QUEUE) -> { add: jest.fn() }, mirrors the
 *   finanzas.service.spec.ts BullMQ-mock pattern (getQueueToken(CAE_QUEUE)).
 * - PrismaService: per-test overrides via jest.fn(), mirrors
 *   pacientes.service.spec.ts's mock-Prisma shape.
 * - EncryptionService: decrypt() always returns a fixture token so
 *   getDecryptedConfig() never explodes on a real AES call.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from './crypto/encryption.service';
import { WHATSAPP_QUEUE } from './processors/whatsapp-message.processor';
import { SendWaMessageDto } from './dto/send-wa-message.dto';
import { TipoMensajeWA } from '@prisma/client';

const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job-1' }),
};

const mockPrisma = {
  configuracionWABA: {
    findUnique: jest.fn(),
  },
  paciente: {
    findUnique: jest.fn(),
  },
  mensajeWhatsApp: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockEncryptionService = {
  decrypt: jest.fn(() => 'token-desencriptado'),
};

const WABA_CONFIG_FIXTURE = {
  phoneNumberId: 'phone-id-1',
  accessTokenEncrypted: 'enc(token)',
  wabaId: 'waba-id-1',
  displayPhone: '+5491100000000',
};

describe('WhatsappService — guards de teléfono (Phase 67, ENVIO-01/02)', () => {
  let service: WhatsappService;

  const PROFESIONAL_ID = 'prof-1';
  const PACIENTE_ID = 'paciente-1';

  beforeEach(async () => {
    jest.clearAllMocks();
    mockQueue.add.mockResolvedValue({ id: 'job-1' });
    mockEncryptionService.decrypt.mockReturnValue('token-desencriptado');
    mockPrisma.configuracionWABA.findUnique.mockResolvedValue(
      WABA_CONFIG_FIXTURE,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        { provide: getQueueToken(WHATSAPP_QUEUE), useValue: mockQueue },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EncryptionService, useValue: mockEncryptionService },
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
  });

  function buildTemplateDto(overrides: Partial<SendWaMessageDto> = {}) {
    return {
      pacienteId: PACIENTE_ID,
      templateName: 'recordatorio_turno',
      tipo: TipoMensajeWA.RECORDATORIO_TURNO,
      ...overrides,
    } as SendWaMessageDto;
  }

  // ── sendTemplateMessage ──────────────────────────────────────────────────

  describe('sendTemplateMessage', () => {
    it('D-03: telefono null -> BadRequestException, sin encolar ni crear registro', async () => {
      mockPrisma.paciente.findUnique.mockResolvedValue({
        telefono: null,
        whatsappOptIn: true,
      });

      await expect(
        service.sendTemplateMessage(PROFESIONAL_ID, buildTemplateDto()),
      ).rejects.toThrow(BadRequestException);

      expect(mockQueue.add).not.toHaveBeenCalled();
      expect(mockPrisma.mensajeWhatsApp.create).not.toHaveBeenCalled();
    });

    it('D-03: el mensaje de rechazo dice explícitamente "no tiene un número de teléfono cargado"', async () => {
      mockPrisma.paciente.findUnique.mockResolvedValue({
        telefono: null,
        whatsappOptIn: true,
      });

      await expect(
        service.sendTemplateMessage(PROFESIONAL_ID, buildTemplateDto()),
      ).rejects.toThrow(/no tiene un número de teléfono cargado/);
    });

    it("D-03: telefono '' (cadena vacía) -> mismo rechazo, 0 encolados", async () => {
      mockPrisma.paciente.findUnique.mockResolvedValue({
        telefono: '',
        whatsappOptIn: true,
      });

      await expect(
        service.sendTemplateMessage(PROFESIONAL_ID, buildTemplateDto()),
      ).rejects.toThrow(BadRequestException);

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it("D-03: telefono '   ' (sólo espacios) -> mismo rechazo, falsy tras trim", async () => {
      mockPrisma.paciente.findUnique.mockResolvedValue({
        telefono: '   ',
        whatsappOptIn: true,
      });

      await expect(
        service.sendTemplateMessage(PROFESIONAL_ID, buildTemplateDto()),
      ).rejects.toThrow(BadRequestException);

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('D-04: telefono null con telefonoAlternativo presente en el registro -> sigue rechazando (el alternativo no es canal de envío)', async () => {
      mockPrisma.paciente.findUnique.mockResolvedValue({
        telefono: null,
        telefonoAlternativo: '1123456789',
        whatsappOptIn: true,
      });

      await expect(
        service.sendTemplateMessage(PROFESIONAL_ID, buildTemplateDto()),
      ).rejects.toThrow(BadRequestException);

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('orden de guards: whatsappOptIn=false y telefono=null -> falla por el mensaje de consentimiento, no por el de teléfono', async () => {
      mockPrisma.paciente.findUnique.mockResolvedValue({
        telefono: null,
        whatsappOptIn: false,
      });

      await expect(
        service.sendTemplateMessage(PROFESIONAL_ID, buildTemplateDto()),
      ).rejects.toThrow(/no ha dado su consentimiento/);

      expect(mockQueue.add).not.toHaveBeenCalled();
      expect(mockPrisma.mensajeWhatsApp.create).not.toHaveBeenCalled();
    });

    it("un teléfono corto pero presente ('123') NO bloquea el envío — el guard mira existencia, no validez (D-03)", async () => {
      mockPrisma.paciente.findUnique.mockResolvedValue({
        telefono: '123',
        whatsappOptIn: true,
      });
      mockPrisma.mensajeWhatsApp.create.mockResolvedValue({ id: 'msg-1' });

      await expect(
        service.sendTemplateMessage(PROFESIONAL_ID, buildTemplateDto()),
      ).resolves.toEqual({ mensajeId: 'msg-1', enqueued: true });

      expect(mockQueue.add).toHaveBeenCalledTimes(1);
    });

    it('camino feliz: telefono presente y whatsappOptIn true -> encola exactamente una vez con el telefono trimmeado en el payload', async () => {
      mockPrisma.paciente.findUnique.mockResolvedValue({
        telefono: '  1123456789  ',
        whatsappOptIn: true,
      });
      mockPrisma.mensajeWhatsApp.create.mockResolvedValue({ id: 'msg-happy' });

      await service.sendTemplateMessage(PROFESIONAL_ID, buildTemplateDto());

      expect(mockQueue.add).toHaveBeenCalledTimes(1);
      const jobPayload = mockQueue.add.mock.calls[0][1];
      expect(jobPayload.telefono).toBe('1123456789');
    });
  });

  // ── sendFreeText ─────────────────────────────────────────────────────────

  describe('sendFreeText', () => {
    it('telefono null -> BadRequestException, sin encolar', async () => {
      mockPrisma.paciente.findUnique.mockResolvedValue({
        telefono: null,
        whatsappOptIn: true,
      });

      await expect(
        service.sendFreeText(PROFESIONAL_ID, PACIENTE_ID, 'Hola'),
      ).rejects.toThrow(BadRequestException);

      expect(mockQueue.add).not.toHaveBeenCalled();
      expect(mockPrisma.mensajeWhatsApp.create).not.toHaveBeenCalled();
    });
  });

  // ── sendPresupuestoPdf ───────────────────────────────────────────────────

  describe('sendPresupuestoPdf', () => {
    it('telefono null -> BadRequestException, sin encolar (ENVIO-02)', async () => {
      mockPrisma.paciente.findUnique.mockResolvedValue({
        telefono: null,
        whatsappOptIn: true,
      });

      await expect(
        service.sendPresupuestoPdf(
          PROFESIONAL_ID,
          PACIENTE_ID,
          'presupuesto-1',
          'https://api.example.com/presupuestos/presupuesto-1/pdf',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockQueue.add).not.toHaveBeenCalled();
      expect(mockPrisma.mensajeWhatsApp.create).not.toHaveBeenCalled();
    });
  });

  // ── retryMessage ─────────────────────────────────────────────────────────

  describe('retryMessage', () => {
    it('mensaje.paciente.telefono null y ownership válido -> rechaza, mensajeWhatsApp.update con 0 llamadas', async () => {
      mockPrisma.mensajeWhatsApp.findUnique.mockResolvedValue({
        id: 'msg-1',
        profesionalId: PROFESIONAL_ID,
        paciente: { telefono: null },
      });

      await expect(
        service.retryMessage(PROFESIONAL_ID, 'msg-1'),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.mensajeWhatsApp.update).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it("profesionalId distinto al dueño del mensaje -> NotFoundException('Mensaje no encontrado'), incluso con telefono null", async () => {
      mockPrisma.mensajeWhatsApp.findUnique.mockResolvedValue({
        id: 'msg-2',
        profesionalId: 'otro-profesional',
        paciente: { telefono: null },
      });

      await expect(
        service.retryMessage(PROFESIONAL_ID, 'msg-2'),
      ).rejects.toThrow(new NotFoundException('Mensaje no encontrado'));

      expect(mockPrisma.mensajeWhatsApp.update).not.toHaveBeenCalled();
    });

    it('camino feliz: telefono presente -> reencola y actualiza el estado a PENDIENTE', async () => {
      mockPrisma.mensajeWhatsApp.findUnique.mockResolvedValue({
        id: 'msg-3',
        profesionalId: PROFESIONAL_ID,
        paciente: { telefono: '1123456789' },
      });
      mockPrisma.mensajeWhatsApp.update.mockResolvedValue({ id: 'msg-3' });

      await expect(
        service.retryMessage(PROFESIONAL_ID, 'msg-3'),
      ).resolves.toEqual({ mensajeId: 'msg-3', enqueued: true });

      expect(mockPrisma.mensajeWhatsApp.update).toHaveBeenCalledTimes(1);
      expect(mockQueue.add).toHaveBeenCalledTimes(1);
    });
  });
});
