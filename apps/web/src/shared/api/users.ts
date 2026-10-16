import { request } from "./client";
import { userSchema, preferencesSchema, publicUserSchema, progressionSchema, privatePassportSchema, publicPassportSchema, ledgerPageSchema, achievementPageSchema, activityPageSchema, skillDefinitionsPageSchema } from "./contracts";
import type { Preferences, PageInput } from "./contracts";
export const usersApi = {
  skillDefinitions: (signal?: AbortSignal) => request("/skills", skillDefinitionsPageSchema, { auth: "none", query: { pageSize: 100, order: "ASC" }, signal }),
  me: (signal?: AbortSignal) => request("/users/me", userSchema, { signal }),
  update: (body: { displayName?: string; bio?: string | null; avatarUrl?: string | null; primaryRole?: "VOLUNTEER" | "ORGANIZER" | "ADMIN" }) => request("/users/me", userSchema, { method: "PATCH", body, replaySafe: true }),
  preferences: (signal?: AbortSignal) => request("/users/me/preferences", preferencesSchema, { signal }),
  updatePreferences: (body: Partial<Preferences>) => request("/users/me/preferences", preferencesSchema, { method: "PATCH", body, replaySafe: true }),
  public: (id: string, signal?: AbortSignal) => request(`/users/${encodeURIComponent(id)}/public-profile`, publicUserSchema, { auth: "none", signal }),
  progression: (signal?: AbortSignal) => request("/users/me/progression", progressionSchema, { signal }),
  passport: (signal?: AbortSignal) => request("/users/me/passport", privatePassportSchema, { signal }),
  publicPassport: (id: string, signal?: AbortSignal) => request(`/users/${encodeURIComponent(id)}/passport`, publicPassportSchema, { auth: "none", signal }),
  transactions: (query: PageInput, signal?: AbortSignal) => request("/users/me/rewards/transactions", ledgerPageSchema, { query, signal }),
  achievements: (query: PageInput, signal?: AbortSignal) => request("/users/me/achievements", achievementPageSchema, { query, signal }),
  activities: (query: PageInput, signal?: AbortSignal) => request("/users/me/passport/activities", activityPageSchema, { query, signal }),
};
