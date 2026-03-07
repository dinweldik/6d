import type { OrchestrationEvent, ThreadId } from "@t3tools/contracts";

import { APP_DISPLAY_NAME } from "./branding";

const BROWSER_NOTIFICATION_SERVICE_WORKER_PATH = "/browser-notifications-sw.js";
const BROWSER_NOTIFICATION_ICON_PATH = "/apple-touch-icon.png";
const BROWSER_NOTIFICATION_BADGE_PATH = "/favicon-32x32.png";

export type BrowserNotificationAvailability =
  | NotificationPermission
  | "unsupported"
  | "insecure";

export interface BrowserNotificationDescriptor {
  readonly title: string;
  readonly body: string;
  readonly path: string;
  readonly tag: string;
}

export function getBrowserNotificationAvailability(): BrowserNotificationAvailability {
  if (typeof window === "undefined") {
    return "unsupported";
  }
  if (!("Notification" in window)) {
    return "unsupported";
  }
  if (!window.isSecureContext) {
    return "insecure";
  }
  return Notification.permission;
}

export async function registerBrowserNotificationServiceWorker(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  if (!window.isSecureContext || !("serviceWorker" in navigator)) {
    return;
  }
  await navigator.serviceWorker.register(BROWSER_NOTIFICATION_SERVICE_WORKER_PATH);
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationAvailability> {
  const availability = getBrowserNotificationAvailability();
  if (availability === "unsupported" || availability === "insecure") {
    return availability;
  }
  if (availability === "granted") {
    await registerBrowserNotificationServiceWorker();
    return availability;
  }
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    await registerBrowserNotificationServiceWorker();
  }
  return permission;
}

export function shouldEmitBrowserNotification(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  return document.visibilityState !== "visible" || !document.hasFocus();
}

export function buildBrowserNotificationDescriptor(input: {
  readonly event: OrchestrationEvent;
  readonly threadTitle?: string | null;
}): BrowserNotificationDescriptor | null {
  const threadTitle = input.threadTitle?.trim() || "Current thread";

  switch (input.event.type) {
    case "thread.turn-diff-completed":
      return {
        title:
          input.event.payload.status === "error"
            ? `${APP_DISPLAY_NAME}: Codex finished with errors`
            : `${APP_DISPLAY_NAME}: Codex finished working`,
        body: `${threadTitle} is ready.`,
        path: `/${input.event.payload.threadId}`,
        tag: `thread:${input.event.payload.threadId}:turn-complete`,
      };

    case "thread.activity-appended": {
      const { activity, threadId } = input.event.payload;

      if (activity.kind === "user-input.requested") {
        return {
          title: `${APP_DISPLAY_NAME}: Codex needs your input`,
          body: `${threadTitle}: ${activity.summary}`,
          path: `/${threadId}`,
          tag: `thread:${threadId}:user-input`,
        };
      }

      if (activity.kind === "approval.requested") {
        return {
          title: `${APP_DISPLAY_NAME}: Codex needs approval`,
          body: `${threadTitle}: ${activity.summary}`,
          path: `/${threadId}`,
          tag: `thread:${threadId}:approval`,
        };
      }

      return null;
    }

    default:
      return null;
  }
}

export async function showBrowserNotification(
  descriptor: BrowserNotificationDescriptor,
): Promise<boolean> {
  if (getBrowserNotificationAvailability() !== "granted") {
    return false;
  }

  const options = {
    body: descriptor.body,
    tag: descriptor.tag,
    renotify: true,
    icon: BROWSER_NOTIFICATION_ICON_PATH,
    badge: BROWSER_NOTIFICATION_BADGE_PATH,
    data: {
      path: descriptor.path,
    },
  };

  try {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(descriptor.title, options);
        return true;
      }
    }

    if (typeof window === "undefined") {
      return false;
    }

    const notification = new Notification(descriptor.title, options);
    notification.addEventListener("click", () => {
      window.focus();
      if (window.location.pathname !== descriptor.path) {
        window.location.assign(descriptor.path);
      }
      notification.close();
    });
    return true;
  } catch {
    return false;
  }
}

export function findThreadTitleForNotification(
  threadId: ThreadId,
  threads: ReadonlyArray<{ readonly id: ThreadId; readonly title: string }>,
): string | null {
  return threads.find((thread) => thread.id === threadId)?.title ?? null;
}
