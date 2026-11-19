"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Error({ retry }: { retry: () => void }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <Card className="w-[min(400px,calc(100vw-2rem))]">
        <CardHeader>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription>
            We could not load this page. Try again, or head back to your
            dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          If the problem keeps happening, check your connection and try once
          more.
        </CardContent>
        <CardFooter className="gap-3">
          <Button type="button" onClick={retry}>
            Try again
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/" />}
          >
            Go to dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
