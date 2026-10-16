import { z } from "zod";
import { categories } from "../../mocks/data";
export const questDraftSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Щонайменше 3 символи")
    .max(100, "До 100 символів"),
  description: z.string().trim().max(240, "До 240 символів"),
  fullDescription: z.string().trim().max(5000, "До 5000 символів"),
  categoryId: z.string(),
  district: z.string().trim().max(80, "До 80 символів"),
  address: z.string().trim().max(200, "До 200 символів"),
  date: z.string(),
  time: z.string(),
  capacity: z
    .number({ error: "Вкажи число" })
    .int("Потрібне ціле число")
    .min(1, "Щонайменше 1 учасник")
    .max(500, "Не більше 500"),
  difficulty: z.enum(["Легкий", "Середній", "Складний"]),
  xp: z
    .number({ error: "Вкажи число" })
    .int("Потрібне ціле число")
    .min(10, "Мінімум 10 XP")
    .max(1000, "Максимум 1000 XP"),
  rewardPoints: z
    .number({ error: "Вкажи число" })
    .int("Потрібне ціле число")
    .min(0, "Не менше нуля")
    .max(500, "Максимум 500 балів"),
  image: z
    .string()
    .refine(
      (v) =>
        [
          "/images/community.jpg",
          "/images/nature.jpg",
          "/images/dogs.jpg",
          "/images/books.jpg",
        ].includes(v),
      "Обери фото з бібліотеки",
    ),
  requirements: z.string().max(2000, "До 2000 символів"),
  bring: z.string().max(2000, "До 2000 символів"),
  instructions: z.string().max(3000, "До 3000 символів"),
  durationHours: z
    .number({ error: "Вкажи тривалість" })
    .min(0.5, "Щонайменше пів години")
    .max(12, "Не більше 12 годин"),
  locationId: z
    .string()
    .refine(
      (v) => ["", "quest-4", "quest-7", "quest-20"].includes(v),
      "Обери доступну територію",
    ),
});
export const questPublishSchema = questDraftSchema.superRefine((v, ctx) => {
  const add = (path: keyof typeof v, message: string) =>
    ctx.addIssue({ code: "custom", path: [path], message });
  if (v.title.length < 8)
    add("title", "Для публікації потрібно щонайменше 8 символів");
  if (v.description.length < 20)
    add("description", "Опиши квест щонайменше 20 символами");
  if (v.fullDescription.length < 60)
    add("fullDescription", "Повний опис — щонайменше 60 символів");
  if (!categories.some((c) => c.id === v.categoryId))
    add("categoryId", "Обери категорію");
  if (v.district.length < 3) add("district", "Вкажи район");
  if (v.address.length < 5) add("address", "Вкажи локацію");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(v.date) ||
    !Number.isFinite(Date.parse(v.date))
  )
    add("date", "Обери коректну дату");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v.time)) add("time", "Обери час");
  if (v.instructions.trim().length < 20)
    add("instructions", "Інструкція — щонайменше 20 символів");
});
