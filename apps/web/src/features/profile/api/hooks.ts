import { useMutation, useQuery } from "@tanstack/react-query";
import { usersApi } from "../../../shared/api/users";
import { acceptUser } from "../../../shared/api/client";
import { apiKeys, apiQueryClient, invalidateIdentity } from "../../../shared/api/query-client";
import { useSession } from "../../session/store";
export function useApiMe() {
  const id = useSession(s => s.user?.id);
  return useQuery({ queryKey: apiKeys.me(id ?? ""), queryFn: ({ signal }) => usersApi.me(signal), enabled: !!id });
}
export function useApiPreferences() {
  const id = useSession(s => s.user?.id);
  return useQuery({ queryKey: apiKeys.preferences(id ?? ""), queryFn: ({ signal }) => usersApi.preferences(signal), enabled: !!id });
}
export function useApiPassport(id?: string) {
  const user = useSession(s => s.user);
  return useQuery({ queryKey: id ? apiKeys.publicPassport(id) : apiKeys.passport(user?.id ?? ""),
    queryFn: async ({ signal }) => id ? usersApi.publicPassport(id, signal) : { restricted: false as const, passport: await usersApi.passport(signal) },
    enabled: !!id || !!user });
}
export function useUpdateApiProfile() {
  const id = useSession(s => s.user?.id);
  return useMutation({ mutationFn: usersApi.update, onSuccess: async user => {
    acceptUser(user); apiQueryClient.setQueryData(apiKeys.me(user.id), user); await invalidateIdentity(user.id);
  }, scope: { id: `profile:${id}` } });
}
export function useUpdateApiPreferences() {
  const id = useSession(s => s.user?.id);
  return useMutation({ mutationFn: usersApi.updatePreferences, onSuccess: async prefs => {
    if (!id) return; apiQueryClient.setQueryData(apiKeys.preferences(id), prefs); await invalidateIdentity(id);
  }, scope: { id: `preferences:${id}` } });
}
