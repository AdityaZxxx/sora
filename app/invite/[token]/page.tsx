import { type Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { getInviteByToken } from "@/lib/invite-context";
import prisma from "@/lib/prisma";

import JoinHouseholdCard from "./JoinHouseholdCard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  return {
    title: invite ? `Join ${invite.household.name}` : "Household invite",
    description: invite
      ? `${invite.createdBy.name} invited you to track finances together in ${invite.household.name}.`
      : "This invite link is invalid or has been revoked.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

const InvitePage = async ({
  params,
}: {
  params: Promise<{ token: string }>;
}) => {
  const { token } = await params;
  const session = await getSession();

  const invite = await getInviteByToken(token);

  if (!invite) {
    return <InvalidInviteLink />;
  }

  if (!session) {
    redirect(`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const existingMembership = await prisma.householdMembership.findUnique({
    where: {
      householdId_userId: {
        householdId: invite.householdId,
        userId: session.user.id,
      },
    },
  });

  if (existingMembership) {
    redirect("/");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Logo />
      <JoinHouseholdCard
        token={token}
        householdName={invite.household.name}
        inviterName={invite.createdBy.name}
      />
    </div>
  );
};

export default InvitePage;

const InvalidInviteLink = () => {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Logo />
      <Card className="mt-12 w-[min(400px,calc(100vw-2rem))]">
        <CardHeader>
          <CardTitle className="text-xl">Invite link unavailable</CardTitle>
          <CardDescription>
            This invite link is invalid or has been revoked. Ask a member of the
            household for a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            nativeButton={false}
            render={<Link href="/" />}
          >
            Go to Sora
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
