import { z } from "zod";
import type { QuestFormValues } from "../../entities/types";
import { questDraftSchema } from "../organizer/quest-schema";

export const generationInputSchema = z.object({
  goal: z
    .string()
    .trim()
    .min(20, "Опиши ідею щонайменше 20 символами")
    .max(1000, "До 1000 символів"),
  categoryId: z.enum([
    "eco",
    "social",
    "animals",
    "culture",
    "education",
    "city",
  ]),
  district: z.string().trim().min(3, "Вкажи район").max(80, "До 80 символів"),
  capacity: z.number().int().min(1).max(500),
  durationHours: z.number().min(0.5).max(12),
});
export type GenerationInput = z.infer<typeof generationInputSchema>;
export type GeneratedQuestDraft = {
  provider: "rule-based" | "remote-ai";
  schemaVersion: 1;
  values: QuestFormValues;
  warnings: string[];
};
export interface QuestGenerationProvider {
  generate(
    input: GenerationInput,
    options?: { signal?: AbortSignal },
  ): Promise<GeneratedQuestDraft>;
}
const templates = {
  eco: {
    title: "Разом подбаємо про зелене місто",
    action:
      "Приберемо погоджену безпечну ділянку та відсортуємо звичайні відходи.",
    image: "/images/nature.jpg",
    safety:
      "Не торкайтеся гострих, медичних або підозрілих предметів. Про небезпеку повідомте координатору.",
  },
  social: {
    title: "Турбота поруч: допоможемо разом",
    action:
      "Підготуємо й відсортуємо погоджені набори допомоги разом із координатором.",
    image: "/images/community.jpg",
    safety:
      "Не публікуйте імена, адреси чи фотографії отримувачів допомоги без їхньої згоди.",
  },
  animals: {
    title: "Добра справа для чотирилапих",
    action:
      "Допоможемо з доглядом за тваринами за правилами відповідальної організації.",
    image: "/images/dogs.jpg",
    safety:
      "Контакт із твариною — лише з дозволу відповідальної особи. Не годуйте тварин без погодження.",
  },
  culture: {
    title: "Бережемо культуру нашого міста",
    action:
      "Допоможемо впорядкувати погоджені матеріали для культурної ініціативи.",
    image: "/images/books.jpg",
    safety:
      "Не змінюйте пам’ятки та не втручайтеся в стан історичних об’єктів без дозволу відповідальної установи.",
  },
  education: {
    title: "Ділимося знаннями й підтримкою",
    action:
      "Підготуємо матеріали та проведемо погоджену освітню зустріч із координатором.",
    image: "/images/books.jpg",
    safety:
      "Участь дітей — лише за правилами організації та з відповідальним дорослим. Не збирайте зайві персональні дані.",
  },
  city: {
    title: "Маленькі зміни у спільному просторі",
    action:
      "Допоможемо впорядкувати погоджену громадську територію без небезпечних робіт.",
    image: "/images/nature.jpg",
    safety:
      "Не працюйте на проїжджій частині, з електрикою чи важкою технікою. Обсяг робіт погоджує координатор.",
  },
} as const;
export function buildRuleBasedDraft(raw: GenerationInput): GeneratedQuestDraft {
  const input = generationInputSchema.parse(raw);
  const t = templates[input.categoryId];
  return {
    provider: "rule-based",
    schemaVersion: 1,
    values: questDraftSchema.parse({
      title: t.title,
      description: t.action,
      fullDescription: `${t.action}\n\nІдея організатора: ${input.goal}\n\nЦе чернетка за шаблоном. Відповідальна особа має перевірити здійсненність і безпеку, погодити місце, дату та конкретні завдання.`,
      categoryId: input.categoryId,
      district: input.district,
      address: "",
      date: "",
      time: "",
      locationId: "",
      capacity: input.capacity,
      durationHours: input.durationHours,
      difficulty: "Легкий",
      xp: 150,
      rewardPoints: 75,
      image: t.image,
      requirements: "Умови участі та вікові обмеження узгоджує організатор.",
      bring: "Вода\nЗручний одяг\nПогоджене з координатором спорядження",
      instructions: `${t.safety}\nДотримуйтеся офіційних вказівок безпеки. Під час повітряної тривоги припиніть роботу та перейдіть до погодженого укриття. Фактичні години й результати фіксуються тільки після виконання.`,
    }),
    warnings: [
      "Локальний rule-based шаблон, не відповідь зовнішньої AI-моделі. Запит нікуди не надсилається.",
      "Дата, час, адреса, координати, партнери й підтверджені результати не вигадуються.",
      "150 XP і 75 бонусних балів — редаговані пропозиції, не нарахування. Перевір умови перед публікацією.",
    ],
  };
}
function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted)
    throw new DOMException("Генерацію скасовано", "AbortError");
}
export const ruleBasedProvider: QuestGenerationProvider = {
  async generate(input, { signal } = {}) {
    checkAbort(signal);
    const draft = buildRuleBasedDraft(input);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", abort);
        resolve();
      }, 350);
      function abort() {
        clearTimeout(timer);
        reject(new DOMException("Генерацію скасовано", "AbortError"));
      }
      signal?.addEventListener("abort", abort, { once: true });
    });
    checkAbort(signal);
    return draft;
  },
};
/** Replace this adapter with a server proxy, not a browser-embedded model key. */
export const questGenerationProvider: QuestGenerationProvider =
  ruleBasedProvider;
