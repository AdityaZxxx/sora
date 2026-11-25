import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { guestRoutes } from "@/lib/routes";
import { safeNext } from "@/lib/safe-next";

export const requireGuest = async (next?: string | string[]) => {
  const destination = safeNext(next, guestRoutes);

  if (await getSession()) {
    redirect(destination ?? "/");
  }

  return destination;
};
