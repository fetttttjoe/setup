/**
 * Plan Mode Extension
 *
 * Provides plan/build mode toggle with interactive questioning,
 * automatic task extraction, and progress tracking.
 *
 * ── Controls ────────────────────────────────────────────────────────────────
 *   Ctrl+Alt+P  — Toggle plan ↔ build mode
 *   /plan        — Enter plan mode
 *   /build       — Enter build mode
 *   /tasks       — Show current plan progress
 *
 * ── Plan mode ───────────────────────────────────────────────────────────────
 *   • Tools: read, grep, find, ls, questionnaire (read-only + Q&A)
 *   • Model asks clarifying questions via questionnaire tool
 *   • After response: extracts numbered steps, prompts Execute/Refine/Stay
 *
 * ── Build mode (executing) ──────────────────────────────────────────────────
 *   • All tools restored
 *   • Progress widget tracks [DONE:n] markers
 *   • Completion notification when all steps done
 *
 * ── Session persistence ─────────────────────────────────────────────────────
 *   Plan state is saved via appendEntry and restored on resume.
 */

import type { ExtensionAPI, ExtensionContext, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { AssistantMessage } from "@mariozechner/pi-ai";
import { Key } from "@mariozechner/pi-tui";

import { registerQuestionnaireTool } from "./questionnaire.js";
import {
  type PlanState,
  type TodoItem,
  extractTodoItems,
  getTextContent,
  isAssistantMessage,
  markCompletedSteps,
} from "./utils.js";

// ── Constants ──────────────────────────────────────────────────────────────────

const PLAN_TOOLS = ["read", "grep", "find", "ls", "questionnaire"];
const FOOTER_KEY = "plan-mode";
const WIDGET_BANNER = "plan-mode-banner";
const WIDGET_TASKS = "plan-mode-tasks";
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

// ── Extension ──────────────────────────────────────────────────────────────────

export default function planMode(pi: ExtensionAPI): void {
  let savedTools: string[] | null = null;
  let mode: "plan" | "build" | "executing" = "build";
  let todos: TodoItem[] = [];

  // ── Register the questionnaire tool ────────────────────────────────────────

  registerQuestionnaireTool(pi);

  // ── Persistence ────────────────────────────────────────────────────────────

  function persist(): void {
    pi.appendEntry(STATE_KEY, { mode, todos, savedTools } satisfies PlanState);
  }

  // ── UI updates ─────────────────────────────────────────────────────────────

  function updateUI(ctx: ExtensionContext): void {
    const t = ctx.ui.theme;

    // Footer — only in build/executing (plan mode has the banner instead)
    if (mode === "executing" && todos.length > 0) {
      const done = todos.filter((i) => i.completed).length;
      ctx.ui.setStatus(FOOTER_KEY, t.fg("accent", `▶ build ${done}/${todos.length}`));
    } else if (mode === "plan") {
      ctx.ui.setStatus(FOOTER_KEY, undefined);
    } else {
      ctx.ui.setStatus(FOOTER_KEY, t.fg("dim", "▶ build"));
    }

    // Banner (plan mode only)
    if (mode === "plan") {
      const marker = t.bg("toolPendingBg", t.fg("warning", t.bold(" PLAN ")));
      const tools = t.fg("text", PLAN_TOOLS.join(" · "));
      const hint = t.fg("dim", "Ctrl+Alt+P to execute");
      ctx.ui.setWidget(WIDGET_BANNER, [`${marker}  ${tools}  ${t.fg("borderMuted", "│")}  ${hint}`], { placement: "belowEditor" });
    } else {
      ctx.ui.setWidget(WIDGET_BANNER, undefined, { placement: "belowEditor" });
    }

    // Tasks widget (executing only)
    if (mode === "executing" && todos.length > 0) {
      ctx.ui.setWidget(
        WIDGET_TASKS,
        todos.map((item) =>
          item.completed
            ? t.fg("success", " ☑ ") + t.fg("muted", t.strikethrough(`${item.step}. ${item.text}`))
            : t.fg("muted", " ☐ ") + `${item.step}. ${item.text}`,
        ),
      );
    } else {
      ctx.ui.setWidget(WIDGET_TASKS, undefined);
    }
  }

  // ── Mode transitions ──────────────────────────────────────────────────────

  function enterPlan(ctx: ExtensionContext): void {
    if (mode === "plan") { ctx.ui.notify("Already in plan mode.", "warning"); return; }
    savedTools = pi.getActiveTools();
    pi.setActiveTools([...PLAN_TOOLS]);
    mode = "plan";
    todos = [];
    ctx.ui.notify("Plan mode — read-only. The model will ask questions and create a plan.", "info");
    updateUI(ctx);
    persist();
  }

  function enterBuild(ctx: ExtensionContext, execute: boolean): void {
    if (mode === "build" || mode === "executing") { ctx.ui.notify("Already in build mode.", "warning"); return; }
    if (savedTools) pi.setActiveTools(savedTools);
    savedTools = null;
    mode = execute && todos.length > 0 ? "executing" : "build";
    ctx.ui.notify("Build mode — all tools restored.", "info");
    updateUI(ctx);
    persist();
  }

  function toggle(ctx: ExtensionContext, force?: "plan" | "build"): void {
    const goToPlan = force === "plan" ? true : force === "build" ? false : mode !== "plan";
    goToPlan ? enterPlan(ctx) : enterBuild(ctx, true);
  }

  // ── Commands & shortcut ────────────────────────────────────────────────────

  pi.registerCommand("plan", {
    description: "Enter read-only plan mode",
    handler: async (_args: string, ctx: ExtensionCommandContext) => toggle(ctx, "plan"),
  });

  pi.registerCommand("build", {
    description: "Exit plan mode, execute the plan",
    handler: async (_args: string, ctx: ExtensionCommandContext) => toggle(ctx, "build"),
  });

  pi.registerCommand("tasks", {
    description: "Show current plan progress",
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      if (todos.length === 0) {
        ctx.ui.notify("No tasks. Enter /plan and ask the agent to create a plan.", "info");
        return;
      }
      const done = todos.filter((i) => i.completed).length;
      const list = todos.map((i) => `${i.completed ? "✓" : "○"} ${i.step}. ${i.text}`).join("\n");
      ctx.ui.notify(`Plan Progress (${done}/${todos.length}):\n${list}`, "info");
    },
  });

  pi.registerShortcut(Key.ctrlAlt("p"), {
    description: "Toggle plan / build mode",
    handler: (ctx) => toggle(ctx),
  });

  // ── System prompt injection (before_agent_start, not before_provider_request) ─
  // Using before_agent_start preserves Anthropic's prompt caching.
  // before_provider_request would strip cache_control markers, causing 429s.

  pi.on("before_agent_start", async (event) => {
    if (mode === "plan") {
      return { systemPrompt: event.systemPrompt + PLAN_SYSTEM_PROMPT };
    }

    if (mode === "executing" && todos.length > 0) {
      const remaining = todos.filter((t) => !t.completed);
      const todoList = remaining.map((t) => `${t.step}. ${t.text}`).join("\n");
      return {
        message: {
          customType: "plan-execution-context",
          content:
            "[EXECUTING PLAN — full tool access]\n\n" +
            `Remaining steps:\n${todoList}\n\n` +
            "Execute each step in order. After completing a step, include [DONE:n] in your response.",
          display: false,
        },
      };
    }
  });

  // ── Track [DONE:n] during execution ────────────────────────────────────────

  pi.on("turn_end", async (event, ctx) => {
    if (mode !== "executing" || todos.length === 0) return;
    if (!isAssistantMessage(event.message)) return;

    if (markCompletedSteps(getTextContent(event.message), todos) > 0) {
      updateUI(ctx);
      persist();
    }
  });

  // ── Post-agent flow ────────────────────────────────────────────────────────

  pi.on("agent_end", async (event, ctx) => {
    // Execution complete?
    if (mode === "executing" && todos.length > 0) {
      if (todos.every((t) => t.completed)) {
        const completedList = todos.map((t) => `~~${t.text}~~`).join("\n");
        pi.sendMessage(
          { customType: "plan-complete", content: `**Plan Complete!** ✓\n\n${completedList}`, display: true },
          { triggerTurn: false },
        );
        mode = "build";
        todos = [];
        updateUI(ctx);
        persist();
      }
      return;
    }

    // Only show interactive flow in plan mode with UI
    if (mode !== "plan" || !ctx.hasUI) return;

    // Extract tasks from last assistant message
    const lastAssistant = [...event.messages].reverse().find(isAssistantMessage);
    if (lastAssistant) {
      const extracted = extractTodoItems(getTextContent(lastAssistant));
      if (extracted.length > 0) todos = extracted;
    }

    // Display extracted tasks
    if (todos.length > 0) {
      const taskList = todos.map((t) => `${t.step}. ☐ ${t.text}`).join("\n");
      pi.sendMessage(
        { customType: "plan-todo-list", content: `**Plan Tasks (${todos.length}):**\n\n${taskList}`, display: true },
        { triggerTurn: false },
      );
      persist();
    }

    // Interactive menu
    const choices = [
      todos.length > 0 ? "Execute the plan" : "Execute (switch to build mode)",
      "Refine the plan",
      "Stay in plan mode",
    ];
    const choice = await ctx.ui.select("Plan ready — what next?", choices);

    if (choice?.startsWith("Execute")) {
      enterBuild(ctx, true);
      const execMsg = todos.length > 0
        ? `Execute the plan step by step. Start with step 1: ${todos[0].text}\n\nAfter completing each step, include [DONE:n] in your response.`
        : "Execute the plan you just created.";
      pi.sendMessage(
        { customType: "plan-mode-execute", content: execMsg, display: true },
        { triggerTurn: true },
      );
    } else if (choice?.startsWith("Refine")) {
      const refinement = await ctx.ui.editor("Refine the plan:", "");
      if (refinement?.trim()) pi.sendUserMessage(refinement.trim());
    }
  });

  // ── Session restore ────────────────────────────────────────────────────────

  pi.on("session_start", async (_event, ctx) => {
    const entries = ctx.sessionManager.getEntries();

    // Restore persisted state
    const stateEntry = entries
      .filter((e: { type: string; customType?: string }) => e.type === "custom" && e.customType === STATE_KEY)
      .pop() as { data?: PlanState } | undefined;

    if (stateEntry?.data) {
      mode = stateEntry.data.mode ?? "build";
      todos = stateEntry.data.todos ?? [];
      savedTools = stateEntry.data.savedTools ?? null;

      // Re-scan for [DONE:n] since last execution marker
      if (mode === "executing" && todos.length > 0) {
        let markerIndex = -1;
        for (let i = entries.length - 1; i >= 0; i--) {
          if ((entries[i] as { customType?: string }).customType === "plan-mode-execute") {
            markerIndex = i;
            break;
          }
        }

        const text = entries
          .slice(markerIndex + 1)
          .filter((e) => e.type === "message" && "message" in e && isAssistantMessage(e.message as AgentMessage))
          .map((e) => getTextContent((e as { message: AssistantMessage }).message))
          .join("\n");
        markCompletedSteps(text, todos);
      }
    }

    if (mode === "plan") pi.setActiveTools([...PLAN_TOOLS]);
    updateUI(ctx);
  });

  // ── Cleanup ────────────────────────────────────────────────────────────────

  pi.on("session_shutdown", async () => {
    savedTools = null;
    mode = "build";
    todos = [];
  });
}
