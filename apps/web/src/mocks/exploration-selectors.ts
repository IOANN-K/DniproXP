import type { VolunteerState } from "../entities/types";
import { verifiedActivities } from "../entities/verified-activity/adapter";
import {
  missionProgress,
  type MissionContext,
} from "../entities/mission/progress";
import { challengeProgress } from "../entities/challenge/progress";
import { explorationSeed } from "./exploration-data";
export const explorationOf = (s: VolunteerState) =>
  s.exploration || explorationSeed(s.questRecords);
export const activitiesOf = (s: VolunteerState) =>
  verifiedActivities(s.participations, s.transactions, s.questRecords, s.clock);
export function missionContext(s: VolunteerState): MissionContext {
  const epic = explorationOf(s);
  return {
    missions: epic.missions,
    activities: activitiesOf(s),
    participations: s.participations,
    transactions: s.transactions,
    enrollments: epic.missionEnrollments,
    now: s.clock,
    quests: s.questRecords,
    organizations: s.organizations,
  };
}
export function selectMissionProgress(
  s: VolunteerState,
  id: string,
  userId: string,
) {
  const m = explorationOf(s).missions.find((m) => m.id === id);
  return m ? missionProgress(m, userId, missionContext(s)) : null;
}
export function selectChallengeProgress(s: VolunteerState, id: string) {
  const epic = explorationOf(s);
  const c = epic.challenges.find((c) => c.id === id);
  return c
    ? challengeProgress(
        c,
        activitiesOf(s),
        epic.measurements,
        epic.challengeParticipants,
        s.clock,
      )
    : null;
}
export function selectExplorationBadges(s: VolunteerState, userId: string) {
  const epic = explorationOf(s);
  return s.transactions
    .filter(
      (t) =>
        t.userId === userId &&
        (t.kind === "MISSION_REWARD" || t.kind === "CHALLENGE_REWARD"),
    )
    .flatMap((t) => {
      const mission =
        t.kind === "MISSION_REWARD"
          ? epic.missions.find((m) => m.id === t.sourceId)
          : null;
      const challenge =
        t.kind === "CHALLENGE_REWARD"
          ? epic.challenges.find((c) => c.id === t.sourceId)
          : null;
      const definition = mission || challenge;
      if (!definition) return [];
      return [
        {
          ...definition.rewards.achievement,
          date: t.date,
          href: mission
            ? `/missions/${mission.slug}`
            : `/challenges/${challenge!.slug}`,
          sourceTitle: definition.title,
        },
      ];
    });
}
