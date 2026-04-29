/**
 * pi extension: claude-auth
 *
 * Bridges pi to Claude Code's OAuth credentials (~/.claude/.credentials.json)
 * and replicates the wire-format transforms that opencode-claude-auth applies
 * so requests are billed against the Claude Code Max subscription instead of
 * the per-token "extra usage" pool.
 *
 * ── What it does ─────────────────────────────────────────────────────────────
 *   1. Reads OAuth tokens from ~/.claude/.credentials.json (single source of
 *      truth shared with the Claude Code CLI).
 *   2. Refreshes tokens via the Claude OAuth endpoint and writes the new tokens
 *      back to the credentials file so the Claude Code CLI stays in sync.
 *   3. Injects the full set of Claude Code beta flags + identity headers as
 *      static request-header overlay.
 *   4. Transforms each outbound Anthropic request so it looks like a request
 *      from the official Claude Code CLI:
 *        a. Adds a cryptographic billing header at system[0]
 *           (x-anthropic-billing-header: cc_version=...; cc_entrypoint=cli; cch=...;)
 *        b. Relocates non-core system entries (third-party agent prompts) into
 *           the first user message — the API rejects extra system content for
 *           OAuth-billed requests with a 400 "out of extra usage" error.
 *        c. Strips the `effort` parameter from requests targeting Haiku models,
 *           which do not support it.
 *        d. Repairs orphaned tool_use / tool_result pairs to keep the API happy.
 *
 * ── Environment overrides ───────────────────────────────────────────────────
 *   ANTHROPIC_BETA_FLAGS         — comma-separated beta-flag override
 *   ANTHROPIC_CLI_VERSION        — user-agent version override (default 2.1.90)
 *   CLAUDE_CODE_ENTRYPOINT       — billing entrypoint label (default "cli")
 *
 * ── Source attribution ──────────────────────────────────────────────────────
 *   The billing-signature, identity-split, system-relocation, effort-strip,
 *   and orphaned-tool-pair-repair logic is ported from
 *   griffinmartin/opencode-claude-auth (MIT licensed) v1.4.9. All upstream
 *   constants and salt values are preserved verbatim.
 *
 * ── Known gaps vs opencode-claude-auth ──────────────────────────────────────
 *   • Per-model anthropic-beta header overrides — would require streamSimple
 *     wrapping, which collides with pi's api-registry. Use ANTHROPIC_BETA_FLAGS
 *     env var when switching to Haiku to drop interleaved-thinking.
 *   • Long-context beta auto-drop on 400 errors — would require stream-replay.
 *   • HTTP 401 retry with forced refresh — pi's pre-emptive refresh handles
 *     the common case.
 *   • Multi-account selector / macOS Keychain — single-account use only.
 *
 * ── Note about pi's "Anthropic subscription auth" startup warning ───────────
 *   pi-coding-agent emits "Anthropic subscription auth is active. Third-party
 *   harness usage draws from extra usage and is billed per token..." on every
 *   interactive startup whenever an OAuth credential is stored for the
 *   anthropic provider (interactive-mode.js, maybeWarnAboutAnthropicSubscriptionAuth,
 *   line 3261). The warning is purely cosmetic — pi has no visibility into the
 *   billing-header transform applied below in `before_provider_request`.
 *   Subscription billing is in fact active when this extension is loaded;
 *   the warning reflects a credential-shape check, not a real billing
 *   classification. There is no settings flag in pi to suppress it, and
 *   opencode never had this warning to begin with.
 *
 *   To verify the transform is producing correct wire output, run:
 *     CLAUDE_AUTH_DEBUG=1 pi -p "test"
 *   and confirm the printed system[] array starts with x-anthropic-billing-header
 *   followed by the Claude Code identity prefix.
 */

import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

// ── Constants ──────────────────────────────────────────────────────────────────

const CREDS_FILE = join(homedir(), ".claude", ".credentials.json");
const TOKEN_URL = "https://claude.ai/v1/oauth/token";
const CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";

/**
 * Beta flags sent by the official Claude Code CLI.
 * Source: opencode-claude-auth model-config.js v1.4.9.
 */
