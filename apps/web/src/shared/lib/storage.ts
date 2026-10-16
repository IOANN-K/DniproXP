export function readStorage<T>(key: string, fallback: T): T {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || "null");
    if (value === null || (Array.isArray(fallback) && !Array.isArray(value)))
      return fallback;
    return value as T;
  } catch {
    return fallback;
  }
}
export function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Session remains usable when browser storage is unavailable. */
  }
}
