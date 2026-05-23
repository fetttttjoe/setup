/**
 * pi extension: security-guidance
 *
 * Port of Anthropic's `claude-plugins-official/plugins/security-guidance`
 * (https://github.com/anthropics/claude-plugins-official) to pi's extension API.
 *
 * Intercepts `edit` / `write` tool calls and blocks them when the new content
 * (or the target path) matches a known unsafe pattern: command injection,
 * eval / new Function, dangerous DOM sinks, pickle deserialisation,
 * os.system, GitHub Actions expression injection. Returns the security
 * reminder as the block reason so the model gets the context and can choose
 * a safer pattern.
 *
 * ── Differences vs the upstream Claude Code plugin ───────────────────────────
 *   1. Dedup state is in-memory (pi extensions are long-lived in-process),
 *      not file-based. Keyed by `${path}::${ruleName}` so the same warning
 *      doesn't block the same file repeatedly within a session.
 *   2. Pi's `edit` tool takes `edits[]` (an array of {oldText, newText});
 *      the upstream MultiEdit handling is unified into that.
 *   3. Disabled with `ENABLE_SECURITY_REMINDER=0` (same env var name as
 *      upstream, for muscle memory).
 *
 * Disable: `ENABLE_SECURITY_REMINDER=0 pi`
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type PathCheck = (path: string) => boolean;

interface PathPattern {
	ruleName: string;
	pathCheck: PathCheck;
	reminder: string;
}

interface ContentPattern {
	ruleName: string;
	substrings: string[];
	reminder: string;
}

type Pattern = PathPattern | ContentPattern;

const PATTERNS: Pattern[] = [
	{
		ruleName: "github_actions_workflow",
		pathCheck: (p) =>
			p.includes(".github/workflows/") && (p.endsWith(".yml") || p.endsWith(".yaml")),
		reminder: `You are editing a GitHub Actions workflow file. Be aware of these security risks:

1. Command Injection: Never use untrusted input (issue titles, PR descriptions, commit messages) directly in run: commands without proper escaping.
2. Use environment variables: instead of \${{ github.event.issue.title }}, use env: with proper quoting.
3. Reference: https://github.blog/security/vulnerability-research/how-to-catch-github-actions-workflow-injections-before-attackers-do/

UNSAFE:
  run: echo "\${{ github.event.issue.title }}"

SAFE:
  env:
    TITLE: \${{ github.event.issue.title }}
  run: echo "$TITLE"

Risky inputs to be careful with: github.event.issue.{title,body}, github.event.pull_request.{title,body,head.{ref,label,repo.default_branch}}, github.event.{comment,review,review_comment}.body, github.event.{commits.*,head_commit}.{message,author.{name,email}}, github.head_ref, github.event.pages.*.page_name.`,
	},
	{
		ruleName: "child_process_exec",
		substrings: ["child_process.exec", "exec(", "execSync("],
		reminder: `⚠️ Security: child_process.exec()/execSync() are shell-spawning APIs and are a common command-injection vector.

Prefer execFile / spawn with an argv array — they bypass the shell and the user input becomes a literal argument, not a shell token:

  // unsafe
  exec(\`grep \${userInput} file.txt\`)

  // safe
  execFile("grep", [userInput, "file.txt"])

Only use exec() if you need shell features (pipes, glob, redirection) AND every interpolated value is statically known.`,
	},
	{
		ruleName: "new_function_injection",
		substrings: ["new Function"],
		reminder: `⚠️ Security: new Function() with dynamic strings is code injection. Use a real parser, JSON.parse, or a plugin/handler registry instead. Only acceptable if you genuinely need to evaluate arbitrary user-provided code (sandbox required).`,
	},
	{
		ruleName: "eval_injection",
		substrings: ["eval("],
		reminder: `⚠️ Security: eval() executes arbitrary code and is the canonical injection vector. Use JSON.parse for data, a parser for expressions, or a dispatch table for "dynamic" behaviour. Almost never the right answer.`,
	},
	{
		ruleName: "react_dangerously_set_html",
		substrings: ["dangerouslySetInnerHTML"],
		reminder: `⚠️ Security: dangerouslySetInnerHTML opens the door to XSS when the content is not strictly trusted. Sanitise with DOMPurify or render the value as text. Never pass user-supplied HTML through unfiltered.`,
	},
	{
		ruleName: "document_write_xss",
		substrings: ["document.write"],
		reminder: `⚠️ Security: document.write() is both an XSS sink and a parser-blocking performance hazard. Use createElement / appendChild or framework-native rendering.`,
	},
	{
		ruleName: "innerHTML_xss",
		substrings: [".innerHTML =", ".innerHTML="],
		reminder: `⚠️ Security: Setting innerHTML with untrusted content is XSS. Use textContent for plain text, DOM methods for structured HTML, or sanitise with DOMPurify if HTML really must be accepted.`,
	},
	{
		ruleName: "pickle_deserialization",
		substrings: ["pickle"],
		reminder: `⚠️ Security: pickle deserialises arbitrary objects, which can trigger arbitrary code execution. Use JSON, msgpack, or protobuf for untrusted input. Pickle is only safe for data you produced yourself in the same trust boundary.`,
	},
	{
		ruleName: "os_system_injection",
		substrings: ["os.system", "from os import system"],
		reminder: `⚠️ Security: os.system() invokes a shell. Use subprocess.run([...], shell=False) with an argv list, and never interpolate untrusted strings into the command. shell=True is the injection vector.`,
	},
];

const ENABLE_ENV = "ENABLE_SECURITY_REMINDER";

function isPathPattern(p: Pattern): p is PathPattern {
	return "pathCheck" in p;
}

function checkPatterns(path: string, content: string): { ruleName: string; reminder: string } | null {
	const normalised = path.replace(/^\/+/, "");
	for (const pattern of PATTERNS) {
		if (isPathPattern(pattern)) {
			if (pattern.pathCheck(normalised)) {
				return { ruleName: pattern.ruleName, reminder: pattern.reminder };
			}
		} else if (content) {
			for (const needle of pattern.substrings) {
				if (content.includes(needle)) {
					return { ruleName: pattern.ruleName, reminder: pattern.reminder };
				}
			}
		}
	}
	return null;
}

function extractContent(toolName: string, input: Record<string, unknown>): string {
	if (toolName === "write") {
		return typeof input.content === "string" ? input.content : "";
	}
	if (toolName === "edit") {
		const edits = Array.isArray(input.edits) ? input.edits : [];
		return edits
			.map((e) => {
				if (e && typeof e === "object" && "newText" in e && typeof (e as { newText: unknown }).newText === "string") {
					return (e as { newText: string }).newText;
				}
				return "";
			})
			.join("\n");
	}
	return "";
}

export default function (pi: ExtensionAPI) {
	if (process.env[ENABLE_ENV] === "0") {
		return;
	}

	// (path, ruleName) pairs we've already surfaced this session — don't re-block.
	const shown = new Set<string>();

	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName !== "edit" && event.toolName !== "write") {
			return undefined;
		}

		const input = event.input as Record<string, unknown>;
		const path = typeof input.path === "string" ? input.path : "";
		if (!path) return undefined;

		const content = extractContent(event.toolName, input);
		const hit = checkPatterns(path, content);
		if (!hit) return undefined;

		const key = `${path}::${hit.ruleName}`;
		if (shown.has(key)) {
			// Already warned this session for this file+rule — let it through.
			return undefined;
		}
		shown.add(key);

		if (ctx.hasUI) {
			ctx.ui.notify(`Security: ${hit.ruleName} in ${path}`, "warning");
		}

		return {
			block: true,
			reason: hit.reminder,
		};
	});
}
