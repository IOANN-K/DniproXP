import { useSyncExternalStore } from "react";
import { repository, getVolunteer } from "../../mocks/repository";
import { useSession } from "../../features/session/store";
export function useVolunteerState() {
  return useSyncExternalStore(repository.subscribe, repository.getSnapshot);
}
export function useVolunteer(userId?: string) {
  const state = useVolunteerState();
  const session = useSession((s) => s.user);
  return getVolunteer(userId || session?.id || "", state);
}
