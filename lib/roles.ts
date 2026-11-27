import {
  CO_OWNER_ROLE,
  MEMBER_ROLE,
  OWNER_ROLE,
  VIEWER_ROLE,
} from "@/lib/constants";
import { DomainError } from "@/lib/errors";

export type MemberRole =
  | typeof OWNER_ROLE
  | typeof CO_OWNER_ROLE
  | typeof MEMBER_ROLE
  | typeof VIEWER_ROLE;

export const MEMBER_ROLES = [
  OWNER_ROLE,
  CO_OWNER_ROLE,
  MEMBER_ROLE,
  VIEWER_ROLE,
] as const;

export function parseMemberRole(role: string): MemberRole {
  if (role === OWNER_ROLE) return OWNER_ROLE;
  if (role === CO_OWNER_ROLE) return CO_OWNER_ROLE;
  if (role === MEMBER_ROLE) return MEMBER_ROLE;
  return VIEWER_ROLE;
}

export function canWrite(role: MemberRole) {
  return role !== VIEWER_ROLE;
}

export function canManage(role: MemberRole) {
  return role === OWNER_ROLE || role === CO_OWNER_ROLE;
}

export function isOwner(role: MemberRole) {
  return role === OWNER_ROLE;
}

const WRITE_MESSAGE = "Viewers cannot make changes in this wallet";
const MANAGE_MESSAGE =
  "Only an owner or co-owner can change this wallet's settings";
const OWNER_MESSAGE = "Only the owner can do that";

export function assertCanWrite(role: MemberRole, message = WRITE_MESSAGE) {
  if (!canWrite(role)) {
    throw new DomainError(message);
  }
}

export function assertCanManage(role: MemberRole, message = MANAGE_MESSAGE) {
  if (!canManage(role)) {
    throw new DomainError(message);
  }
}

export function assertOwner(role: MemberRole, message = OWNER_MESSAGE) {
  if (!isOwner(role)) {
    throw new DomainError(message);
  }
}

export function assertCanEditEntry(
  role: MemberRole,
  addedById: string,
  callerId: string,
) {
  assertCanWrite(role);
  if (canManage(role)) return;
  if (addedById !== callerId) {
    throw new DomainError("You can only change entries you added");
  }
}

export function roleLabel(role: MemberRole) {
  if (role === OWNER_ROLE) return "Owner";
  if (role === CO_OWNER_ROLE) return "Co-owner";
  if (role === MEMBER_ROLE) return "Member";
  return "Viewer";
}
