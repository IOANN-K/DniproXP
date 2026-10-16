import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { passportApi } from "../../mocks/identity-api";
import { useSession } from "../session/store";
import type { PassportVisibilitySettings } from "../../entities/passport/types";
export function usePassport(userId: string, publicView = false) {
  const viewer = useSession((s) => s.user?.id);
  return useQuery({
    queryKey: ["passport", userId, viewer, publicView],
    queryFn: () => passportApi.get(userId, publicView),
  });
}
export function useCredential(id: string) {
  const viewer = useSession((s) => s.user?.id);
  return useQuery({
    queryKey: ["credential", id, viewer],
    queryFn: () => passportApi.credential(id),
  });
}
export function usePassportPrivacy() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (settings: PassportVisibilitySettings) =>
      passportApi.privacy(settings),
    onSuccess: () => client.invalidateQueries({ queryKey: ["passport"] }),
  });
}