const BASE_BETAS: readonly string[] = [
  "claude-code-20250219",
  "oauth-2025-04-20",
  "interleaved-thinking-2025-05-14",
  "prompt-caching-scope-2026-01-05",
  "context-management-2025-06-27",
];

/**
 * Resolved base betas, honouring `ANTHROPIC_BETA_FLAGS` override.
 * If the env var is set it replaces BASE_BETAS entirely (matches opencode behaviour).
 */
const RESOLVED_BASE_BETAS: readonly string[] = process.env.ANTHROPIC_BETA_FLAGS
  ? process.env.ANTHROPIC_BETA_FLAGS.split(",").map((s) => s.trim()).filter(Boolean)
  : BASE_BETAS;

const CLI_VERSION = process.env.ANTHROPIC_CLI_VERSION ?? "2.1.90";
const USER_AGENT = `claude-cli/${CLI_VERSION} (external, cli)`;
const ENTRYPOINT = process.env.CLAUDE_CODE_ENTRYPOINT ?? "cli";

/** Stable per-process UUID — matches Claude Code's X-Claude-Code-Session-Id behaviour. */
const SESSION_ID = randomUUID();

/** The system-prompt prefix Anthropic's OAuth validation requires verbatim at system[1]. */
const SYSTEM_IDENTITY = "You are Claude Code, Anthropic's official CLI for Claude.";

/** Prefix of the billing header entry that occupies system[0]. */
const BILLING_PREFIX = "x-anthropic-billing-header";

/** Cryptographic salt used by the billing-signature scheme (opencode-claude-auth signing.js). */
const BILLING_SALT = "59cf53e54c78";

/** Pre-refresh threshold — refresh tokens this many ms before expiry. */
const REFRESH_THRESHOLD_MS = 60_000;

/** Default access-token lifetime when the OAuth response omits expires_in. */
const DEFAULT_TOKEN_LIFETIME_S = 36_000; // 10 hours

// ── Internal types ─────────────────────────────────────────────────────────────

/** Shape of the claudeAiOauth entry in ~/.claude/.credentials.json. */
interface ClaudeFileCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
  [key: string]: unknown;
}

/** The OAuthCredentials shape pi expects. */
interface PiOAuthCredentials {
  access: string;
  refresh: string;
  expires: number;
  [key: string]: unknown;
}

/** pi provides callbacks for browser-based OAuth flows — we ignore them. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OAuthLoginCallbacks = Record<string, any>;

/** Anthropic Messages API content blocks (subset we care about). */
interface TextBlock { type: "text"; text: string; [k: string]: unknown }
interface ToolUseBlock { type: "tool_use"; id: string; name: string; [k: string]: unknown }
interface ToolResultBlock { type: "tool_result"; tool_use_id: string; [k: string]: unknown }
type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock | { type: string; [k: string]: unknown };

interface AnthropicMessage {
  role: "user" | "assistant" | string;
  content: string | ContentBlock[];
  [k: string]: unknown;
}

interface AnthropicPayload {
  model?: string;
  system?: string | TextBlock[];
  messages?: AnthropicMessage[];
  output_config?: { effort?: string; [k: string]: unknown };
  thinking?: { effort?: string; [k: string]: unknown };
  [k: string]: unknown;
}

// ── Credential file helpers ────────────────────────────────────────────────────

function readCredsFile(): { claudeAiOauth: ClaudeFileCredentials; [k: string]: unknown } {
  return JSON.parse(readFileSync(CREDS_FILE, "utf-8"));
}

function readCreds(): ClaudeFileCredentials {
  return readCredsFile().claudeAiOauth;
}

/** Writes updated fields back into the credentials file, preserving all other top-level data. */
function writeCreds(updated: ClaudeFileCredentials): void {
  const file = readCredsFile();
  file.claudeAiOauth = { ...file.claudeAiOauth, ...updated };
  writeFileSync(CREDS_FILE, JSON.stringify(file, null, 2), {
    encoding: "utf-8",
    mode: 0o600,
  });
}

function toPiCredentials(c: ClaudeFileCredentials): PiOAuthCredentials {
  return { access: c.accessToken, refresh: c.refreshToken, expires: c.expiresAt };
}

// ── Token refresh ──────────────────────────────────────────────────────────────

