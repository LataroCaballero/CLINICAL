import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
export declare class JwtRolesGuard implements CanActivate {
    private readonly jwtAuthGuard;
    private readonly rolesGuard;
    constructor(jwtAuthGuard: JwtAuthGuard, rolesGuard: RolesGuard);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
