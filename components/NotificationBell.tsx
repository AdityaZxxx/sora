"use client";
import type { Notification } from "@prisma/client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { markAllRead } from "@/app/(dashboard)/_actions/notifications";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useHydrated } from "@/hooks/use-hydrated";
import { actionErrorMessage, unwrapAction } from "@/lib/action-client";
import { POLL_INTERVAL, UNUSUAL_SPENDING_TYPE } from "@/lib/constants";
import { fetchReadJson } from "@/lib/fetch-json";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const NotificationBell = () => {
  const queryClient = useQueryClient();
  const hydrated = useHydrated();
  const seenIdsRef = useRef<Set<string> | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const { data } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () =>
      fetchReadJson<Notification[]>(
        "/api/notifications",
        "Unable to load the notifications. Refresh the page and try again.",
      ),
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });
  const notifications = data ?? [];

  useEffect(() => {
    if (!data) return;
    const currentIds = new Set(data.map((notification) => notification.id));
    const previousIds = seenIdsRef.current;
    seenIdsRef.current = currentIds;
    if (previousIds === null) return;
    const fresh = data.filter(
      (notification) => !previousIds.has(notification.id),
    );
    if (fresh.length === 0) return;
    const message =
      fresh.length === 1
        ? `New notification: ${fresh[0].message}`
        : `${fresh.length} new notifications`;
    setAnnouncement("");
    const timer = setTimeout(() => setAnnouncement(message), 50);
    return () => clearTimeout(timer);
  }, [data]);

  const unreadCount = notifications.filter(
    (notification) => !notification.readAt,
  ).length;
  const shownUnreadCount = hydrated ? unreadCount : 0;
  const hasUnreadWarning = notifications.some(
    (notification) =>
      !notification.readAt && notification.type === UNUSUAL_SPENDING_TYPE,
  );

  const { mutate: markRead, isPending } = useMutation({
    mutationFn: async () => {
      return unwrapAction(await markAllRead());
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications });
      const previous = queryClient.getQueryData<Notification[]>(
        queryKeys.notifications,
      );
      const readAt = new Date();
      queryClient.setQueryData<Notification[]>(
        queryKeys.notifications,
        (current) =>
          current?.map((notification) => ({
            ...notification,
            readAt: notification.readAt ?? readAt,
          })),
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.notifications, context.previous);
      }
      toast.error(
        actionErrorMessage(
          error,
          "Unable to mark the notifications as read. Refresh the page and try again.",
        ),
        {
          id: "mark-all-read",
        },
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      <Tooltip>
        <DropdownMenu>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    aria-label="Notifications"
                  />
                }
              />
            }
          >
            <Bell />
            {unreadCount > 0 && (
              <span
                className={cn(
                  "absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white",
                  hasUnreadWarning ? "bg-amber-500" : "bg-destructive",
                )}
              >
                {shownUnreadCount > 9 ? "9+" : shownUnreadCount}
              </span>
            )}
          </TooltipTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[22rem] max-w-[calc(100vw-2rem)]"
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="p-0">
                  Notifications
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuItem
                disabled={isPending || unreadCount === 0}
                onClick={() => markRead()}
                className="gap-1.5 px-1.5 text-xs"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No notifications yet
              </p>
            ) : (
              <ScrollArea viewportClassName="max-h-80 pr-3">
                {notifications.map((notification) => {
                  const isWarning = notification.type === UNUSUAL_SPENDING_TYPE;
                  const isUnread = !notification.readAt;
                  const relativeTime = formatDistanceToNow(
                    new Date(notification.createdAt),
                    { addSuffix: true },
                  );
                  const rowClass = cn(
                    "flex items-start gap-2 px-2 py-2 whitespace-normal",
                    isUnread &&
                      (isWarning ? "bg-amber-500/10" : "bg-accent/50"),
                  );
                  const icon = isWarning ? (
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-500/15"
                    >
                      <TriangleAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    </span>
                  ) : null;
                  const content = (
                    <>
                      <p
                        className={cn(
                          "text-sm break-words",
                          isUnread && "font-medium",
                        )}
                      >
                        {notification.message}
                      </p>
                      <time
                        dateTime={notification.createdAt.toISOString()}
                        className="text-xs text-muted-foreground"
                      >
                        {relativeTime}
                      </time>
                    </>
                  );
                  return isUnread ? (
                    <DropdownMenuItem
                      key={notification.id}
                      onClick={() => markRead()}
                      disabled={isPending}
                      className={rowClass}
                      aria-label={`${notification.message}, ${relativeTime}. Activate to mark all notifications as read.`}
                    >
                      {icon}
                      <div className="flex min-w-0 flex-col gap-0.5">
                        {content}
                      </div>
                    </DropdownMenuItem>
                  ) : (
                    <div key={notification.id} className={rowClass}>
                      {icon}
                      <div className="flex min-w-0 flex-col gap-0.5">
                        {content}
                      </div>
                    </div>
                  );
                })}
              </ScrollArea>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <TooltipContent>Notifications</TooltipContent>
      </Tooltip>
    </>
  );
};

export default NotificationBell;
