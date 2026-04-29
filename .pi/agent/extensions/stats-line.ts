/**
 * pi extension: stats-line
 *
 * Adds a per-turn token + throughput indicator to pi's footer status bar.
 * Pi's default footer already shows session-cumulative ↑↓RW$ — this fills
 * the gap by surfacing the LAST TURN's metrics, which pi doesn't expose.
 *
 * ── What it shows ────────────────────────────────────────────────────────────
 *   ⚡ last: ↑512 ↓384 ⏱2.4s 213/s
 *
 *     ↑       — input tokens for the last assistant turn
 *     ↓       — output tokens for the last assistant turn
 *     ⏱       — wall-clock seconds from turn_start to turn_end
 *     N/s     — output tokens per second (rounded; output / duration)
 *
 * ── Behaviour ────────────────────────────────────────────────────────────────
 *   • Footer status appears after the first assistant turn and updates after
 *     every subsequent turn.
 *   • Cleared on session_start so a fresh session does not show stale numbers
 *     from the previous one.
 *   • Skips display when usage is missing (e.g. partial / aborted turns).
 */

import type { ExtensionAPI, ExtensionContext, TurnEndEvent } from "@mariozechner/pi-coding-agent";

// ── Constants ──────────────────────────────────────────────────────────────────

/** Footer status key — namespaced to avoid collisions with other extensions. */
const FOOTER_KEY = "stats-line";

// ── Extension state ────────────────────────────────────────────────────────────

/** Wall-clock timestamp (ms) of the most recent turn_start, or null between turns. */
let turnStartedAt: number | null = null;

// ── Formatters ─────────────────────────────────────────────────────────────────

/** Compact human-readable token count: 1234 → "1.2k", 1_500_000 → "1.5M". */
function fmtTokens(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

/** Compact duration: 2.4s, 850ms, 1m12s. */
function fmtDuration(ms: number): string {
  if (ms < 1_000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1_000);
  return `${m}m${s}s`;
}

/** Throughput in tokens/sec, rounded — guards against divide-by-zero. */
function fmtThroughput(tokens: number, ms: number): string {
  if (ms <= 0) return "—";
  const tps = Math.round((tokens / ms) * 1_000);
  return `${tps}/s`;
}

// ── UI ─────────────────────────────────────────────────────────────────────────

interface TurnStats {
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

/** Renders the footer status entry for the latest turn's stats. */
function renderStats(ctx: ExtensionContext, stats: TurnStats): void {
  const t = ctx.ui.theme;
  const parts = [
    t.fg("accent", "⚡ last:"),
    t.fg("success", `↑${fmtTokens(stats.inputTokens)}`),
    t.fg("warning", `↓${fmtTokens(stats.outputTokens)}`),
    t.fg("dim", `⏱${fmtDuration(stats.durationMs)}`),
    t.fg("dim", fmtThroughput(stats.outputTokens, stats.durationMs)),
  ];
  ctx.ui.setStatus(FOOTER_KEY, parts.join(" "));
}

/** Clears the footer status. */
function clearStats(ctx: ExtensionContext): void {
  ctx.ui.setStatus(FOOTER_KEY, undefined);
}

// ── Extension factory ──────────────────────────────────────────────────────────

export default function statsLine(pi: ExtensionAPI): void {

  // ── Reset on session start ──────────────────────────────────────────────────
  // Avoid stale numbers from the previous session bleeding into a fresh one.

  pi.on("session_start", (_event, ctx) => {
    turnStartedAt = null;
    clearStats(ctx);
  });

  // ── Capture turn start time ─────────────────────────────────────────────────

  pi.on("turn_start", (event) => {
    turnStartedAt = event.timestamp;
  });

  // ── Render stats on turn end ────────────────────────────────────────────────
  // event.message is the assistant's response for this turn. It carries a
  // `usage` field with input/output/cache token counts. We compute duration
  // from turnStartedAt → now and render to the footer.

  pi.on("turn_end", (event: TurnEndEvent, ctx) => {
    const message = event.message;

    // Defensive: only render for assistant messages with usage data.
    // Aborted turns or system entries lack usage — skip silently.
    if (message.role !== "assistant") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usage = (message as any).usage as
      | { input?: number; output?: number }
      | undefined;
    if (!usage || typeof usage.input !== "number" || typeof usage.output !== "number") {
      return;
    }

    const now = Date.now();
    const durationMs = turnStartedAt !== null ? now - turnStartedAt : 0;
    turnStartedAt = null;

    renderStats(ctx, {
      inputTokens: usage.input,
      outputTokens: usage.output,
      durationMs,
    });
  });
}
