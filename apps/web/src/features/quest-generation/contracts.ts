import { z } from "zod";
import { generationInputSchema } from "./provider";
import { questDraftSchema } from "../organizer/quest-schema";

/** Proposed NestJS proxy contract, NOT an implemented endpoint. */
export const generationEndpoint = "/v1/quest-generations" as const;
export const generationRequestSchema = z.object({
  schemaVersion: z.literal(1),
  input: generationInputSchema,
});
export const generationResponseSchema = z.object({
  schemaVersion: z.literal(1),
  provider: z.enum(["rule-based", "remote-ai"]),
  values: questDraftSchema,
  warnings: z.array(z.string().max(1000)).max(20),
});
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum([
      "UNAUTHENTICATED",
      "NOT_FOUND",
      "INTERNAL_ERROR",
      "FORBIDDEN",
      "VALIDATION_FAILED",
      "CONFLICT",
      "RATE_LIMITED",
      "PROVIDER_UNAVAILABLE",
    ]),
    message: z.string().max(1000),
    requestId: z.string().max(100),
    fields: z.record(z.string(), z.array(z.string())).optional(),
    retryAfterSeconds: z.number().int().nonnegative().optional(),
  }),
});
export type GenerationRequest = z.infer<typeof generationRequestSchema>;
export type GenerationResponse = z.infer<typeof generationResponseSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
