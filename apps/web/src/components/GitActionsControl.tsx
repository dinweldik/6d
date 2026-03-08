import { FileDiff } from "@pierre/diffs/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  GitFileChangeStatus,
  GitReadWorkingTreeFileDiffResult,
  GitStatusResult,
} from "@t3tools/contracts";
import { ChevronDownIcon, FileIcon, FolderIcon } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { useMediaQuery } from "../hooks/useMediaQuery";
import {
  gitBranchesQueryOptions,
  gitInitMutationOptions,
  gitStatusQueryOptions,
  gitWorkingTreeFileDiffQueryOptions,
} from "../lib/gitReactQuery";
import { resolveDiffThemeName } from "../lib/diffRendering";
import {
  buildFileDiffRenderKey,
  DIFF_SURFACE_UNSAFE_CSS,
  getRenderablePatch,
} from "../lib/diffPatch";
import { cn } from "../lib/utils";
import { basenameOfPath, getVscodeIconUrlForEntry } from "../vscode-icons";
import { Button } from "./ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "./ui/popover";
import { Sheet, SheetPopup, SheetTrigger } from "./ui/sheet";

interface GitActionsControlProps {
  gitCwd: string | null;
  projectName?: string;
}

function dirnameOfPath(pathValue: string): string | null {
  const lastSlashIndex = Math.max(pathValue.lastIndexOf("/"), pathValue.lastIndexOf("\\"));
  if (lastSlashIndex <= 0) {
    return null;
  }
  return pathValue.slice(0, lastSlashIndex);
}

function resolveRepositoryLabel(gitCwd: string, projectName?: string): string {
  if (projectName && projectName.trim().length > 0) {
    return projectName;
  }
  return basenameOfPath(gitCwd.replace(/[/\\]+$/, ""));
}

function statusLetter(status: GitFileChangeStatus): string {
  if (status === "added") return "A";
  if (status === "deleted") return "D";
  if (status === "renamed") return "R";
  if (status === "copied") return "C";
  if (status === "untracked") return "U";
  if (status === "type_changed") return "T";
  if (status === "unmerged") return "!";
  return "M";
}

function statusClassName(status: GitFileChangeStatus): string {
  if (status === "added" || status === "untracked") {
    return "text-emerald-600 dark:text-emerald-300/90";
  }
  if (status === "deleted") {
    return "text-red-600 dark:text-red-300/90";
  }
  if (status === "renamed" || status === "copied") {
    return "text-sky-600 dark:text-sky-300/90";
  }
  if (status === "unmerged") {
    return "text-amber-600 dark:text-amber-300/90";
  }
  return "text-amber-700 dark:text-amber-200/90";
}

function statusLabel(status: GitFileChangeStatus): string {
  if (status === "added") return "Added";
  if (status === "deleted") return "Deleted";
  if (status === "renamed") return "Renamed";
  if (status === "copied") return "Copied";
  if (status === "untracked") return "Untracked";
  if (status === "type_changed") return "Type changed";
  if (status === "unmerged") return "Unmerged";
  return "Modified";
}

function BranchDelta({
  aheadCount,
  behindCount,
}: {
  aheadCount: number;
  behindCount: number;
}) {
  if (aheadCount <= 0 && behindCount <= 0) {
    return <span className="text-muted-foreground/70">In sync</span>;
  }

  return (
    <>
      {behindCount > 0 && <span className="text-muted-foreground">-{behindCount}</span>}
      {aheadCount > 0 && <span className="text-foreground">+{aheadCount}</span>}
    </>
  );
}

