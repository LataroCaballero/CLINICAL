import { Test, TestingModule } from '@nestjs/testing';
import { CirugiaRealizadaSchedulerService } from './cirugia-realizada-scheduler.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CirugiaRealizadaSchedulerService', () => {
  let service: CirugiaRealizadaSchedulerService;
  let prismaMock: {
    cirugia: {
      findMany: jest.Mock;
    };
    paciente: {
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaMock = {
      cirugia: {
        findMany: jest.fn(),
      },
      paciente: {
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CirugiaRealizadaSchedulerService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<CirugiaRealizadaSchedulerService>(
      CirugiaRealizadaSchedulerService,
    );
  });

  it('mueve a PROCEDIMIENTO_REALIZADO a paciente con cirugía pasada y etapaCRM menor (CONFIRMADO → orden 5 < 6)', async () => {
    // Arrange
    prismaMock.cirugia.findMany.mockResolvedValue([
      {
        pacienteId: 'p-1',
        paciente: { etapaCRM: 'CONFIRMADO' },
      },
    ]);
    prismaMock.paciente.update.mockResolvedValue({});

    // Act
    await service.moverCirugiasRealizadas();

    // Assert: update llamado con PROCEDIMIENTO_REALIZADO
    expect(prismaMock.paciente.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.paciente.update).toHaveBeenCalledWith({
      where: { id: 'p-1' },
      data: { etapaCRM: 'PROCEDIMIENTO_REALIZADO' },
    });
  });

  it('NO mueve a paciente ya en PROCEDIMIENTO_REALIZADO (gate >= 6)', async () => {
    // Arrange: paciente ya está en orden 6
    prismaMock.cirugia.findMany.mockResolvedValue([
      {
        pacienteId: 'p-2',
        paciente: { etapaCRM: 'PROCEDIMIENTO_REALIZADO' },
      },
    ]);

    // Act
    await service.moverCirugiasRealizadas();

    // Assert: NO se llama update
    expect(prismaMock.paciente.update).not.toHaveBeenCalled();
  });

  it('NO mueve a paciente en PERDIDO (excluido explícitamente — no está en ETAPA_ORDEN)', async () => {
    // Arrange: paciente en PERDIDO
    prismaMock.cirugia.findMany.mockResolvedValue([
      {
        pacienteId: 'p-3',
        paciente: { etapaCRM: 'PERDIDO' },
      },
    ]);

    // Act
    await service.moverCirugiasRealizadas();

    // Assert: NO se llama update
    expect(prismaMock.paciente.update).not.toHaveBeenCalled();
  });

  it('cirugía con fecha futura no entra en findMany (where fecha < ahora) — verifica el filtro', async () => {
    // Arrange: findMany no devuelve nada (fecha futura excluida por el WHERE)
    prismaMock.cirugia.findMany.mockResolvedValue([]);

    // Act
    await service.moverCirugiasRealizadas();

    // Assert: el findMany fue llamado con fecha: { lt: ... }
    const whereArg = prismaMock.cirugia.findMany.mock.calls[0][0].where;
    expect(whereArg).toHaveProperty('fecha');
    expect(whereArg.fecha).toHaveProperty('lt');
    expect(whereArg.fecha.lt).toBeInstanceOf(Date);

    // Assert: no se llama update
    expect(prismaMock.paciente.update).not.toHaveBeenCalled();
  });

  it('cirugías CANCELADA y SUSPENDIDA excluidas del where (estado notIn)', async () => {
    // Arrange: findMany devuelve vacío porque CANCELADA/SUSPENDIDA están excluidas
    prismaMock.cirugia.findMany.mockResolvedValue([]);

    // Act
    await service.moverCirugiasRealizadas();

    // Assert: el where incluye notIn con CANCELADA y SUSPENDIDA
    const whereArg = prismaMock.cirugia.findMany.mock.calls[0][0].where;
    expect(whereArg).toHaveProperty('estado');
    expect(whereArg.estado).toHaveProperty('notIn');
    expect(whereArg.estado.notIn).toContain('CANCELADA');
    expect(whereArg.estado.notIn).toContain('SUSPENDIDA');
  });

  it('resiliencia: si un update lanza, el loop continúa con el siguiente item y se llama logger.error', async () => {
    // Arrange: dos candidatos; el primero lanza error
    prismaMock.cirugia.findMany.mockResolvedValue([
      { pacienteId: 'p-fail', paciente: { etapaCRM: 'CONFIRMADO' } },
      { pacienteId: 'p-ok', paciente: { etapaCRM: 'TURNO_AGENDADO' } },
    ]);

    prismaMock.paciente.update
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce({});

    const loggerErrorSpy = jest
      .spyOn(service['logger'], 'error')
      .mockImplementation(() => undefined);

    // Act — no debe lanzar
    await expect(service.moverCirugiasRealizadas()).resolves.toBeUndefined();

    // Assert: se intentó el segundo item
    expect(prismaMock.paciente.update).toHaveBeenCalledTimes(2);

    // Assert: logger.error fue llamado con info del ítem fallido
    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy.mock.calls[0][0]).toContain('p-fail');

    loggerErrorSpy.mockRestore();
  });
});
