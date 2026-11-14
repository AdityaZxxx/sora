import { z } from "zod";

import { amountNumber } from "@/schemas/money";
import { freeText } from "@/schemas/text";

export function goalFields(coerced: boolean) {
  return {
    name: freeText({ min: 1, max: 50, minMessage: "Enter a name" }),
    target: amountNumber(coerced),
  };
}

const fields = goalFields(true);

export const CreateGoalSchema = z.object({
  ...fields,
  deadline: z.date().optional(),
});

export type CreateGoalSchemaType = z.output<typeof CreateGoalSchema>;

export const UpdateGoalSchema = z.object({
  id: z.string().min(1),
  name: fields.name.optional(),
  target: fields.target.optional(),
  deadline: z.date().nullish(),
});

export type UpdateGoalSchemaType = z.infer<typeof UpdateGoalSchema>;
