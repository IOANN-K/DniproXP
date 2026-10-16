import type { Request, Response, CookieOptions } from 'express';
import type { Environment } from '../config/environment.js';
export function cookieName(env: Environment): string {
  return env.COOKIE_SECURE === 'true'
    ? '__Host-dniproxp_refresh'
    : 'dniproxp_refresh';
}
function cookieOptions(env: Environment): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE === 'true',
    sameSite: env.COOKIE_SAME_SITE,
    path: '/',
  };
}
export function readRefreshCookie(
  req: Request,
  env: Environment,
): string | undefined {
  const name = `${cookieName(env)}=`;
  const value = req.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(name))
    ?.slice(name.length);
  if (!value || value.length > 4096) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}
export function setRefreshCookie(
  res: Response,
  env: Environment,
  token: string,
  expires: Date,
): void {
  res.cookie(cookieName(env), token, { ...cookieOptions(env), expires });
}
export function clearRefreshCookie(res: Response, env: Environment): void {
  res.clearCookie(cookieName(env), cookieOptions(env));
}
