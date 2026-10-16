import { create } from "zustand";
import { persist } from "zustand/middleware";
import { users } from "../../mocks/data";
import type { User } from "../../entities/types";
type Session = { user: User | null; enterDemo: () => void; logout: () => void };
export const useSession = create<Session>()(
  persist(
    (set) => ({
      user: null,
      enterDemo: () => set({ user: users[0] }),
      logout: () => set({ user: null }),
    }),
    { name: "dniproxp:session:v1" },
  ),
);
