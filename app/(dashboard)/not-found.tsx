import type { Metadata } from "next";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Household not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <Card className="w-[min(400px,calc(100vw-2rem))]">
        <CardHeader>
          <CardTitle className="text-xl">Household not found</CardTitle>
          <CardDescription>
            We could not find this household. The invite link may have expired,
            or you may no longer be a member.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            nativeButton={false}
            render={<Link href="/" />}
          >
            Go to dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
