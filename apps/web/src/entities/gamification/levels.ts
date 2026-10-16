export const LEVELS = [
  { level: 1, xp: 0, name: "Перший крок" },
  { level: 2, xp: 250, name: "Добрий сусід" },
  { level: 3, xp: 600, name: "Творець змін" },
  { level: 4, xp: 1000, name: "Сила спільноти" },
  { level: 5, xp: 1600, name: "Натхненник міста" },
  { level: 6, xp: 2400, name: "Захисник добрих справ" },
  { level: 7, xp: 3400, name: "Герой Дніпра" },
  { level: 8, xp: 4800, name: "Легенда спільноти" },
] as const;
export function levelFor(xp: number) {
  const current = [...LEVELS].reverse().find((l) => xp >= l.xp) || LEVELS[0];
  const next = LEVELS.find((l) => l.level === current.level + 1);
  return {
    ...current,
    nextXp: next?.xp ?? null,
    progress: next
      ? Math.min(
          100,
          Math.max(0, ((xp - current.xp) / (next.xp - current.xp)) * 100),
        )
      : 100,
  };
}
export const rewardPointsFor = (xp: number) => Math.floor(xp / 2);
