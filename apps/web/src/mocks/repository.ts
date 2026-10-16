import type {
  Participation,
  ProfileData,
  Redemption,
  QuestReport,
  Quest,
  VolunteerState,
  VolunteerStats,
  Transaction,
  DemoAccount,
  RegistrationInput,
  QuestFormValues,
  QuestLifecycle,
} from "../entities/types";
import { quests, users, rewards, DEMO_NOW } from "./data";
import { allQuests, historicalQuests } from "./history";
import { levelFor, rewardPointsFor } from "../entities/gamification/levels";
import { readStorage, writeStorage } from "../shared/lib/storage";
import { authSession } from "./auth-session";
import { organizations as baseOrganizations } from "./data";
import {
  questDraftSchema,
  questPublishSchema,
} from "../features/organizer/quest-schema";
import { verifiedLocations } from "./locations";
const KEY = "dniproxp:platform:v4";
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
    version: 4,
    accounts: [
      ...users.map((u) => ({
        id: u.id,
        email:
          u.id === "demo-user"
            ? "volunteer@dniproxp.demo"
            : `${u.id}@dniproxp.demo`,
        role: "VOLUNTEER" as const,
      })),
      ...baseOrganizations.map((o) => ({
        id: o.id === "green" ? "demo-organizer" : `organizer-${o.id}`,
        email:
          o.id === "green"
            ? "organizer@dniproxp.demo"
            : `organizer-${o.id}@dniproxp.demo`,
        role: "ORGANIZER" as const,
        organizationId: o.id,
      })),
      { id: "demo-admin", email: "admin@dniproxp.demo", role: "ADMIN" },
    ],
    organizations: baseOrganizations.map((o) => ({
      ...o,
      focus:
        o.id === "green"
          ? "Екологія та міські простори"
          : "Міське волонтерство",
      email: `${o.id}@example.invalid`,
      moderation: "approved",
    })),
    questRecords: [
      ...allQuests.map((q) => ({
        ...q,
        lifecycle:
          q.status === "completed"
            ? ("completed" as const)
            : ("published" as const),
        moderation: "approved" as const,
        fullDescription: q.description,
        rewardPoints: rewardPointsFor(q.xp),
        instructions:
          "Пройди інструктаж, виконай погоджені завдання та подай звіт про свою участь.",
      })),
      {
        ...quests[3],
        id: "demo-city-team",
        title: "Разом озеленюємо парк: демонстраційний квест",
        description:
          "Об’єднуємо волонтерів, щоб підготувати зелену ділянку парку та пройти повний шлях доброї справи.",
        fullDescription:
          "Це спеціальний демонстраційний квест для знайомства з DniproXP. Волонтер подає заявку, команда Зеленого Дніпра схвалює участь, а після виконання завдання перевіряє звіт. Лише підтверджений внесок приносить досвід та бонусні бали.",
        date: "2026-10-20T10:00:00+03:00",
        participants: 0,
        capacity: 20,
        xp: 200,
        rewardPoints: 100,
        lifecycle: "published",
        moderation: "approved",
        instructions:
          "Дочекайся схвалення заявки. У демосценарії виконай завдання, опиши результат у звіті та додай демонстраційне фото.",
      },
    ],
    demoQuestId: "demo-city-team",
    nextId: 1,
    revision: 0,
    clock: initialTime,
    profiles: Object.fromEntries(
      [
        ...users,
        ...baseOrganizations.map((o) => ({
          id: o.id === "green" ? "demo-organizer" : `organizer-${o.id}`,
          name: o.id === "green" ? "Марія Савченко" : `Команда «${o.name}»`,
        })),
        { id: "demo-admin", name: "Адміністратор DniproXP" },
      ].map((u) => [
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
    s.version === 4 &&
    Number.isFinite(s.revision) &&
    Number.isFinite(s.clock) &&
    Number.isFinite(s.nextId) &&
    Array.isArray(s.accounts) &&
    s.accounts.every(
      (a) =>
        a &&
        typeof a.id === "string" &&
        ["VOLUNTEER", "ORGANIZER", "ADMIN"].includes(a.role),
    ) &&
    !!s.profiles &&
    s.accounts.every(
      (a) => s.profiles[a.id] && typeof s.profiles[a.id].name === "string",
    ) &&
    Array.isArray(s.organizations) &&
    Array.isArray(s.questRecords) &&
    s.questRecords.every(
      (q) =>
        q &&
        typeof q.id === "string" &&
        typeof q.title === "string" &&
        Array.isArray(q.requirements) &&
        Array.isArray(q.bring),
    ) &&
    Array.isArray(s.participations) &&
    s.participations.every(
      (p) =>
        p &&
        s.accounts.some((a) => a.id === p.userId) &&
        s.questRecords.some((q) => q.id === p.questId),
    ) &&
    Array.isArray(s.transactions) &&
    s.transactions.every(
      (t) =>
        t &&
        typeof t.id === "string" &&
        Number.isFinite(t.xp) &&
        Number.isFinite(t.points) &&
        Number.isFinite(Date.parse(t.date)),
    ) &&
    new Set(s.transactions.map((t) => t.id)).size === s.transactions.length &&
    Array.isArray(s.redemptions) &&
    Array.isArray(s.activity)
  );
}
function hydrate(): VolunteerState {
  const saved = readStorage<unknown>(KEY, null);
  if (isState(saved)) return saved;
  if (saved !== null) writeStorage(`${KEY}:backup`, saved);
  const base = seed();
  const legacy = readStorage<unknown>(
    "dniproxp:volunteer:v3",
    null,
  ) as Partial<VolunteerState> & { version?: number };
  if (
    legacy &&
    Number(legacy.version) === 3 &&
    Array.isArray(legacy.participations) &&
    Array.isArray(legacy.transactions) &&
    Array.isArray(legacy.redemptions) &&
    legacy.profiles
  ) {
    base.participations = legacy.participations.filter(
      (p) =>
        p &&
        base.accounts.some((a) => a.id === p.userId) &&
        base.questRecords.some((q) => q.id === p.questId),
    );
    base.transactions = legacy.transactions.filter(
      (t) => t && Number.isFinite(t.xp) && Number.isFinite(t.points),
    );
    base.redemptions = legacy.redemptions;
    Object.assign(base.profiles, legacy.profiles);
    base.activity = legacy.activity || base.activity;
    base.clock = legacy.clock || base.clock;
    base.revision = legacy.revision || 0;
  }
  base.participations = base.participations.map((p) => ({
    ...p,
    applicationStatus: p.applicationStatus || "approved",
  }));
  // Two organizer-facing examples; existing volunteer state is never replaced.
  for (const [userId, questId, status] of [
    ["u2", "quest-4", "planned"],
    ["u3", "quest-7", "pending"],
  ] as const)
    if (
      !base.participations.some(
        (p) => p.userId === userId && p.questId === questId,
      )
    )
      base.participations.push({
        id: `p-${userId}-${questId}`,
        userId,
        questId,
        status,
        applicationStatus: status === "planned" ? "pending" : "approved",
        createdAt: DEMO_NOW,
        updatedAt: DEMO_NOW,
        ...(status === "pending"
          ? {
              report: {
                text: "Прибрали погоджену ділянку, відсортували вторсировину й передали координатору результат роботи.",
                photo: "/images/nature.jpg",
                photoName: "Демонстраційне фото",
                submittedAt: DEMO_NOW,
              },
            }
          : {}),
      });
  return base;
}
let state: VolunteerState = hydrate();
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
function account() {
  const a = state.accounts.find((a) => a.id === authSession.get());
  if (!a) throw new Error("Увійди в демонстраційний обліковий запис.");
  return a;
}
function actor(userId: string) {
  const a = account();
  if (a.id !== userId || a.role !== "VOLUNTEER")
    throw new Error("Ця дія доступна лише для власного профілю волонтера.");
}
function owner(questId: string) {
  const a = account();
  const q = state.questRecords.find((q) => q.id === questId);
  if (!q || a.role !== "ORGANIZER" || a.organizationId !== q.organizationId)
    throw new Error("Квест не належить твоїй організації.");
  return q;
}
function administrator() {
  const a = account();
  if (a.role !== "ADMIN") throw new Error("Потрібна роль адміністратора.");
  return a;
}
function approvedOrganization(id: string, s = state) {
  return s.organizations.find((o) => o.id === id)?.moderation === "approved";
}
function occupied(q: Quest, s = state) {
  return (
    q.participants +
    s.participations.filter(
      (p) =>
        p.questId === q.id &&
        p.status !== "cancelled" &&
        p.applicationStatus !== "rejected",
    ).length
  );
}
function award(
  s: VolunteerState,
  questId: string,
  userId: string,
  now: string,
) {
  const p = entry(s, questId, userId);
  const id = `completion:${userId}:${questId}`;
  if (p.status === "completed" && s.transactions.some((t) => t.id === id))
    return;
  const q = s.questRecords.find((q) => q.id === questId)!;
  if (
    p.status !== "pending" ||
    !p.report ||
    p.applicationStatus !== "approved" ||
    q.lifecycle === "cancelled"
  )
    throw new Error("Потрібен звіт схваленого учасника доступного квесту.");
  if (s.transactions.some((t) => t.id === id))
    throw new Error("Винагороду вже нараховано.");
  p.status = "completed";
  p.confirmedAt = now;
  p.updatedAt = now;
  p.awardedXp = q.xp;
  p.awardedPoints = pointsForQuest(q);
  s.transactions.push({
    id,
    userId,
    questId,
    xp: q.xp,
    points: pointsForQuest(q),
    date: now,
    description: `Організатор підтвердив: ${q.title}`,
  });
  event(
    s,
    userId,
    questId,
    `Участь підтверджено: +${q.xp} XP та +${pointsForQuest(q)} бонусних балів`,
    "confirm",
    now,
  );
}
export function pointsForQuest(q: Quest) {
  return q.rewardPoints ?? rewardPointsFor(q.xp);
}
export function publicQuests(s = state) {
  return s.questRecords.filter(
    (q) =>
      !q.id.startsWith("history-") &&
      ["published", "active", "completed"].includes(
        q.lifecycle || "published",
      ) &&
      q.moderation === "approved" &&
      approvedOrganization(q.organizationId, s),
  );
}
export function volunteerAccounts(s = state) {
  return s.accounts.filter((a) => a.role === "VOLUNTEER");
}
function kyivDate(date: string, time: string) {
  const part =
    new Intl.DateTimeFormat("en", {
      timeZone: "Europe/Kyiv",
      timeZoneName: "shortOffset",
    })
      .formatToParts(new Date(`${date}T12:00:00Z`))
      .find((p) => p.type === "timeZoneName")?.value || "GMT+2";
  return `${date}T${time}:00+${String(Number(part.replace("GMT+", ""))).padStart(2, "0")}:00`;
}
function questFromForm(
  values: QuestFormValues,
  id: string,
  organizationId: string,
  lifecycle: QuestLifecycle,
  now: string,
): Quest {
  const v = questDraftSchema.parse(values);
  const loc = verifiedLocations[v.locationId];
  return {
    id,
    organizationId,
    title: v.title,
    description: v.description,
    fullDescription: v.fullDescription,
    categoryId: v.categoryId,
    district: v.district,
    address: loc?.locationLabel || v.address,
    date: v.date && v.time ? kyivDate(v.date, v.time) : "",
    duration: `${String(v.durationHours).replace(".", ",")} години`,
    capacity: v.capacity,
    difficulty: v.difficulty,
    xp: v.xp,
    rewardPoints: v.rewardPoints,
    image: v.image,
    imageAlt: "Тематичне фото демонстраційної ініціативи",
    requirements: v.requirements
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    bring: v.bring
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    instructions: v.instructions,
    participants: 0,
    status: "available",
    lifecycle,
    moderation: "pending",
    createdAt: now,
    updatedAt: now,
    coordinates: loc?.coordinates || null,
    coordinateSource: loc?.coordinateSource,
    locationLabel: loc?.locationLabel,
  };
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
      const q = s.questRecords.find((q) => q.id === questId);
      if (
        !q ||
        !["published", "active"].includes(q.lifecycle || "") ||
        q.moderation !== "approved" ||
        !approvedOrganization(q.organizationId, s)
      )
        throw new Error("Запис на цей квест недоступний.");
      const old = s.participations.find(
        (p) => p.questId === questId && p.userId === userId,
      );
      if (
        old &&
        old.status !== "cancelled" &&
        old.applicationStatus !== "rejected"
      )
        return;
      if (old?.applicationStatus === "rejected")
        throw new Error(
          "Організатор відхилив заявку. Повторне подання на цей квест недоступне.",
        );
      if (occupied(q, s) >= q.capacity) throw new Error("Усі місця зайняті.");
      if (old) {
        old.status = "planned";
        old.applicationStatus = "pending";
        old.report = undefined;
        old.updatedAt = now;
      } else
        s.participations.push({
          id: `p-${userId}-${questId}`,
          questId,
          userId,
          status: "planned",
          applicationStatus: "pending",
          createdAt: now,
          updatedAt: now,
        });
      event(
        s,
        userId,
        questId,
        "Заявку на участь надіслано організатору",
        "join",
        now,
      );
    });
    return state.participations.find(
      (p) => p.questId === questId && p.userId === userId,
    )!;
  },
  cancel(questId: string, userId: string) {
    actor(userId);
    commit((s, now) => {
      const p = entry(s, questId, userId);
      if (p.status !== "planned" || p.applicationStatus === "rejected")
        throw new Error("Можна скасувати лише заявку або заплановану участь.");
      p.status = "cancelled";
      p.updatedAt = now;
      event(s, userId, questId, "Участь скасовано", "cancel", now);
    });
  },
  startDemo(questId: string, userId: string) {
    actor(userId);
    commit((s, now) => {
      const p = entry(s, questId, userId);
      const q = s.questRecords.find((q) => q.id === questId)!;
      if (
        p.status !== "planned" ||
        p.applicationStatus !== "approved" ||
        !["published", "active"].includes(q.lifecycle || "")
      )
        throw new Error("Потрібне схвалення організатора й доступний квест.");
      p.status = "active";
      p.updatedAt = now;
      event(s, userId, questId, "Розпочато схвалену демоучасть", "start", now);
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
      const q = s.questRecords.find((q) => q.id === questId)!;
      if (
        p.status !== "active" ||
        p.applicationStatus !== "approved" ||
        !["active", "published"].includes(q.lifecycle || "")
      )
        throw new Error("Звіт доступний лише для активної схваленої участі.");
      if (report.text.trim().length < 30 || report.text.length > 2000)
        throw new Error("Опис має містити 30–2000 символів.");
      if (report.photo && !report.photo.startsWith("/images/"))
        throw new Error("Обери демонстраційне фото.");
      if (p.report) p.reportHistory = [...(p.reportHistory || []), p.report];
      p.report = { ...report, text: report.text.trim(), submittedAt: now };
      p.reportRejectionReason = undefined;
      p.status = "pending";
      p.updatedAt = now;
      event(s, userId, questId, "Звіт надіслано організатору", "report", now);
    });
  },
  confirmDemo(questId: string, userId: string) {
    owner(questId);
    commit((s, now) => award(s, questId, userId, now));
  },
  reviewApplication(
    questId: string,
    userId: string,
    approve: boolean,
    reason: string,
  ) {
    owner(questId);
    commit((s, now) => {
      const q = s.questRecords.find((q) => q.id === questId)!;
      if (
        !["published", "active"].includes(q.lifecycle || "") ||
        !approvedOrganization(q.organizationId, s)
      )
        throw new Error(
          "Квест або організація недоступні для розгляду заявок.",
        );
      const p = entry(s, questId, userId);
      if (p.status !== "planned" || p.applicationStatus !== "pending")
        throw new Error("Заявку вже розглянуто.");
      if (!approve && reason.trim().length < 5)
        throw new Error("Вкажи причину відхилення (від 5 символів).");
      p.applicationStatus = approve ? "approved" : "rejected";
      p.applicationReason = approve ? undefined : reason.trim();
      p.status = approve ? "active" : "cancelled";
      p.updatedAt = now;
      if (approve) q.lifecycle = "active";
      event(
        s,
        userId,
        questId,
        approve
          ? "Організатор схвалив заявку. Участь активна."
          : `Заявку відхилено: ${reason.trim()}`,
        "join",
        now,
      );
    });
  },
  rejectReport(questId: string, userId: string, reason: string) {
    owner(questId);
    commit((s, now) => {
      const p = entry(s, questId, userId);
      if (p.status !== "pending" || !p.report)
        throw new Error("Немає звіту, що очікує перевірки.");
      if (reason.trim().length < 5 || reason.length > 1000)
        throw new Error("Причина: 5–1000 символів.");
      p.status = "active";
      p.reportRejectionReason = reason.trim();
      p.updatedAt = now;
      event(
        s,
        userId,
        questId,
        `Звіт потребує доопрацювання: ${reason.trim()}`,
        "report",
        now,
      );
    });
  },
  saveQuest(values: QuestFormValues, id?: string) {
    const a = account();
    if (a.role !== "ORGANIZER" || !a.organizationId)
      throw new Error("Створення доступне організатору.");
    if (id) owner(id);
    let savedId = id || "";
    commit((s, now) => {
      const old = id ? s.questRecords.find((q) => q.id === id) : undefined;
      if (old && old.lifecycle !== "draft" && old.lifecycle !== "published")
        throw new Error(
          "Редагування доступне для чернетки або запланованого квесту.",
        );
      if (old && s.participations.some((p) => p.questId === id))
        throw new Error("Після першої заявки параметри квесту зафіксовані.");
      savedId = id || `created-${a.organizationId}-${s.nextId++}`;
      const q = questFromForm(values, savedId, a.organizationId!, "draft", now);
      if (old) {
        q.createdAt = old.createdAt;
        q.participants = old.participants;
        s.questRecords = s.questRecords.map((item) =>
          item.id === id ? q : item,
        );
      } else s.questRecords.push(q);
      event(s, a.id, savedId, "Чернетку квесту збережено", "profile", now);
    });
    return savedId;
  },
  transitionQuest(id: string, next: QuestLifecycle) {
    const q = owner(id);
    commit((s, now) => {
      const item = s.questRecords.find((q) => q.id === id)!;
      const allowed: Record<QuestLifecycle, QuestLifecycle[]> = {
        draft: ["published", "cancelled"],
        published: ["active", "cancelled"],
        active: ["completed", "cancelled"],
        completed: [],
        cancelled: [],
      };
      if (!allowed[item.lifecycle || "draft"].includes(next))
        throw new Error("Такий перехід статусу недоступний.");
      if (next === "published") {
        if (!approvedOrganization(q.organizationId, s))
          throw new Error("Спершу адміністратор має схвалити організацію.");
        const form = questToForm(item);
        const result = questPublishSchema.safeParse(form);
        if (!result.success) throw new Error(result.error.issues[0].message);
        if (Date.parse(item.date) <= s.clock)
          throw new Error("Для публікації обери майбутню дату.");
        item.moderation = "pending";
      }
      if (
        next === "completed" &&
        s.participations.some(
          (p) =>
            p.questId === id &&
            ["active", "pending", "planned"].includes(p.status) &&
            p.applicationStatus !== "rejected",
        )
      )
        throw new Error(
          "Спочатку розглянь заявки та звіти й заверши активну участь.",
        );
      if (next === "active")
        s.participations
          .filter(
            (p) =>
              p.questId === id &&
              p.status === "planned" &&
              p.applicationStatus === "approved",
          )
          .forEach((p) => {
            p.status = "active";
            p.updatedAt = now;
          });
      if (next === "cancelled")
        s.participations
          .filter((p) => p.questId === id && p.status !== "completed")
          .forEach((p) => {
            p.status = "cancelled";
            p.updatedAt = now;
          });
      item.lifecycle = next;
      item.status = next === "completed" ? "completed" : "available";
      item.updatedAt = now;
      event(
        s,
        account().id,
        id,
        `Статус квесту: ${questStatusLabels[next]}`,
        "profile",
        now,
      );
    });
  },
  moderateQuest(id: string, approve: boolean, reason: string) {
    const admin = administrator();
    commit((s, now) => {
      const q = s.questRecords.find((q) => q.id === id);
      if (!q || q.lifecycle === "draft")
        throw new Error("Чернетки не модеруються.");
      if (!approve && reason.trim().length < 5)
        throw new Error("Вкажи причину приховування (від 5 символів).");
      q.moderation = approve ? "approved" : "rejected";
      q.moderationReason = approve ? undefined : reason.trim();
      event(
        s,
        admin.id,
        id,
        approve ? "Квест пройшов модерацію" : "Квест приховано модератором",
        "profile",
        now,
      );
    });
  },
  moderateOrganization(id: string, approve: boolean, reason: string) {
    const admin = administrator();
    commit((s, now) => {
      const org = s.organizations.find((o) => o.id === id);
      if (!org) throw new Error("Організацію не знайдено.");
      if (!approve && reason.trim().length < 5)
        throw new Error("Вкажи причину призупинення (від 5 символів).");
      org.moderation = approve ? "approved" : "suspended";
      org.moderationReason = approve ? undefined : reason.trim();
      event(
        s,
        admin.id,
        undefined,
        approve ? "Організацію схвалено" : "Діяльність організації призупинено",
        "profile",
        now,
      );
    });
  },
  register(input: RegistrationInput) {
    if (input.code !== "dnipro-demo")
      throw new Error("Демонстраційний код: dnipro-demo");
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) ||
      input.name.trim().length < 2
    )
      throw new Error("Вкажи коректні ім’я та електронну пошту.");
    if (!["VOLUNTEER", "ORGANIZER"].includes(input.role))
      throw new Error("Роль недоступна для реєстрації.");
    if (
      state.accounts.some((a) => a.email === input.email.trim().toLowerCase())
    )
      throw new Error("Такий обліковий запис уже існує.");
    let id = "";
    commit((s, now) => {
      id = `account-${s.nextId++}`;
      let organizationId: string | undefined;
      if (input.role === "ORGANIZER") {
        if ((input.organizationName || "").trim().length < 3)
          throw new Error("Назва організації — від 3 символів.");
        organizationId = `org-${s.nextId++}`;
        s.organizations.push({
          id: organizationId,
          name: input.organizationName!.trim(),
          description:
            "Нова демонстраційна організація. Ініціативи цієї команди очікують на знайомство зі спільнотою.",
          initials: input.organizationName!.trim().slice(0, 2).toUpperCase(),
          focus: "Міське волонтерство",
          email: input.email.trim().toLowerCase(),
          moderation: "pending",
        });
      }
      s.accounts.push({
        id,
        email: input.email.trim().toLowerCase(),
        role: input.role,
        organizationId,
      });
      s.profiles[id] = { name: input.name.trim(), bio: "", avatar: null };
      event(
        s,
        id,
        undefined,
        "Демонстраційний обліковий запис створено",
        "profile",
        now,
      );
    });
    return id;
  },
  newDemoRun() {
    const signed = account();
    let id = "";
    commit((s, now) => {
      if (!approvedOrganization("green", s))
        throw new Error(
          "Спочатку віднови організацію «Зелений Дніпро» через модерацію.",
        );
      const source = s.questRecords.find((q) => q.id === "demo-city-team")!;
      id = `demo-run-${s.nextId++}`;
      s.questRecords.push({
        ...source,
        id,
        title: `Добрі справи в парку · демопрохід ${s.nextId - 1}`,
        participants: 0,
        lifecycle: "published",
        status: "available",
        moderation: "approved",
        createdAt: now,
        updatedAt: now,
      });
      s.demoQuestId = id;
      event(
        s,
        signed.id,
        id,
        "Підготовлено новий демонстраційний квест",
        "profile",
        now,
      );
    });
    return id;
  },
  updateProfile(userId: string, profile: ProfileData) {
    const signed = account();
    if (signed.id !== userId)
      throw new Error("Можна редагувати лише власний профіль.");
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
  const identity = snapshot.accounts.find((a) => a.id === userId);
  const base = identity
    ? {
        ...(users.find((u) => u.id === userId) || {
          id: userId,
          name: "",
          xp: 0,
          level: 1,
          questsCompleted: 0,
          initials: "",
        }),
        ...identity,
      }
    : null;
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
      const q = snapshot.questRecords.find((q) => q.id === p.questId);
      return n + parseFloat((q?.duration || "0").replace(",", "."));
    }, 0),
    nextLevelXp: level.nextXp,
    levelStartXp: level.xp,
    progress: level.progress,
  };
}

