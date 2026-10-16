import { useQuery, useMutation } from "@tanstack/react-query";
import { teamsApi } from "../../mocks/identity-api";
import { useSession } from "../session/store";
import type { TeamCommand } from "../../entities/team/types";
export function useTeams() {
  const id = useSession((s) => s.user?.id);
  return useQuery({ queryKey: ["teams", id], queryFn: () => teamsApi.list() });
}
export function useTeam(slug: string) {
  const id = useSession((s) => s.user?.id);
  return useQuery({
    queryKey: ["team", slug, id],
    queryFn: () => teamsApi.get(slug),
  });
}
export function useTeamMutation() {
  return useMutation({
    mutationFn: (command: TeamCommand) => teamsApi.mutate(command),
  });
}
