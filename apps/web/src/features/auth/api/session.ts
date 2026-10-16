import { create } from "zustand";
import { authenticate, logoutSession, observeSession, readApiUser, refreshSession } from "../../../shared/api/client";
import type { ApiUser } from "../../../shared/api/contracts";
import { apiQueryClient } from "../../../shared/api/query-client";
import { ApiError, isAbort } from "../../../shared/api/errors";
import type { Role } from "../../../entities/types";
export type SessionIdentity = { id: string; email: string; name: string; role: Role; roles?: Role[]; initials: string; avatar?: string; organizationId?: string };
function identity(user: ApiUser): SessionIdentity {
  return { id: user.id, email: user.email, name: user.displayName, role: user.primaryRole, roles: user.roles,
    initials: user.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s.slice(0, 1)).join(""), avatar: user.avatarUrl ?? "initials" };
}
export type SessionState = { user: SessionIdentity | null; status: "loading" | "authenticated" | "anonymous" | "error"; error: Error | null;
  initialize: () => Promise<void>; logout: () => Promise<void>; enterDemo: () => Promise<SessionIdentity> };
let bootstrap: Promise<void> | null = null;
export const useApiSession = create<SessionState>(() => ({
  user: null, status: "loading", error: null,
  initialize: () => initialize(), logout: () => logout(), enterDemo: () => Promise.reject(new Error("Демовхід вимкнено. Увійдіть за поштою та паролем.")),
}));
observeSession(({ user, reset }) => {
  if (reset) { void apiQueryClient.cancelQueries(); apiQueryClient.clear(); }
  useApiSession.setState({ user: user ? identity(user) : null, status: user ? "authenticated" : "anonymous", error: null });
});
async function initialize() {
  if (bootstrap) return bootstrap;
  useApiSession.setState({ status: "loading", error: null });
  const flight = (async () => {
    try { await refreshSession(); }
    catch (error) {
      if (isAbort(error)) return;
      if (error instanceof ApiError && error.status === 401) useApiSession.setState({ user: null, status: "anonymous", error: null });
      else useApiSession.setState({ user: null, status: "error", error: error instanceof Error ? error : new Error("Не вдалося відновити сесію.") });
    }
  })();
  bootstrap = flight;
  try { await flight; } finally { if (bootstrap === flight) bootstrap = null; }
}
async function logout() {
  try { await logoutSession(); }
  catch (error) {
    // Private browser state is already cleared; expose failed server revocation rather than silently pretending success.
    useApiSession.setState({ error: error instanceof Error ? error : new Error("Не вдалося завершити сесію на сервері.") });
  }
}
export const apiAuthAdapter = {
  async login(email: string, password: string) { const user = await authenticate("/auth/login", { email: email.trim().toLowerCase(), password }); return identity(user); },
  async register(input: { name: string; email: string; code: string; role: "VOLUNTEER" | "ORGANIZER"; organizationName?: string }) {
    if (input.role !== "VOLUNTEER") throw new ApiError(422, "VALIDATION_FAILED", "Реєстрація створює волонтера. Організація оформлюється окремо після входу.");
    const user = await authenticate("/auth/register", { displayName: input.name.trim(), email: input.email.trim().toLowerCase(), password: input.code }); return identity(user);
  },
  logout, session: () => { const user = readApiUser(); return user ? identity(user) : null; },
  switchDemo: (_role: Role, _organizationId?: string): Promise<SessionIdentity> => Promise.reject(new Error("Перемикання демооблікових записів вимкнено для API.")),
};
