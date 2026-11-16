"use client";

import type { EmojiDataResolver, EmojiPickerListComponents } from "frimousse";

import {
  defaultEmojiDataResolver,
  EmojiPicker as FrimoussePicker,
} from "frimousse";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

interface Props {
  onEmojiSelect: (emoji: string) => void;
}

const CURATED_EMOJIS = [
  { emoji: "🛒", label: "Groceries" },
  { emoji: "🏠", label: "Housing" },
  { emoji: "🚗", label: "Transport" },
  { emoji: "💡", label: "Utilities" },
  { emoji: "🍽️", label: "Dining" },
  { emoji: "🏥", label: "Health" },
  { emoji: "📱", label: "Phone and internet" },
  { emoji: "🎓", label: "Education" },
  { emoji: "✈️", label: "Travel" },
  { emoji: "🎬", label: "Entertainment" },
  { emoji: "🎁", label: "Gifts" },
  { emoji: "🐶", label: "Pets" },
  { emoji: "💪", label: "Fitness" },
  { emoji: "🧾", label: "Bills" },
  { emoji: "💳", label: "Card" },
  { emoji: "🏦", label: "Bank" },
  { emoji: "💼", label: "Work" },
  { emoji: "💵", label: "Cash" },
  { emoji: "📈", label: "Investing" },
  { emoji: "💰", label: "Savings" },
  { emoji: "🎯", label: "Goal" },
  { emoji: "🧳", label: "Vacation" },
  { emoji: "🚿", label: "Personal care" },
  { emoji: "🧹", label: "Household" },
  { emoji: "🛠️", label: "Repairs" },
  { emoji: "📚", label: "Reading" },
  { emoji: "💊", label: "Pharmacy" },
  { emoji: "🪴", label: "Plants" },
  { emoji: "☕", label: "Coffee" },
  { emoji: "🍔", label: "Fast food" },
  { emoji: "🚌", label: "Public transit" },
  { emoji: "🎮", label: "Games" },
];

const resolveEmojiData: EmojiDataResolver = async (locale, options) => {
  const data = await defaultEmojiDataResolver(locale, options);

  return {
    ...data,
    categories: [
      { index: 0, label: "Suggested" },
      ...data.categories.map((category) => ({
        ...category,
        index: category.index + 1,
      })),
    ],
    emojis: [
      ...CURATED_EMOJIS.map((emoji) => ({
        emoji: emoji.emoji,
        label: emoji.label,
        version: 14,
        category: 0,
        tags: [emoji.label.toLowerCase()],
        aliases: [],
      })),
      ...data.emojis.map((emoji) => ({
        ...emoji,
        category: emoji.category + 1,
      })),
    ],
  };
};

const listComponents: EmojiPickerListComponents = {
  CategoryHeader: ({ category, className, ...props }) => (
    <div
      {...props}
      className={cn(
        "bg-popover px-1 py-1 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      {category.label}
    </div>
  ),
  Row: ({ children, className, ...props }) => (
    <div {...props} className={cn("grid grid-cols-8 gap-1", className)}>
      {children}
    </div>
  ),
  Emoji: ({ emoji, className, ...props }) => (
    <button
      type="button"
      {...props}
      aria-label={emoji.label}
      className={cn(
        "flex size-9 items-center justify-center rounded-md text-xl transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        emoji.isActive && "bg-muted",
        className,
      )}
    >
      {emoji.emoji}
    </button>
  ),
};

export default function EmojiPicker({ onEmojiSelect }: Props) {
  return (
    <FrimoussePicker.Root
      columns={8}
      sticky={false}
      resolveEmojiData={resolveEmojiData}
      onEmojiSelect={(emoji) => onEmojiSelect(emoji.emoji)}
    >
      <div className="flex h-96 w-full flex-col gap-2">
        <div className="relative shrink-0">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <FrimoussePicker.Search
            placeholder="Search all emoji"
            aria-label="Search all emoji"
            className="h-9 w-full rounded-md border border-input bg-transparent pr-2 pl-8 text-sm transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset dark:bg-input/30"
          />
        </div>

        <FrimoussePicker.Viewport className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1">
          <FrimoussePicker.Loading className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading emoji
          </FrimoussePicker.Loading>
          <FrimoussePicker.Empty className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No emoji found
          </FrimoussePicker.Empty>
          <FrimoussePicker.List components={listComponents} />
        </FrimoussePicker.Viewport>
      </div>
    </FrimoussePicker.Root>
  );
}
