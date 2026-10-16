import { Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/authorization.js';
import { TokenService } from '../auth/token.service.js';
import type { ApiRequest } from '../common/http.js';
@Injectable()
export class OptionalJwtGuard extends JwtAuthGuard {
  constructor(source: DataSource, tokens: TokenService) {
    super(source, tokens);
  }
  override canActivate(context: ExecutionContext): Promise<boolean> {
    return context.switchToHttp().getRequest<ApiRequest>().headers.authorization
      ? super.canActivate(context)
      : Promise.resolve(true);
  }
}
