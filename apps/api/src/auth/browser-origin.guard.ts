import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { Settings } from '../config/settings.js';
import { DomainError } from '../common/http.js';
@Injectable()
export class BrowserOriginGuard implements CanActivate {
  constructor(private readonly settings: Settings) {}
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    // Custom header forces a CORS preflight; exact Origin is checked even for same-site subdomains.
    if (
      req.headers['x-dniproxp-csrf'] !== '1' ||
      !req.headers.origin ||
      !this.settings.origins.includes(req.headers.origin)
    )
      throw new DomainError(
        403,
        'CSRF_REJECTED',
        'Недозволене джерело запиту.',
      );
    return true;
  }
}
