import { z } from "zod";

export const IdSchema = z.object({
  id: z.string().min(1, "Id is required"),
});

export type IdSchemaType = z.infer<typeof IdSchema>;
