import { type Metadata } from "next";

import AccountSettingsClient from "./_components/AccountSettingsClient";

export const metadata: Metadata = {
  title: "Account Settings",
  description: "Your profile, authentication, appearance and agent access.",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return <AccountSettingsClient />;
}
