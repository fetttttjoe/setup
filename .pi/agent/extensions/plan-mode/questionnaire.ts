/**
 * Questionnaire tool — interactive Q&A for plan mode.
 *
 * Registers a "questionnaire" tool that the LLM can call to ask the user
 * clarifying questions with structured options + freeform fallback.
 * Single question: simple option list. Multiple: tab-bar navigation.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Editor, type EditorTheme, Key, matchesKey, Text, type TUI, truncateToWidth } from "@mariozechner/pi-tui";
import { Type } from "typebox";

// ── Types ──────────────────────────────────────────────────────────────────────

interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

interface Question {
  id: string;
  label: string;
  prompt: string;
  options: QuestionOption[];
  allowOther: boolean;
}

interface Answer {
  id: string;
  value: string;
  label: string;
  wasCustom: boolean;
  index?: number;
}

interface QuestionnaireResult {
  questions: Question[];
  answers: Answer[];
  cancelled: boolean;
}

type RenderOption = QuestionOption & { isOther?: boolean };

// ── Schema ─────────────────────────────────────────────────────────────────────

const OptionSchema = Type.Object({
  value: Type.String({ description: "The value returned when selected" }),
  label: Type.String({ description: "Display label for the option" }),
  description: Type.Optional(Type.String({ description: "Optional description shown below label" })),
});

const QuestionSchema = Type.Object({
  id: Type.String({ description: "Unique identifier for this question" }),
  label: Type.Optional(Type.String({ description: "Short tab label, e.g. 'Scope' (defaults to Q1, Q2)" })),
  prompt: Type.String({ description: "The full question text to display" }),
  options: Type.Array(OptionSchema, { description: "Available options" }),
  allowOther: Type.Optional(Type.Boolean({ description: "Allow freeform 'Type something' option (default: true)" })),
});

const QuestionnaireParams = Type.Object({
  questions: Type.Array(QuestionSchema, { description: "Questions to ask the user" }),
});

// ── Registration ───────────────────────────────────────────────────────────────

export function registerQuestionnaireTool(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "questionnaire",
    label: "Questionnaire",
    description:
      "Ask the user one or more clarifying questions. " +
      "Use to gather requirements, preferences, or confirm assumptions before creating a plan. " +
      "Single question: simple option list. Multiple: tab-based interface.",
    promptSnippet: "Ask the user clarifying questions with structured options",
    promptGuidelines: [
      "Use questionnaire when requirements are ambiguous before creating a plan.",
      "Use questionnaire to confirm assumptions about scope, priority, or approach.",
    ],
    parameters: QuestionnaireParams,

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (!ctx.hasUI) {
        return errorResult("Error: UI not available (non-interactive mode)");
      }
      if (params.questions.length === 0) {
        return errorResult("Error: No questions provided");
      }

      const questions: Question[] = params.questions.map((q, i) => ({
        ...q,
        label: q.label || `Q${i + 1}`,
        allowOther: q.allowOther !== false,
      }));

      const result = await ctx.ui.custom<QuestionnaireResult>((tui, theme, _kb, done) =>
        createQuestionnaireUI(tui, theme, questions, done),
      );

      if (result.cancelled) {
        return {
          content: [{ type: "text", text: "User cancelled the questionnaire" }],
          details: result,
        };
      }

      const answerLines = result.answers.map((a) => {
        const label = questions.find((q) => q.id === a.id)?.label || a.id;
        return a.wasCustom
          ? `${label}: user wrote: ${a.label}`
          : `${label}: user selected: ${a.index}. ${a.label}`;
      });

      return {
        content: [{ type: "text", text: answerLines.join("\n") }],
        details: result,
      };
    },

    renderCall(args, theme) {
      const qs = (args.questions as Question[]) || [];
      const count = qs.length;
      const labels = qs.map((q) => q.label || q.id).join(", ");
      let text = theme.fg("toolTitle", theme.bold("questionnaire "));
      text += theme.fg("muted", `${count} question${count !== 1 ? "s" : ""}`);
      if (labels) text += theme.fg("dim", ` (${truncateToWidth(labels, 40)})`);
      return new Text(text, 0, 0);
    },

    renderResult(result, _options, theme) {
      const details = result.details as QuestionnaireResult | undefined;
      if (!details) {
        const first = result.content[0];
        return new Text(first?.type === "text" ? first.text : "", 0, 0);
      }
      if (details.cancelled) {
        return new Text(theme.fg("warning", "Cancelled"), 0, 0);
      }
      const lines = details.answers.map((a) => {
        const display = a.wasCustom ? `${theme.fg("muted", "(wrote) ")}${a.label}` : a.index ? `${a.index}. ${a.label}` : a.label;
        return `${theme.fg("success", "✓ ")}${theme.fg("accent", a.id)}: ${display}`;
      });
      return new Text(lines.join("\n"), 0, 0);
    },
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function errorResult(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    details: { questions: [], answers: [], cancelled: true } as QuestionnaireResult,
  };
}

// ── UI component ───────────────────────────────────────────────────────────────

function createQuestionnaireUI(
  tui: TUI,
  theme: { fg: (color: string, text: string) => string; bg: (color: string, text: string) => string; bold: (text: string) => string },
  questions: Question[],
  done: (result: QuestionnaireResult) => void,
) {
  const isMulti = questions.length > 1;
  const totalTabs = questions.length + 1; // questions + Submit

  let currentTab = 0;
  let optionIndex = 0;
  let inputMode = false;
  let inputQuestionId: string | null = null;
  let cachedLines: string[] | undefined;
  const answers = new Map<string, Answer>();

  const editorTheme: EditorTheme = {
    borderColor: (s) => theme.fg("accent", s),
    selectList: {
      selectedPrefix: (t) => theme.fg("accent", t),
      selectedText: (t) => theme.fg("accent", t),
      description: (t) => theme.fg("muted", t),
      scrollInfo: (t) => theme.fg("dim", t),
      noMatch: (t) => theme.fg("warning", t),
    },
  };
  const editor = new Editor(tui, editorTheme);

  // ── Internal helpers ───────────────────────────────────────────────────────

  function refresh() {
    cachedLines = undefined;
    tui.requestRender();
  }

  function submit(cancelled: boolean) {
    done({ questions, answers: Array.from(answers.values()), cancelled });
  }

  function activeQuestion(): Question | undefined {
    return questions[currentTab];
  }

  function activeOptions(): RenderOption[] {
    const q = activeQuestion();
    if (!q) return [];
    const opts: RenderOption[] = [...q.options];
    if (q.allowOther) opts.push({ value: "__other__", label: "Type something.", isOther: true });
    return opts;
  }

  function allAnswered(): boolean {
    return questions.every((question) => answers.has(question.id));
  }

  function advanceAfterAnswer() {
    if (!isMulti) { submit(false); return; }
    currentTab = currentTab < questions.length - 1 ? currentTab + 1 : questions.length;
    optionIndex = 0;
    refresh();
  }

  editor.onSubmit = (value) => {
    if (!inputQuestionId) return;
    const trimmed = value.trim() || "(no response)";
    answers.set(inputQuestionId, { id: inputQuestionId, value: trimmed, label: trimmed, wasCustom: true });
    inputMode = false;
    inputQuestionId = null;
    editor.setText("");
    advanceAfterAnswer();
  };

  // ── Input handling ─────────────────────────────────────────────────────────

  function handleInput(data: string) {
    // Editor mode: route everything to the inline editor
    if (inputMode) {
      if (matchesKey(data, Key.escape)) {
        inputMode = false;
        inputQuestionId = null;
        editor.setText("");
        refresh();
      } else {
        editor.handleInput(data);
        refresh();
      }
      return;
    }

    // Tab navigation (multi-question only)
    if (isMulti && (matchesKey(data, Key.tab) || matchesKey(data, Key.right))) {
      currentTab = (currentTab + 1) % totalTabs;
      optionIndex = 0;
      refresh();
      return;
    }
    if (isMulti && (matchesKey(data, Key.shift("tab")) || matchesKey(data, Key.left))) {
      currentTab = (currentTab - 1 + totalTabs) % totalTabs;
      optionIndex = 0;
      refresh();
      return;
    }

    // Submit tab
    if (currentTab === questions.length) {
      if (matchesKey(data, Key.enter) && allAnswered()) submit(false);
      else if (matchesKey(data, Key.escape)) submit(true);
      return;
    }

    // Option navigation
    const opts = activeOptions();
    if (matchesKey(data, Key.up)) { optionIndex = Math.max(0, optionIndex - 1); refresh(); return; }
    if (matchesKey(data, Key.down)) { optionIndex = Math.min(opts.length - 1, optionIndex + 1); refresh(); return; }

    // Select
    const q = activeQuestion();
    if (matchesKey(data, Key.enter) && q) {
      const opt = opts[optionIndex];
      if (opt.isOther) {
        inputMode = true;
        inputQuestionId = q.id;
        editor.setText("");
      } else {
        answers.set(q.id, { id: q.id, value: opt.value, label: opt.label, wasCustom: false, index: optionIndex + 1 });
        advanceAfterAnswer();
      }
      refresh();
      return;
    }

    if (matchesKey(data, Key.escape)) submit(true);
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  function render(width: number): string[] {
    if (cachedLines) return cachedLines;

    const lines: string[] = [];
    const add = (s: string) => lines.push(truncateToWidth(s, width));
    const q = activeQuestion();
    const opts = activeOptions();

    add(theme.fg("accent", "─".repeat(width)));

    // Tab bar
    if (isMulti) {
      const tabs: string[] = ["← "];
      for (let i = 0; i < questions.length; i++) {
        const active = i === currentTab;
        const answered = answers.has(questions[i].id);
        const lbl = ` ${answered ? "■" : "□"} ${questions[i].label} `;
        tabs.push((active ? theme.bg("selectedBg", theme.fg("text", lbl)) : theme.fg(answered ? "success" : "muted", lbl)) + " ");
      }
      const canSubmit = allAnswered();
      const submitLbl = " ✓ Submit ";
      tabs.push(
        (currentTab === questions.length
          ? theme.bg("selectedBg", theme.fg("text", submitLbl))
          : theme.fg(canSubmit ? "success" : "dim", submitLbl)) + " →",
      );
      add(` ${tabs.join("")}`);
      lines.push("");
    }

    // Option list renderer
    function renderOptions() {
      for (let i = 0; i < opts.length; i++) {
        const opt = opts[i];
        const sel = i === optionIndex;
        const prefix = sel ? theme.fg("accent", "> ") : "  ";
        const label = `${i + 1}. ${opt.label}${opt.isOther && inputMode ? " ✎" : ""}`;
        add(prefix + theme.fg(sel || (opt.isOther && inputMode) ? "accent" : "text", label));
        if (opt.description) add(`     ${theme.fg("muted", opt.description)}`);
      }
    }

    // Body
    if (inputMode && q) {
      add(theme.fg("text", ` ${q.prompt}`));
      lines.push("");
      renderOptions();
      lines.push("");
      add(theme.fg("muted", " Your answer:"));
      for (const line of editor.render(width - 2)) add(` ${line}`);
      lines.push("");
      add(theme.fg("dim", " Enter to submit • Esc to cancel"));
    } else if (currentTab === questions.length) {
      add(theme.fg("accent", theme.bold(" Ready to submit")));
      lines.push("");
      for (const question of questions) {
        const answer = answers.get(question.id);
        if (answer) {
          add(`${theme.fg("muted", ` ${question.label}: `)}${theme.fg("text", (answer.wasCustom ? "(wrote) " : "") + answer.label)}`);
        }
      }
      lines.push("");
      if (allAnswered()) {
        add(theme.fg("success", " Press Enter to submit"));
      } else {
        const missing = questions.filter((question) => !answers.has(question.id)).map((question) => question.label).join(", ");
        add(theme.fg("warning", ` Unanswered: ${missing}`));
      }
    } else if (q) {
      add(theme.fg("text", ` ${q.prompt}`));
      lines.push("");
      renderOptions();
    }

    lines.push("");
    if (!inputMode) {
      add(theme.fg("dim", isMulti ? " Tab/←→ navigate • ↑↓ select • Enter confirm • Esc cancel" : " ↑↓ navigate • Enter select • Esc cancel"));
    }
    add(theme.fg("accent", "─".repeat(width)));

    cachedLines = lines;
    return lines;
  }

  return { render, invalidate: () => { cachedLines = undefined; }, handleInput };
}
