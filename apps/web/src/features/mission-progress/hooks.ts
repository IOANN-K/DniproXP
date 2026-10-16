import { useQuery, useMutation } from "@tanstack/react-query";
import { missionsRepository } from "../../mocks/missions-api";
import { useSession } from "../session/store";
import { useVolunteerState } from "../../shared/lib/use-volunteer";
import { selectMissionProgress } from "../../mocks/exploration-selectors";
export function useMissions() {
  const id = useSession((s) => s.user?.id);
  return useQuery({
    queryKey: ["missions", id],
    queryFn: () => missionsRepository.list(),
  });
}
export function useMission(slug: string) {
  const id = useSession((s) => s.user?.id);
  return useQuery({
    queryKey: ["mission", slug, id],
    queryFn: () => missionsRepository.get(slug),
  });
}
export function useMissionProgress(id: string, userId?: string) {
  const s = useVolunteerState();
  const user = useSession((s) => s.user);
  return selectMissionProgress(s, id, userId || user?.id || "");
}
export function useJoinMission() {
  return useMutation({
    mutationFn: (id: string) => missionsRepository.join(id),
  });
}
export function useClaimMission() {
  return useMutation({
    mutationFn: (id: string) => missionsRepository.claimReward(id),
  });
}
