import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';
import { JwtAuthGuard, RolesGuard } from './authorization.js';
import { BrowserOriginGuard } from './browser-origin.guard.js';
import { RateLimitGuard } from './rate-limit.guard.js';
@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    JwtAuthGuard,
    RolesGuard,
    BrowserOriginGuard,
    RateLimitGuard,
  ],
  exports: [
    PasswordService,
    JwtAuthGuard,
    RolesGuard,
    TokenService,
    BrowserOriginGuard,
    RateLimitGuard,
  ],
})
export class AuthModule {}
