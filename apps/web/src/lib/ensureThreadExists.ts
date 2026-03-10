import type { NativeApi, OrchestrationReadModel } from "@fatma/contracts";

export type ThreadCreateCommand = Extract<
  Parameters<NativeApi["orchestration"]["dispatchCommand"]>[0],
  { type: "thread.create" }
>;

interface ThreadCreationApi {
  readonly orchestration: Pick<NativeApi["orchestration"], "dispatchCommand" | "getSnapshot">;
}

export async function ensureThreadExists(input: {
  readonly api: ThreadCreationApi;
  readonly command: ThreadCreateCommand;
  readonly onSnapshot?: (snapshot: OrchestrationReadModel) => void;
}): Promise<"created" | "existing"> {
  try {
    await input.api.orchestration.dispatchCommand(input.command);
    return "created";
  } catch (error) {
    const snapshot = await input.api.orchestration.getSnapshot().catch(() => null);
    const existingThread = snapshot?.threads.find(
      (thread) =>
        thread.id === input.command.threadId &&
        thread.projectId === input.command.projectId &&
        thread.deletedAt === null,
    );
    if (!snapshot || !existingThread) {
      throw error;
    }
    input.onSnapshot?.(snapshot);
    return "existing";
  }
}
