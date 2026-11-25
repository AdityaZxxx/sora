import type { TokenScope } from "@/lib/types";

import {
  assertCanEditEntry as assertRoleCanEditEntry,
  assertCanManage as assertRoleCanManage,
  assertCanWrite as assertRoleCanWrite,
  assertOwner as assertRoleIsOwner,
  type MemberRole,
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

export function assertCallerCanWrite(caller: Caller, message?: string) {
  assertRoleCanWrite(caller.role, message);
}

export function assertCallerCanManage(caller: Caller, message?: string) {
  assertRoleCanManage(caller.role, message);
}

export function assertCallerIsOwner(caller: Caller, message?: string) {
  assertRoleIsOwner(caller.role, message);
}

export function assertCallerCanEditEntry(caller: Caller, addedById: string) {
  assertRoleCanEditEntry(caller.role, addedById, caller.userId);
}
