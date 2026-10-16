import type { VolunteerState } from "../types";
import type { VerifiedActivity } from "../verified-activity/types";
import type { Team, TeamAchievement, TeamStatistics } from "./types";
import { verifiedActivities } from "../verified-activity/adapter";
import {
  challengeProgress,
  challengeContributions,
  teamChallengeContribution,
} from "../challenge/progress";
export function teamVerifiedActivities(
  s: VolunteerState,
  teamId: string,
): VerifiedActivity[] {
  const records =
    s.identity?.teamQuests.filter((r) => r.teamId === teamId) || [];
  return verifiedActivities(
    s.participations,
    s.transactions,
    s.questRecords,
    s.clock,
  ).filter((a) =>
    records.some(
      (r) =>
        r.questId === a.questId &&
        r.participantIds.includes(a.userId) &&
        Date.parse(r.createdAt) <= Date.parse(a.occurredAt) &&
        s.participations.some(
          (p) => p.id === a.participationId && p.teamParticipationId === r.id,
        ),
    ),
  );
}
const monthKey = (date: number | string) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
  }).format(new Date(date));
export function teamStatistics(
  s: VolunteerState,
  teamId: string,
  period: "all" | "month" = "all",
): TeamStatistics {
  const all = teamVerifiedActivities(s, teamId);
  const activities = all.filter(
    (a) => period === "all" || monthKey(a.occurredAt) === monthKey(s.clock),
  );
  const questIds = new Set(activities.map((a) => a.questId));
  const metrics = new Map<
    string,
    { metric: string; unit: string; value: number }
  >();
  for (const m of s.exploration?.measurements || [])
    if (questIds.has(m.questId)) {
      const key = `${m.metric}:${m.unit}`;
      const old = metrics.get(key);
      metrics.set(key, {
        metric: m.metric,
        unit: m.unit,
        value: (old?.value || 0) + m.value,
      });
    }
  return {
    teamId,
    verifiedQuests: questIds.size,
    completedQuests: (s.identity?.teamQuests || []).filter(
      (r) =>
        r.teamId === teamId &&
        r.status === "COMPLETED" &&
        questIds.has(r.questId),
    ).length,
    verifiedParticipations: activities.length,
    hours: activities.reduce((n, a) => n + a.hours, 0),
    xp: s.transactions
      .filter((t) => activities.some((a) => a.id === t.id))
      .reduce((n, t) => n + t.xp, 0),
    volunteers: new Set(activities.map((a) => a.userId)).size,
    rank: 0,
    impacts: [...metrics.values()],
  };
}
export function teamRanking(
  s: VolunteerState,
  period: "all" | "month" = "all",
  category = "",
  visibleTeams: Team[] = s.identity?.teams.filter(
    (t) => t.visibility === "PUBLIC",
  ) || [],
) {
  return visibleTeams
    .filter((t) => !category || t.category === category)
    .map((team) => ({ team, statistics: teamStatistics(s, team.id, period) }))
    .sort(
      (a, b) =>
        b.statistics.hours - a.statistics.hours ||
        b.statistics.verifiedParticipations -
          a.statistics.verifiedParticipations ||
        a.team.id.localeCompare(b.team.id),
    )
    .map((r, index) => ({
      ...r,
      statistics: { ...r.statistics, rank: index + 1 },
    }));
}
export function teamAchievements(
  s: VolunteerState,
  teamId: string,
): TeamAchievement[] {
  const stats = teamStatistics(s, teamId);
  const activities = teamVerifiedActivities(s, teamId);
  const eco = new Set(
    activities
      .filter(
        (a) =>
          s.questRecords.find((q) => q.id === a.questId)?.categoryId === "eco",
      )
      .map((a) => a.questId),
  ).size;
  const city = new Set(
    activities
      .filter(
        (a) =>
          s.questRecords.find((q) => q.id === a.questId)?.categoryId === "city",
      )
      .map((a) => a.questId),
  ).size;
  const monthly = teamRanking(s, "month");
  const monthlyMine = monthly.find((r) => r.team.id === teamId);
  return [
    {
      id: "first",
      name: "Перша спільна справа",
      description: "Є хоча б одна підтверджена участь у командній заявці.",
      value: stats.verifiedParticipations,
      target: 1,
      unlocked: stats.verifiedParticipations >= 1,
    },
    {
      id: "eco",
      name: "Екокоманда",
      description:
        "Три квести екологічного напряму з підтвердженим командним внеском.",
      value: eco,
      target: 3,
      unlocked: eco >= 3,
    },
    {
      id: "hours",
      name: "100 годин допомоги",
      description: "Разом накопичено 100 підтверджених особистих годин.",
      value: stats.hours,
      target: 100,
      unlocked: stats.hours >= 100,
    },
    {
      id: "month",
      name: "Команда місяця",
      description:
        "Перше місце серед публічних команд поточного місяця, від 10 годин і двох квестів.",
      value: monthlyMine?.statistics.hours || 0,
      target: 10,
      unlocked:
        monthlyMine?.statistics.rank === 1 &&
        monthlyMine.statistics.hours >= 10 &&
        monthlyMine.statistics.verifiedQuests >= 2,
    },
    {
      id: "city",
      name: "Містотворці",
      description: "Два квести міських просторів із підтвердженим внеском.",
      value: city,
      target: 2,
      unlocked: city >= 2,
    },
  ];
}
export function teamChallengeResults(s: VolunteerState, teamId: string) {
  const activities = teamVerifiedActivities(s, teamId);
  return (s.exploration?.challenges || [])
    .filter((c) => c.status !== "DRAFT")
    .map((challenge) => {
      const contributions = challengeContributions(
        challenge,
        activities,
        s.exploration?.measurements || [],
      );
      const result = teamChallengeContribution(
        challenge,
        [...new Set(activities.map((a) => a.userId))],
        activities,
        contributions,
      );
      const overall = challengeProgress(
        challenge,
        activities,
        s.exploration?.measurements || [],
        [],
        s.clock,
      );
      return { challenge, ...result, contributions, overall };
    })
    .filter((r) => r.hours > 0 || r.contributions.length > 0);
}
