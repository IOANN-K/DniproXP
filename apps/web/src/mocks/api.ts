import type {
  Participation,
  Quest,
  QuestReport,
  ProfileData,
  VolunteerStats,
} from "../entities/types";
import { quests } from "./data";
import { repository, getVolunteer, getQuestSnapshot } from "./repository";
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 350));
export interface QuestApi {
  list(): Promise<Quest[]>;
  get(id: string): Promise<Quest | null>;
  participations(): Promise<Participation[]>;
  join(questId: string, userId: string): Promise<Participation>;
  cancel(questId: string, userId: string): Promise<void>;
  startDemo(questId: string, userId: string): Promise<void>;
  submitReport(
    questId: string,
    userId: string,
    report: Pick<QuestReport, "text" | "photo" | "photoName">,
  ): Promise<void>;
  confirmDemo(questId: string, userId: string): Promise<void>;
}
export const questApi: QuestApi = {
  async list() {
    await wait();
    return quests.map((q) => getQuestSnapshot(q.id)!);
  },
  async get(id) {
    await wait();
    return getQuestSnapshot(id);
  },
  async participations() {
    await wait();
    return structuredClone(repository.getSnapshot().participations);
  },
  async join(q, u) {
    await wait();
    return repository.join(q, u);
  },
  async cancel(q, u) {
    await wait();
    repository.cancel(q, u);
  },
  async startDemo(q, u) {
    await wait();
    repository.startDemo(q, u);
  },
  async submitReport(q, u, r) {
    await wait();
    repository.submitReport(q, u, r);
  },
  async confirmDemo(q, u) {
    await wait();
    repository.confirmDemo(q, u);
  },
};
export interface ProfileApi {
  update(userId: string, profile: ProfileData): Promise<VolunteerStats | null>;
}
export interface RewardsApi {
  balance(): Promise<number>;
  redeemed(): Promise<string[]>;
  redeem(id: string, userId: string): Promise<string>;
}
export const profileApi: ProfileApi = {
  async update(userId: string, profile: ProfileData) {
    await wait();
    repository.updateProfile(userId, profile);
    return getVolunteer(userId);
  },
};
export const rewardsApi: RewardsApi = {
  async balance() {
    await wait();
    return getVolunteer("demo-user")!.points;
  },
  async redeemed() {
    await wait();
    return repository
      .getSnapshot()
      .redemptions.filter((r) => r.userId === "demo-user")
      .map((r) => r.rewardId);
  },
  async redeem(id: string, userId: string) {
    await wait();
    return repository.redeem(id, userId).code;
  },
};
