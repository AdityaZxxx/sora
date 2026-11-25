import dynamicIconImports from "lucide-react/dynamicIconImports";

export const CATEGORY_ICON_KINDS = ["emoji", "lucide"] as const;

export type CategoryIconKind = (typeof CATEGORY_ICON_KINDS)[number];

export const ICON_COLOR_PRESETS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
] as const;

export type CategoryIconColor =
  | (typeof ICON_COLOR_PRESETS)[number]
  | (string & {});

export const CURATED_LUCIDE_ICONS = [
  {
    name: "ShoppingCart",
    label: "Groceries",
    keywords: ["shopping", "cart", "grocery", "food"],
  },
  {
    name: "ShoppingBag",
    label: "Shopping",
    keywords: ["shopping", "bag", "retail"],
  },
  {
    name: "Home",
    label: "Housing",
    keywords: ["home", "rent", "house", "mortgage"],
  },
  {
    name: "Building2",
    label: "Building",
    keywords: ["building", "office", "property", "rent"],
  },
  {
    name: "Car",
    label: "Transport",
    keywords: ["car", "auto", "vehicle", "gas"],
  },
  {
    name: "Bus",
    label: "Public transit",
    keywords: ["bus", "transit", "commute"],
  },
  {
    name: "Train",
    label: "Train",
    keywords: ["train", "rail", "transit", "commute"],
  },
  { name: "Bike", label: "Biking", keywords: ["bike", "bicycle", "cycling"] },
  {
    name: "Lightbulb",
    label: "Utilities",
    keywords: ["electricity", "power", "utility", "light"],
  },
  {
    name: "Zap",
    label: "Electricity",
    keywords: ["electric", "power", "energy", "bill"],
  },
  { name: "Droplet", label: "Water", keywords: ["water", "utility", "bill"] },
  {
    name: "Wifi",
    label: "Internet",
    keywords: ["internet", "wifi", "phone", "broadband"],
  },
  { name: "Smartphone", label: "Phone", keywords: ["phone", "mobile", "cell"] },
  {
    name: "Utensils",
    label: "Dining",
    keywords: ["dining", "restaurant", "food", "dinner"],
  },
  {
    name: "Coffee",
    label: "Coffee",
    keywords: ["coffee", "cafe", "breakfast"],
  },
  {
    name: "Pizza",
    label: "Fast food",
    keywords: ["pizza", "fast food", "takeout"],
  },
  {
    name: "HeartPulse",
    label: "Health",
    keywords: ["health", "medical", "doctor", "wellness"],
  },
  {
    name: "Stethoscope",
    label: "Medical",
    keywords: ["doctor", "medical", "health", "clinic"],
  },
  {
    name: "Pill",
    label: "Pharmacy",
    keywords: ["pharmacy", "medicine", "drug", "pill"],
  },
  {
    name: "Dumbbell",
    label: "Fitness",
    keywords: ["fitness", "gym", "workout", "exercise"],
  },
  {
    name: "GraduationCap",
    label: "Education",
    keywords: ["school", "education", "tuition", "course"],
  },
  {
    name: "BookOpen",
    label: "Education",
    keywords: ["books", "education", "reading", "course"],
  },
  {
    name: "Plane",
    label: "Travel",
    keywords: ["travel", "flight", "vacation", "trip"],
  },
  {
    name: "Luggage",
    label: "Vacation",
    keywords: ["travel", "luggage", "vacation", "trip"],
  },
  {
    name: "Clapperboard",
    label: "Entertainment",
    keywords: ["movies", "entertainment", "cinema", "tv"],
  },
  {
    name: "Gamepad2",
    label: "Games",
    keywords: ["games", "gaming", "entertainment"],
  },
  {
    name: "Music",
    label: "Music",
    keywords: ["music", "concert", "entertainment"],
  },
  { name: "Gift", label: "Gifts", keywords: ["gift", "birthday", "present"] },
  { name: "Dog", label: "Pets", keywords: ["dog", "pet", "animal", "vet"] },
  { name: "Cat", label: "Pets", keywords: ["cat", "pet", "animal", "vet"] },
  { name: "PawPrint", label: "Pets", keywords: ["pet", "animal", "vet"] },
  { name: "Receipt", label: "Bills", keywords: ["bill", "receipt", "invoice"] },
  { name: "CreditCard", label: "Card", keywords: ["card", "credit", "debt"] },
  { name: "Wallet", label: "Wallet", keywords: ["wallet", "cash", "expense"] },
  {
    name: "Landmark",
    label: "Bank",
    keywords: ["bank", "loan", "mortgage", "finance"],
  },
  {
    name: "Banknote",
    label: "Cash",
    keywords: ["cash", "salary", "income", "money"],
  },
  {
    name: "Coins",
    label: "Savings",
    keywords: ["savings", "coins", "cash", "budget"],
  },
  {
    name: "TrendingUp",
    label: "Investing",
    keywords: ["invest", "stocks", "portfolio", "growth"],
  },
  {
    name: "PiggyBank",
    label: "Savings",
    keywords: ["savings", "piggy bank", "emergency fund"],
  },
  { name: "Target", label: "Goal", keywords: ["goal", "target", "saving"] },
  {
    name: "Briefcase",
    label: "Work",
    keywords: ["work", "salary", "job", "income"],
  },
  {
    name: "Shirt",
    label: "Clothing",
    keywords: ["clothes", "shopping", "apparel"],
  },
  {
    name: "Baby",
    label: "Childcare",
    keywords: ["baby", "childcare", "family"],
  },
  {
    name: "Sparkles",
    label: "Wallet",
    keywords: ["cleaning", "wallet", "home"],
  },
  {
    name: "Wrench",
    label: "Repairs",
    keywords: ["repair", "maintenance", "fix"],
  },
  { name: "Trash2", label: "Waste", keywords: ["trash", "waste", "garbage"] },
  {
    name: "Flower2",
    label: "Plants",
    keywords: ["plants", "garden", "flowers"],
  },
  {
    name: "Umbrella",
    label: "Insurance",
    keywords: ["insurance", "rain", "protection"],
  },
  {
    name: "Shield",
    label: "Insurance",
    keywords: ["insurance", "protection", "security"],
  },
  { name: "Phone", label: "Phone", keywords: ["phone", "mobile", "call"] },
  { name: "Tv", label: "TV", keywords: ["tv", "streaming", "subscription"] },
  { name: "Users", label: "People", keywords: ["family", "people", "shared"] },
] as const;

