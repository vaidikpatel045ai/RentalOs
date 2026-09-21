"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions/notification-actions";
import type { Notification } from "@prisma/client";

export function NotificationBell({ unreadCount, notifications }: { unreadCount: number; notifications: Notification[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onOpenNotification(id: string, isRead: boolean) {
    if (isRead) return;
    startTransition(async () => {
      await markNotificationRead(id);
      router.refresh();
    });
  }

  function onMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-risk-unsafe text-[10px] font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-sm font-medium">Notifications</span>
          {unreadCount > 0 && (
            <button
              type="button"
              disabled={isPending}
              onClick={onMarkAllRead}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                disabled={isPending}
                onClick={() => onOpenNotification(n.id, n.isRead)}
                className="flex w-full flex-col gap-0.5 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-accent"
              >
                <div className="flex items-center gap-2">
                  {!n.isRead && <span className="size-1.5 shrink-0 rounded-full bg-gold" />}
                  <span className="text-sm font-medium">{n.title}</span>
                </div>
                {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(n.createdAt, { addSuffix: true })}</p>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
