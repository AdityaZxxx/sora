import { CURATED_LUCIDE_ICONS, REST_LUCIDE_ICONS } from "@/lib/category-icons";

export const CURATED_EMOJIS = [
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

export const ICON_COLUMNS = 8;
export const ROW_HEIGHT = 40;
export const HEADER_HEIGHT = 28;
export const VIEWPORT_HEIGHT = 320;

const SUGGESTED_ICONS = CURATED_LUCIDE_ICONS.map((icon) => ({
  name: icon.name,
  label: icon.label,
  keywords: [...icon.keywords],
}));

export type IconMetadata = {
  name: string;
  label: string;
  keywords: string[];
};

export type VirtualRow =
  | { type: "header"; label: string; top: number; height: number }
  | { type: "icons"; icons: IconMetadata[]; top: number; height: number };

function chunkIcons(items: IconMetadata[], size: number) {
  const rows: IconMetadata[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

export function buildRows(searchResults: IconMetadata[] | null): {
  rows: VirtualRow[];
  totalHeight: number;
} {
  const rows: VirtualRow[] = [];
  let top = 0;
  const pushHeader = (label: string) => {
    rows.push({ type: "header", label, top, height: HEADER_HEIGHT });
    top += HEADER_HEIGHT;
  };
  const pushIconRows = (items: IconMetadata[]) => {
    for (const icons of chunkIcons(items, ICON_COLUMNS)) {
      rows.push({ type: "icons", icons, top, height: ROW_HEIGHT });
      top += ROW_HEIGHT;
    }
  };

  if (searchResults) {
    pushIconRows(searchResults);
    return { rows, totalHeight: top };
  }

  pushHeader("Suggested");
  pushIconRows(SUGGESTED_ICONS);
  pushHeader("All icons");
  pushIconRows(REST_LUCIDE_ICONS);

  return { rows, totalHeight: top };
}

export function iconMatches(icon: IconMetadata, query: string) {
  return [icon.name, icon.label, ...icon.keywords]
    .join(" ")
    .toLowerCase()
    .includes(query);
}
