import { z } from "zod";

import { IdSchema, type IdSchemaType } from "@/schemas/id";
import { freeText } from "@/schemas/text";

export const CreateApiTokenSchema = z.object({
  name: freeText({ min: 1, minMessage: "Enter a name", max: 60 }),
  scope: z.enum(["read-only", "read-write"]),
  walletIds: z.array(z.string().min(1)).min(1, "Select at least one wallet"),
  expiresAt: z.coerce
    .date()
    .refine((date) => date > new Date(), "Pick a future date")
    .optional(),
});

export type CreateApiTokenSchemaType = z.output<typeof CreateApiTokenSchema>;

export const RevokeApiTokenSchema = IdSchema;

export type RevokeApiTokenSchemaType = IdSchemaType;

export const SetAgentAccessSchema = z.object({
  walletId: z.string().min(1),
  enabled: z.boolean(),
});

export type SetAgentAccessSchemaType = z.infer<typeof SetAgentAccessSchema>;
