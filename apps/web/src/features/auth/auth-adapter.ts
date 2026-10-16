import type {
  RegistrationInput,
  Role,
  SessionUser,
} from "../../entities/types";
import { repository, getVolunteer } from "../../mocks/repository";
import { authSession } from "../../mocks/auth-session";
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 300));
export const DEMO_CODE = "dnipro-demo";
export const roleHome = (role: Role) =>
  role === "ORGANIZER"
    ? "/organizer"
    : role === "ADMIN"
      ? "/admin"
      : "/dashboard";
export interface AuthAdapter {
  login(email: string, code: string): Promise<SessionUser>;
  register(input: RegistrationInput): Promise<SessionUser>;
  logout(): Promise<void>;
  session(): SessionUser | null;
  switchDemo(role: Role, organizationId?: string): Promise<SessionUser>;
}
function session(): SessionUser | null {
  const a = repository
    .getSnapshot()
    .accounts.find((a) => a.id === authSession.get());
  const profile = a ? getVolunteer(a.id) : null;
  return a && profile ? { ...profile, ...a } : null;
}
export const authAdapter: AuthAdapter = {
  session,
  async login(email, code) {
    await wait();
    const a = repository
      .getSnapshot()
      .accounts.find((a) => a.email === email.trim().toLowerCase());
    if (!a || code !== DEMO_CODE)
      throw new Error("Не знайшли обліковий запис або демокод неправильний.");
    authSession.set(a.id);
    return session()!;
  },
  async register(input) {
    await wait();
    const id = repository.register(input);
    authSession.set(id);
    return session()!;
  },
  async logout() {
    await wait();
    authSession.set(null);
  },
  async switchDemo(role, organizationId = "green") {
    await wait();
    const id =
      role === "VOLUNTEER"
        ? "demo-user"
        : role === "ORGANIZER"
          ? repository
              .getSnapshot()
              .accounts.find(
                (a) =>
                  a.role === "ORGANIZER" && a.organizationId === organizationId,
              )?.id
          : "demo-admin";
    if (!id) throw new Error("Демообліковий запис не знайдено.");
    authSession.set(id);
    return session()!;
  },
};
