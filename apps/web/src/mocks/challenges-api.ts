import type { CityChallenge } from "../entities/challenge/types";
import { repository } from "./repository";
import { explorationOf } from "./exploration-selectors";
import { authSession } from "./auth-session";
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 300));
const admin = () =>
  repository.getSnapshot().accounts.find((a) => a.id === authSession.get())
    ?.role === "ADMIN";
export interface ChallengesRepository {
  list(): Promise<CityChallenge[]>;
  get(slug: string): Promise<CityChallenge | null>;
  join(id: string): Promise<void>;
  claimReward(id: string): Promise<void>;
  save(definition: CityChallenge): Promise<void>;
}
function identity() {
  const id = authSession.get();
  if (!id) throw new Error("Увійди в профіль волонтера.");
  return id;
}
export const challengesRepository: ChallengesRepository = {
  async list() {
    await wait();
    return structuredClone(
      explorationOf(repository.getSnapshot()).challenges.filter(
        (c) => c.status !== "DRAFT" || admin(),
      ),
    );
  },
  async get(slug) {
    await wait();
    const c = explorationOf(repository.getSnapshot()).challenges.find(
      (c) => c.slug === slug && (c.status !== "DRAFT" || admin()),
    );
    return c ? structuredClone(c) : null;
  },
  async join(id) {
    await wait();
    repository.joinChallenge(id, identity());
  },
  async claimReward(id) {
    await wait();
    repository.claimChallengeReward(id, identity());
  },
  async save(definition) {
    await wait();
    repository.saveChallenge(definition);
  },
};
