"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSignOut } from "@/components/use-sign-out";
import { useSession } from "@/lib/auth-client";

export default function ProfileSection() {
  const { data: session } = useSession();
  const signOut = useSignOut();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile</CardTitle>
          <CardDescription>How Sora knows you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="font-medium">{session?.user.name ?? "Your name"}</p>
          <p className="text-muted-foreground">{session?.user.email}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Authentication</CardTitle>
          <CardDescription>Your current sign-in</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Signed in with email and password or a linked provider.
          </p>
          <Button variant="outline" onClick={signOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
