import { z } from "zod";
export const teamFormSchema = z.object({
  name: z.string().trim().min(3, "Від 3 символів").max(70, "До 70 символів"),
  description: z
    .string()
    .trim()
    .min(30, "Розкажи про команду: від 30 символів")
    .max(1500, "До 1500 символів"),
  category: z.enum([
    "eco",
    "social",
    "animals",
    "culture",
    "education",
    "city",
  ]),
  city: z.literal("Дніпро"),
  avatar: z.enum(["leaf", "heart", "flag", "sun"]),
  coverImage: z.enum([
    "/images/nature.jpg",
    "/images/community.jpg",
    "/images/books.jpg",
    "/images/dogs.jpg",
  ]),
  visibility: z.enum(["PUBLIC", "PRIVATE"]),
  maxMembers: z
    .number()
    .int("Ціле число")
    .min(2, "Від 2 учасників")
    .max(50, "Не більше 50 учасників"),
});
