import { CheckpointRef, EventId, ThreadId, TurnId, type OrchestrationEvent } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import { buildBrowserNotificationDescriptor } from "./browserNotifications";

const baseEventFields = {
  sequence: 1,
  eventId: EventId.makeUnsafe("evt-1"),
  aggregateKind: "thread" as const,
  aggregateId: ThreadId.makeUnsafe("thread-1"),
  occurredAt: "2026-03-07T20:10:00.000Z",
  commandId: null,
  causationEventId: null,
  correlationId: null,
  metadata: {},
};

describe("buildBrowserNotificationDescriptor", () => {
  it("builds a completion notification for completed turns", () => {
    const threadId = ThreadId.makeUnsafe("thread-1");
    const event = {
      ...baseEventFields,
      aggregateId: threadId,
      type: "thread.turn-diff-completed",
      payload: {
        threadId,
        turnId: TurnId.makeUnsafe("turn-1"),
        checkpointTurnCount: 1,
        checkpointRef: CheckpointRef.makeUnsafe("refs/t3/checkpoints/thread-1/turn/1"),
        status: "ready",
        files: [],
        assistantMessageId: null,
        completedAt: "2026-03-07T20:10:00.000Z",
      },
    } satisfies OrchestrationEvent;

    expect(
      buildBrowserNotificationDescriptor({
        event,
        threadTitle: "Fix diff bug",
      }),
    ).toEqual({
      title: "6d: Codex finished working",
      body: "Fix diff bug is ready.",
      path: "/thread-1",
      tag: "thread:thread-1:turn-complete",
    });
  });

  it("builds a notification for structured user-input requests", () => {
    const threadId = ThreadId.makeUnsafe("thread-1");
    const event = {
      ...baseEventFields,
      aggregateId: threadId,
      type: "thread.activity-appended",
      payload: {
        threadId,
        activity: {
          id: EventId.makeUnsafe("evt-user-input"),
          tone: "approval",
          kind: "user-input.requested",
          summary: "Input requested",
          payload: { requestId: "req-1" },
          turnId: TurnId.makeUnsafe("turn-1"),
          createdAt: "2026-03-07T20:10:00.000Z",
        },
      },
    } satisfies OrchestrationEvent;

    expect(
      buildBrowserNotificationDescriptor({
        event,
        threadTitle: "Deploy release",
      }),
    ).toEqual({
      title: "6d: Codex needs your input",
      body: "Deploy release: Input requested",
      path: "/thread-1",
      tag: "thread:thread-1:user-input",
    });
  });

  it("ignores unrelated activity events", () => {
    const threadId = ThreadId.makeUnsafe("thread-1");
    const event = {
      ...baseEventFields,
      aggregateId: threadId,
      type: "thread.activity-appended",
      payload: {
        threadId,
        activity: {
          id: EventId.makeUnsafe("evt-tool"),
          tone: "tool",
          kind: "tool.started",
          summary: "Tool started",
          payload: {},
          turnId: TurnId.makeUnsafe("turn-1"),
          createdAt: "2026-03-07T20:10:00.000Z",
        },
      },
    } satisfies OrchestrationEvent;

    expect(
      buildBrowserNotificationDescriptor({
        event,
        threadTitle: "Deploy release",
      }),
    ).toBeNull();
  });
});
