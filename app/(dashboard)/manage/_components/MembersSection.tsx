"use client";
import type { listMembers } from "@/lib/members";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Mail, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCallerRole, useFormerMembers } from "@/hooks/use-members";
import { actionErrorMessage, unwrapAction } from "@/lib/action-client";
import { useSession } from "@/lib/auth-client";
import {
  CO_OWNER_ROLE,
  MEMBER_ROLE,
  OWNER_ROLE,
  QUERY_STALE_TIME,
  VIEWER_ROLE,
} from "@/lib/constants";
import { fetchReadJson } from "@/lib/fetch-json";
import { queryKeys } from "@/lib/query-keys";
import { MEMBER_ROLES, parseMemberRole, roleLabel } from "@/lib/roles";

import {
  leaveWalletAction,
  setEmailDigest,
  setMemberRole,
} from "../_actions/membership";
import LeaveWalletDialog from "./LeaveWalletDialog";
import RemoveMemberDialog from "./RemoveMemberDialog";

type Members = Awaited<ReturnType<typeof listMembers>>;

const MembersSection = () => {
  const { data: session } = useSession();

  const queryClient = useQueryClient();
  const router = useRouter();

  const formerMembersQuery = useFormerMembers();

  const { data: members = [], isLoading } = useQuery({
    queryKey: queryKeys.walletMembers,
    queryFn: () =>
      fetchReadJson<Awaited<ReturnType<typeof listMembers>>>(
        "/api/members",
        "Unable to load the members. Refresh the page and try again.",
      ),
    staleTime: QUERY_STALE_TIME,
  });

  const { role: callerRole, canManage, isOwner } = useCallerRole();
  const [transferTarget, setTransferTarget] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [ownerLeaveOpen, setOwnerLeaveOpen] = useState(false);

  const { mutate: toggleDigest, isPending: isTogglingDigest } = useMutation({
    mutationFn: async (input: Parameters<typeof setEmailDigest>[0]) => {
      return unwrapAction(await setEmailDigest(input));
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.walletMembers,
      });
      const previous = queryClient.getQueryData<Members>(
        queryKeys.walletMembers,
      );
      queryClient.setQueryData<Members>(queryKeys.walletMembers, (current) =>
        current?.map((member) =>
          member.user.id === session?.user.id
            ? { ...member, emailDigest: input.emailDigest }
            : member,
        ),
      );
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.walletMembers, context.previous);
      }
      toast.error(
        actionErrorMessage(
          error,
          "Unable to update the email digest. Try again.",
        ),
        {
          id: "email-digest",
        },
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.walletMembers,
      });
    },
  });

  const { mutate: leave } = useMutation({
    mutationFn: async () => unwrapAction(await leaveWalletAction()),
    onSuccess: () => {
      queryClient.invalidateQueries();
      router.push("/");
    },
    onError: () => toast.error("Unable to leave the wallet. Try again."),
  });

  const { mutate: changeRole } = useMutation({
    mutationFn: async (input: Parameters<typeof setMemberRole>[0]) => {
      return unwrapAction(await setMemberRole(input));
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.walletMembers,
      });
      const previous = queryClient.getQueryData<Members>(
        queryKeys.walletMembers,
      );
      queryClient.setQueryData<Members>(queryKeys.walletMembers, (current) =>
        current?.map((member) => {
          if (member.userId === input.userId) {
            return { ...member, role: input.role };
          }
          if (input.role === OWNER_ROLE && member.userId === session?.user.id) {
            return { ...member, role: CO_OWNER_ROLE };
          }
          return member;
        }),
      );
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.walletMembers, context.previous);
      }
      toast.error(
        actionErrorMessage(
          error,
          "Unable to change this member's access. Try again.",
        ),
        {
          id: "member-role",
        },
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.walletMembers,
      });
    },
  });

  return (
    <section>
      <Card className="transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Members</CardTitle>
          <CardDescription>
            Owners and co-owners invite and remove members. Only the owner can
            change roles. Viewers read without writing.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="divide-y">
              {members.map((member) => {
                const isSelf = member.user.id === session?.user.id;
                const initials = member.user.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <div
                    key={member.userId}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.user.image ?? undefined} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {member.user.name}
                          {isSelf ? " (you)" : ""}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {member.user.email}
                        </p>
                      </div>
                    </div>
                    {isSelf ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="secondary">{member.role}</Badge>
                        <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="hidden text-xs whitespace-nowrap text-muted-foreground sm:inline">
                          Email digest
                        </span>
                        <Switch
                          checked={member.emailDigest}
                          disabled={isTogglingDigest}
                          onCheckedChange={(checked) =>
                            toggleDigest({ emailDigest: checked })
                          }
                          aria-label="Toggle daily email digest"
                        />
                      </div>
                    ) : (
                      <div className="flex shrink-0 items-center gap-2">
                        {isOwner ? (
                          <Select
                            value={member.role}
                            onValueChange={(role) => {
                              if (
                                !role ||
                                role === member.role ||
                                !MEMBER_ROLES.some(
                                  (allowed) => allowed === role,
                                )
                              ) {
                                return;
                              }
                              if (
                                role === OWNER_ROLE &&
                                member.role === CO_OWNER_ROLE
                              ) {
                                setTransferTarget({
                                  userId: member.user.id,
                                  name: member.user.name,
                                });
                                return;
                              }
                              changeRole({
                                userId: member.user.id,
                                role: parseMemberRole(role),
                              });
                            }}
                            items={{
                              [OWNER_ROLE]: roleLabel(OWNER_ROLE),
                              [CO_OWNER_ROLE]: roleLabel(CO_OWNER_ROLE),
                              [MEMBER_ROLE]: roleLabel(MEMBER_ROLE),
                              [VIEWER_ROLE]: roleLabel(VIEWER_ROLE),
                            }}
                          >
                            <SelectTrigger
                              className="w-32"
                              aria-label={`Access for ${member.user.name}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {member.role === CO_OWNER_ROLE && (
                                <SelectItem value={OWNER_ROLE}>
                                  Owner (transfer)
                                </SelectItem>
                              )}
                              <SelectItem value={CO_OWNER_ROLE}>
                                {roleLabel(CO_OWNER_ROLE)}
                              </SelectItem>
                              <SelectItem value={MEMBER_ROLE}>
                                {roleLabel(MEMBER_ROLE)}
                              </SelectItem>
                              <SelectItem value={VIEWER_ROLE}>
                                {roleLabel(VIEWER_ROLE)}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary">
                            {roleLabel(parseMemberRole(member.role))}
                          </Badge>
                        )}
                        {canManage &&
                          member.role !== OWNER_ROLE &&
                          (member.role !== CO_OWNER_ROLE || isOwner) && (
                            <Tooltip>
                              <RemoveMemberDialog
                                member={member}
                                trigger={
                                  <TooltipTrigger
                                    render={
                                      <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        className="text-destructive hover:bg-destructive/10"
                                        aria-label={`Remove ${member.user.name} from wallet`}
                                      />
                                    }
                                  >
                                    <UserMinus />
                                  </TooltipTrigger>
                                }
                              />
                              <TooltipContent>
                                Remove {member.user.name} from wallet
                              </TooltipContent>
                            </Tooltip>
                          )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {formerMembersQuery.data && formerMembersQuery.data.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <p className="pb-2 text-xs font-medium text-muted-foreground">
                Past members
              </p>
              {formerMembersQuery.data.map((member) => (
                <p
                  key={member.userId}
                  className="py-1 text-sm text-muted-foreground"
                >
                  {member.user.name} left this wallet
                </p>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter>
          {!isLoading &&
            (callerRole === OWNER_ROLE ? (
              <Button
                variant="outline"
                className="w-full gap-2 text-destructive hover:text-destructive sm:w-auto"
                onClick={() => setOwnerLeaveOpen(true)}
              >
                <LogOut className="h-4 w-4" />
                Leave wallet
              </Button>
            ) : (
              <LeaveWalletDialog
                memberCount={members.length}
                trigger={
                  <Button
                    variant="outline"
                    className="w-full gap-2 text-destructive hover:text-destructive sm:w-auto"
                  >
                    <LogOut className="h-4 w-4" />
                    {members.length === 1
                      ? "Delete this space"
                      : "Leave wallet"}
                  </Button>
                }
              />
            ))}
        </CardFooter>
      </Card>

      <Dialog
        open={transferTarget !== null}
        onOpenChange={(open) => {
          if (!open) setTransferTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make {transferTarget?.name} the owner?</DialogTitle>
            <DialogDescription>
              You will become a co-owner. The change takes effect immediately
              and cannot be undone from this screen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              onClick={() => {
                if (!transferTarget) return;
                changeRole(
                  { userId: transferTarget.userId, role: OWNER_ROLE },
                  { onSuccess: () => setTransferTarget(null) },
                );
              }}
            >
              Transfer ownership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ownerLeaveOpen} onOpenChange={setOwnerLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer ownership before leaving</DialogTitle>
            <DialogDescription>
              Choose a co-owner to become the new owner. You will become a
              co-owner and can then leave.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {members.filter((member) => member.role === CO_OWNER_ROLE)
              .length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Appoint a co-owner in the role list first, then come back here
                to leave.
              </p>
            ) : (
              members
                .filter((member) => member.role === CO_OWNER_ROLE)
                .map((member) => (
                  <Button
                    key={member.userId}
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => {
                      changeRole(
                        { userId: member.userId, role: OWNER_ROLE },
                        {
                          onSuccess: () => {
                            setOwnerLeaveOpen(false);
                            leave();
                          },
                        },
                      );
                    }}
                  >
                    <span>Make {member.user.name} owner</span>
                    <LogOut className="h-4 w-4" />
                  </Button>
                ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default MembersSection;
