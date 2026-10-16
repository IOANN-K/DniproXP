import type { QuestFormValues, QuestLifecycle, Quest } from "../entities/types";
import { repository } from "./repository";
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 300));
export interface OrganizerApi {
  save(values: QuestFormValues, id?: string): Promise<string>;
  transition(id: string, next: QuestLifecycle): Promise<void>;
  reviewApplication(
    questId: string,
    userId: string,
    approve: boolean,
    reason: string,
  ): Promise<void>;
  confirm(questId: string, userId: string): Promise<void>;
  rejectReport(questId: string, userId: string, reason: string): Promise<void>;
}
export const organizerApi: OrganizerApi = {
  async save(v, id) {
    await wait();
    return repository.saveQuest(v, id);
  },
  async transition(id, next) {
    await wait();
    repository.transitionQuest(id, next);
  },
  async reviewApplication(q, u, approve, reason) {
    await wait();
    repository.reviewApplication(q, u, approve, reason);
  },
  async confirm(q, u) {
    await wait();
    repository.confirmDemo(q, u);
  },
  async rejectReport(q, u, reason) {
    await wait();
    repository.rejectReport(q, u, reason);
  },
};
export interface AdminApi {
  moderateQuest(
    id: Quest["id"],
    approve: boolean,
    reason: string,
  ): Promise<void>;
  moderateOrganization(
    id: string,
    approve: boolean,
    reason: string,
  ): Promise<void>;
}
export const adminApi: AdminApi = {
  async moderateQuest(id, approve, reason) {
    await wait();
    repository.moderateQuest(id, approve, reason);
  },
  async moderateOrganization(id, approve, reason) {
    await wait();
    repository.moderateOrganization(id, approve, reason);
  },
};
