import { z } from "zod";

import { DomainError } from "@/lib/errors";

export const AvatarWriteSchema = z.object({
  userId: z.string().min(1),
  data: z.instanceof(Uint8Array),
  contentType: z.enum(["image/png", "image/jpeg", "image/webp"]),
});

export const AvatarRemoveSchema = z.object({
  userId: z.string().min(1),
});

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"];

function imageContentType(bytes: Uint8Array) {
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return undefined;
}

export async function parseAvatarImage(file: File) {
  if (file.size === 0 || file.size > AVATAR_MAX_BYTES) {
    throw new DomainError("Choose an image smaller than 2 MB");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = imageContentType(bytes);
  if (!contentType) {
    throw new DomainError("Choose a PNG, JPEG or WebP image");
  }

  return { bytes, contentType };
}
