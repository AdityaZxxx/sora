import type { TokenScope } from "@/lib/types";

import { assertFullMemberRole, type MemberRole } from "@/lib/roles";

export type Caller = {
  householdId: string;
  userId: string;
  role: MemberRole;
  scope: TokenScope;
  actorName: string;
};

export type Actor = {
  actorId: string;
  actorName: string;
};

export function actorFor(caller: Caller): Actor {
  return { actorId: caller.userId, actorName: caller.actorName };
}

export function assertCallerFullMember(caller: Caller, message?: string) {
  assertFullMemberRole(caller.role, message);
}
