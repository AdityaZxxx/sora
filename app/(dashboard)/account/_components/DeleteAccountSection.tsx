"use client";

import { TrashIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import DeleteAccountDialog from "../../manage/_components/DeleteAccountDialog";

export default function DeleteAccountSection() {
  return (
    <Card className="border-destructive/20 transition-all hover:shadow-md">
      <CardHeader>
        <CardTitle className="text-lg text-destructive">
          Delete account
        </CardTitle>
        <CardDescription>
          Permanently delete your sign-in and every wallet where you are the
          last member
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DeleteAccountDialog
          trigger={
            <Button variant="destructive" className="gap-2">
              <TrashIcon className="h-4 w-4" />
              Delete account
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}
