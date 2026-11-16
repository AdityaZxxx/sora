"use client";

import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";

import {
  Baby,
  Banknote,
  Bike,
  BookOpen,
  Briefcase,
  Building2,
  Bus,
  Car,
  Cat,
  Clapperboard,
  Coffee,
  Coins,
  CreditCard,
  Dog,
  Droplet,
  Dumbbell,
  Flower2,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Lightbulb,
  Luggage,
  Music,
  PawPrint,
  Phone,
  PiggyBank,
  Pill,
  Pizza,
  Plane,
  Receipt,
  Shield,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Stethoscope,
  Tag,
  Target,
  Train,
  Trash2,
  TrendingUp,
  Tv,
  Umbrella,
  Users,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import { createElement, useEffect, useState } from "react";

import { lucideKebabForName } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

const DYNAMIC_ICON_IMPORTS: Record<
  string,
  () => Promise<{ default: LucideIcon }>
> = dynamicIconImports;

const LUCIDE_ICONS: Record<string, LucideIcon> = {
  ShoppingCart,
  ShoppingBag,
  Home,
  Building2,
  Car,
  Bus,
  Train,
  Bike,
  Lightbulb,
  Zap,
  Droplet,
  Wifi,
  Smartphone,
  Utensils,
  Coffee,
  Pizza,
  HeartPulse,
  Stethoscope,
  Pill,
  Dumbbell,
  GraduationCap,
  BookOpen,
  Plane,
  Luggage,
  Clapperboard,
  Gamepad2,
  Music,
  Gift,
  Dog,
  Cat,
  PawPrint,
  Receipt,
  CreditCard,
  Wallet,
  Landmark,
  Banknote,
  Coins,
  TrendingUp,
  PiggyBank,
  Target,
  Briefcase,
  Shirt,
  Baby,
  Sparkles,
  Wrench,
  Trash2,
  Flower2,
  Umbrella,
  Shield,
  Phone,
  Tv,
  Users,
};

const dynamicIconCache = new Map<string, LucideIcon>();

function DynamicLucideIcon({
  name,
  className,
  style,
}: {
  name: string;
  className?: string;
  style?: CSSProperties;
}) {
  const [loadedIcon, setLoadedIcon] = useState<{
    name: string;
    Icon: LucideIcon;
  } | null>(() => {
    const cachedIcon = dynamicIconCache.get(name);
    return cachedIcon ? { name, Icon: cachedIcon } : null;
  });

  useEffect(() => {
    if (LUCIDE_ICONS[name] || dynamicIconCache.has(name)) return;

    const kebab = lucideKebabForName(name);
    const loader = kebab ? DYNAMIC_ICON_IMPORTS[kebab] : undefined;
    if (!loader) return;

    let cancelled = false;
    loader()
      .then((module) => {
        dynamicIconCache.set(name, module.default);
        if (!cancelled) setLoadedIcon({ name, Icon: module.default });
        return true;
      })
      .catch(() => {
        dynamicIconCache.set(name, Tag);
        if (!cancelled) setLoadedIcon({ name, Icon: Tag });
      });

    return () => {
      cancelled = true;
    };
  }, [name]);

  const kebab = lucideKebabForName(name);
  const hasLoader = kebab ? Boolean(DYNAMIC_ICON_IMPORTS[kebab]) : false;
  const Icon =
    LUCIDE_ICONS[name] ??
    dynamicIconCache.get(name) ??
    (loadedIcon?.name === name ? loadedIcon.Icon : hasLoader ? null : Tag);

  if (!Icon) {
    return <span aria-hidden="true" className={className} style={style} />;
  }

  return createElement(Icon, {
    "aria-hidden": true,
    className,
    style,
  });
}

interface Props {
  icon: string;
  iconKind?: string | null;
  iconColor?: string | null;
  className?: string;
}

export default function CategoryIcon({
  icon,
  iconKind,
  iconColor,
  className,
}: Props) {
  if (iconKind === "lucide") {
    return (
      <DynamicLucideIcon
        name={icon}
        className={cn(
          "inline-flex size-5 shrink-0 items-center justify-center",
          className,
        )}
        style={iconColor ? { color: iconColor } : undefined}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center leading-none",
        className,
      )}
    >
      {icon}
    </span>
  );
}
