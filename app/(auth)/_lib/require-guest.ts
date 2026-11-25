import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";

export const requireGuest = async (next?: string | string[]) => {
  const destination = safeNext(next);

  if (await getSession()) {
    redirect(destination ?? "/");
  }

  return destination;
};
