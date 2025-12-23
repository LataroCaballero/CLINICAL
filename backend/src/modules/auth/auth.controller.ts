import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { Auth } from './decorators/auth.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req) {
    return this.authService.login(dto, req);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto, @Req() req) {
    return this.authService.refresh(dto, req);
  }

  @Post('logout')
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto);
  }

  @Post('logout-all')
  logoutAll(@Body() dto: LogoutDto) {
    return this.authService.logoutAll(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @Auth()
  me(@Req() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('test-user')
  test(@Req() req: any) {
    console.log(req.user);
    return req.user;
  }
}
