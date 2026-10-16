import { z } from 'zod';
import { QuestCategory, QuestDifficulty } from '../quests/domain.js';

const plain = (max: number, min = 0) => z.string().trim().min(min).max(max)
  .refine(s => !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(s), 'Use plain text');
export const districts = ['Амур-Нижньодніпровський','Індустріальний','Новокодацький','Самарський','Соборний','Центральний','Чечелівський','Шевченківський'] as const;
export const generationInputSchema = z.object({
  goal: plain(1000,20), categoryId: z.enum(QuestCategory), district: z.enum(districts),
  capacity: z.number().int().min(1).max(500), durationHours: z.number().min(0.5).max(12),
  interests: z.array(plain(80,1)).max(10).optional(), difficulty: z.enum(QuestDifficulty).optional(),
  participation: z.enum(['individual','team']).optional(), accessibility: z.array(plain(120,1)).max(8).optional(),
}).strict();
export type GenerationInput = z.infer<typeof generationInputSchema>;
export const requestSchema = z.object({ schemaVersion: z.literal(1), input: generationInputSchema,
  count: z.number().int().min(1).max(3).optional(), organizationId: z.uuid().optional() }).strict();
export type GenerationRequest = z.infer<typeof requestSchema>;
const lines = z.array(plain(160,1)).min(1).max(8);
export const generatedPayloadSchema = z.object({
  title: plain(100,8), shortDescription: plain(240,20), description: plain(3000,60),
  category: z.enum(QuestCategory), suggestedDistrict: z.enum(districts),
  estimatedDuration: z.number().min(0.5).max(12), difficulty: z.enum(QuestDifficulty),
  requiredVolunteers: z.number().int().min(1).max(500), checklist: lines, requirements: lines,
  impactIntent: plain(300,20), safetyNotes: lines, uncertaintyNotes: lines,
}).strict();
export type GeneratedPayload = z.infer<typeof generatedPayloadSchema>;
export const providerOutputSchema = z.object({ suggestions: z.array(generatedPayloadSchema).min(1).max(3) }).strict();
export const providerEnvelopeSchema = z.object({ choices: z.array(z.object({
  finish_reason: z.string().nullable().optional(), message: z.object({ content: z.string().max(150000) }),
})).min(1).max(10) });
export const generatedJsonSchema = z.toJSONSchema(providerOutputSchema);
export function validateOutput(value: unknown, input: GenerationInput, count: number): GeneratedPayload[] {
  const parsed = providerOutputSchema.parse(value);
  if (parsed.suggestions.length !== count || parsed.suggestions.some(s => s.category !== input.categoryId ||
    s.suggestedDistrict !== input.district || s.estimatedDuration !== input.durationHours || s.requiredVolunteers !== input.capacity ||
    (input.difficulty !== undefined && s.difficulty !== input.difficulty))) throw new Error('Output does not match requested constraints');
  return parsed.suggestions;
}
/** Reward amounts and all unverifiable facts are server policy, never model output. */
export function draftValues(payload: GeneratedPayload, input: GenerationInput) {
  return {
    title: payload.title, description: payload.shortDescription,
    fullDescription: `${payload.description}\n\nОчікуваний намір, не підтверджений результат: ${payload.impactIntent}`,
    categoryId: payload.category, district: payload.suggestedDistrict, address: '', date: '', time: '', locationId: '',
    capacity: payload.requiredVolunteers, durationHours: payload.estimatedDuration, difficulty: payload.difficulty,
    xp: 150, rewardPoints: 75,
    image: payload.category === QuestCategory.ECO || payload.category === QuestCategory.CITY ? '/images/nature.jpg' : payload.category === QuestCategory.ANIMALS ? '/images/dogs.jpg' : payload.category === QuestCategory.CULTURE || payload.category === QuestCategory.EDUCATION ? '/images/books.jpg' : '/images/community.jpg',
    requirements: payload.requirements.join('\n'), bring: '',
    instructions: [...payload.checklist,...payload.safetyNotes,'Під час повітряної тривоги припиніть роботу та дотримуйтеся офіційних вказівок безпеки.'].join('\n'),
    allowTeamParticipation: input.participation === 'team',
    ...(input.participation === 'team' ? { teamParticipantLimit: Math.min(50,input.capacity) } : {}),
  };
}
export const aiWarnings = [
  'Ідея створена AI й потребує перевірки організатором. Це не підтвердження здійсненності або безпеки.',
  'Адреса, дата, координати, партнери та результати не підтверджені. Узгодьте їх перед публікацією.',
  '150 XP і 75 балів — серверні параметри чернетки; генерація нічого не нараховує.',
];