const kebabToPascal = (value: string) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const kebabToLabel = (value: string) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export interface LucideIconMetadata {
  kebab: string;
  name: string;
  label: string;
  keywords: string[];
}

export const ALL_LUCIDE_ICONS: LucideIconMetadata[] = (() => {
  const seen = new Set<string>();
  return Object.keys(dynamicIconImports)
    .map((kebab) => ({
      kebab,
      name: kebabToPascal(kebab),
      label: kebabToLabel(kebab),
      keywords: [
        kebab,
        kebabToPascal(kebab).toLowerCase(),
        ...kebab.split("-"),
      ],
    }))
    .filter((icon) => {
      if (seen.has(icon.name)) return false;
      seen.add(icon.name);
      return true;
    });
})();

export const REST_LUCIDE_ICONS = ALL_LUCIDE_ICONS.filter(
  (icon) => !CURATED_LUCIDE_ICONS.some((curated) => curated.name === icon.name),
);

const lucideIconByName = new Map(
  ALL_LUCIDE_ICONS.map((icon) => [icon.name, icon]),
);
const lucideIconNames = new Set(lucideIconByName.keys());

export function isLucideIconName(name: string): boolean {
  return lucideIconNames.has(name);
}

export function lucideKebabForName(name: string): string | undefined {
  return lucideIconByName.get(name)?.kebab;
}

export function getLucideIconLabel(name: string): string {
  return (
    CURATED_LUCIDE_ICONS.find((icon) => icon.name === name)?.label ??
    lucideIconByName.get(name)?.label ??
    name
  );
}

export type CategoryIconValue = {
  icon: string;
  iconKind: CategoryIconKind;
  iconColor: string | null;
};

export function defaultCategoryIcon(): CategoryIconValue {
  return { icon: "", iconKind: "emoji", iconColor: null };
}

export function withIconKindDefault(
  icon: string,
  iconKind: string | null | undefined,
  iconColor: string | null | undefined,
): CategoryIconValue {
  return {
    icon,
    iconKind: iconKind === "lucide" ? "lucide" : "emoji",
    iconColor: iconKind === "lucide" ? (iconColor ?? null) : null,
  };
}

export function categoryIconLabel(icon: {
  icon: string;
  iconKind?: string | null;
}): string {
  return icon.iconKind === "lucide" ? getLucideIconLabel(icon.icon) : icon.icon;
}

export function categoryIconSnapshot(category: {
  icon: string;
  iconKind: string;
  iconColor: string | null;
}) {
  return {
    categoryIcon: category.icon,
    categoryIconKind: category.iconKind,
    categoryIconColor: category.iconColor,
  };
}
