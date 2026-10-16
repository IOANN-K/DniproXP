import { QueryClient } from "@tanstack/react-query";
import { ApiError, isAbort } from "./errors";
export const apiQueryClient = new QueryClient({ defaultOptions: {
  queries: { staleTime: 30000, refetchOnWindowFocus: false, retry: (attempt, error) =>
    !isAbort(error) && error instanceof ApiError && (error.status === 0 || error.status === 502 || error.status === 503) && attempt < 1 },
  mutations: { retry: false },
} });
export const apiKeys = {
  me: (id: string) => ["api", "private", id, "user"] as const,
  preferences: (id: string) => ["api", "private", id, "preferences"] as const,
  progression: (id: string) => ["api", "private", id, "progression"] as const,
  passport: (id: string) => ["api", "private", id, "passport"] as const,
  publicUser: (id: string) => ["api", "public", "user", id] as const,
  publicPassport: (id: string) => ["api", "public", "passport", id] as const,
};
export async function invalidateIdentity(id: string) {
  // A privacy change must not resurrect a previously cached public projection on navigation.
  apiQueryClient.removeQueries({ queryKey: apiKeys.publicUser(id) });
  apiQueryClient.removeQueries({ queryKey: apiKeys.publicPassport(id) });
  await Promise.all([
    apiQueryClient.invalidateQueries({ queryKey: ["api", "private", id] }),
    apiQueryClient.invalidateQueries({ queryKey: apiKeys.publicUser(id) }),
    apiQueryClient.invalidateQueries({ queryKey: apiKeys.publicPassport(id) }),
  ]);
}
