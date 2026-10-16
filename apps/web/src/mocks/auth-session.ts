import { readStorage, writeStorage } from "../shared/lib/storage";
const key = "dniproxp:auth:v2";
const old = readStorage<{ state?: { user?: { id?: string } } }>(
  "dniproxp:session:v1",
  {},
);
const saved = readStorage<{ userId: string | null } | string>(key, {
  userId: old.state?.user?.id || null,
});
let principal: string | null =
  typeof saved === "string" ? saved : saved?.userId || null;
const listeners = new Set<() => void>();
export const authSession = {
  get: () => principal,
  set: (id: string | null) => {
    principal = id;
    writeStorage(key, { userId: id });
    listeners.forEach((fn) => fn());
  },
  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
