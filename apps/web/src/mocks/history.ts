import type { Quest } from "../entities/types";
import { quests, users } from "./data";
// Archived demo events supply real, dated contributions for profiles and rankings.
export const historicalQuests: Quest[] = Array.from({ length: 20 }, (_, i) => {
  const source =
    quests[
      [0, 1, 2, 7, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19][i]
    ];
  return {
    ...source,
    id: `history-${i + 1}`,
    title: `${source.title} · попередня зустріч`,
    date: `2026-${i < 4 ? "10-" + String(5 + i * 3).padStart(2, "0") : i < 12 ? "10-" + String(i - 3).padStart(2, "0") : "09-" + String(i + 1).padStart(2, "0")}T10:00:00+03:00`,
    status: "completed",
    participants: Math.min(source.capacity - users.length, source.participants),
    coordinates: null,
  };
});
export const allQuests = [...quests, ...historicalQuests];
