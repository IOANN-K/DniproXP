import { useQuery, useMutation } from "@tanstack/react-query";
import { challengesRepository } from "../../mocks/challenges-api";
import { useSession } from "../session/store";
import { useVolunteerState } from "../../shared/lib/use-volunteer";
import { selectChallengeProgress } from "../../mocks/exploration-selectors";
export function useChallenges() {
  const id = useSession((s) => s.user?.id);
  return useQuery({
    queryKey: ["challenges", id],
    queryFn: () => challengesRepository.list(),
  });
}
export function useChallenge(slug: string) {
  const id = useSession((s) => s.user?.id);
  return useQuery({
    queryKey: ["challenge", slug, id],
    queryFn: () => challengesRepository.get(slug),
  });
}
export function useChallengeProgress(id: string) {
  return selectChallengeProgress(useVolunteerState(), id);
}
export function useJoinChallenge() {
  return useMutation({
    mutationFn: (id: string) => challengesRepository.join(id),
  });
}
export function useClaimChallenge() {
  return useMutation({
    mutationFn: (id: string) => challengesRepository.claimReward(id),
  });
}
