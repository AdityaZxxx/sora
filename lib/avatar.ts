import {
  AvatarRemoveSchema,
  AvatarWriteSchema,
  parseAvatarImage,
} from "@/lib/avatar-rules";
import { DomainError } from "@/lib/errors";
import prisma from "@/lib/prisma";

export function avatarImageUrl(userId: string, version: number) {
  return `/api/avatars/${encodeURIComponent(userId)}?v=${version}`;
}

export async function saveAvatar(userId: string, file: File) {
  const { bytes, contentType } = await parseAvatarImage(file);
  const parsed = AvatarWriteSchema.safeParse({
    userId,
    data: bytes,
    contentType,
  });
  if (!parsed.success) throw new DomainError("Invalid avatar image");

  const version = Date.now();
  const data = Buffer.from(parsed.data.data);
  const image = avatarImageUrl(parsed.data.userId, version);

  await prisma.$transaction([
    prisma.userAvatar.upsert({
      where: { userId: parsed.data.userId },
      create: {
        userId: parsed.data.userId,
        data,
        contentType: parsed.data.contentType,
      },
      update: { data, contentType: parsed.data.contentType },
    }),
    prisma.user.update({
      where: { id: parsed.data.userId },
      data: { image, hasCustomAvatar: true },
    }),
  ]);
}

export async function removeAvatar(userId: string) {
  const parsed = AvatarRemoveSchema.safeParse({ userId });
  if (!parsed.success) throw new DomainError("Invalid user");

  await prisma.$transaction([
    prisma.userAvatar.deleteMany({ where: { userId: parsed.data.userId } }),
    prisma.user.update({
      where: { id: parsed.data.userId },
      data: { image: null, hasCustomAvatar: false },
    }),
  ]);
}
