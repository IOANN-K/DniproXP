import { z } from "zod";
import { generationInputSchema } from "./provider";
import type { GenerationInput } from "./provider";
import type { QuestFormValues } from "../../entities/types";
import { questDraftSchema } from "../organizer/quest-schema";
const schema = z.object({
  version: z.literal(1),
  input: generationInputSchema.extend({
    goal: z.string().max(1000),
    district: z.string().max(80),
  }),
  values: questDraftSchema.nullable(),
  step: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});
export type WizardSnapshot = {
  version: 1;
  input: GenerationInput;
  values: QuestFormValues | null;
  step: 1 | 2 | 3;
};
export const wizardKey = (userId: string) =>
  `dniproxp:quest-wizard:v1:${userId}`;
export function loadWizard(userId: string): WizardSnapshot | null {
  try {
    const result = schema.safeParse(
      JSON.parse(sessionStorage.getItem(wizardKey(userId)) || "null"),
    );
    if (!result.success || (result.data.step > 1 && !result.data.values))
      return null;
    return result.data;
  } catch {
    return null;
  }
}
export function saveWizard(userId: string, value: WizardSnapshot): boolean {
  try {
    sessionStorage.setItem(wizardKey(userId), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function clearWizard(userId: string) {
  try {
    sessionStorage.removeItem(wizardKey(userId));
  } catch {
    /* In-memory work remains usable. */
  }
}