/**
 * Refreshes the OAuth access token via the Claude OAuth endpoint.
 * Uses the same CLIENT_ID and TOKEN_URL as opencode-claude-auth.
 */
async function refreshAccessToken(refreshToken: string): Promise<ClaudeFileCredentials> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: CLIENT_ID,
    refresh_token: refreshToken,
  });

  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "(unreadable)");
    throw new Error(`[claude-auth] Token refresh failed (HTTP ${resp.status}): ${detail}`);
  }

  const data = (await resp.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) {
    throw new Error("[claude-auth] Token refresh response missing access_token");
  }

  return {
    accessToken: data.access_token,
    // OAuth servers may omit refresh_token when it is unchanged — keep the old one.
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + (data.expires_in ?? DEFAULT_TOKEN_LIFETIME_S) * 1_000,
  };
}

/** Returns credentials, refreshing first if the token is within REFRESH_THRESHOLD_MS of expiry. */
async function refreshIfExpiring(creds: ClaudeFileCredentials): Promise<ClaudeFileCredentials> {
  if (creds.expiresAt > Date.now() + REFRESH_THRESHOLD_MS) return creds;
  const refreshed = await refreshAccessToken(creds.refreshToken);
  writeCreds(refreshed);
  return refreshed;
}

// ── Billing signature (ported from opencode-claude-auth/signing.js) ───────────

/**
 * Returns the text of the first text block in the first user message.
 * Matches Claude Code's K19() function: find the first user role, then
 * return its first text content block.
 */
function extractFirstUserMessageText(messages: AnthropicMessage[]): string {
  const userMsg = messages.find((m) => m.role === "user");
  if (!userMsg) return "";
  const content = userMsg.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const textBlock = content.find((b): b is TextBlock => b.type === "text" && typeof (b as TextBlock).text === "string");
    if (textBlock) return textBlock.text;
  }
  return "";
}

/** First 5 hex chars of SHA-256(messageText). */
function computeCch(messageText: string): string {
  return createHash("sha256").update(messageText).digest("hex").slice(0, 5);
}

/**
 * 3-char version suffix.
 * Samples chars at indices 4, 7, 20 of the message text (padding with "0" when
 * the message is shorter), then hashes with the billing salt and version string.
 */
function computeVersionSuffix(messageText: string, version: string): string {
  const sampled = [4, 7, 20]
    .map((i) => (i < messageText.length ? messageText[i] : "0"))
    .join("");
  const input = `${BILLING_SALT}${sampled}${version}`;
  return createHash("sha256").update(input).digest("hex").slice(0, 3);
}

/**
 * Builds the complete billing header string for insertion as system[0].
 * Format: `x-anthropic-billing-header: cc_version=V.S; cc_entrypoint=E; cch=H;`
 */
function buildBillingHeaderValue(messages: AnthropicMessage[], version: string, entrypoint: string): string {
  const text = extractFirstUserMessageText(messages);
  const suffix = computeVersionSuffix(text, version);
  const cch = computeCch(text);
  return `${BILLING_PREFIX}: cc_version=${version}.${suffix}; cc_entrypoint=${entrypoint}; cch=${cch};`;
}

// ── Tool-pair repair (ported from opencode-claude-auth/transforms.js) ─────────

/**
 * Removes orphaned tool_use blocks (no matching tool_result) and orphaned
 * tool_result blocks (no matching tool_use). Anthropic's API rejects requests
 * with unmatched pairs — this is a defensive pass to keep transient state
 * inconsistencies from breaking requests.
 */
