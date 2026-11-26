"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { House, Loader2, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallets } from "@/hooks/use-wallets";
import { actionErrorMessage, unwrapAction } from "@/lib/action-client";
import { DEFAULT_WALLET_NAME } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";

import { renameWallet } from "../_actions/wallets";

const WalletSection = ({ canEdit }: { canEdit: boolean }) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const walletsQuery = useWallets();
  const active = walletsQuery.data?.wallets.find(
    (wallet) => wallet.id === walletsQuery.data?.active.id,
  );
  const displayName = active?.name ?? DEFAULT_WALLET_NAME;

  const { mutate: rename, isPending } = useMutation({
    mutationFn: async () => {
      return unwrapAction(await renameWallet(name));
    },
    onSuccess: () => {
      toast.success("Space renamed", {
        id: "rename-wallet",
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.wallets,
      });
      setOpen(false);
    },
    onError: (error) => {
      toast.error(
        actionErrorMessage(
          error,
          "Unable to rename this space. Check the name and try again.",
        ),
        {
          id: "rename-wallet",
        },
      );
    },
  });

  return (
    <section>
      <Card className="transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Your space</CardTitle>
          <CardDescription>
            Rename the space where you keep your money
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <House className="h-4 w-4 shrink-0 text-muted-foreground" />
              {walletsQuery.isLoading ? (
                <Skeleton className="h-5 w-32" />
              ) : (
                <span className="text-sm font-medium break-words">
                  {displayName}
                </span>
              )}
            </span>
            {canEdit && (
              <Dialog
                open={open}
                onOpenChange={(next) => {
                  setOpen(next);
                  if (next) {
                    setName(active?.name ?? "");
                  }
                }}
              >
                <DialogTrigger
                  render={
                    <Button variant="outline" size="sm" className="gap-2" />
                  }
                >
                  <Pencil className="h-4 w-4" />
                  Rename
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Rename your space</DialogTitle>
                  </DialogHeader>
                  <Field>
                    <FieldLabel htmlFor="wallet-rename">Name</FieldLabel>
                    <Input
                      id="wallet-rename"
                      value={name}
                      maxLength={50}
                      placeholder="e.g. Family, Flat 12"
                      onChange={(event) => setName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !isPending) {
                          rename();
                        }
                      }}
                    />
                  </Field>
                  <DialogFooter>
                    <DialogClose
                      render={<Button variant="secondary" type="button" />}
                    >
                      Cancel
                    </DialogClose>
                    <Button
                      onClick={() => rename()}
                      disabled={isPending}
                      className="gap-2"
                    >
                      {!isPending && "Save"}
                      {isPending && <Loader2 className="animate-spin" />}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default WalletSection;
