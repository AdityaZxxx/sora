import type { TokenScope } from "@/lib/types";

import { DomainError } from "@/lib/errors";
import {
  assertCanEditEntry as assertRoleCanEditEntry,
  assertCanManage as assertRoleCanManage,
  assertCanWrite as assertRoleCanWrite,
  assertOwner as assertRoleIsOwner,
  type MemberRole,
  tokenAllowsWrite,
} from "@/lib/roles";

export type Caller = {
  walletId: string;
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

function assertTokenAllowsWrite(caller: Caller) {
  if (!tokenAllowsWrite(caller.scope)) {
    throw new DomainError("This token is read-only");
  }
}

export function assertCallerCanWrite(caller: Caller, message?: string) {
  assertTokenAllowsWrite(caller);
  assertRoleCanWrite(caller.role, message);
}

export function assertCallerCanManage(caller: Caller, message?: string) {
  assertTokenAllowsWrite(caller);
  assertRoleCanManage(caller.role, message);
}

export function assertCallerIsOwner(caller: Caller, message?: string) {
  assertTokenAllowsWrite(caller);
  assertRoleIsOwner(caller.role, message);
}

export function assertCallerCanEditEntry(caller: Caller, addedById: string) {
  assertTokenAllowsWrite(caller);
  assertRoleCanEditEntry(caller.role, addedById, caller.userId);
}

export function assertCallerCanEditCategory(
  caller: Caller,
  createdById: string | null,
) {
  assertTokenAllowsWrite(caller);
  assertRoleCanEditEntry(
    caller.role,
    createdById,
    caller.userId,
    "You can only rename or delete categories you added",
  );
}
