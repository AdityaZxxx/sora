import type { MemberRole } from "@/lib/roles";

import {
  CO_OWNER_ROLE,
  MEMBER_ROLE,
  OWNER_ROLE,
  VIEWER_ROLE,
} from "@/lib/constants";

export function categoryPermissionNote(role: MemberRole | undefined) {
  if (role === OWNER_ROLE || role === CO_OWNER_ROLE) {
    return "You can rename or delete any category in this wallet.";
  }
  if (role === MEMBER_ROLE) {
    return "You can rename or delete categories you added.";
  }
  if (role === VIEWER_ROLE) {
    return "You can view categories but cannot rename or delete them.";
  }
  return "";
}
