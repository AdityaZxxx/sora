import { z } from "zod";

import { MEMBER_ROLES } from "@/lib/roles";

export const RemoveMemberSchema = z.object({
  userId: z.string().min(1),
});

export type RemoveMemberSchemaType = z.infer<typeof RemoveMemberSchema>;

export const SetEmailDigestSchema = z.object({
  emailDigest: z.boolean(),
});

export type SetEmailDigestSchemaType = z.infer<typeof SetEmailDigestSchema>;

export const SetMemberRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(MEMBER_ROLES),
});

export type SetMemberRoleSchemaType = z.infer<typeof SetMemberRoleSchema>;
