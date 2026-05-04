/**
 * Plan Mode Extension
 *
 * Simple plan/build mode toggle. Plan mode restricts the agent to read-only
 * tools and adds a system-prompt nudge to ask clarifying questions and present
 * a numbered plan before any code is written. Build mode restores the user's
 * previous tool set.
 *
 * ── Controls ────────────────────────────────────────────────────────────────
 *   Ctrl+Alt+P  — Toggle plan ↔ build mode
 *   /plan       — Enter plan mode
 *   /build      — Enter build mode
 *
 * ── Plan mode ───────────────────────────────────────────────────────────────
 *   • Tools: read, grep, find, ls, questionnaire (read-only + Q&A)
 *   • System prompt asks the model to clarify, analyse, then present a plan
 *   • Banner below the editor + footer indicator make the mode obvious
 *
 * ── Build mode ──────────────────────────────────────────────────────────────
 *   • Previous tool set restored
 *   • Footer shows "▶ build"
 *
 * ── Session persistence ─────────────────────────────────────────────────────
 *   { mode, savedTools } is persisted via appendEntry and restored on resume.
 */

import type { ExtensionAPI, ExtensionContext, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { Key } from "@mariozechner/pi-tui";

import { registerQuestionnaireTool } from "./questionnaire.js";

// ── Constants ──────────────────────────────────────────────────────────────────

const PLAN_TOOLS = ["read", "grep", "find", "ls", "questionnaire"];
const FOOTER_KEY = "plan-mode";
const WIDGET_BANNER = "plan-mode-banner";
const STATE_KEY = "plan-mode-state";

const PLAN_SYSTEM_PROMPT =
  "\n\n[PLAN MODE ACTIVE — read-only]\n\n" +
  "Workflow:\n" +
  "1. If the request is ambiguous, use the questionnaire tool to ask clarifying questions first.\n" +
  "2. Analyse the codebase using read, grep, find, ls.\n" +
  "3. Present a complete numbered plan under a 'Plan:' header:\n\n" +
  "Plan:\n" +
  "1. First step\n" +
  "2. Second step\n" +
  "...\n\n" +
  "Do NOT modify files — write/edit/bash are unavailable.\n" +
  "The user will run /build or press Ctrl+Alt+P when ready to execute.";

// ── Types ──────────────────────────────────────────────────────────────────────

type Mode = "plan" | "build";

interface PlanState {
  mode: Mode;
  savedTools: string[] | null;
}

// ── Extension ──────────────────────────────────────────────────────────────────

export default function planMode(pi: ExtensionAPI): void {
  let savedTools: string[] | null = null;
  let mode: Mode = "build";

  registerQuestionnaireTool(pi);

  // ── Persistence ────────────────────────────────────────────────────────────

  function persist(): void {
    pi.appendEntry(STATE_KEY, { mode, savedTools } satisfies PlanState);
  }

  // ── UI updates ─────────────────────────────────────────────────────────────

  function updateUI(ctx: ExtensionContext): void {
    const t = ctx.ui.theme;

    // Footer — only in build (plan mode has the banner instead)
    if (mode === "plan") {
      ctx.ui.setStatus(FOOTER_KEY, undefined);
    } else {
      ctx.ui.setStatus(FOOTER_KEY, t.fg("dim", "▶ build"));
    }

    // Banner (plan mode only)
    if (mode === "plan") {
      const marker = t.bg("toolPendingBg", t.fg("warning", t.bold(" PLAN ")));
      const tools = t.fg("text", PLAN_TOOLS.join(" · "));
      const hint = t.fg("dim", "Ctrl+Alt+P or /build to execute");
      ctx.ui.setWidget(
        WIDGET_BANNER,
        [`${marker}  ${tools}  ${t.fg("borderMuted", "│")}  ${hint}`],
        { placement: "belowEditor" },
      );
    } else {
      ctx.ui.setWidget(WIDGET_BANNER, undefined, { placement: "belowEditor" });
    }
  }

  // ── Mode transitions ──────────────────────────────────────────────────────

  function enterPlan(ctx: ExtensionContext): void {
    if (mode === "plan") {
      ctx.ui.notify("Already in plan mode.", "warning");
      return;
    }
    savedTools = pi.getActiveTools();
    pi.setActiveTools([...PLAN_TOOLS]);
    mode = "plan";
    ctx.ui.notify("Plan mode — read-only. The model will ask questions and create a plan.", "info");
    updateUI(ctx);
    persist();
  }

  function enterBuild(ctx: ExtensionContext): void {
    if (mode === "build") {
      ctx.ui.notify("Already in build mode.", "warning");
      return;
    }
    if (savedTools) {
      pi.setActiveTools(savedTools);
    } else {
      // Defensive: if we somehow lost savedTools (corrupt persisted state),
      // warn rather than silently leaving the user with PLAN_TOOLS active.
      ctx.ui.notify(
        "Build mode: previous tool set was not recorded. Use /tools to enable what you need.",
        "warning",
      );
    }
    savedTools = null;
    mode = "build";
    ctx.ui.notify("Build mode — all tools restored.", "info");
    updateUI(ctx);
    persist();
  }

  function toggle(ctx: ExtensionContext, force?: Mode): void {
    const goToPlan = force === "plan" ? true : force === "build" ? false : mode !== "plan";
    if (goToPlan) enterPlan(ctx);
    else enterBuild(ctx);
  }

  // ── Commands & shortcut ────────────────────────────────────────────────────

  pi.registerCommand("plan", {
    description: "Enter read-only plan mode",
    handler: async (_args: string, ctx: ExtensionCommandContext) => toggle(ctx, "plan"),
  });

  pi.registerCommand("build", {
    description: "Exit plan mode, restore tools",
    handler: async (_args: string, ctx: ExtensionCommandContext) => toggle(ctx, "build"),
  });

  pi.registerShortcut(Key.ctrlAlt("p"), {
    description: "Toggle plan / build mode",
    handler: (ctx) => toggle(ctx),
  });

  // ── System prompt injection ────────────────────────────────────────────────
  // Using before_agent_start preserves Anthropic's prompt caching.
  // before_provider_request would strip cache_control markers, causing 429s.

  pi.on("before_agent_start", async (event) => {
    if (mode === "plan") {
      return { systemPrompt: event.systemPrompt + PLAN_SYSTEM_PROMPT };
    }
  });

  // ── Session restore ────────────────────────────────────────────────────────

  pi.on("session_start", async (_event, ctx) => {
    const entries = ctx.sessionManager.getEntries();

    const stateEntry = entries
      .filter((e: { type: string; customType?: string }) => e.type === "custom" && e.customType === STATE_KEY)
      .pop() as { data?: { mode?: string; savedTools?: string[] | null } } | undefined;

    if (stateEntry?.data) {
      // Normalise legacy "executing" mode (from the old todo-tracking flow) to "build".
      const persistedMode = stateEntry.data.mode === "plan" ? "plan" : "build";
      mode = persistedMode;
      savedTools = stateEntry.data.savedTools ?? null;
    }

    if (mode === "plan") {
      // Capture the active tool set before clobbering it with PLAN_TOOLS, so
      // /build can restore later. This fixes the "stuck in PLAN_TOOLS after
      // /build" bug when sessions were persisted with savedTools=null.
      if (!savedTools) savedTools = pi.getActiveTools();
      pi.setActiveTools([...PLAN_TOOLS]);
    }

    updateUI(ctx);
  });

  pi.on("session_shutdown", async () => {
    savedTools = null;
    mode = "build";
  });
}
