"use client";

import { BellRing, Send } from "lucide-react";
import { usePushNotifications } from "@/components/notifications/use-push-notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

const messages = {
  loading: "Checking notification status…",
  unsupported: "This browser does not support push notifications. On iPhone, add OfficeFlow to your Home Screen first.",
  unconfigured: "Push notifications are not configured on the server yet.",
  denied: "Notifications are blocked. Allow them for this site in your browser settings, then reload.",
  off: "Get a push notification for your birthday and when a colleague celebrates theirs.",
  on: "This device will receive birthday wishes and team celebration alerts.",
} as const;

export function NotificationSettingsCard() {
  const { status, busy, enable, disable, sendTest } = usePushNotifications();
  const available = status === "on" || status === "off";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-slate-50/70">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)]">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Push notifications</CardTitle>
              <CardDescription>{messages[status]}</CardDescription>
            </div>
          </div>
          <Switch
            aria-label="Toggle push notifications"
            checked={status === "on"}
            disabled={!available || busy}
            onCheckedChange={(checked) => (checked ? enable() : disable())}
          />
        </div>
      </CardHeader>
      {status === "on" ? (
        <CardContent className="flex items-center justify-between gap-4 p-6">
          <p className="text-sm text-slate-500">Send a test notification to this device.</p>
          <Button disabled={busy} onClick={sendTest} type="button" variant="outline">
            <Send className="h-4 w-4" />
            Send test
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}
