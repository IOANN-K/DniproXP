import type {
  Participation,
  ProfileData,
  Redemption,
  QuestReport,
  Quest,
  VolunteerState,
  VolunteerStats,
  Transaction,
} from "../entities/types";
import { quests, users, rewards, DEMO_NOW } from "./data";
import { allQuests, historicalQuests } from "./history";
import { levelFor, rewardPointsFor } from "../entities/gamification/levels";
import { readStorage, writeStorage } from "../shared/lib/storage";
const KEY = "dniproxp:volunteer:v3";
const self = "demo-user";
const listeners = new Set<() => void>();
const initialTime = new Date(DEMO_NOW).getTime();
function seed(): VolunteerState {
  const participations: Participation[] = [];
  const transactions: Transaction[] = [];
  users.forEach((u) =>
    historicalQuests.slice(0, u.questsCompleted).forEach((q) => {
      participations.push({
        id: `p-${u.id}-${q.id}`,
        userId: u.id,
        questId: q.id,
        status: "completed",
        createdAt: q.date,
        updatedAt: q.date,
        confirmedAt: q.date,
      });
      transactions.push({
        id: `completion:${u.id}:${q.id}`,
        userId: u.id,
        questId: q.id,
        xp: q.xp,
        points: rewardPointsFor(q.xp),
        date: q.date,
        description: `Підтверджено: ${q.title}`,
      });
    }),
  );
  for (const [questId, status] of [
    ["quest-4", "planned"],
    ["quest-6", "active"],
    ["quest-12", "pending"],
  ] as const)
    participations.push({
      id: `p-${self}-${questId}`,
      userId: self,
      questId,
      status,
      createdAt: DEMO_NOW,
      updatedAt: DEMO_NOW,
      ...(status === "pending"
        ? {
            report: {
              text: "Допомогла підготувати матеріали та провела розмовну практику разом із координатором. Усі завдання виконані.",
              photo: "/images/community.jpg",
              photoName: "Демонстраційне фото волонтерства",
              submittedAt: DEMO_NOW,
            },
          }
        : {}),
    });
  const old = readStorage<unknown>("dniproxp:participations:v1", []);
  if (Array.isArray(old))
    old.forEach((p) => {
      if (
        p &&
        p.userId === self &&
        quests.some((q) => q.id === p.questId && q.status === "available") &&
        !participations.some(
          (e) => e.userId === self && e.questId === p.questId,
        )
      )
        participations.push({
          id: `p-${self}-${p.questId}`,
          questId: p.questId,
          userId: self,
          status: "planned",
          createdAt: DEMO_NOW,
          updatedAt: DEMO_NOW,
        });
    });
  const legacyRewards = readStorage<unknown>("dniproxp:rewards:v1", []);
  const redemptions: Redemption[] = Array.isArray(legacyRewards)
    ? [...new Set(legacyRewards)]
        .filter(
          (id): id is string =>
            typeof id === "string" && rewards.some((r) => r.id === id),
        )
        .map((rewardId) => ({
          id: `legacy:${self}:${rewardId}`,
          userId: self,
          rewardId,
          cost: 0,
          code: `ДЕМО-ПЕРЕНЕСЕНО-${rewardId.toUpperCase()}`,
          date: DEMO_NOW,
        }))
    : [];
  return {
    version: 3,
    revision: 0,
    clock: initialTime,
    profiles: Object.fromEntries(
      users.map((u) => [
        u.id,
        {
          name: u.name,
          bio:
            u.id === self
              ? "Вірю в силу маленьких дій. Люблю Дніпро, прогулянки й людей, які роблять місто теплішим."
              : "Допомагаю місту, долучаюся до спільних справ і ділюся досвідом.",
          avatar: null,
        },
      ]),
    ),
    participations,
    transactions,
    redemptions,
    activity: transactions
      .filter((t) => t.userId === self)
      .map((t) => ({
        id: `a-${t.id}`,
        userId: self,
        questId: t.questId,
        title: t.description,
        date: t.date,
        kind: "confirm",
      })),
  };
}
function isState(value: unknown): value is VolunteerState {
  if (!value || typeof value !== "object") return false;
  const s = value as VolunteerState;
  return (
    s.version === 3 &&
    Number.isFinite(s.revision) &&
    Number.isFinite(s.clock) &&
    !!s.profiles &&
    users.every(
      (u) =>
        s.profiles[u.id] &&
        typeof s.profiles[u.id].name === "string" &&
        typeof s.profiles[u.id].bio === "string",
    ) &&
    Array.isArray(s.participations) &&
    s.participations.every(
      (p) =>
        p &&
        allQuests.some((q) => q.id === p.questId) &&
        users.some((u) => u.id === p.userId) &&
        ["planned", "active", "pending", "completed", "cancelled"].includes(
          p.status,
        ),
    ) &&
    Array.isArray(s.transactions) &&
    s.transactions.every(
      (t) =>
        t &&
        typeof t.id === "string" &&
        typeof t.description === "string" &&
        users.some((u) => u.id === t.userId) &&
        Number.isFinite(t.xp) &&
        t.xp >= 0 &&
        Number.isFinite(t.points) &&
        Number.isFinite(Date.parse(t.date)),
    ) &&
    new Set(s.transactions.map((t) => t.id)).size === s.transactions.length &&
    Array.isArray(s.redemptions) &&
    s.redemptions.every(
      (r) =>
        r &&
        typeof r.id === "string" &&
        typeof r.code === "string" &&
        users.some((u) => u.id === r.userId) &&
        Number.isFinite(r.cost) &&
        r.cost >= 0 &&
        Number.isFinite(Date.parse(r.date)) &&
        rewards.some((item) => item.id === r.rewardId),
    ) &&
    Array.isArray(s.activity) &&
    s.activity.every(
      (a) =>
        a &&
        typeof a.id === "string" &&
        typeof a.title === "string" &&
        users.some((u) => u.id === a.userId) &&
        Number.isFinite(Date.parse(a.date)),
    )
  );
}
const saved = readStorage<unknown>(KEY, null);
if (saved !== null && !isState(saved)) writeStorage(`${KEY}:backup`, saved);
let state: VolunteerState = isState(saved) ? saved : seed();
writeStorage(KEY, state);
function commit(change: (draft: VolunteerState, now: string) => void) {
  const next = structuredClone(state);
  next.clock = Math.max(initialTime, next.clock) + 60_000;
  const now = new Date(next.clock).toISOString();
  change(next, now);
  next.revision += 1;
  state = next;
  writeStorage(KEY, state);
  listeners.forEach((listener) => listener());
}
function actor(userId: string) {
  if (userId !== self)
    throw new Error("Редагування доступне лише для власного демопрофілю.");
}
function entry(draft: VolunteerState, questId: string, userId: string) {
  const p = draft.participations.find(
    (p) => p.questId === questId && p.userId === userId,
  );
  if (!p) throw new Error("Спочатку запишися на квест.");
  return p;
}
function event(
  draft: VolunteerState,
  userId: string,
  questId: string | undefined,
  title: string,
  kind: VolunteerState["activity"][number]["kind"],
  date: string,
) {
  draft.activity.unshift({
    id: `activity-${draft.revision + 1}`,
    userId,
    questId,
    title,
    kind,
    date,
  });
}
export const repository = {
  getSnapshot: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  join(questId: string, userId: string) {
    actor(userId);
    commit((s, now) => {
      const q = quests.find((q) => q.id === questId);
      if (!q || q.status === "completed")
        throw new Error("Квест завершений або недоступний.");
      const existing = s.participations.find(
        (p) => p.questId === questId && p.userId === userId,
      );
      if (existing && existing.status !== "cancelled") return;
      const reserved = s.participations.filter(
        (p) => p.questId === questId && p.status !== "cancelled",
      ).length;
      if (q.participants + reserved >= q.capacity)
        throw new Error("Усі місця зайняті.");
      if (existing) {
        existing.status = "planned";
        existing.report = undefined;
        existing.updatedAt = now;
      } else
        s.participations.push({
          id: `p-${userId}-${questId}`,
          questId,
          userId,
          status: "planned",
          createdAt: now,
          updatedAt: now,
        });
      event(s, userId, questId, "Запис на квест", "join", now);
    });
    return state.participations.find(
      (p) => p.questId === questId && p.userId === userId,
    )!;
  },
  cancel(questId: string, userId: string) {
    actor(userId);
    commit((s, now) => {
      const p = entry(s, questId, userId);
      if (p.status !== "planned")
        throw new Error(
          "Скасувати можна лише заплановану участь до початку квесту.",
        );
      p.status = "cancelled";
      p.updatedAt = now;
      event(s, userId, questId, "Участь скасовано", "cancel", now);
    });
  },
  startDemo(questId: string, userId: string) {
    actor(userId);
    commit((s, now) => {
      const p = entry(s, questId, userId);
      if (p.status !== "planned")
        throw new Error("Почати можна лише запланований квест.");
      p.status = "active";
      p.updatedAt = now;
      event(s, userId, questId, "Демосистема розпочала квест", "start", now);
    });
  },
  submitReport(
    questId: string,
    userId: string,
    report: Pick<QuestReport, "text" | "photo" | "photoName">,
  ) {
    actor(userId);
    commit((s, now) => {
      const p = entry(s, questId, userId);
      if (p.status !== "active")
        throw new Error("Звіт доступний лише для активного квесту.");
      if (report.text.trim().length < 30 || report.text.length > 2000)
        throw new Error("Опис має містити від 30 до 2000 символів.");
      if (report.photo && !report.photo.startsWith("/images/"))
        throw new Error("Дозволені лише демонстраційні фото.");
      p.report = { ...report, text: report.text.trim(), submittedAt: now };
      p.status = "pending";
      p.updatedAt = now;
      event(s, userId, questId, "Звіт подано на підтвердження", "report", now);
    });
  },
  confirmDemo(questId: string, userId: string) {
    actor(userId);
    commit((s, now) => {
      const p = entry(s, questId, userId);
      const id = `completion:${userId}:${questId}`;
      if (p.status === "completed" && s.transactions.some((t) => t.id === id))
        return;
      if (p.status !== "pending" || !p.report)
        throw new Error("Спершу потрібно виконати квест і подати звіт.");
      if (s.transactions.some((t) => t.id === id))
        throw new Error("Нагороду за цей квест уже нараховано.");
      const q = allQuests.find((q) => q.id === questId)!;
      p.status = "completed";
      p.confirmedAt = now;
      p.updatedAt = now;
      s.transactions.push({
        id,
        userId,
        questId,
        xp: q.xp,
        points: rewardPointsFor(q.xp),
        date: now,
        description: `Демосистема підтвердила: ${q.title}`,
      });
      event(
        s,
        userId,
        questId,
        `Квест підтверджено: +${q.xp} XP, +${rewardPointsFor(q.xp)} бонусних балів`,
        "confirm",
        now,
      );
    });
  },
  updateProfile(userId: string, profile: ProfileData) {
    actor(userId);
    commit((s, now) => {
      if (
        profile.name.trim().length < 2 ||
        profile.name.length > 60 ||
        profile.bio.length > 500
      )
        throw new Error("Ім’я: 2–60 символів. Біографія: до 500 символів.");
      if (profile.avatar && !["leaf", "heart", "sun"].includes(profile.avatar))
        throw new Error("Обери аватар зі списку.");
      s.profiles[userId] = {
        ...profile,
        name: profile.name.trim(),
        bio: profile.bio.trim(),
      };
      event(s, userId, undefined, "Профіль оновлено", "profile", now);
    });
  },
  redeem(rewardId: string, userId: string) {
    actor(userId);
    commit((s, now) => {
      const r = rewards.find((r) => r.id === rewardId);
      if (
        !r ||
        r.stock <= s.redemptions.filter((e) => e.rewardId === rewardId).length
      )
        throw new Error("Ця пропозиція вже недоступна.");
      if (
        s.redemptions.some(
          (e) => e.rewardId === rewardId && e.userId === userId,
        )
      )
        throw new Error("Ти вже отримав цю нагороду.");
      const balance = s.transactions
        .filter((t) => t.userId === userId)
        .reduce((n, t) => n + t.points, 0);
      if (balance < r.cost) throw new Error("Недостатньо бонусних балів.");
      const id = `redemption:${userId}:${rewardId}`;
      s.redemptions.push({
        id,
        userId,
        rewardId,
        cost: r.cost,
        date: now,
        code: `ДЕМО-${rewardId.toUpperCase()}-${s.revision + 1}`,
      });
      s.transactions.push({
        id,
        userId,
        rewardId,
        xp: 0,
        points: -r.cost,
        date: now,
        description: `Обмін: ${r.name}`,
      });
      event(s, userId, undefined, `Отримано: ${r.name}`, "reward", now);
    });
    return state.redemptions.find(
      (r) => r.userId === userId && r.rewardId === rewardId,
    )!;
  },
};
export function getVolunteer(
  userId: string,
  snapshot = state,
): VolunteerStats | null {
  const base = users.find((u) => u.id === userId);
  if (!base) return null;
  const profile = snapshot.profiles[userId];
  const tx = snapshot.transactions.filter((t) => t.userId === userId);
  const xp = tx.reduce((n, t) => n + t.xp, 0);
  const level = levelFor(xp);
  const done = snapshot.participations.filter(
    (p) => p.userId === userId && p.status === "completed",
  );
  return {
    ...base,
    name: profile.name,
    bio: profile.bio,
    avatar: profile.avatar || "initials",
    initials: profile.name
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase(),
    xp,
    level: level.level,
    questsCompleted: done.length,
    points: tx.reduce((n, t) => n + t.points, 0),
    hours: done.reduce((n, p) => {
      const q = allQuests.find((q) => q.id === p.questId);
      return (
        n +
        (q?.duration.startsWith("1,5") ? 1.5 : parseFloat(q?.duration || "0"))
      );
    }, 0),
    nextLevelXp: level.nextXp,
    levelStartXp: level.xp,
    progress: level.progress,
  };
}

export function getQuestSnapshot(id: string, snapshot = state): Quest | null {
  const q = allQuests.find((q) => q.id === id);
  if (!q) return null;
  return {
    ...q,
    participants:
      q.participants +
      snapshot.participations.filter(
        (p) => p.questId === id && p.status !== "cancelled",
      ).length,
  };
}
