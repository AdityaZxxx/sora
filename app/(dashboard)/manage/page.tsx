import { type Metadata } from "next";
import { notFound } from "next/navigation";

import { requireHousehold } from "@/lib/household";

import ManagePageClient from "./_components/ManagePageClient";

export const metadata: Metadata = {
  title: "Manage Settings",
  description:
    "Manage your account settings, default currency, and categories.",

  robots: {
    index: false,
    follow: false,
  },
};

export const instant = false;

export default async function ManagePage() {
  const result = await requireHousehold();
  if (!result) {
    notFound();
  }

  return <ManagePageClient household={result.household} />;
}
