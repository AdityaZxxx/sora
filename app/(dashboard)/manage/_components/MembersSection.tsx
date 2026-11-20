"use client";
import type { listMembers } from "@/lib/members";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Mail, UserMinus } from "lucide-react";
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
import { actionErrorMessage, unwrapAction } from "@/lib/action-client";
import { useSession } from "@/lib/auth-client";
import {
  FULL_MEMBER_ROLE,
  QUERY_STALE_TIME,
  VIEW_ONLY_ROLE,
} from "@/lib/constants";
import { fetchReadJson } from "@/lib/fetch-json";
import { queryKeys } from "@/lib/query-keys";

import { setEmailDigest, setMemberRole } from "../_actions/membership";
import LeaveHouseholdDialog from "./LeaveHouseholdDialog";
import RemoveMemberDialog from "./RemoveMemberDialog";

type Members = Awaited<ReturnType<typeof listMembers>>;

const MembersSection = () => {
  const { data: session } = useSession();

  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: queryKeys.householdMembers,
    queryFn: () =>
      fetchReadJson<Awaited<ReturnType<typeof listMembers>>>(
        "/api/members",
        "Unable to load the members. Refresh the page and try again.",
      ),
    staleTime: QUERY_STALE_TIME,
  });

  const callerRole = members.find(
    (member) => member.user.id === session?.user.id,
  )?.role;
  const canEdit = callerRole !== VIEW_ONLY_ROLE;

  const { mutate: toggleDigest, isPending: isTogglingDigest } = useMutation({
    mutationFn: async (input: Parameters<typeof setEmailDigest>[0]) => {
      return unwrapAction(await setEmailDigest(input));
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.householdMembers,
      });
      const previous = queryClient.getQueryData<Members>(
        queryKeys.householdMembers,
      );
      queryClient.setQueryData<Members>(queryKeys.householdMembers, (current) =>
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
        queryClient.setQueryData(queryKeys.householdMembers, context.previous);
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
        queryKey: queryKeys.householdMembers,
      });
    },
  });

  const { mutate: changeRole } = useMutation({
    mutationFn: async (input: Parameters<typeof setMemberRole>[0]) => {
      return unwrapAction(await setMemberRole(input));
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.householdMembers,
      });
      const previous = queryClient.getQueryData<Members>(
        queryKeys.householdMembers,
      );
      queryClient.setQueryData<Members>(queryKeys.householdMembers, (current) =>
        current?.map((member) =>
          member.userId === input.userId
            ? { ...member, role: input.role }
            : member,
        ),
      );
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.householdMembers, context.previous);
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
        queryKey: queryKeys.householdMembers,
      });
    },
  });

  return (
    <section>
      <Card className="transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Members</CardTitle>
          <CardDescription>
            Full members can add, edit, and remove transactions; view-only
            members follow along
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
                        {member.role === VIEW_ONLY_ROLE && (
                          <Badge variant="secondary">View only</Badge>
                        )}
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
                        {canEdit ? (
                          <Select
                            value={member.role}
                            onValueChange={(role) => {
                              if (
                                (role !== FULL_MEMBER_ROLE &&
                                  role !== VIEW_ONLY_ROLE) ||
                                role === member.role
                              ) {
                                return;
                              }
                              changeRole({
                                userId: member.user.id,
                                role,
                              });
                            }}
                            items={{
                              [FULL_MEMBER_ROLE]: "Full edit",
                              [VIEW_ONLY_ROLE]: "View only",
                            }}
                          >
                            <SelectTrigger
                              className="w-32"
                              aria-label={`Access for ${member.user.name}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={FULL_MEMBER_ROLE}>
                                Full edit
                              </SelectItem>
                              <SelectItem value={VIEW_ONLY_ROLE}>
                                View only
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          member.role === VIEW_ONLY_ROLE && (
                            <Badge variant="secondary">View only</Badge>
                          )
                        )}
                        {canEdit && (
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
                                      aria-label={`Remove ${member.user.name} from household`}
                                    />
                                  }
                                >
                                  <UserMinus />
                                </TooltipTrigger>
                              }
                            />
                            <TooltipContent>
                              Remove {member.user.name} from household
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
        </CardContent>
        <CardFooter>
          {!isLoading && (
            <LeaveHouseholdDialog
              memberCount={members.length}
              trigger={
                <Button
                  variant="outline"
                  className="w-full gap-2 text-destructive hover:text-destructive sm:w-auto"
                >
                  <LogOut className="h-4 w-4" />
                  {members.length === 1
                    ? "Delete this space"
                    : "Leave household"}
                </Button>
              }
            />
          )}
        </CardFooter>
      </Card>
    </section>
  );
};

export default MembersSection;