function repairToolPairs(messages: AnthropicMessage[]): AnthropicMessage[] {
  const toolUseIds = new Set<string>();
  const toolResultIds = new Set<string>();
  for (const message of messages) {
    if (!Array.isArray(message.content)) continue;
    for (const block of message.content) {
      if (block.type === "tool_use" && typeof (block as ToolUseBlock).id === "string") {
        toolUseIds.add((block as ToolUseBlock).id);
      }
      if (block.type === "tool_result" && typeof (block as ToolResultBlock).tool_use_id === "string") {
        toolResultIds.add((block as ToolResultBlock).tool_use_id);
      }
    }
  }

  const orphanedUses = new Set<string>();
  for (const id of toolUseIds) {
    if (!toolResultIds.has(id)) orphanedUses.add(id);
  }
  const orphanedResults = new Set<string>();
  for (const id of toolResultIds) {
    if (!toolUseIds.has(id)) orphanedResults.add(id);
  }
  if (orphanedUses.size === 0 && orphanedResults.size === 0) {
    return messages;
  }

  return messages
    .map((message) => {
      if (!Array.isArray(message.content)) return message;
      const filtered = message.content.filter((block) => {
        if (block.type === "tool_use" && typeof (block as ToolUseBlock).id === "string") {
          return !orphanedUses.has((block as ToolUseBlock).id);
        }
        if (block.type === "tool_result" && typeof (block as ToolResultBlock).tool_use_id === "string") {
          return !orphanedResults.has((block as ToolResultBlock).tool_use_id);
        }
        return true;
      });
      return { ...message, content: filtered };
    })
    .filter((message) => !(Array.isArray(message.content) && message.content.length === 0));
}

// ── Body transform (ported from opencode-claude-auth/transforms.js) ───────────

/**
 * Returns true if the model id targets a Haiku family model that does not
 * support the `effort` parameter on output_config / thinking.
 */
function isHaiku(modelId: string | undefined): boolean {
  return typeof modelId === "string" && modelId.toLowerCase().includes("haiku");
}

/**
 * Normalises a system entry into a TextBlock. Anthropic's API accepts both
 * raw strings and TextBlock arrays for `system`; pi-ai always emits
 * TextBlock arrays for OAuth tokens, but we are defensive.
 */
function normaliseSystemEntries(system: string | TextBlock[] | undefined): TextBlock[] {
  if (system === undefined) return [];
  if (typeof system === "string") return [{ type: "text", text: system }];
  return system;
}

/**
 * Applies the Claude Code wire-format transforms to an outbound Anthropic
 * request payload. Idempotent — re-running on the same payload produces the
 * same result, so it is safe even if pi's pipeline ever fires
 * before_provider_request more than once for a single request.
 */
function transformAnthropicPayload(payload: AnthropicPayload): AnthropicPayload {
  // Defensive copy — never mutate pi's original payload object.
  const next: AnthropicPayload = { ...payload };
  const messages = Array.isArray(next.messages) ? [...next.messages] : [];

  // ── 1. Compute and inject billing header at system[0] ──────────────────────
  const billingHeader = buildBillingHeaderValue(messages, CLI_VERSION, ENTRYPOINT);

  let system = normaliseSystemEntries(next.system);

  // Remove any pre-existing billing header (idempotency).
  system = system.filter(
    (e) => !(e.type === "text" && typeof e.text === "string" && e.text.startsWith(BILLING_PREFIX)),
  );
  // Insert fresh billing header at position 0. No cache_control — the value
  // depends on the user message text and changes between requests.
  system.unshift({ type: "text", text: billingHeader });

  // ── 2. Relocate non-core system entries to the first user message ─────────
  // Anthropic's API validates the system prompt for OAuth-billed requests.
  // Third-party prompts (engineering-standards, plan-mode, etc.) trigger a
  // 400 "out of extra usage" rejection when present alongside the identity
  // prefix. Move them into the user message where they are functionally
  // equivalent but not validated.
  const keptSystem: TextBlock[] = [];
  const movedTexts: string[] = [];
  for (const entry of system) {
    const txt = entry.type === "text" && typeof entry.text === "string" ? entry.text : "";
    if (txt.startsWith(BILLING_PREFIX) || txt.startsWith(SYSTEM_IDENTITY)) {
      keptSystem.push(entry);
    } else if (txt.length > 0) {
      movedTexts.push(txt);
    }
  }

  if (movedTexts.length > 0 && messages.length > 0) {
    const firstUserIdx = messages.findIndex((m) => m.role === "user");
    if (firstUserIdx !== -1) {
      const firstUser = messages[firstUserIdx];
      const prefix = movedTexts.join("\n\n");
      const updated: AnthropicMessage =
        typeof firstUser.content === "string"
          ? { ...firstUser, content: `${prefix}\n\n${firstUser.content}` }
          : Array.isArray(firstUser.content)
            ? { ...firstUser, content: [{ type: "text", text: prefix }, ...firstUser.content] }
            : firstUser;
      messages[firstUserIdx] = updated;
      system = keptSystem;
    }
  }

  next.system = system;

  // ── 3. Strip `effort` parameter for Haiku models ──────────────────────────
  if (isHaiku(next.model)) {
    if (next.output_config) {
      const { effort: _, ...rest } = next.output_config;
      next.output_config = Object.keys(rest).length > 0 ? rest : undefined;
      if (next.output_config === undefined) delete next.output_config;
    }
    if (next.thinking && "effort" in next.thinking) {
      const { effort: _, ...rest } = next.thinking;
      next.thinking = Object.keys(rest).length > 0 ? rest : undefined;
      if (next.thinking === undefined) delete next.thinking;
    }
  }

  // ── 4. Repair orphaned tool_use / tool_result pairs ───────────────────────
  next.messages = repairToolPairs(messages);

  // ── Debug: print system[] structure when CLAUDE_AUTH_DEBUG=1 ──────────────
  // One-shot verification that the transform produced the expected wire format.
  // Output goes to stderr so it does not interleave with TUI output.
  if (process.env.CLAUDE_AUTH_DEBUG === "1") {
    const sys = Array.isArray(next.system) ? next.system : [];
    const preview = sys.map((entry, i) => {
      const txt = entry.type === "text" && typeof entry.text === "string" ? entry.text : "";
      return `  [${i}] ${txt.slice(0, 70)}${txt.length > 70 ? "..." : ""}`;
    });
    console.error(`[claude-auth] system[] after transform (${sys.length} entries):\n${preview.join("\n")}`);
  }

  return next;
}

