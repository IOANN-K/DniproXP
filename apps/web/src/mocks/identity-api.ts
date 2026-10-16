import type {
  PassportView,
  PassportCredential,
  PassportVisibilitySettings,
} from "../entities/passport/types";
import type { Team, TeamCommand } from "../entities/team/types";
import { repository } from "./repository";
import { authSession } from "./auth-session";
import {
  buildPassport,
  projectPassport,
  selectCredential,
  visibleTeams,
  selectSkills,
} from "./identity-selectors";
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 250));
export interface PassportApi {
  get(userId: string, publicView?: boolean): Promise<PassportView | null>;
  credential(id: string): Promise<PassportCredential | null>;
  privacy(settings: PassportVisibilitySettings): Promise<void>;
}
export const passportApi: PassportApi = {
  async get(userId, publicView = false) {
    await wait();
    const p = buildPassport(repository.getSnapshot(), userId);
    return p
      ? projectPassport(p, !publicView && authSession.get() === userId)
      : null;
  },
  async credential(id) {
    await wait();
    return selectCredential(repository.getSnapshot(), id, authSession.get());
  },
  async privacy(settings) {
    await wait();
    repository.mutateIdentity({ type: "PASSPORT_PRIVACY", settings });
  },
};
export interface TeamsApi {
  list(): Promise<Team[]>;
  get(slug: string): Promise<Team | null>;
  mutate(command: TeamCommand): Promise<string | void>;
}
export const teamsApi: TeamsApi = {
  async list() {
    await wait();
    return structuredClone(
      visibleTeams(repository.getSnapshot(), authSession.get()),
    );
  },
  async get(slug) {
    await wait();
    return structuredClone(
      visibleTeams(repository.getSnapshot(), authSession.get()).find(
        (t) => t.slug === slug,
      ) || null,
    );
  },
  async mutate(command) {
    await wait();
    return repository.mutateIdentity(command);
  },
};
export const skillsApi = {
  async get(userId: string) {
    await wait();
    if (authSession.get() !== userId)
      throw new Error("Власне дерево навичок доступне після входу.");
    return selectSkills(repository.getSnapshot(), userId);
  },
};
