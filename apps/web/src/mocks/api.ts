import { authSession } from "./auth-session";
import type {
  Participation,
  Quest,
  QuestReport,
  ProfileData,
  VolunteerStats,
} from "../entities/types";

import {
  repository,
  getVolunteer,
  getQuestSnapshot,
  publicQuests,
} from "./repository";
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
    return publicQuests().map((q) => getQuestSnapshot(q.id)!);
  },
  async get(id) {
    await wait();
    const q = getQuestSnapshot(id);
    if (!q || q.lifecycle === "draft") return null;
    const user = authSession.get();
    const account = repository
      .getSnapshot()
      .accounts.find((a) => a.id === user);
    const visible =
      publicQuests().some((item) => item.id === id) ||
      id.startsWith("history-") ||
      account?.role === "ADMIN" ||
      (account?.role === "ORGANIZER" &&
        account.organizationId === q.organizationId) ||
      repository
        .getSnapshot()
        .participations.some((p) => p.questId === id && p.userId === user);
    return visible ? q : null;
  },
  async participations() {
    await wait();
    const s = repository.getSnapshot();
    const a = s.accounts.find((a) => a.id === authSession.get());
    return structuredClone(
      s.participations.filter(
        (p) =>
          a?.role === "ADMIN" ||
          (a?.role === "VOLUNTEER" && p.userId === a.id) ||
          (a?.role === "ORGANIZER" &&
            s.questRecords.some(
              (q) =>
                q.id === p.questId && q.organizationId === a.organizationId,
            )),
      ),
    );
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
    return getVolunteer(authSession.get() || "")?.points || 0;
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