export function getQuestSnapshot(id: string, snapshot = state): Quest | null {
  const q = snapshot.questRecords.find((q) => q.id === id);
  if (!q) return null;
  return {
    ...q,
    participants:
      q.participants +
      snapshot.participations.filter(
        (p) =>
          p.questId === id &&
          p.status !== "cancelled" &&
          p.applicationStatus !== "rejected",
      ).length,
  };
}

export const questStatusLabels: Record<QuestLifecycle, string> = {
  draft: "Чернетка",
  published: "Заплановано",
  active: "Активний",
  completed: "Завершено",
  cancelled: "Скасовано",
};
export function questToForm(q: Quest): QuestFormValues {
  return {
    title: q.title,
    description: q.description,
    fullDescription: q.fullDescription || q.description,
    categoryId: q.categoryId,
    district: q.district,
    address: q.address,
    date: q.date.slice(0, 10),
    time: q.date.slice(11, 16),
    capacity: q.capacity,
    difficulty: q.difficulty,
    xp: q.xp,
    rewardPoints: pointsForQuest(q),
    image: q.image,
    requirements: q.requirements.join("\n"),
    bring: q.bring.join("\n"),
    instructions: q.instructions || "",
    durationHours: parseFloat(q.duration.replace(",", ".")) || 2,
    locationId:
      Object.keys(verifiedLocations).find(
        (id) => verifiedLocations[id].coordinateSource === q.coordinateSource,
      ) || "",
  };
}
