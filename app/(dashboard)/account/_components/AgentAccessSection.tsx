"use client";

import type { ApiTokenSummary } from "@/lib/api-token";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, TrashIcon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useWallets } from "@/hooks/use-wallets";
import { unwrapAction } from "@/lib/action-client";
import { QUERY_STALE_TIME, READ_WRITE_SCOPE } from "@/lib/constants";
import { fetchReadJson } from "@/lib/fetch-json";
import { queryKeys } from "@/lib/query-keys";
import { parseMemberRole, canWrite, canManage } from "@/lib/roles";

import {
  createApiTokenForm,
  revokeApiTokenForm,
  setAgentAccessForm,
} from "../_actions/api-tokens";

export default function AgentAccessSection() {
  const queryClient = useQueryClient();
  const walletsQuery = useWallets();
  const rolesQuery = useQuery<Record<string, string>>({
    queryKey: ["walletRoles"],
    queryFn: () =>
      fetchReadJson<Record<string, string>>(
        "/api/account/wallet-roles",
        "Unable to load wallet roles. Refresh the page and try again.",
      ),
    staleTime: QUERY_STALE_TIME,
    refetchOnWindowFocus: true,
  });
  const tokensQuery = useQuery<ApiTokenSummary[]>({
    queryKey: queryKeys.apiTokens,
    queryFn: () =>
      fetchReadJson<ApiTokenSummary[]>(
        "/api/account/api-tokens",
        "Unable to load tokens. Refresh the page and try again.",
      ),
    staleTime: QUERY_STALE_TIME,
    refetchOnWindowFocus: true,
  });

  const [name, setName] = useState("");
  const [scope, setScope] = useState("read-only");
  const [walletIds, setWalletIds] = useState<string[]>([]);
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  const wallets = walletsQuery.data?.wallets ?? [];
  const roleByWallet = new Map(
    Object.entries(rolesQuery.data ?? {}).map(([walletId, role]) => [
      walletId,
      parseMemberRole(role),
    ]),
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      const result = await unwrapAction(
        await createApiTokenForm({
          name,
          scope: scope as "read-only" | "read-write",
          walletIds,
        }),
      );
      return result;
    },
    onSuccess: (result) => {
      setCreatedToken(result.token);
      setName("");
      setWalletIds([]);
      void queryClient.invalidateQueries({ queryKey: queryKeys.apiTokens });
      toast.success("Token created. Copy it now.");
    },
    onError: () =>
      toast.error("Unable to create the token. Check the details."),
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) =>
      unwrapAction(await revokeApiTokenForm({ id })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.apiTokens });
      toast.success("Token revoked");
    },
    onError: () => toast.error("Unable to revoke the token."),
  });

  const toggleMutation = useMutation({
    mutationFn: async (input: { walletId: string; enabled: boolean }) =>
      unwrapAction(await setAgentAccessForm(input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wallets });
    },
    onError: () => toast.error("Unable to change agent access."),
  });

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Agent access</CardTitle>
          <CardDescription>
            Turn agent access on for each wallet you want an assistant or script
            to use. Tokens are user owned and list the wallets they may reach.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <span className="text-sm font-medium">
                {wallet.name ?? "Personal wallet"}
              </span>
              <Switch
                checked={wallet.agentAccessEnabled ?? false}
                disabled={!canManage(roleByWallet.get(wallet.id) ?? "viewer")}
                onCheckedChange={(enabled) =>
                  toggleMutation.mutate({ walletId: wallet.id, enabled })
                }
                aria-label={`Agent access for ${wallet.name ?? "personal wallet"}`}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create a token</CardTitle>
          <CardDescription>
            Pick the wallets this token may reach. Read and write is limited by
            your current role in each wallet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-sm">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Token name"
              aria-label="Token name"
            />
          </div>
          <Select
            value={scope}
            onValueChange={(value) => {
              if (value) setScope(value);
            }}
            items={{ "read-only": "Read only", "read-write": "Read and write" }}
          >
            <SelectTrigger className="max-w-sm" aria-label="Token scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="read-only">Read only</SelectItem>
              <SelectItem value="read-write">Read and write</SelectItem>
            </SelectContent>
          </Select>
          <div className="space-y-2">
            {wallets.map((wallet) => (
              <label
                key={wallet.id}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={walletIds.includes(wallet.id)}
                  onChange={(event) =>
                    setWalletIds((current) =>
                      event.target.checked
                        ? [...current, wallet.id]
                        : current.filter((id) => id !== wallet.id),
                    )
                  }
                />
                {wallet.name ?? "Personal wallet"}
              </label>
            ))}
          </div>
          <Button
            disabled={
              !name.trim() || walletIds.length === 0 || createMutation.isPending
            }
            onClick={() => createMutation.mutate()}
            className="gap-2"
          >
            {createMutation.isPending ? (
              <Loader2 className="animate-spin" />
            ) : null}
            Create token
          </Button>
          {createdToken && (
            <p className="rounded-lg border bg-muted p-3 text-sm break-all">
              Copy this token now. It will not be shown again: {createdToken}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your tokens</CardTitle>
          <CardDescription>
            Effective access follows your current role in each wallet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(tokensQuery.data ?? []).map((token) => {
            const revoked = token.revokedAt !== null;
            return (
              <div key={token.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{token.name}</span>
                  {!revoked && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Revoke ${token.name}`}
                      onClick={() => revokeMutation.mutate(token.id)}
                    >
                      <TrashIcon />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {revoked
                    ? "Revoked"
                    : token.wallets
                        .map((entry) => {
                          const role = roleByWallet.get(entry.wallet.id);
                          const effective =
                            token.scope === READ_WRITE_SCOPE &&
                            role &&
                            canWrite(role) &&
                            entry.wallet.agentAccessEnabled
                              ? "read-write"
                              : "read-only";
                          return `${entry.wallet.name ?? "Personal wallet"}: ${effective}`;
                        })
                        .join(", ")}
                </p>
              </div>
            );
          })}
          {tokensQuery.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No tokens yet.</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
