import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
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
    me(req: any): any;
}
