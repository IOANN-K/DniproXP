import { useSession } from "../session/store";
import { useVolunteerState } from "../../shared/lib/use-volunteer";
export function useOrganizer() {
  const state = useVolunteerState();
  const user = useSession((s) => s.user)!;
  const organization = state.organizations.find(
    (o) => o.id === user.organizationId,
  )!;
  const quests = state.questRecords.filter(
    (q) => q.organizationId === organization.id && !q.id.startsWith("history-"),
  );
  const participations = state.participations.filter((p) =>
    quests.some((q) => q.id === p.questId),
  );
  return { state, user, organization, quests, participations };
}
