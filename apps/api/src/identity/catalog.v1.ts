// Immutable BE-04 catalog version: migrations and the API share these frontend semantics.
// Future changes require a new catalog version/migration, not rewriting this file.
import type { SkillDefinition, SkillCategory } from '../skills/skill.entity.js';
import type { AchievementDefinition } from '../achievements/achievement.entity.js';
const branches: { category: SkillCategory; icon: string; categories: string[]; names: [string, string]; team?: boolean }[] = [
  { category: 'eco', icon: 'leaf', categories: ['eco'], names: ['Турбота про довкілля', 'Екологічні практики'] },
  { category: 'social', icon: 'heart', categories: ['social', 'animals'], names: ['Уважна допомога', 'Підтримка спільноти'] },
  { category: 'events', icon: 'calendar', categories: ['city', 'culture'], names: ['Спільна подія', 'Координація ініціатив'] },
  { category: 'education', icon: 'book', categories: ['education'], names: ['Обмін знаннями', 'Наставництво'] },
  { category: 'communication', icon: 'message', categories: ['social', 'culture', 'education'], names: ['Діалог із сусідами', 'Модерація спільноти'] },
  { category: 'leadership', icon: 'flag', categories: ['eco', 'social', 'animals', 'city', 'culture', 'education'], names: ['Командна відповідальність', 'Лідерство через дії'], team: true },
  { category: 'logistics', icon: 'package', categories: ['social', 'eco', 'city'], names: ['Організація ресурсів', 'Логістика допомоги'] },
  { category: 'digital', icon: 'code', categories: ['education', 'culture'], names: ['Цифрова підтримка', 'Цифрові ініціативи'] },
];
const uuid = (number: number) => `c4000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
export const SKILLS_V1: SkillDefinition[] = branches.flatMap((branch, index) => branch.names.map((title, slot): SkillDefinition => ({
  id: uuid(index * 2 + slot + 1), slug: `${branch.category}-${slot + 1}`, title,
  description: slot === 0 ? 'Компетенція зростає завдяки підтвердженим практичним справам у відповідних напрямах.' : 'Наступний крок спеціалізації. Попередній досвід зберігається, але рівень відкривається після базової навички.',
  category: branch.category, icon: branch.icon, status: 'ACTIVE', levelThresholds: [0, 40, 120, 260, 480],
  eligibleQuestCategories: branch.categories, prerequisites: slot ? [{ skillId: uuid(index * 2 + 1), minLevel: 1 }] : [],
  experienceRules: { baseXp: slot ? 15 : 20, xpPerHour: 10, requiresTeam: !!branch.team },
})));
export const ACHIEVEMENTS_V1: AchievementDefinition[] = [
  { id: uuid(1001), slug: 'first', title: 'Перший крок', description: 'Заверши свій перший квест.', icon: 'sprout', tier: 'BRONZE', scope: 'USER', status: 'ACTIVE', requirements: { kind: 'QUEST_COUNT', target: 1 } },
  { id: uuid(1002), slug: 'regular', title: 'На хвилі добра', description: 'Допоможи місту на 5 квестах.', icon: 'flame', tier: 'SILVER', scope: 'USER', status: 'ACTIVE', requirements: { kind: 'QUEST_COUNT', target: 5 } },
  { id: uuid(1003), slug: 'hero', title: 'Герой міста', description: 'Заверши 20 міських квестів.', icon: 'trophy', tier: 'GOLD', scope: 'USER', status: 'ACTIVE', requirements: { kind: 'QUEST_COUNT', target: 20 } },
  { id: uuid(1101), slug: 'team-first', title: 'Перша спільна справа', description: 'Є хоча б одна підтверджена участь у командній заявці.', icon: 'flag', tier: 'BRONZE', scope: 'TEAM', status: 'ACTIVE', requirements: { kind: 'TEAM_PARTICIPATIONS', target: 1 } },
  { id: uuid(1102), slug: 'team-eco', title: 'Екокоманда', description: 'Три підтверджені екологічні квести.', icon: 'leaf', tier: 'SILVER', scope: 'TEAM', status: 'ACTIVE', requirements: { kind: 'TEAM_CATEGORY_QUESTS', target: 3, category: 'eco' } },
  { id: uuid(1103), slug: 'team-hours', title: '100 годин допомоги', description: 'Разом накопичено 100 підтверджених особистих годин.', icon: 'heart', tier: 'GOLD', scope: 'TEAM', status: 'ACTIVE', requirements: { kind: 'TEAM_HOURS', target: 100 } },
  { id: uuid(1104), slug: 'team-city', title: 'Містотворці', description: 'Два квести міських просторів із підтвердженим командним внеском.', icon: 'sun', tier: 'SILVER', scope: 'TEAM', status: 'ACTIVE', requirements: { kind: 'TEAM_CATEGORY_QUESTS', target: 2, category: 'city' } },
];
