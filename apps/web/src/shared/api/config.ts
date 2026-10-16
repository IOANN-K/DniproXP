/** API is the default. Demo is an explicit local development/test mode, never a network fallback. */
const requested = import.meta.env.VITE_DATA_SOURCE ?? (import.meta.env.MODE === "test" ? "demo" : "api");
if (!["api", "demo"].includes(requested)) throw new Error("VITE_DATA_SOURCE має бути api або demo.");
if (import.meta.env.PROD && requested === "demo") throw new Error("Демонстраційне сховище вимкнено у production.");
export const isApiMode = requested === "api";
export function apiUrl(path: string): string {
  const configured: unknown = import.meta.env.VITE_API_BASE_URL;
  const base = typeof configured === "string" && configured.trim() ? configured.trim() : "/v1";
  const url = new URL(base, window.location.origin);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash ||
      (import.meta.env.PROD && url.protocol !== 'https:')) throw new Error("Перевірте адресу API та HTTPS у конфігурації застосунку.");
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('..') || path.includes('?') || path.includes('#')) throw new Error("Некоректний шлях API.");
  return `${url.href.replace(/\/$/, '')}${path}`;
}
