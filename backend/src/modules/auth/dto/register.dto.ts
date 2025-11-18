import { IsEmail, IsNotEmpty, MinLength, IsEnum } from 'class-validator';
import { RolUsuario } from '@prisma/client';

export class RegisterDto {
  @IsNotEmpty()
  nombre: string;

  @IsNotEmpty()
  apellido: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;

  @IsEnum(RolUsuario)
  rol: RolUsuario;
}