function SourceControlPanel({
  gitCwd,
  projectName,
  isRepo,
  isLoadingRepoState,
  isLoadingStatus,
  initPending,
  onInitializeGit,
  branchListError,
  gitStatus,
  gitStatusError,
  resolvedTheme,
  selectedFilePath,
  onSelectFile,
  selectedFileDiffQuery,
}: {
  gitCwd: string;
  projectName?: string;
  isRepo: boolean | null;
  isLoadingRepoState: boolean;
  isLoadingStatus: boolean;
  initPending: boolean;
  onInitializeGit: () => void;
  branchListError: string | null;
  gitStatus:
    | GitStatusResult
    | null;
  gitStatusError: string | null;
  resolvedTheme: "light" | "dark";
  selectedFilePath: string | null;
  onSelectFile: (path: string) => void;
  selectedFileDiffQuery: {
    data: GitReadWorkingTreeFileDiffResult | undefined;
    error: unknown;
    isLoading: boolean;
    isFetching: boolean;
  };
}) {
  const deferredPatch = useDeferredValue(selectedFileDiffQuery.data?.diff);
  const selectedRenderablePatch = useMemo(
    () =>
      getRenderablePatch(
        deferredPatch,
        `working-tree:${gitCwd}:${selectedFilePath ?? "none"}:${resolvedTheme}`,
      ),
    [deferredPatch, gitCwd, resolvedTheme, selectedFilePath],
  );
  const selectedFiles = useMemo(
    () => (selectedRenderablePatch?.kind === "files" ? selectedRenderablePatch.files : []),
    [selectedRenderablePatch],
  );
  const selectedFile = useMemo(
    () => gitStatus?.workingTree.files.find((file) => file.path === selectedFilePath) ?? null,
    [gitStatus?.workingTree.files, selectedFilePath],
  );
  const repositoryLabel = resolveRepositoryLabel(gitCwd, projectName);
  const selectedFileDiffError =
    selectedFileDiffQuery.error instanceof Error
      ? selectedFileDiffQuery.error.message
      : selectedFileDiffQuery.error
        ? "Unable to load file diff."
        : null;

  return (
    <div className="flex max-h-[min(82vh,52rem)] min-h-0 min-w-0 w-full flex-col gap-4">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          Source Control
        </p>
        <p className="text-sm text-muted-foreground">
          Review the current repository state and inspect changed files inline.
        </p>
      </div>

      {isLoadingRepoState ? (
        <div className="rounded-xl border border-border/70 bg-background/70 px-4 py-5 text-sm text-muted-foreground">
          Loading repository status...
        </div>
      ) : isRepo === false ? (
        <div className="rounded-xl border border-border/70 bg-background/70 p-4">
          <div className="space-y-2">
            <p className="font-medium text-foreground">This project is not a git repository.</p>
            <p className="text-sm text-muted-foreground">
              Initialize git here to start tracking changes from the source control panel.
            </p>
            <Button size="sm" variant="outline" disabled={initPending} onClick={onInitializeGit}>
              {initPending ? "Initializing..." : "Initialize Git"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Repository
              </p>
              {gitStatus ? (
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <BranchDelta aheadCount={gitStatus.aheadCount} behindCount={gitStatus.behindCount} />
                </div>
              ) : null}
            </div>
            <div className="rounded-xl border border-border/70 bg-background/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-card">
                    <FolderIcon className="size-4 text-foreground/80" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{repositoryLabel}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {gitStatus?.branch ?? "Detached HEAD"}
                      {gitStatus?.hasWorkingTreeChanges ? " *" : ""}
                    </p>
                  </div>
                </div>
                {gitStatus?.pr ? (
                  <span className="rounded-full border border-border/70 bg-card px-2 py-0.5 text-[11px] text-muted-foreground">
                    PR {gitStatus.pr.state}
                  </span>
                ) : null}
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Changes
              </p>
              {gitStatus ? (
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {gitStatus.workingTree.files.length}
                  </span>
                  <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-300/90">
                    +{gitStatus.workingTree.insertions}
                  </span>
                  <span className="font-mono text-[11px] text-red-600 dark:text-red-300/90">
                    -{gitStatus.workingTree.deletions}
                  </span>
                </div>
              ) : null}
            </div>

            {isLoadingStatus ? (
              <div className="rounded-xl border border-border/70 bg-background/70 px-4 py-5 text-sm text-muted-foreground">
                Loading changed files...
              </div>
            ) : !gitStatus || gitStatus.workingTree.files.length === 0 ? (
              <div className="rounded-xl border border-border/70 bg-background/70 px-4 py-5 text-sm text-muted-foreground">
                Working tree clean.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border/70 bg-background/70">
                <div className="max-h-72 overflow-y-auto p-1">
                  {gitStatus.workingTree.files.map((file) => {
                    const selected = file.path === selectedFilePath;
                    const iconUrl = getVscodeIconUrlForEntry(file.path, "file", resolvedTheme);
                    const directory = dirnameOfPath(file.path);

                    return (
                      <button
                        key={file.path}
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                          selected
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/50 text-foreground",
                        )}
                        onClick={() => onSelectFile(file.path)}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <img
                            src={iconUrl}
                            alt=""
                            className="size-4 shrink-0"
                            loading="lazy"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{basenameOfPath(file.path)}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {directory ?? statusLabel(file.status)}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span
                            className={cn(
                              "w-4 text-center font-semibold text-xs",
                              statusClassName(file.status),
                            )}
                          >
                            {statusLetter(file.status)}
                          </span>
                          <span className="min-w-18 text-right font-mono text-[11px] text-muted-foreground">
                            <span className="text-emerald-600 dark:text-emerald-300/90">
                              +{file.insertions}
                            </span>
                            <span className="mx-1 text-muted-foreground/60">/</span>
                            <span className="text-red-600 dark:text-red-300/90">
                              -{file.deletions}
                            </span>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {selectedFile ? (
            <section className="min-h-0 flex-1 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  Diff Preview
                </p>
                <button
                  type="button"
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => onSelectFile(selectedFile.path)}
                >
                  Collapse
                </button>
              </div>
              <div className="min-h-0 overflow-hidden rounded-xl border border-border/70 bg-card">
                <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background">
                      <FileIcon className="size-4 text-foreground/80" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{selectedFile.path}</p>
                      <p className={cn("text-xs", statusClassName(selectedFile.status))}>
                        {statusLabel(selectedFile.status)}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right font-mono text-sm">
                    <span className="text-red-600 dark:text-red-300/90">
                      -{selectedFile.deletions}
                    </span>
                    <span className="mx-2 text-muted-foreground/60" />
                    <span className="text-emerald-600 dark:text-emerald-300/90">
                      +{selectedFile.insertions}
                    </span>
                  </div>
                </div>

                <div className="max-h-[28rem] overflow-auto">
                  {selectedFileDiffError ? (
                    <div className="px-4 py-5 text-sm text-destructive">{selectedFileDiffError}</div>
                  ) : !selectedRenderablePatch ? (
                    <div className="px-4 py-5 text-sm text-muted-foreground">
                      {selectedFileDiffQuery.isLoading || selectedFileDiffQuery.isFetching
                        ? "Loading file diff..."
                        : "No diff available for this file."}
                    </div>
                  ) : selectedRenderablePatch.kind === "files" ? (
                    <div className="[&_[data-file-info]]:hidden">
                      {selectedFiles.map((fileDiff) => (
                        <div key={buildFileDiffRenderKey(fileDiff)}>
                          <FileDiff
                            fileDiff={fileDiff}
                            options={{
                              diffStyle: "unified",
                              lineDiffType: "none",
                              theme: resolveDiffThemeName(resolvedTheme),
                              themeType: resolvedTheme,
                              unsafeCSS: DIFF_SURFACE_UNSAFE_CSS,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2 p-4">
                      <p className="text-[11px] text-muted-foreground/75">
                        {selectedRenderablePatch.reason}
                      </p>
                      <pre className="overflow-auto rounded-lg border border-border/70 bg-background/70 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground/90">
                        {selectedRenderablePatch.text}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </section>
          ) : null}
        </>
      )}

      {(branchListError || gitStatusError) && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/6 px-4 py-3 text-sm text-destructive">
          {branchListError ?? gitStatusError}
        </div>
      )}
    </div>
  );
}

export default function GitActionsControl({ gitCwd, projectName }: GitActionsControlProps) {
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [open, setOpen] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  const branchListQuery = useQuery(gitBranchesQueryOptions(gitCwd));
  const initMutation = useMutation(gitInitMutationOptions({ cwd: gitCwd, queryClient }));
  const gitStatusQuery = useQuery({
    ...gitStatusQueryOptions(gitCwd),
    enabled: gitCwd !== null && branchListQuery.data?.isRepo === true,
  });
  const selectedFileDiffQuery = useQuery(
    gitWorkingTreeFileDiffQueryOptions({
      cwd: gitCwd,
      path: selectedFilePath,
      enabled: open && gitCwd !== null && branchListQuery.data?.isRepo === true && selectedFilePath !== null,
    }),
  );

  useEffect(() => {
    if (!open) {
      setSelectedFilePath(null);
    }
  }, [open]);

  useEffect(() => {
    if (!selectedFilePath || !gitStatusQuery.data) {
      return;
    }
    if (!gitStatusQuery.data.workingTree.files.some((file) => file.path === selectedFilePath)) {
      setSelectedFilePath(null);
    }
  }, [gitStatusQuery.data, selectedFilePath]);

  if (!gitCwd) {
    return null;
  }

  const trigger = (
    <Button
      size="xs"
      variant="outline"
      className={cn(open && "bg-accent text-accent-foreground")}
    >
      <FolderIcon className="size-3.5" />
      <span className="sr-only @sm/header-actions:not-sr-only">Source Control</span>
      <ChevronDownIcon className="size-3.5 opacity-70" />
    </Button>
  );

  const panel = (
    <SourceControlPanel
      gitCwd={gitCwd}
      isRepo={branchListQuery.data?.isRepo ?? null}
      isLoadingRepoState={branchListQuery.isLoading}
      isLoadingStatus={gitStatusQuery.isLoading}
      initPending={initMutation.isPending}
      onInitializeGit={() => initMutation.mutate()}
      branchListError={
        branchListQuery.error instanceof Error ? branchListQuery.error.message : null
      }
      gitStatus={gitStatusQuery.data ?? null}
      gitStatusError={gitStatusQuery.error instanceof Error ? gitStatusQuery.error.message : null}
      resolvedTheme={resolvedTheme}
      selectedFilePath={selectedFilePath}
      onSelectFile={(path) => {
        setSelectedFilePath((current) => (current === path ? null : path));
      }}
      selectedFileDiffQuery={selectedFileDiffQuery}
      {...(projectName ? { projectName } : {})}
    />
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={trigger} />
        <SheetPopup side="right" className="w-[min(100vw,34rem)] p-0">
          <div className="p-4 sm:p-5">{panel}</div>
        </SheetPopup>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      <PopoverPopup align="end" side="bottom" className="w-[min(92vw,48rem)]">
        {panel}
      </PopoverPopup>
    </Popover>
  );
}
