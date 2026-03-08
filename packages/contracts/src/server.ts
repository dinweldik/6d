import { Schema } from "effect";
import { IsoDateTime, TrimmedNonEmptyString, TrimmedString } from "./baseSchemas";
import { KeybindingRule, ResolvedKeybindingsConfig } from "./keybindings";
import { EditorId } from "./editor";
import { ProviderKind } from "./orchestration";

const KeybindingsMalformedConfigIssue = Schema.Struct({
  kind: Schema.Literal("keybindings.malformed-config"),
  message: TrimmedNonEmptyString,
});

const KeybindingsInvalidEntryIssue = Schema.Struct({
  kind: Schema.Literal("keybindings.invalid-entry"),
  message: TrimmedNonEmptyString,
  index: Schema.Number,
});

export const ServerConfigIssue = Schema.Union([
  KeybindingsMalformedConfigIssue,
  KeybindingsInvalidEntryIssue,
]);
export type ServerConfigIssue = typeof ServerConfigIssue.Type;

const ServerConfigIssues = Schema.Array(ServerConfigIssue);

export const ServerProviderStatusState = Schema.Literals(["ready", "warning", "error"]);
export type ServerProviderStatusState = typeof ServerProviderStatusState.Type;

export const ServerProviderAuthStatus = Schema.Literals([
  "authenticated",
  "unauthenticated",
  "unknown",
]);
export type ServerProviderAuthStatus = typeof ServerProviderAuthStatus.Type;

export const ServerProviderStatus = Schema.Struct({
  provider: ProviderKind,
  status: ServerProviderStatusState,
  available: Schema.Boolean,
  authStatus: ServerProviderAuthStatus,
  checkedAt: IsoDateTime,
  message: Schema.optional(TrimmedNonEmptyString),
});
export type ServerProviderStatus = typeof ServerProviderStatus.Type;

const ServerProviderStatuses = Schema.Array(ServerProviderStatus);
const TelegramChatId = TrimmedString.check(Schema.isMaxLength(256));
const TelegramBotTokenInput = TrimmedString.check(Schema.isMaxLength(4096));

export const ServerTelegramNotificationSettings = Schema.Struct({
  chatId: TelegramChatId,
  hasBotToken: Schema.Boolean,
  botTokenHint: Schema.NullOr(TrimmedNonEmptyString),
  enabled: Schema.Boolean,
});
export type ServerTelegramNotificationSettings = typeof ServerTelegramNotificationSettings.Type;

export const ServerConfig = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  keybindingsConfigPath: TrimmedNonEmptyString,
  keybindings: ResolvedKeybindingsConfig,
  issues: ServerConfigIssues,
  providers: ServerProviderStatuses,
  availableEditors: Schema.Array(EditorId),
  telegramNotifications: ServerTelegramNotificationSettings,
});
export type ServerConfig = typeof ServerConfig.Type;

export const ServerUpsertKeybindingInput = KeybindingRule;
export type ServerUpsertKeybindingInput = typeof ServerUpsertKeybindingInput.Type;

export const ServerUpsertKeybindingResult = Schema.Struct({
  keybindings: ResolvedKeybindingsConfig,
  issues: ServerConfigIssues,
});
export type ServerUpsertKeybindingResult = typeof ServerUpsertKeybindingResult.Type;

export const ServerUpdateTelegramNotificationsInput = Schema.Struct({
  chatId: TelegramChatId,
  botToken: Schema.optional(TelegramBotTokenInput),
  clearBotToken: Schema.optional(Schema.Boolean),
});
export type ServerUpdateTelegramNotificationsInput =
  typeof ServerUpdateTelegramNotificationsInput.Type;

export const ServerUpdateTelegramNotificationsResult = ServerTelegramNotificationSettings;
export type ServerUpdateTelegramNotificationsResult =
  typeof ServerUpdateTelegramNotificationsResult.Type;

export const ServerSendTestTelegramNotificationInput = ServerUpdateTelegramNotificationsInput;
export type ServerSendTestTelegramNotificationInput =
  typeof ServerSendTestTelegramNotificationInput.Type;

export const ServerSendTestTelegramNotificationResult = Schema.Struct({
  delivered: Schema.Boolean,
});
export type ServerSendTestTelegramNotificationResult =
  typeof ServerSendTestTelegramNotificationResult.Type;

export const ServerConfigUpdatedPayload = Schema.Struct({
  issues: ServerConfigIssues,
  providers: ServerProviderStatuses,
});
export type ServerConfigUpdatedPayload = typeof ServerConfigUpdatedPayload.Type;
