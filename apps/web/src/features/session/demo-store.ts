import { create } from "zustand";
import type { SessionState } from "../auth/api/session";
import { authSession } from "../../mocks/auth-session";
import { repository } from "../../mocks/repository";
import { authAdapter } from "../auth/mock-auth-adapter";
export const useDemoSession = create<SessionState>(() => ({
  user: authAdapter.session(),
  status: authAdapter.session() ? "authenticated" : "anonymous",
  error: null,
  initialize: () => Promise.resolve(),
  enterDemo: () => authAdapter.switchDemo("VOLUNTEER"),
  logout: () => authAdapter.logout(),
}));
authSession.subscribe(() =>
  useDemoSession.setState({ user: authAdapter.session(), status: authAdapter.session() ? "authenticated" : "anonymous" }),
);

repository.subscribe(() =>
  useDemoSession.setState({ user: authAdapter.session(), status: authAdapter.session() ? "authenticated" : "anonymous" }),
);
