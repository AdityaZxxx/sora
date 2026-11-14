import { z } from "zod";

import { Currencies } from "@/lib/currencies";
export const UpdateUserCurrencySchema = z.object({
  currency: z
    .string()
    .refine(
      (value) => Currencies.some((c) => c.value === value),
      "That currency is not supported. Choose one from the list.",
    ),
});
