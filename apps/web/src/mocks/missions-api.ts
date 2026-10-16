import type { QuestChain } from "../entities/mission/types";
import { repository } from "./repository";
import { explorationOf } from "./exploration-selectors";
import { authSession } from "./auth-session";
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 300));
const admin = () =>
  repository.getSnapshot().accounts.find((a) => a.id === authSession.get())
    ?.role === "ADMIN";
export interface MissionsRepository {
  list(): Promise<QuestChain[]>;
  get(slug: string): Promise<QuestChain | null>;
  join(id: string): Promise<void>;
  claimReward(id: string): Promise<void>;
  save(definition: QuestChain): Promise<void>;
}
function identity() {
  const id = authSession.get();
  if (!id) throw new Error("Увійди в профіль волонтера.");
  return id;
}
export const missionsRepository: MissionsRepository = {
  async list() {
    await wait();
    return structuredClone(
      explorationOf(repository.getSnapshot()).missions.filter(
        (m) => m.status !== "DRAFT" || admin(),
      ),
    );
  },
  async get(slug) {
    await wait();
    const m = explorationOf(repository.getSnapshot()).missions.find(
      (m) => m.slug === slug && (m.status !== "DRAFT" || admin()),
    );
    return m ? structuredClone(m) : null;
  },
  async join(id) {
    await wait();
    repository.joinMission(id, identity());
  },
  async claimReward(id) {
    await wait();
    repository.claimMissionReward(id, identity());
  },
  async save(definition) {
    await wait();
    repository.saveMission(definition);
  },
};
