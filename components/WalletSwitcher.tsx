"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, House, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useWallets, type WalletsResponse } from "@/hooks/use-wallets";
import { DEFAULT_WALLET_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

import {
  createWallet,
  switchWallet,
} from "../app/(dashboard)/manage/_actions/wallets";

type WalletLabelInput = Pick<
  WalletsResponse["wallets"][number],
  "name" | "isPersonal" | "memberCount"
>;

function labelFor(wallet: WalletLabelInput) {
  return wallet.isPersonal && wallet.memberCount === 1
    ? "Personal wallet"
    : (wallet.name ?? DEFAULT_WALLET_NAME);
}

interface WalletSwitcherProps {
  variant?: "default" | "row";
}

export default function WalletSwitcher({
  variant = "default",
}: WalletSwitcherProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [, startSwitchTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");

  const walletsQuery = useWallets();

  const wallets = walletsQuery.data?.wallets ?? [];
  const activeId = walletsQuery.data?.active.id;
  const active = wallets.find((wallet) => wallet.id === activeId);
  const { mutate: switchTo, isPending: isSwitching } = useMutation({
    mutationFn: switchWallet,
    onSuccess: () => {
      startSwitchTransition(async () => {
        await queryClient.invalidateQueries();
        router.refresh();
      });
    },
    onError: () => {
      toast.error("Unable to switch wallet. Try again.", {
        id: "switch-wallet",
      });
    },
  });

  const { mutate: create, isPending: isCreating } = useMutation({
    mutationFn: () => createWallet(name),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setCreateOpen(false);
      setName("");
      router.push("/");
      router.refresh();
    },
    onError: () => {
      toast.error("Unable to create wallet. Try again.", {
        id: "create-wallet",
      });
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            variant === "row" ? (
              <Button
                variant="ghost"
                className="h-16 w-full justify-start gap-3 px-3 font-normal"
                aria-label="Switch wallet"
              />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                aria-label="Switch wallet"
              />
            )
          }
        >
          {variant === "row" ? (
            <>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <House className="h-4 w-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                <span className="truncate text-sm leading-5 font-medium">
                  {active ? labelFor(active) : "Wallet"}
                </span>
                {active && (
                  <span className="text-xs leading-4 text-muted-foreground">
                    {active.memberCount}{" "}
                    {active.memberCount === 1 ? "member" : "members"}
                  </span>
                )}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </>
          ) : (
            <>
              <House className="h-4 w-4" />
              <span className="max-w-32 truncate">
                {active ? labelFor(active) : "Wallet"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Wallets</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {wallets.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Loading…</p>
          ) : (
            wallets.map((wallet) => (
              <DropdownMenuItem
                key={wallet.id}
                disabled={isSwitching || wallet.id === activeId}
                onClick={() => switchTo(wallet.id)}
                aria-current={wallet.id === activeId ? "true" : undefined}
                className={cn(
                  "gap-2",
                  wallet.id === activeId &&
                    "bg-accent text-accent-foreground data-disabled:opacity-100",
                )}
              >
                <span className="min-w-0 flex-1 truncate">
                  {labelFor(wallet)}
                </span>
                <span
                  className={cn(
                    "text-xs text-muted-foreground tabular-nums",
                    wallet.id === activeId && "text-accent-foreground/70",
                  )}
                >
                  {wallet.memberCount}
                </span>
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setCreateOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New wallet
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add wallet</DialogTitle>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="wallet-name">Name</FieldLabel>
            <Input
              id="wallet-name"
              maxLength={50}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Family, Flat 12"
              onKeyDown={(event) => {
                if (event.key === "Enter" && name.trim() && !isCreating) {
                  create();
                }
              }}
            />
          </Field>
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" className="w-auto" />
              }
            >
              Cancel
            </DialogClose>
            <Button
              disabled={isCreating || !name.trim()}
              onClick={() => create()}
              className="w-auto"
            >
              {isCreating ? <Loader2 className="animate-spin" /> : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
