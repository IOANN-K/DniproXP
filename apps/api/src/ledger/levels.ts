// Matches apps/web/src/entities/gamification/levels.ts. Frontend stays independent until HTTP adapter rollout.
export const LEVELS = [
  { level: 1, xp: 0, name: 'Перший крок' },
  { level: 2, xp: 250, name: 'Добрий сусід' },
  { level: 3, xp: 600, name: 'Творець змін' },
  { level: 4, xp: 1000, name: 'Сила спільноти' },
  { level: 5, xp: 1600, name: 'Натхненник міста' },
  { level: 6, xp: 2400, name: 'Захисник добрих справ' },
  { level: 7, xp: 3400, name: 'Герой Дніпра' },
  { level: 8, xp: 4800, name: 'Легенда спільноти' },
];
export function progressionFor(xp: number) {
  const first = LEVELS[0];
  if (!first) throw new Error('Level configuration missing');
  const current =
    [...LEVELS].reverse().find((level) => xp >= level.xp) ?? first;
  const next = LEVELS.find((level) => level.level === current.level + 1);
  return {
    currentLevel: current.level,
    levelName: current.name,
    nextLevelXP: next?.xp ?? null,
    xpToNextLevel: next ? Math.max(0, next.xp - xp) : null,
    progress: next
      ? Math.min(
          100,
          Math.max(0, ((xp - current.xp) / (next.xp - current.xp)) * 100),
        )
      : 100,
  };
}
