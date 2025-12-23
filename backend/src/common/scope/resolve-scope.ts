import { ForbiddenException } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';

interface ResolveScopeParams {
  user: {
    userId: string;
    rol: RolUsuario;
    profesionalId: string | null;
  };
  requestedProfesionalId?: string;
}

export function resolveScope({
  user,
  requestedProfesionalId,
}: ResolveScopeParams) {
  // Caso PROFESIONAL
  if (user.rol === RolUsuario.PROFESIONAL) {
    return {
      userId: user.userId,
      rol: user.rol,
      profesionalId: user.profesionalId, // fijo
    };
  }

  // Otros roles
  return {
    userId: user.userId,
    rol: user.rol,
    profesionalId: requestedProfesionalId ?? null,
  };
}
