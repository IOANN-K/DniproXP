import type { PassportVisibilitySettings } from "./passport/types";
import type {
  Team,
  TeamMembership,
  TeamInvitation,
  TeamQuestParticipation,
  TeamEvent,
  TeamCommand,
} from "./team/types";
export type IdentityState = {
  schemaVersion: 1;
  passports: Record<
    string,
    {
      passportId: string;
      joinDate: string;
      visibility: PassportVisibilitySettings;
    }
  >;
  teams: Team[];
  memberships: TeamMembership[];
  invitations: TeamInvitation[];
  teamQuests: TeamQuestParticipation[];
  events: TeamEvent[];
  recoveryMessage?: string;
};
export type IdentityCommand =
  | TeamCommand
  | { type: "PASSPORT_PRIVACY"; settings: PassportVisibilitySettings };
