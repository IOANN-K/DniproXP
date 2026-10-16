import { create } from "zustand";
import type { SessionUser } from "../../entities/types";
import { authSession } from "../../mocks/auth-session";
import { repository } from "../../mocks/repository";
import { authAdapter } from "../auth/auth-adapter";
type Session = {
  user: SessionUser | null;
  enterDemo: () => Promise<SessionUser>;
  logout: () => Promise<void>;
};
export const useSession = create<Session>(() => ({
  user: authAdapter.session(),
  enterDemo: () => authAdapter.switchDemo("VOLUNTEER"),
  logout: () => authAdapter.logout(),
}));
authSession.subscribe(() =>
  useSession.setState({ user: authAdapter.session() }),
);

repository.subscribe(() =>
  useSession.setState({ user: authAdapter.session() }),
);
