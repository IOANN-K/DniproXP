import { DomainError } from '../common/http.js';

/** Validate raw SQL projections at the driver boundary; no unchecked result casts. */
export function rows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error('Unexpected database result');
  return value.map((item: unknown) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item))
      throw new Error('Unexpected database row');
    return Object.fromEntries(Object.entries(item));
  });
}

export function numeric(value: unknown): number {
  if (typeof value !== 'string' && typeof value !== 'number')
    throw new Error('Invalid numeric projection');
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number) > Number.MAX_SAFE_INTEGER)
    throw new DomainError(503, 'STATISTICS_OUT_OF_RANGE', 'Статистика поза допустимим діапазоном.');
  return number;
}

export function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid text projection');
  return value;
}

export function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const result = new Date(text(value));
  if (!Number.isFinite(result.getTime())) throw new Error('Invalid timestamp');
  return result.toISOString();
}

export function flag(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('Invalid boolean projection');
  return value;
}