// ── Extension factory ──────────────────────────────────────────────────────────

export default function claudeAuth(pi: ExtensionAPI): void {
  if (!existsSync(CREDS_FILE)) {
    console.warn(
      "[claude-auth] ~/.claude/.credentials.json not found. " +
        "Falling back to pi native Anthropic auth. " +
        "Run `claude` once to create the credentials file.",
    );
    return;
  }

  // ── Static header overlay ────────────────────────────────────────────────────
  pi.registerProvider("anthropic", {
    headers: {
      "anthropic-beta": RESOLVED_BASE_BETAS.join(","),
      "user-agent": USER_AGENT,
      "x-app": "cli",
      "X-Claude-Code-Session-Id": SESSION_ID,
    },

    oauth: {
      name: "Claude Code Auth",

      /**
       * Called when the user runs /login → anthropic.
       * Reads credentials from ~/.claude/.credentials.json — no browser required.
       * Pre-refreshes if the access token is near expiry.
       */
      async login(_callbacks: OAuthLoginCallbacks): Promise<PiOAuthCredentials> {
        const creds = await refreshIfExpiring(readCreds());
        return toPiCredentials(creds);
      },

      /**
       * Called automatically by pi when the stored access token is near expiry.
       * Refreshes via the Claude OAuth endpoint and writes the new tokens back
       * to ~/.claude/.credentials.json so the Claude Code CLI stays in sync.
       */
      async refreshToken(stored: PiOAuthCredentials): Promise<PiOAuthCredentials> {
        const creds = await refreshAccessToken(stored.refresh);
        writeCreds(creds);
        return toPiCredentials(creds);
      },

      /** Returns the access token; pi injects it as `Authorization: Bearer <token>`. */
      getApiKey(stored: PiOAuthCredentials): string {
        return stored.access;
      },
    },
  });

  // ── Body transform on every outbound Anthropic request ──────────────────────
  // Fires after pi-ai serialises the Context to a wire payload but before HTTP
  // send. We add the billing signature, relocate third-party system prompts,
  // strip Haiku-incompatible parameters, and repair any orphaned tool pairs.
  pi.on("before_provider_request", (event) => {
    const payload = event.payload;
    if (!payload || typeof payload !== "object") return;
    // Only transform Anthropic Messages API payloads — identifiable by the
    // presence of `messages` array. Other providers (OpenAI, Google) have
    // different payload shapes and would be corrupted by our transforms.
    const p = payload as AnthropicPayload;
    if (!Array.isArray(p.messages)) return;
    return transformAnthropicPayload(p);
  });
}
