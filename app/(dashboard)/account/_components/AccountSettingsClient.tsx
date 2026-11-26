"use client";

import AccountSection from "../../manage/_components/AccountSection";
import AppearanceSection from "../../manage/_components/AppearanceSection";
import AgentAccessSection from "./AgentAccessSection";
import DeleteAccountSection from "./DeleteAccountSection";
import ProfileSection from "./ProfileSection";

export default function AccountSettingsClient() {
  return (
    <div className="min-h-screen bg-background">
      <header className="container pt-6">
        <div className="rounded-xl border bg-card px-6 py-8">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">
              Account settings
            </h1>
            <p className="text-muted-foreground">
              Your profile, sign-in, appearance and agent access
            </p>
          </div>
        </div>
      </header>
      <main className="container space-y-6 py-8">
        <ProfileSection />
        <AccountSection />
        <AppearanceSection />
        <AgentAccessSection />
        <DeleteAccountSection />
      </main>
    </div>
  );
}
