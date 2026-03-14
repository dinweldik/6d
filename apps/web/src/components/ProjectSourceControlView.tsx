import { cn } from "../lib/utils";
import { useMobileViewport } from "../mobileViewport";
import type { Project } from "../types";
import GitActionsControl from "./GitActionsControl";
import ProjectBranchSelector from "./ProjectBranchSelector";

export default function ProjectSourceControlView({
  gitCwd,
  project,
}: {
  gitCwd: string;
  project: Project;
}) {
  const mobileViewport = useMobileViewport();

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground",
        mobileViewport.isMobile &&
          "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0))]",
      )}
    >
      <header className="shrink-0 border-b border-border/70 bg-background/78 px-3 py-3 backdrop-blur-xl sm:px-5 sm:py-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground/60 uppercase">
            Source Control
          </p>
          <h1 className="mt-1 truncate text-base font-semibold sm:text-lg">{project.name}</h1>
          <p className="truncate text-xs text-muted-foreground/70 sm:text-sm">{gitCwd}</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
        <div
          className={cn(
            "mx-auto flex min-h-0 w-full flex-col",
            !mobileViewport.isMobile && "max-w-5xl",
          )}
        >
          <section className="mb-4 rounded-xl border border-border/70 bg-background/70 p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  Branch
                </p>
                <p className="text-sm text-muted-foreground">
                  This checkout applies to the whole project. Every thread uses it on the next turn.
                </p>
              </div>
              <ProjectBranchSelector projectId={project.id} cwd={gitCwd} />
            </div>
          </section>
          <GitActionsControl presentation="inline" gitCwd={gitCwd} projectName={project.name} />
        </div>
      </div>
    </div>
  );
}
