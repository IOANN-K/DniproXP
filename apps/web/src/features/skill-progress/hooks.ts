import { useQuery } from "@tanstack/react-query";
import { skillsApi } from "../../mocks/identity-api";
export function useSkills(userId: string) {
  return useQuery({
    queryKey: ["skills", userId],
    queryFn: () => skillsApi.get(userId),
  });
}
