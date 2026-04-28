/**
 * Pure utility functions for plan mode.
 * No side effects, no pi dependencies — easy to test.
 */

import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { AssistantMessage, TextContent } from "@mariozechner/pi-ai";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TodoItem {
  step: number;
  text: string;
  completed: boolean;
}

export interface PlanState {
  mode: "plan" | "build" | "executing";
  todos: TodoItem[];
  savedTools: string[] | null;
}

// ── Type guards ────────────────────────────────────────────────────────────────

export function isAssistantMessage(m: AgentMessage): m is AssistantMessage {
  return m.role === "assistant" && Array.isArray(m.content);
}

export function getTextContent(message: AssistantMessage): string {
  return message.content
    .filter((block): block is TextContent => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

// ── Plan extraction ────────────────────────────────────────────────────────────

function cleanStepText(text: string): string {
  let cleaned = text
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1") // strip bold/italic
    .replace(/`([^`]+)`/g, "$1")               // strip inline code
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  if (cleaned.length > 60) {
    cleaned = `${cleaned.slice(0, 57)}...`;
  }
  return cleaned;
}

/**
 * Extract numbered steps from a "Plan:" section in markdown text.
 * Returns empty array if no Plan: header is found.
 */
export function extractTodoItems(message: string): TodoItem[] {
  const items: TodoItem[] = [];
  const headerMatch = message.match(/\*{0,2}Plan:\*{0,2}\s*\n/i);
  if (!headerMatch || headerMatch.index === undefined) return items;

  const planSection = message.slice(headerMatch.index + headerMatch[0].length);
  const numberedPattern = /^\s*(\d+)[.)]\s+\*{0,2}([^*\n]+)/gm;

  for (const match of planSection.matchAll(numberedPattern)) {
    const raw = match[2].trim().replace(/\*{1,2}$/, "").trim();
    if (raw.length <= 5) continue;

    const cleaned = cleanStepText(raw);
    if (cleaned.length > 3) {
      items.push({ step: items.length + 1, text: cleaned, completed: false });
    }
  }
  return items;
}

// ── Progress tracking ──────────────────────────────────────────────────────────

/** Find all [DONE:n] markers in text. */
function extractDoneSteps(text: string): number[] {
  const steps: number[] = [];
  for (const match of text.matchAll(/\[DONE:(\d+)\]/gi)) {
    const step = Number(match[1]);
    if (Number.isFinite(step)) steps.push(step);
  }
  return steps;
}

/** Mark todo items complete based on [DONE:n] markers. Returns count of newly marked items. */
export function markCompletedSteps(text: string, items: TodoItem[]): number {
  let marked = 0;
  for (const step of extractDoneSteps(text)) {
    const item = items.find((t) => t.step === step);
    if (item && !item.completed) {
      item.completed = true;
      marked++;
    }
  }
  return marked;
}
