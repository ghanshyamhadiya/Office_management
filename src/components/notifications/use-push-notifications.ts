"use client";

import * as React from "react";
import { toast } from "sonner";

export type PushStatus = "loading" | "unsupported" | "unconfigured" | "denied" | "off" | "on";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function postJson(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  if (!response.ok) throw new Error(payload?.message || `Request failed with status ${response.status}`);
  return payload;
}

function isSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function getRegistration() {
  return (await navigator.serviceWorker.getRegistration("/")) ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export function usePushNotifications() {
  const [status, setStatus] = React.useState<PushStatus>("loading");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isSupported()) return "unsupported" as const;
      if (!publicKey) return "unconfigured" as const;
      if (Notification.permission === "denied") return "denied" as const;
      const registration = await getRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return "off" as const;
      // Re-sync so the subscription follows whoever is signed in on this browser.
      await postJson("/api/push/subscribe", "POST", subscription.toJSON()).catch(() => undefined);
      return "on" as const;
    })()
      .then((next) => !cancelled && setStatus(next))
      .catch(() => !cancelled && setStatus("off"));
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = React.useCallback(async () => {
    if (!isSupported() || !publicKey) return false;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        toast.error(permission === "denied" ? "Notifications are blocked in your browser settings." : "Notification permission was dismissed.");
        return false;
      }
      const registration = await getRegistration();
      await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
      await postJson("/api/push/subscribe", "POST", subscription.toJSON());
      setStatus("on");
      toast.success("Notifications enabled.");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not enable notifications.");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = React.useCallback(async () => {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await postJson("/api/push/subscribe", "DELETE", { endpoint: subscription.endpoint }).catch(() => undefined);
        await subscription.unsubscribe();
      }
      setStatus("off");
      toast.success("Notifications disabled.");
    } finally {
      setBusy(false);
    }
  }, []);

  const sendTest = React.useCallback(async () => {
    setBusy(true);
    try {
      const payload = await postJson("/api/push/test", "POST");
      toast.success(payload?.message ?? "Test notification sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send test notification.");
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, enable, disable, sendTest };
}
