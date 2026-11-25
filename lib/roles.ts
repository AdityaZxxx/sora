import { FULL_MEMBER_ROLE, VIEW_ONLY_ROLE } from "@/lib/constants";
import { DomainError } from "@/lib/errors";

export type MemberRole = typeof FULL_MEMBER_ROLE | typeof VIEW_ONLY_ROLE;

export function parseMemberRole(role: string): MemberRole {
  return role === FULL_MEMBER_ROLE ? FULL_MEMBER_ROLE : VIEW_ONLY_ROLE;
}

export function assertFullMemberRole(
  role: MemberRole,
  message = "View-only members cannot make changes in this wallet",
) {
  if (role !== FULL_MEMBER_ROLE) {
    throw new DomainError(message);
  }
}
