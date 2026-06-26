import { Test, TestingModule } from '@nestjs/testing';
import { SeguimientoSchedulerService } from './seguimiento-scheduler.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SeguimientoSchedulerService — CHAT-01 guard', () => {
  let service: SeguimientoSchedulerService;
  let prismaMock: {
    tareaSeguimiento: {
      findMany: jest.Mock;
      update: jest.Mock;
    };
    mensajeInterno: {
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaMock = {
      tareaSeguimiento: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      mensajeInterno: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeguimientoSchedulerService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<SeguimientoSchedulerService>(
      SeguimientoSchedulerService,
    );
  });

  it('CHAT-01: skips tasks where notificada=true (already alerted)', async () => {
    // Arrange: findMany is scoped to notificada:false — it returns no tasks
    // because already-notified tasks are filtered out by the WHERE clause
    prismaMock.tareaSeguimiento.findMany.mockResolvedValue([]);

    // Act
    await service.processSeguimientos();

    // Assert: findMany was called with notificada: false in the WHERE
    const whereArg =
      prismaMock.tareaSeguimiento.findMany.mock.calls[0][0].where;
    expect(whereArg).toHaveProperty('notificada', false);

    // Assert: no MensajeInterno is created when there are no pending tasks
    expect(prismaMock.mensajeInterno.create).not.toHaveBeenCalled();
  });

  it('CHAT-01: alerts a new task then marks it notificada=true', async () => {
    // Arrange: one pending un-notified task
    const fakeTarea = {
      id: 'tarea-1',
      tipo: 'SEGUIMIENTO_DIA_3',
      paciente: { id: 'p-1', nombreCompleto: 'Ana García' },
      profesional: { id: 'prof-1', usuarioId: 'user-1' },
    };
    prismaMock.tareaSeguimiento.findMany.mockResolvedValue([fakeTarea]);
    prismaMock.mensajeInterno.create.mockResolvedValue({ id: 'msg-1' });
    prismaMock.tareaSeguimiento.update.mockResolvedValue({});

    // Act
    await service.processSeguimientos();

    // Assert: MensajeInterno was created with esSistema=true
    expect(prismaMock.mensajeInterno.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.mensajeInterno.create.mock.calls[0][0].data).toMatchObject(
      {
        esSistema: true,
        pacienteId: 'p-1',
        autorId: 'user-1',
      },
    );

    // Assert: TareaSeguimiento.update called with notificada:true and notificadaEn
    expect(prismaMock.tareaSeguimiento.update).toHaveBeenCalledTimes(1);
    const updateCall = prismaMock.tareaSeguimiento.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: 'tarea-1' });
    expect(updateCall.data).toHaveProperty('notificada', true);
    expect(updateCall.data).toHaveProperty('notificadaEn');
    expect(updateCall.data.notificadaEn).toBeInstanceOf(Date);

    // Assert: completada is NOT set (task stays open for manual completion — D-05)
    expect(updateCall.data).not.toHaveProperty('completada');
  });
});
