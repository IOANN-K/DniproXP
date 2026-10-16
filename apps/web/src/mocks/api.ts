import type { Participation, Quest, Reward, User } from "../entities/types";
import { quests, users, rewards, DEMO_NOW } from "./data";
import { readStorage, writeStorage } from "../shared/lib/storage";
export interface QuestApi {
  list(): Promise<Quest[]>;
  get(id: string): Promise<Quest | null>;
  participations(): Promise<Participation[]>;
  join(questId: string, userId: string): Promise<Participation>;
  cancel(questId: string, userId: string): Promise<void>;
}
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 420));
const key = "dniproxp:participations:v1";
let entries = readStorage<Participation[]>(key, []).filter(
  (p) =>
    p && quests.some((q) => q.id === p.questId) && p.userId === "demo-user",
);
let redeemed = readStorage<string[]>("dniproxp:rewards:v1", []).filter((id) =>
  rewards.some((r) => r.id === id),
);
const snapshot = (q: Quest): Quest => ({
  ...q,
  participants:
    q.participants + entries.filter((p) => p.questId === q.id).length,
});
export const questApi: QuestApi = {
  async list() {
    await wait();
    return quests.map(snapshot);
  },
  async get(id) {
    await wait();
    const q = quests.find((item) => item.id === id);
    return q ? snapshot(q) : null;
  },
  async participations() {
    await wait();
    return [...entries];
  },
  async join(questId, userId) {
    await wait();
    const q = quests.find((item) => item.id === questId);
    if (!q || q.status === "completed")
      throw new Error("Цей квест уже завершений.");
    if (userId !== users[0].id) throw new Error("Доступний лише демопрофіль.");
    const existing = entries.find(
      (p) => p.questId === questId && p.userId === userId,
    );
    if (existing) return existing;
    if (snapshot(q).participants >= q.capacity)
      throw new Error("Усі місця вже зайняті. Обери інший квест.");
    const p: Participation = {
      id: `participation-${questId}-${userId}`,
      questId,
      userId,
      status: "registered",
      createdAt: DEMO_NOW,
    };
    entries = [...entries, p];
    writeStorage(key, entries);
    return p;
  },
  async cancel(questId, userId) {
    await wait();
    entries = entries.filter(
      (p) => !(p.questId === questId && p.userId === userId),
    );
    writeStorage(key, entries);
  },
};
export interface RewardsApi {
  balance(): Promise<number>;
  redeemed(): Promise<string[]>;
  redeem(id: Reward["id"], userId: User["id"]): Promise<string>;
}
export const rewardsApi: RewardsApi = {
  async balance() {
    await wait();
    return (
      users[0].xp -
      rewards
        .filter((r) => redeemed.includes(r.id))
        .reduce((sum, r) => sum + r.cost, 0)
    );
  },
  async redeemed() {
    await wait();
    return [...redeemed];
  },
  async redeem(id, userId) {
    await wait();
    const r = rewards.find((item) => item.id === id);
    const balance =
      users[0].xp -
      rewards
        .filter((item) => redeemed.includes(item.id))
        .reduce((sum, item) => sum + item.cost, 0);
    if (
      userId !== users[0].id ||
      !r ||
      redeemed.includes(id) ||
      balance < r.cost
    )
      throw new Error("Нагорода недоступна або бракує XP.");
    redeemed = [...redeemed, id];
    writeStorage("dniproxp:rewards:v1", redeemed);
    return `DEMO-${id.toUpperCase()}-2026`;
  },
};
