import type { QuestChain, MissionEnrollment } from "./mission/types";
import type {
  CityChallenge,
  ChallengeParticipant,
  ChallengeContribution,
} from "./challenge/types";
import type { QuestImpactMeasurement } from "./verified-activity/types";
export type ExplorationState = {
  schemaVersion: 1;
  recoveryMessage?: string;
  missions: QuestChain[];
  challenges: CityChallenge[];
  measurements: QuestImpactMeasurement[];
  missionEnrollments: MissionEnrollment[];
  challengeParticipants: ChallengeParticipant[];
  contributions: ChallengeContribution[];
};
