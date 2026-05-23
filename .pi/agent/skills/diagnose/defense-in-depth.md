# Defense in Depth

Reference for bugs caused by invalid data flowing through multiple layers.

**Core principle:** Validate at every layer the data passes through. Make the bug *structurally* impossible, not just blocked at one chokepoint.

This complements — does not replace — the root-cause fix from Phase 5 of the main diagnose loop. The root-cause fix tells you *why* the data got bad. Defense in depth ensures bad data of that shape cannot survive the system again.

## When to apply

- The bug was caused by an invalid value (empty string, null, wrong type) reaching code that assumed it was valid.
- The value passed through multiple layers without being checked.
- Different call paths could re-introduce the same bug (a refactor, a test mock, a new caller).

## When *not* to apply

- The bug was a logic error in one specific location and adding checks elsewhere would be ceremony, not safety.
- You're tempted to wrap broken state in a `try/catch` — that's not defense in depth, that's a band-aid. (See engineering-standards rule 3.)

## The four layers

### 1. Entry-point validation

Reject obviously invalid input at the API boundary.

```ts
function createProject(name: string, workingDirectory: string) {
  if (!workingDirectory?.trim()) throw new Error('workingDirectory cannot be empty');
  if (!existsSync(workingDirectory)) throw new Error(`workingDirectory does not exist: ${workingDirectory}`);
  if (!statSync(workingDirectory).isDirectory()) throw new Error(`workingDirectory is not a directory: ${workingDirectory}`);
}
```

### 2. Business-logic validation

Ensure the data makes sense for the operation about to happen.

```ts
function initializeWorkspace(projectDir: string, sessionId: string) {
  if (!projectDir) throw new Error('projectDir required for workspace initialization');
}
```

### 3. Environment guards

Prevent dangerous operations in specific contexts (tests, sandboxes, production).

```ts
async function gitInit(directory: string) {
  if (process.env.NODE_ENV === 'test') {
    const dir = normalize(resolve(directory));
    const tmp = normalize(resolve(tmpdir()));
    if (!dir.startsWith(tmp)) {
      throw new Error(`Refusing git init outside temp dir during tests: ${directory}`);
    }
  }
}
```

### 4. Debug instrumentation

When other layers fail, capture context for forensics.

```ts
logger.debug('About to git init', { directory, cwd: process.cwd(), stack: new Error().stack });
```

## Process

1. **Trace the data flow.** Where does the bad value originate? Every function it passes through.
2. **Map the checkpoints.** List every layer between origin and the damaging call.
3. **Add a check at each layer that makes sense.** Not every layer needs all four — pick the ones that catch real cases.
4. **Test each layer.** Bypass layer 1 in a test, confirm layer 2 catches it. Each layer should be independently effective.

## Key insight

In a real session that motivated this pattern (1847-test repo), all four layers caught bugs the others missed:
- Different call paths bypassed entry validation
- Mocks bypassed business-logic checks
- Platform edge cases needed environment guards
- Debug logging surfaced structural misuse no other layer saw

A single check is a fix. Multiple checks make the bug impossible.

## What this is *not*

This is not "wrap everything in try/catch and log". That's defensive programming gone wrong — it hides bugs instead of preventing them. Every layer here either **rejects** bad data with a loud error or **records** context. Nothing silently swallows.
