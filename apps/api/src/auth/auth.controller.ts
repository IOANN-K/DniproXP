import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto, RegisterDto, AuthResponseDto } from './auth.dto.js';
import { JwtAuthGuard, CurrentUser } from './authorization.js';
import { BrowserOriginGuard } from './browser-origin.guard.js';
import { RateLimit, RateLimitGuard } from './rate-limit.guard.js';
import {
  clearRefreshCookie,
  readRefreshCookie,
  setRefreshCookie,
} from './refresh-cookie.js';
import { Settings } from '../config/settings.js';
import { privateUser } from '../users/projections.js';
import { UserDto } from '../users/users.dto.js';
import { ApiErrors } from '../common/http.js';
import type { Principal } from '../common/http.js';
@ApiTags('Authentication')
@ApiErrors()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly settings: Settings,
  ) {}
  @Post('register')
  @UseGuards(BrowserOriginGuard, RateLimitGuard)
  @RateLimit('register', 5, 3600)
  @ApiHeader({
    name: 'X-DniproXP-CSRF',
    required: true,
    schema: { type: 'string', enum: ['1'] },
  })
  @ApiOperation({ summary: 'Register a VOLUNTEER; no client-assigned roles' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.auth.register(body);
    setRefreshCookie(
      res,
      this.settings.values,
      result.refreshToken,
      result.refreshExpiresAt,
    );
    res.setHeader('Cache-Control', 'no-store');
    return result.body;
  }
  @Post('login')
  @HttpCode(200)
  @UseGuards(BrowserOriginGuard, RateLimitGuard)
  @RateLimit('login', 10, 900)
  @ApiHeader({
    name: 'X-DniproXP-CSRF',
    required: true,
    schema: { type: 'string', enum: ['1'] },
  })
  @ApiOkResponse({ type: AuthResponseDto })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.auth.login(body);
    setRefreshCookie(
      res,
      this.settings.values,
      result.refreshToken,
      result.refreshExpiresAt,
    );
    res.setHeader('Cache-Control', 'no-store');
    return result.body;
  }
  @Post('refresh')
  @HttpCode(200)
  @UseGuards(BrowserOriginGuard, RateLimitGuard)
  @RateLimit('refresh', 60, 60)
  @ApiCookieAuth('refresh')
  @ApiHeader({
    name: 'X-DniproXP-CSRF',
    required: true,
    schema: { type: 'string', enum: ['1'] },
  })
  @ApiOkResponse({ type: AuthResponseDto })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    try {
      const result = await this.auth.refresh(
        readRefreshCookie(req, this.settings.values),
      );
      setRefreshCookie(
        res,
        this.settings.values,
        result.refreshToken,
        result.refreshExpiresAt,
      );
      res.setHeader('Cache-Control', 'no-store');
      return result.body;
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === 401) {
        clearRefreshCookie(res, this.settings.values);
      }
      throw error;
    }
  }
  @Post('logout')
  @HttpCode(204)
  @UseGuards(BrowserOriginGuard, RateLimitGuard)
  @RateLimit('logout', 60, 60)
  @ApiCookieAuth('refresh')
  @ApiHeader({
    name: 'X-DniproXP-CSRF',
    required: true,
    schema: { type: 'string', enum: ['1'] },
  })
  @ApiNoContentResponse()
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(readRefreshCookie(req, this.settings.values));
    clearRefreshCookie(res, this.settings.values);
  }
  @Post('logout-all')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, BrowserOriginGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-DniproXP-CSRF',
    required: true,
    schema: { type: 'string', enum: ['1'] },
  })
  @ApiNoContentResponse()
  async logoutAll(
    @CurrentUser() principal: Principal,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logoutAll(principal.user.id);
    clearRefreshCookie(res, this.settings.values);
  }
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserDto })
  me(@CurrentUser() principal: Principal): UserDto {
    return privateUser(principal.user);
  }
}
