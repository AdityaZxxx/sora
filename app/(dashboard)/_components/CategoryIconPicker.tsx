"use client";

import type { EmojiDataResolver, EmojiPickerListComponents } from "frimousse";

import {
  defaultEmojiDataResolver,
  EmojiPicker as FrimoussePicker,
} from "frimousse";
import { Ban, Check, Search } from "lucide-react";
import { useRef, useState } from "react";

import CategoryIcon from "@/components/CategoryIcon";
import {
  ALL_LUCIDE_ICONS,
  ICON_COLOR_PRESETS,
  defaultCategoryIcon,
  type CategoryIconKind,
  type CategoryIconValue,
} from "@/lib/category-icons";
import { cn } from "@/lib/utils";

import {
  CURATED_EMOJIS,
  VIEWPORT_HEIGHT,
  buildRows,
  iconMatches,
  type IconMetadata,
} from "./category-icon-data";

interface Props extends CategoryIconValue {
  onChange: (value: CategoryIconValue) => void;
}

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

function LucideIconButton({
  icon,
  selected,
  color,
  onSelect,
}: {
  icon: IconMetadata;
  selected: boolean;
  color: string | null;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={icon.label}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex size-9 items-center justify-center rounded-md transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        selected && "bg-muted",
      )}
    >
      <CategoryIcon
        icon={icon.name}
        iconKind="lucide"
        iconColor={color}
        className="size-5"
      />
    </button>
  );
}

export default function CategoryIconPicker({
  icon,
  iconKind,
  iconColor,
  onChange,
}: Props) {
  const [tab, setTab] = useState<CategoryIconKind>(
    iconKind === "lucide" ? "lucide" : "emoji",
  );
  const [iconQuery, setIconQuery] = useState("");
  const [scrollTop, setScrollTop] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);

  const search = iconQuery.trim().toLowerCase();

  const resetScroll = (nextQuery: string) => {
    setIconQuery(nextQuery);
    setScrollTop(0);
    if (viewportRef.current) viewportRef.current.scrollTop = 0;
  };

  const selectedLucide = iconKind === "lucide" ? icon : null;
  const presetColorValues = new Set<string>(ICON_COLOR_PRESETS);
  const isCustomColor =
    iconColor !== null && !presetColorValues.has(iconColor.toLowerCase());
  const searchResults = search
    ? ALL_LUCIDE_ICONS.filter((item) => iconMatches(item, search))
    : null;
  const { rows, totalHeight } = buildRows(searchResults);
  const visibleRows = rows.filter(
    (row) =>
      row.top + row.height >= scrollTop &&
      row.top <= scrollTop + VIEWPORT_HEIGHT,
  );

  const selectLucide = (nextIcon: string) =>
    onChange({
      icon: nextIcon,
      iconKind: "lucide",
      iconColor: iconKind === "lucide" ? iconColor : null,
    });

  return (
    <div className="flex h-96 w-full flex-col gap-2">
      <div
        role="tablist"
        aria-label="Icon type"
        className="grid shrink-0 grid-cols-2 rounded-md bg-muted p-1"
      >
        {(["emoji", "lucide"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "rounded-sm px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              tab === value && "bg-background text-foreground shadow-sm",
            )}
          >
            {value === "emoji" ? "Emoji" : "Lucide icons"}
          </button>
        ))}
      </div>

      {tab === "emoji" ? (
        <FrimoussePicker.Root
          columns={8}
          sticky={false}
          resolveEmojiData={resolveEmojiData}
          className="flex min-h-0 flex-1 flex-col"
          onEmojiSelect={(emoji) =>
            onChange({ ...defaultCategoryIcon(), icon: emoji.emoji })
          }
        >
          <div className="flex min-h-0 flex-1 flex-col gap-2">
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
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="relative shrink-0">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={iconQuery}
              onChange={(event) => resetScroll(event.target.value)}
              placeholder="Search icons"
              aria-label="Search icons"
              className="h-9 w-full rounded-md border border-input bg-transparent pr-2 pl-8 text-sm transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset dark:bg-input/30"
            />
          </div>

          {search && searchResults?.length === 0 ? (
            <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
              No icons found
            </div>
          ) : (
            <div
              ref={viewportRef}
              onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
              className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1"
            >
              <div className="relative" style={{ height: totalHeight }}>
                {visibleRows.map((row) =>
                  row.type === "header" ? (
                    <div
                      key={`header-${row.label}`}
                      className="absolute inset-x-0 flex items-center px-1 text-xs font-medium text-muted-foreground"
                      style={{ top: row.top, height: row.height }}
                    >
                      {row.label}
                    </div>
                  ) : (
                    <div
                      key={`icons-${row.top}`}
                      className="absolute inset-x-0 grid grid-cols-8 gap-1"
                      style={{ top: row.top, height: row.height }}
                    >
                      {row.icons.map((item) => {
                        const selected = selectedLucide === item.name;
                        return (
                          <LucideIconButton
                            key={item.name}
                            icon={item}
                            selected={selected}
                            color={iconColor}
                            onSelect={() => selectLucide(item.name)}
                          />
                        );
                      })}
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {selectedLucide ? (
            <div className="shrink-0 border-t pt-2">
              <div className="mb-2 flex min-w-0 items-center gap-2">
                <CategoryIcon
                  icon={selectedLucide}
                  iconKind="lucide"
                  iconColor={iconColor}
                  className="size-5"
                />
                <span className="truncate text-xs text-muted-foreground">
                  {ALL_LUCIDE_ICONS.find((item) => item.name === selectedLucide)
                    ?.label ?? selectedLucide}
                </span>
              </div>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Icon color"
              >
                <button
                  type="button"
                  aria-label="Use default color"
                  aria-pressed={iconColor === null}
                  onClick={() =>
                    onChange({
                      icon: selectedLucide,
                      iconKind: "lucide",
                      iconColor: null,
                    })
                  }
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    iconColor === null &&
                      "ring-2 ring-ring ring-offset-2 ring-offset-popover",
                  )}
                >
                  <Ban className="size-4 text-foreground" aria-hidden="true" />
                </button>

                <input
                  type="color"
                  value={iconColor ?? "#111111"}
                  onChange={(event) =>
                    onChange({
                      icon: selectedLucide,
                      iconKind: "lucide",
                      iconColor: event.target.value,
                    })
                  }
                  aria-label="Custom icon color"
                  className={cn(
                    "size-6 cursor-pointer appearance-none rounded-full border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-none [&::-webkit-color-swatch]:h-full [&::-webkit-color-swatch]:w-full [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:p-0",
                    isCustomColor &&
                      "ring-2 ring-ring ring-offset-2 ring-offset-popover",
                  )}
                />
                {ICON_COLOR_PRESETS.map((color) => {
                  const selected = iconColor?.toLowerCase() === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Set color ${color}`}
                      aria-pressed={selected}
                      onClick={() =>
                        onChange({
                          icon: selectedLucide,
                          iconKind: "lucide",
                          iconColor: color,
                        })
                      }
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                        selected &&
                          "ring-2 ring-ring ring-offset-2 ring-offset-popover",
                      )}
                      style={{ backgroundColor: color }}
                    >
                      {selected && (
                        <Check
                          className="size-4 text-white"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="shrink-0 border-t pt-2 text-xs text-muted-foreground">
              Pick an icon to choose a color.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
