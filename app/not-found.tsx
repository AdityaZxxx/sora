import type { Metadata } from "next";

import Link from "next/link";

import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Logo />
      <Card className="mt-12 w-[min(400px,calc(100vw-2rem))]">
        <CardHeader>
          <CardTitle className="text-xl">Page not found</CardTitle>
          <CardDescription>
            We could not find that page. The link may be out of date, or the
            invite may have expired.
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
}
