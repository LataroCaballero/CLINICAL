import { applyDecorators, UseGuards } from '@nestjs/common';
import { Roles } from './roles.decorator';
import { JwtRolesGuard } from '../guards/jwt-roles.guard';

export function Auth(...roles: string[]) {
  return applyDecorators(Roles(...roles), UseGuards(JwtRolesGuard));
}
