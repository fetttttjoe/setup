# Testing Anti-Patterns

Reference for when writing or changing tests, adding mocks, or tempted to add test-only methods to production code.

**Core principle:** Test what the code does, not what the mocks do. Mocks are a means to isolate, not the thing being tested.

## The five anti-patterns

### 1. Testing mock behaviour

Asserting on the mock itself ("the mock rendered") rather than the real component's behaviour.

```ts
// ❌ verifies the mock exists, not the component
expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument();

// ✅ test real behaviour, or don't mock the dependency at all
expect(screen.getByRole('navigation')).toBeInTheDocument();
```

**Gate before any assertion on a mock:** "Am I testing real behaviour, or just that the mock exists?" If the latter, delete the assertion or remove the mock.

### 2. Test-only methods in production

`destroy()`, `reset()`, `clearAllState()` that only tests call. Pollutes production API and risks accidental misuse.

```ts
// ❌ Session.destroy() is only ever called from tests
afterEach(() => session.destroy());

// ✅ test utilities own test cleanup
afterEach(() => cleanupSession(session));
```

**Gate before adding a method to a production class:** "Is this only used by tests?" If yes → test utility, not production code.

### 3. Mocking without understanding dependencies

Mocking high-level functions that have side effects the test relies on.

```ts
// ❌ mock prevents the config write that the duplicate-detection test depends on
vi.mock('ToolCatalog', () => ({ discoverAndCacheTools: vi.fn().mockResolvedValue(undefined) }));

// ✅ mock the slow/external operation at the right level — preserve behaviour the test needs
vi.mock('MCPServerManager');
```

**Gate before mocking any method:**
1. What side effects does the real method have?
2. Does the test depend on any of those side effects?
3. If unsure: run the test with the real implementation first, observe what it actually needs, then mock minimally at the right level.

Red flags: "I'll mock this to be safe", "this might be slow, better mock it".

### 4. Incomplete mocks

Mocking only the fields the immediate test uses, then downstream code accesses a field you didn't include and fails silently (or worse, silently succeeds).

```ts
// ❌ missing metadata that downstream code reads
const mockResponse = { status: 'success', data: { userId: '123' } };

// ✅ mirror the real API completely
const mockResponse = { status: 'success', data: { userId: '123' }, metadata: { requestId: 'req-789', timestamp: 1234567890 } };
```

**Iron rule:** mock the complete data structure as it exists in reality, not just the fields your immediate test reads.

### 5. Tests as afterthought

"Implementation complete, now I'll write tests." That's not TDD. If you didn't watch the test fail against real code first, you don't know it's testing what you think it tests.

## When mocks become too complex

Warning signs:
- Mock setup is longer than test logic
- Mocking everything to make the test pass
- Mock missing methods the real component has
- Test breaks when you change the mock

**Question to ask:** "Do we actually need a mock here?" An integration test with real components is often simpler than a complex mock.

## Quick reference

| Anti-pattern | Fix |
|---|---|
| Assert on `*-mock` test IDs | Test real component, or unmock |
| Methods only called in test files | Move to test utilities |
| Mock without understanding | Understand dependencies, then mock minimally at the right level |
| Incomplete mocks | Mirror the real API |
| Tests written after implementation | Red-green-refactor; tests first |
| Over-complex mocks | Consider integration test with real components |

## The bottom line

If TDD reveals you're testing mock behaviour, you've gone wrong. Test real behaviour, or question why you're mocking at all.
