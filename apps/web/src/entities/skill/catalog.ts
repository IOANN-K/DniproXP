import type { SkillCategory, SkillDefinition } from "./types";
export const skillCategories: { id: SkillCategory; name: string }[] = [
  { id: "eco", name: "Екологія" },
  { id: "social", name: "Соціальна допомога" },
  { id: "events", name: "Організація заходів" },
  { id: "education", name: "Освіта" },
  { id: "communication", name: "Комунікація" },
  { id: "leadership", name: "Лідерство" },
  { id: "logistics", name: "Логістика" },
  { id: "digital", name: "Цифрове волонтерство" },
];
const branches: {
  category: SkillCategory;
  icon: SkillDefinition["icon"];
  categories: string[];
  names: [string, string];
  team?: boolean;
}[] = [
  {
    category: "eco",
    icon: "leaf",
    categories: ["eco"],
    names: ["Турбота про довкілля", "Екологічні практики"],
  },
  {
    category: "social",
    icon: "heart",
    categories: ["social", "animals"],
    names: ["Уважна допомога", "Підтримка спільноти"],
  },
  {
    category: "events",
    icon: "calendar",
    categories: ["city", "culture"],
    names: ["Спільна подія", "Координація ініціатив"],
  },
  {
    category: "education",
    icon: "book",
    categories: ["education"],
    names: ["Обмін знаннями", "Наставництво"],
  },
  {
    category: "communication",
    icon: "message",
    categories: ["social", "culture", "education"],
    names: ["Діалог із сусідами", "Модерація спільноти"],
  },
  {
    category: "leadership",
    icon: "flag",
    categories: ["eco", "social", "animals", "city", "culture", "education"],
    names: ["Командна відповідальність", "Лідерство через дії"],
    team: true,
  },
  {
    category: "logistics",
    icon: "package",
    categories: ["social", "eco", "city"],
    names: ["Організація ресурсів", "Логістика допомоги"],
  },
  {
    category: "digital",
    icon: "code",
    categories: ["education", "culture"],
    names: ["Цифрова підтримка", "Цифрові ініціативи"],
  },
];
export const skillDefinitions: SkillDefinition[] = branches.flatMap((b) =>
  b.names.map((name, i) => ({
    id: `${b.category}-${i + 1}`,
    name,
    description:
      i === 0
        ? "Компетенція зростає завдяки підтвердженим практичним справам у відповідних напрямах."
        : "Наступний крок спеціалізації. Попередній досвід зберігається, але рівень відкривається після базової навички.",
    category: b.category,
    icon: b.icon,
    levelThresholds: [0, 40, 120, 260, 480],
    prerequisiteSkillIds: i ? [`${b.category}-1`] : [],
    prerequisites: i
      ? [{ skillId: `${b.category}-1`, minLevel: 1 as const }]
      : [],
    eligibleQuestCategories: b.categories,
    experienceRules: {
      baseXp: i ? 15 : 20,
      xpPerHour: 10,
      requiresTeam: !!b.team,
    },
  })),
);
