import { Injectable } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { isUUID } from 'class-validator';
import { Settings } from '../config/settings.js';
import { DomainError } from '../common/http.js';
export type TokenClaims = {
  userId: string;
  sessionId: string;
  tokenId: string;
};
@Injectable()
export class TokenService {
  constructor(private readonly settings: Settings) {}
  private key(kind: 'access' | 'refresh'): Uint8Array {
    return new TextEncoder().encode(
      kind === 'access'
        ? this.settings.values.JWT_ACCESS_SECRET
        : this.settings.values.JWT_REFRESH_SECRET,
    );
  }
  sign(
    kind: 'access' | 'refresh',
    claims: TokenClaims,
    expiresIn: number,
  ): Promise<string> {
    return new SignJWT({ sid: claims.sessionId, kind })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(claims.userId)
      .setJti(claims.tokenId)
      .setIssuer(this.settings.values.JWT_ISSUER)
      .setAudience(this.settings.values.JWT_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
      .sign(this.key(kind));
  }
  async verify(
    kind: 'access' | 'refresh',
    token: string,
  ): Promise<TokenClaims> {
    try {
      const { payload } = await jwtVerify(token, this.key(kind), {
        algorithms: ['HS256'],
        issuer: this.settings.values.JWT_ISSUER,
        audience: this.settings.values.JWT_AUDIENCE,
        typ: 'JWT',
        requiredClaims: ['sub', 'sid', 'jti', 'iat', 'exp'],
      });
      if (
        payload.kind !== kind ||
        typeof payload.sub !== 'string' ||
        !isUUID(payload.sub, '4') ||
        typeof payload.sid !== 'string' ||
        !isUUID(payload.sid, '4') ||
        typeof payload.jti !== 'string' ||
        !isUUID(payload.jti, '4')
      )
        throw new Error('Invalid claims');
      return {
        userId: payload.sub,
        sessionId: payload.sid,
        tokenId: payload.jti,
      };
    } catch {
      throw new DomainError(
        401,
        'UNAUTHENTICATED',
        'Сесія недійсна або завершилася.',
      );
    }
  }
  verifier(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
  matches(token: string, verifier: string): boolean {
    const actual = Buffer.from(this.verifier(token), 'hex');
    const expected = Buffer.from(verifier, 'hex');
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }
}
