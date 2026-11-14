import { z } from "zod";

import { freeText } from "@/schemas/text";

export const CreateApiTokenSchema = z.object({
  name: freeText({ min: 1, minMessage: "Enter a name", max: 60 }),
  scope: z.enum(["read-only", "read-write"]),
  expiresAt: z.coerce
    .date()
    .refine((date) => date > new Date(), "Pick a future date")
    .optional(),
});

export type CreateApiTokenSchemaType = z.output<typeof CreateApiTokenSchema>;

export const RevokeApiTokenSchema = z.object({
  id: z.string().min(1),
});

export type RevokeApiTokenSchemaType = z.infer<typeof RevokeApiTokenSchema>;

export const SetAgentAccessSchema = z.object({
  enabled: z.boolean(),
});

export type SetAgentAccessSchemaType = z.infer<typeof SetAgentAccessSchema>;
