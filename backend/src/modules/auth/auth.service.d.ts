import { PrismaService } from '../../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { JwtService } from '@nestjs/jwt';
export declare class AuthService {
    private prisma;
    private jwt;
    constructor(prisma: PrismaService, jwt: JwtService);
    private generateRefreshToken;
    login(dto: LoginDto, req: any): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
        expiresAt: Date;
    }>;
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
        expiresAt: Date;
    }>;
    refresh(dto: RefreshDto, req: any): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
        expiresAt: Date;
    }>;
    logout(dto: LogoutDto): Promise<{
        message: string;
    }>;
    logoutAll(dto: LogoutDto): Promise<{
        message: string;
    }>;
}
