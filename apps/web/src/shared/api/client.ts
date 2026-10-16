import type { z } from "zod";
import { apiUrl, isApiMode } from "./config";
import { authSchema } from "./contracts";
import type { AuthResponse, ApiUser } from "./contracts";
import { ApiError, isAbort, responseError } from "./errors";
type SessionEvent = { user: ApiUser | null; reset: boolean };
const listeners = new Set<(event: SessionEvent) => void>();
let token: string | null = null, expiresAt = 0, generation = 0;
let currentUser: ApiUser | null = null;
let refreshing: Promise<AuthResponse> | null = null;
const privateRequests = new Set<AbortController>();
const channel = !isApiMode || typeof window === "undefined" || typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("dniproxp:api-session:v1");
function emit(reset: boolean) { listeners.forEach(fn => fn({ user: currentUser, reset })); }
function abortPrivate() { privateRequests.forEach(c => c.abort()); privateRequests.clear(); }
export function clearAccess(broadcast = false) {
  generation++; token = null; expiresAt = 0; currentUser = null; abortPrivate(); emit(true);
  if (broadcast) channel?.postMessage("session-cleared");
}
channel?.addEventListener("message", e => { if (e.data === "session-cleared") clearAccess(); });
export function observeSession(fn: (event: SessionEvent) => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function readApiUser() { return currentUser; }
export function acceptUser(user: ApiUser) {
  if (currentUser?.id !== user.id) throw new ApiError(409, "SESSION_CHANGED", "Обліковий запис змінився. Оновіть сторінку.");
  currentUser = user; emit(false);
}
function acceptAuth(response: AuthResponse) {
  const reset = currentUser?.id !== response.user.id;
  if (reset) { generation++; abortPrivate(); }
  token = response.accessToken; expiresAt = Date.now() + response.expiresIn * 1000; currentUser = response.user; emit(reset);
}
export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown; query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal; auth?: "required" | "optional" | "none"; idempotencyKey?: string;
  /** Explicitly safe set-value mutations only. Never enable on unkeyed creation/generation/spending. */
  replaySafe?: boolean;
};
async function raw(path: string, options: RequestOptions, bearer: string | null): Promise<unknown> {
  const method = options.method ?? "GET", controller = new AbortController();
  const privateRequest = (options.auth ?? "required") !== "none";
  if (privateRequest) privateRequests.add(controller);
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(20000), ...(options.signal ? [options.signal] : [])]);
  try {
    const url = new URL(apiUrl(path));
    Object.entries(options.query ?? {}).forEach(([key, value]) => { if (value !== undefined) url.searchParams.set(key, String(value)); });
    const headers = new Headers({ Accept: "application/json" });
    if (options.body !== undefined) headers.set("Content-Type", "application/json");
    if (bearer) headers.set("Authorization", `Bearer ${bearer}`);
    if (path.startsWith("/auth/") && method !== "GET") headers.set("X-DniproXP-CSRF", "1");
    if (options.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);
    const response = await fetch(url, { method, credentials: "include", cache: "no-store", redirect: "error", headers,
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}), signal });
    if (response.status === 204) return undefined;
    const text = await response.text(); let value: unknown;
    try { value = text ? JSON.parse(text) : undefined; } catch { value = undefined; }
    if (!response.ok) throw responseError(response.status, value, response.headers.get("X-Request-Id"), response.headers.get("Retry-After"));
    if (value === undefined) throw new ApiError(502, "INVALID_RESPONSE", "API повернув відповідь у невідомому форматі.");
    return value;
  } catch (error) {
    if (error instanceof ApiError || isAbort(error)) throw error;
    if (error instanceof DOMException && error.name === "TimeoutError") throw new ApiError(0, "TIMEOUT", "API не відповів вчасно. Перевірте стан операції перед повтором.");
    if (options.signal?.aborted || controller.signal.aborted) throw new DOMException("Запит скасовано", "AbortError");
    throw new ApiError(0, "NETWORK_ERROR", "Немає зв’язку з API. Перевірте мережу та спробуйте ще раз.");
  } finally { privateRequests.delete(controller); }
}
function decode<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new ApiError(502, "INVALID_RESPONSE", "Формат відповіді API не відповідає контракту. Зверніться до підтримки.");
  return parsed.data;
}
async function withCookieLock<T>(work: () => Promise<T>): Promise<T> {
  return typeof navigator !== "undefined" && navigator.locks ? navigator.locks.request("dniproxp:refresh", work) : work();
}
/** Refresh is single-flight per tab and serialized across supporting same-origin tabs. No refresh-token JS storage. */
export function refreshSession(): Promise<AuthResponse> {
  if (refreshing) return refreshing;
  const started = generation;
  const work = async () => {
    const response = decode(authSchema, await raw("/auth/refresh", { method: "POST", auth: "none" }, null));
    if (generation !== started) throw new DOMException("Сесію змінено", "AbortError");
    acceptAuth(response); return response;
  };
  const execute = async () => {
    try { return await withCookieLock(work); }
    catch (error) { if (generation === started && error instanceof ApiError && error.status === 401) clearAccess(); throw error; }
  };
  const flight = execute(); refreshing = flight;
  void flight.finally(() => { if (refreshing === flight) refreshing = null; }).catch(() => {});
  return flight;
}
export async function authenticate(path: "/auth/login" | "/auth/register", body: unknown) {
  clearAccess(true);
  // An earlier refresh must settle before a new cookie rotation/login can win.
  if (refreshing) { try { await refreshing; } catch { /* Superseded refresh cannot install credentials. */ } }
  const started = generation;
  const result = decode(authSchema, await withCookieLock(() => raw(path, { method: "POST", body, auth: "none" }, null)));
  if (generation !== started) throw new DOMException("Сесію змінено", "AbortError");
  acceptAuth(result); return result.user;
}
export async function logoutSession() {
  clearAccess(true);
  if (refreshing) { try { await refreshing; } catch { /* Wait for cookie rotation before revocation. */ } }
  await withCookieLock(() => raw("/auth/logout", { method: "POST", auth: "none" }, null));
}
export async function request<T>(path: string, schema: z.ZodType<T>, options: RequestOptions = {}): Promise<T> {
  const auth = options.auth ?? "required";
  if (auth === "required" && (!token || expiresAt <= Date.now() + 15000)) await refreshSession();
  const started = generation, usedToken = auth === "none" ? null : token;
  try {
    const value = await raw(path, options, usedToken);
    if (auth !== "none" && generation !== started) throw new DOMException("Сесію змінено", "AbortError");
    return decode(schema, value);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || auth === "none" || !usedToken || generation !== started) throw error;
    if (token === usedToken) await refreshSession();
    if (generation !== started) throw new DOMException("Сесію змінено", "AbortError");
    const safe = (options.method ?? "GET") === "GET" || options.replaySafe || !!options.idempotencyKey;
    if (!safe) throw new ApiError(409, "REAUTHENTICATED", "Сесію оновлено. Перевірте стан операції перед повтором.");
    let value: unknown;
    try { value = await raw(path, options, token); }
    catch (retryError) { if (retryError instanceof ApiError && retryError.status === 401 && generation === started) clearAccess(); throw retryError; }
    if (generation !== started) throw new DOMException("Сесію змінено", "AbortError");
    return decode(schema, value);
  }
}
