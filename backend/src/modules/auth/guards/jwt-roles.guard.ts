import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@Injectable()
export class JwtRolesGuard implements CanActivate {
  constructor(
    private readonly jwtAuthGuard: JwtAuthGuard,
    private readonly rolesGuard: RolesGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1️⃣ Validar JWT primero
    const jwtValid = await this.jwtAuthGuard.canActivate(context);
    if (!jwtValid) return false;

    // 2️⃣ Validar roles después
    const roleValid = await this.rolesGuard.canActivate(context);
    return roleValid;
  }
}
