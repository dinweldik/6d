import { ProjectId, ThreadId } from "@fatma/contracts";
import { useNavigate, useParams, useRouterState } from "@tanstack/react-router";
import { FolderKanbanIcon, MessageSquareTextIcon, SettingsIcon, TerminalSquareIcon } from "lucide-react";
import { useMemo } from "react";

import { isElectron } from "../env";
import { useMobileViewport } from "../mobileViewport";
import { useStore } from "../store";
import { cn } from "../lib/utils";
import { useSidebar } from "./ui/sidebar";

const MOBILE_BOTTOM_NAV_HEIGHT = "5.5rem";

function iconClass(active: boolean): string {
  return active ? "text-foreground" : "text-muted-foreground/72";
}

export function mobileBottomNavHeight(isVisible: boolean): string {
  return isVisible ? MOBILE_BOTTOM_NAV_HEIGHT : "0px";
}

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { setOpenMobile } = useSidebar();
  const mobileViewport = useMobileViewport();
  const projects = useStore((store) => store.projects);
  const threads = useStore((store) => store.threads);
  const routeParams = useParams({
    strict: false,
    select: (params) => ({
      projectId: params.projectId ? ProjectId.makeUnsafe(params.projectId) : null,
      threadId: params.threadId ? ThreadId.makeUnsafe(params.threadId) : null,
    }),
  });

  const activeThread = useMemo(
    () => (routeParams.threadId ? threads.find((thread) => thread.id === routeParams.threadId) : null),
    [routeParams.threadId, threads],
  );
  const activeProjectId = routeParams.projectId ?? activeThread?.projectId ?? projects[0]?.id ?? null;
  const mostRecentThreadIdForActiveProject = useMemo(() => {
    if (!activeProjectId) {
      return threads[0]?.id ?? null;
    }

    return (
      threads
        .filter((thread) => thread.projectId === activeProjectId)
        .toSorted((a, b) => {
          const byDate = Date.parse(b.createdAt) - Date.parse(a.createdAt);
          if (byDate !== 0) return byDate;
          return b.id.localeCompare(a.id);
        })[0]?.id ?? null
    );
  }, [activeProjectId, threads]);
  const showBottomNav = mobileViewport.isMobile && !mobileViewport.isKeyboardOpen && !isElectron;

  if (!showBottomNav) {
    return null;
  }

  const chatIsActive = pathname === "/" || (!pathname.startsWith("/settings") && !pathname.startsWith("/shells/"));
  const shellIsActive = pathname.startsWith("/shells/");
  const settingsIsActive = pathname.startsWith("/settings");
  const canOpenShell = activeProjectId !== null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(var(--safe-area-inset-bottom)+0.65rem)]">
      <nav
        aria-label="Mobile navigation"
        className="pointer-events-auto mx-auto flex max-w-xl items-stretch gap-1.5 rounded-[1.75rem] border border-border/70 bg-background/94 p-2 shadow-[0_18px_40px_rgba(0,0,0,0.16)] backdrop-blur-xl"
      >
        <button
          type="button"
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-[1.2rem] px-2 text-[11px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
          onClick={() => setOpenMobile(true)}
        >
          <FolderKanbanIcon className="size-4 text-muted-foreground/80" />
          <span>Projects</span>
        </button>
        <button
          type="button"
          className={cn(
            "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-[1.2rem] px-2 text-[11px] font-medium transition-colors duration-150 hover:bg-accent hover:text-foreground",
            chatIsActive ? "bg-accent text-foreground" : "text-muted-foreground",
          )}
          onClick={() => {
            if (mostRecentThreadIdForActiveProject) {
              void navigate({
                to: "/$threadId",
                params: { threadId: mostRecentThreadIdForActiveProject },
              });
              return;
            }
            void navigate({ to: "/" });
          }}
        >
          <MessageSquareTextIcon className={cn("size-4", iconClass(chatIsActive))} />
          <span>Chat</span>
        </button>
        <button
          type="button"
          disabled={!canOpenShell}
          className={cn(
            "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-[1.2rem] px-2 text-[11px] font-medium transition-colors duration-150 hover:bg-accent hover:text-foreground disabled:opacity-40",
            shellIsActive ? "bg-accent text-foreground" : "text-muted-foreground",
          )}
          onClick={() => {
            if (!activeProjectId) return;
            void navigate({
              to: "/shells/$projectId",
              params: { projectId: activeProjectId },
            });
          }}
        >
          <TerminalSquareIcon className={cn("size-4", iconClass(shellIsActive))} />
          <span>Shell</span>
        </button>
        <button
          type="button"
          className={cn(
            "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-[1.2rem] px-2 text-[11px] font-medium transition-colors duration-150 hover:bg-accent hover:text-foreground",
            settingsIsActive ? "bg-accent text-foreground" : "text-muted-foreground",
          )}
          onClick={() => {
            void navigate({ to: "/settings" });
          }}
        >
          <SettingsIcon className={cn("size-4", iconClass(settingsIsActive))} />
          <span>Settings</span>
        </button>
      </nav>
    </div>
  );
}
