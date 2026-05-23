# Condition-Based Waiting

Reference for fixing flaky tests caused by arbitrary `sleep`/`setTimeout`.

**Core principle:** Wait for the actual condition you care about, not a guess about how long it takes.

## When to apply

- Tests use `setTimeout`, `sleep`, `time.sleep`, `Thread.sleep` to "let things settle"
- Tests are flaky — pass on a fast machine, fail in CI or under load
- Tests time out when run in parallel

## When *not* to apply

- You are testing actual timing behaviour (debounce, throttle, retry intervals). Document **why** the literal timeout is required.

## The pattern

```ts
// ❌ guessing at timing
await new Promise(r => setTimeout(r, 50));
const result = getResult();
expect(result).toBeDefined();

// ✅ waiting for the condition
await waitFor(() => getResult() !== undefined);
const result = getResult();
expect(result).toBeDefined();
```

## Quick patterns

| Scenario | Condition |
|---|---|
| Wait for event | `waitFor(() => events.find(e => e.type === 'DONE'))` |
| Wait for state | `waitFor(() => machine.state === 'ready')` |
| Wait for count | `waitFor(() => items.length >= 5)` |
| Wait for file | `waitFor(() => fs.existsSync(path))` |
| Compound | `waitFor(() => obj.ready && obj.value > 10)` |

## Minimal implementation

```ts
async function waitFor<T>(
  condition: () => T | undefined | null | false,
  description: string,
  timeoutMs = 5000,
): Promise<T> {
  const start = Date.now();
  while (true) {
    const result = condition();
    if (result) return result;
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timeout waiting for ${description} after ${timeoutMs}ms`);
    }
    await new Promise(r => setTimeout(r, 10)); // 10ms poll
  }
}
```

## Mistakes to avoid

- **Polling every 1ms** — wastes CPU. 10ms is fine.
- **No timeout** — loops forever if the condition never fires. Always include a timeout with a descriptive error.
- **Caching state outside the loop** — call the getter inside the loop so each iteration sees fresh state.

## When a literal timeout is actually correct

If you genuinely need to wait for timed behaviour (a tool ticks every 100ms, you want to verify two ticks happened), wait for the *triggering condition* first, then sleep for a documented, justified interval:

```ts
await waitForEvent(manager, 'TOOL_STARTED'); // condition first
await new Promise(r => setTimeout(r, 200));  // then 2 ticks at 100ms — known timing, documented
```

Requirements: (1) wait for the triggering condition first, (2) interval based on known timing not guessing, (3) comment explaining why.
