import { z } from "zod";
const envelope = z.object({ error: z.object({ code: z.string(), message: z.string(), requestId: z.string().optional(),
  fields: z.record(z.string(), z.array(z.string())).optional(), retryAfterSeconds: z.number().optional() }) });
export class ApiError extends Error {
  readonly status: number; readonly code: string; readonly requestId?: string;
  readonly fields?: Record<string, string[]>; readonly retryAfterSeconds?: number;
  constructor(status: number, code: string, message: string, requestId?: string, fields?: Record<string, string[]>, retryAfterSeconds?: number) {
    super(message); this.name = "ApiError"; this.status = status; this.code = code; this.requestId = requestId;
    this.fields = fields; this.retryAfterSeconds = retryAfterSeconds;
  }
}
export function responseError(status: number, value: unknown, requestId: string | null, retryAfter: string | null) {
  const parsed = envelope.safeParse(value);
  if (parsed.success) { const e = parsed.data.error; return new ApiError(status, e.code, e.message, e.requestId ?? requestId ?? undefined, e.fields, e.retryAfterSeconds); }
  const messages: Record<number, string> = { 401: "Сесія завершилася. Увійдіть знову.", 403: "Недостатньо прав для цієї дії.",
    404: "Запис не знайдено або доступ обмежено.", 409: "Стан змінився. Оновіть дані перед повтором.", 422: "Перевірте поля форми.",
    429: "Забагато запитів. Спробуйте пізніше.", 503: "Сервіс тимчасово недоступний." };
  const seconds = retryAfter === null ? undefined : Number(retryAfter);
  return new ApiError(status, `HTTP_${status}`, messages[status] ?? "Не вдалося виконати запит.", requestId ?? undefined, undefined,
    seconds !== undefined && Number.isFinite(seconds) ? seconds : undefined);
}
export function isAbort(error: unknown) { return error instanceof DOMException && error.name === "AbortError"; }
