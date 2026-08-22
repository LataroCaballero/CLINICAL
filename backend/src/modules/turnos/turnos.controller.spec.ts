/**
 * turnos.controller.spec.ts
 * Unit tests for Phase 69 Plan 10 (T-69-16 / ENVIO-03) — cierre del IDOR de
 * `GET /turnos/rango`: el handler `obtenerPorRango` debe resolver el scope
 * igual que `findAll`, para que un usuario con rol PROFESIONAL no pueda leer
 * la agenda (nombre, telefono, whatsappOptIn) de otro profesional inyectando
 * `profesionalId` por query string.
 *
 * Mock strategy (replicado de turnos.service.spec.ts): TurnosService mockeado
 * con jest.fn() por metodo. El controller se instancia directamente (sin
 * Test.createTestingModule con `controllers:`) porque `@Auth` aplica guards
 * a nivel de clase cuyas dependencias (JwtAuthGuard/RolesGuard) no estan
 * disponibles en un modulo de test aislado; instanciar el constructor a mano
 * evita el bootstrap de Nest DI/guards, que no aplica en un unit test de
 * metodo.
 */
import { BadRequestException } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { TurnosController } from './turnos.controller';
import { TurnosService } from './turnos.service';

describe('TurnosController', () => {
  let controller: TurnosController;
  let turnosService: jest.Mocked<TurnosService>;

  beforeEach(() => {
    const mockTurnosService = {
      obtenerTurnosPorRango: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<TurnosService>;

    turnosService = mockTurnosService;
    controller = new TurnosController(turnosService);
  });

  describe('obtenerPorRango — scoping horizontal (T-69-16)', () => {
    it('un PROFESIONAL no puede leer la agenda de otro', async () => {
      const req = {
        user: {
          userId: 'u1',
          rol: RolUsuario.PROFESIONAL,
          profesionalId: 'prof-PROPIO',
        },
      };

      await controller.obtenerPorRango(
        req,
        'prof-AJENO',
        '2026-08-01',
        '2026-08-31',
      );

      expect(turnosService.obtenerTurnosPorRango).toHaveBeenCalledWith(
        'prof-PROPIO',
        '2026-08-01',
        '2026-08-31',
      );
    });

    it('SECRETARIA conserva el acceso multi-profesional', async () => {
      const req = {
        user: {
          userId: 'u2',
          rol: RolUsuario.SECRETARIA,
          profesionalId: null,
        },
      };

      await controller.obtenerPorRango(
        req,
        'prof-AJENO',
        '2026-08-01',
        '2026-08-31',
      );

      expect(turnosService.obtenerTurnosPorRango).toHaveBeenCalledWith(
        'prof-AJENO',
        '2026-08-01',
        '2026-08-31',
      );
    });

    it('PROFESIONAL sin profesionalId en el JWT es rechazado', async () => {
      const req = {
        user: {
          userId: 'u3',
          rol: RolUsuario.PROFESIONAL,
          profesionalId: null,
        },
      };

      expect(() =>
        controller.obtenerPorRango(
          req,
          'prof-AJENO',
          '2026-08-01',
          '2026-08-31',
        ),
      ).toThrow(BadRequestException);

      expect(turnosService.obtenerTurnosPorRango).not.toHaveBeenCalled();
    });
  });
});
