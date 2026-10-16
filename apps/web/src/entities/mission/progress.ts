import type { Participation, Transaction, Quest, Organization } from "../types";
import type { VerifiedActivity } from "../verified-activity/types";
import type {
  QuestChain,
  QuestChainProgress,
  MissionEnrollment,
} from "./types";
import { levelFor } from "../gamification/levels";
export type MissionContext = {
  missions: QuestChain[];
  quests: Quest[];
  organizations: Organization[];
  activities: VerifiedActivity[];
  participations: Participation[];
  transactions: Transaction[];
  enrollments: MissionEnrollment[];
  now: number;
};
export function missionProgress(
  chain: QuestChain,
  userId: string,
  ctx: MissionContext,
  trail = new Set<string>(),
): QuestChainProgress {
  if (trail.has(chain.id)) throw new Error("Виявлено цикл передумов місії.");
  const path = new Set(trail).add(chain.id);
  const xp = ctx.transactions
    .filter((t) => t.userId === userId)
    .reduce((n, t) => n + t.xp, 0);
  const reasons: string[] = [];
  if (levelFor(xp).level < chain.prerequisites.minLevel)
    reasons.push(`Потрібен рівень ${chain.prerequisites.minLevel}.`);
  const allActivity = ctx.activities.filter((a) => a.userId === userId);
  for (const id of chain.prerequisites.questIds)
    if (!allActivity.some((a) => a.questId === id))
      reasons.push("Спочатку підтвердь виконання квесту-передумови.");
  for (const id of chain.prerequisites.chainIds) {
    const other = ctx.missions.find((m) => m.id === id);
    if (
      !other ||
      missionProgress(other, userId, ctx, path).status !== "COMPLETED"
    )
      reasons.push(`Спочатку заверши місію «${other?.title || id}».`);
  }
  const activities = allActivity.filter(
    (a) =>
      (!chain.startsAt ||
        Date.parse(a.occurredAt) >= Date.parse(chain.startsAt)) &&
      (!chain.endsAt || Date.parse(a.occurredAt) <= Date.parse(chain.endsAt)),
  );
  const confirmed = new Map(activities.map((a) => [a.questId, a]));
  const required = chain.steps.filter((s) => !s.isOptional);
  const optional = chain.steps.filter((s) => s.isOptional);
  const requiredCompleted = required.filter((s) =>
    confirmed.has(s.questId),
  ).length;
  const optionalCompleted = optional.filter((s) =>
    confirmed.has(s.questId),
  ).length;
  const completed =
    required.length > 0 &&
    requiredCompleted === required.length &&
    reasons.length === 0 &&
    chain.status !== "DRAFT";
  const open =
    ["PUBLISHED", "ACTIVE"].includes(chain.status) &&
    (!chain.startsAt || ctx.now >= Date.parse(chain.startsAt)) &&
    (!chain.endsAt || ctx.now <= Date.parse(chain.endsAt));
  if (!open && !completed)
    reasons.push(
      chain.status === "DRAFT"
        ? "Місію ще не опубліковано."
        : chain.startsAt && ctx.now < Date.parse(chain.startsAt)
          ? "Місія ще не почалася."
          : "Проходження цієї місії вже закрито.",
    );
  const steps = chain.steps
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((step) => {
      const activity = confirmed.get(step.questId);
      if (activity)
        return {
          stepId: step.id,
          status: "COMPLETED" as const,
          confirmedAt: activity.occurredAt,
          reason: null,
        };
      const deps = step.prerequisiteStepIds.every((id) => {
        const prior = chain.steps.find((s) => s.id === id);
        return !!prior && confirmed.has(prior.questId);
      });
      if (reasons.length || !deps || !open)
        return {
          stepId: step.id,
          status: "LOCKED" as const,
          confirmedAt: null,
          reason:
            reasons[0] ||
            (!open
              ? "Нові етапи цієї місії вже закриті."
              : "Потрібне підтвердження попереднього етапу."),
        };
      const quest = ctx.quests.find((q) => q.id === step.questId);
      const active = ctx.participations.some(
        (p) =>
          p.userId === userId &&
          p.questId === step.questId &&
          ["planned", "active", "pending"].includes(p.status) &&
          p.applicationStatus !== "rejected",
      );
      if (
        !active &&
        (!quest ||
          quest.status === "completed" ||
          ["draft", "cancelled"].includes(quest.lifecycle || "") ||
          (!!quest.moderation && quest.moderation !== "approved") ||
          ctx.organizations.find((o) => o.id === quest.organizationId)
            ?.moderation !== "approved" ||
          quest.participants +
            ctx.participations.filter(
              (p) =>
                p.questId === quest.id &&
                p.status !== "cancelled" &&
                p.applicationStatus !== "rejected",
            ).length >=
            quest.capacity)
      )
        return {
          stepId: step.id,
          status: "LOCKED" as const,
          confirmedAt: null,
          reason: "Квест цього етапу зараз недоступний для нової участі.",
        };
      return {
        stepId: step.id,
        status: active ? ("IN_PROGRESS" as const) : ("AVAILABLE" as const),
        confirmedAt: null,
        reason: null,
      };
    });
  const next =
    steps.find(
      (s) =>
        s.status === "IN_PROGRESS" &&
        !chain.steps.find((p) => p.id === s.stepId)?.isOptional,
    ) ||
    steps.find(
      (s) =>
        s.status === "AVAILABLE" &&
        !chain.steps.find((p) => p.id === s.stepId)?.isOptional,
    ) ||
    steps.find((s) => s.status === "AVAILABLE" || s.status === "IN_PROGRESS");
  if (
    !completed &&
    !steps.some(
      (s) => s.status === "AVAILABLE" || s.status === "IN_PROGRESS",
    ) &&
    !reasons.length
  )
    reasons.push("Наразі немає відкритих етапів для продовження цієї історії.");
  const enrolled = ctx.enrollments.some(
    (e) => e.chainId === chain.id && e.userId === userId,
  );
  const status = completed
    ? "COMPLETED"
    : reasons.length
      ? "LOCKED"
      : requiredCompleted ||
          optionalCompleted ||
          enrolled ||
          steps.some((s) => s.status === "IN_PROGRESS")
        ? "IN_PROGRESS"
        : "AVAILABLE";
  const completionTimes = required
    .map((s) => confirmed.get(s.questId)?.occurredAt)
    .filter((v): v is string => !!v)
    .sort((a, b) => Date.parse(b) - Date.parse(a));
  return {
    chainId: chain.id,
    userId,
    status,
    steps,
    requiredCompleted,
    requiredTotal: required.length,
    optionalCompleted,
    optionalTotal: optional.length,
    percentage: required.length
      ? (requiredCompleted / required.length) * 100
      : 0,
    nextStepId: completed ? null : next?.stepId || null,
    completedAt: completed ? completionTimes[0] || null : null,
    rewardClaimed: ctx.transactions.some(
      (t) =>
        t.id === `mission:${chain.id}:${userId}` && t.kind === "MISSION_REWARD",
    ),
    reasons,
    enrolled,
  };
}
