"use client";

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

interface Props {
  theme: string | undefined;
  onEmojiSelect: (emoji: { native: string }) => void;
}

export default function EmojiPicker({ theme, onEmojiSelect }: Props) {
  return <Picker data={data} theme={theme} onEmojiSelect={onEmojiSelect} />;
}
