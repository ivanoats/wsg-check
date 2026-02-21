---
applyTo: '**/*.{ts,tsx}'
description: TypeScript functional programming style guide for wsg-check. Prefer pure functions, immutability, and composition over classes and mutation.
---

# TypeScript Functional Programming Style

Write all TypeScript in a **functional programming style**. This project uses
functional patterns throughout (pure check functions, `Result<T, E>` discriminated
unions, `readonly` types). New code must follow the same conventions.

## Core Rules

### 1. Prefer pure functions

A pure function has no side effects and always returns the same value for the
same arguments.

```typescript
// ✅ pure – depends only on its argument
const toKb = (bytes: number): number => Math.round(bytes / 1024)

// ❌ impure – reads from module-level mutable state
let factor = 1024
const toKb = (bytes: number): number => Math.round(bytes / factor)
```

### 2. Use `const` arrow functions

Declare functions with `const` and explicit return types.

```typescript
// ✅
const add = (a: number, b: number): number => a + b

// ❌ avoid
function add(a: number, b: number) {
  return a + b
}
```

### 3. Immutability by default

Mark all object/array properties as `readonly`. Use `Readonly<T>` and
`ReadonlyArray<T>` for data that must not be mutated after creation.

```typescript
// ✅
interface Config {
  readonly baseUrl: string
  readonly timeout: number
}

const processItems = (items: ReadonlyArray<string>): string[] =>
  items.map((s) => s.trim())

// ❌ mutable by default
interface Config {
  baseUrl: string
  timeout: number
}
```

### 4. Prefer `map` / `filter` / `reduce` over imperative loops

Use array higher-order functions for data transformation.

```typescript
// ✅
const failedChecks = results.filter((r) => r.status === 'fail')
const scores = results.map((r) => r.score)
const total = scores.reduce((sum, s) => sum + s, 0)

// ❌ imperative
const failedChecks: CheckResult[] = []
for (const r of results) {
  if (r.status === 'fail') failedChecks.push(r)
}
```

### 5. Use discriminated unions instead of throwing

At module and API boundaries, return a `Result<T, E>` (already defined in
`src/utils/errors.ts`) instead of throwing exceptions.

```typescript
import { ok, err, type Result } from '../utils/errors.js'
import { FetchError } from '../utils/errors.js'

// ✅ callers can handle errors without try/catch
const fetchPage = async (url: string): Promise<Result<PageData, FetchError>> => {
  try {
    const data = await doFetch(url)
    return ok(data)
  } catch (e) {
    return err(new FetchError('fetch failed', url, e))
  }
}

// ❌ forces callers to use try/catch
const fetchPage = async (url: string): Promise<PageData> => {
  // throws on failure
  return doFetch(url)
}
```

### 6. Compose small, single-purpose functions

Each function should do one thing. Build complexity by composing small
functions.

```typescript
// ✅ composed from small helpers
const summarise = (results: ReadonlyArray<CheckResult>): string =>
  [formatScore(calcScore(results)), formatIssues(filterFailed(results))].join('\n')

// ❌ monolithic
const summarise = (results: CheckResult[]): string => {
  let score = 0
  const failed: string[] = []
  for (const r of results) {
    score += r.score
    if (r.status === 'fail') failed.push(r.message)
  }
  return `Score: ${score / results.length}\n${failed.join(', ')}`
}
```

### 7. Avoid `class` unless genuinely necessary

Prefer module-level exported functions over classes. Use a `class` only when
you need encapsulated mutable state (e.g., a connection pool or a runner that
accumulates registrations).

```typescript
// ✅ module-level functions for stateless logic
export const checkPageWeight: CheckFn = (page) => { ... }

// ⚠️  class is acceptable only when mutable state is truly needed
export class CheckRunner {
  private readonly checks: CheckFn[] = []
  register(check: CheckFn): this { ... }
}
```

### 8. Avoid mutation

Never push to arrays or mutate object properties after creation. Derive new
values instead.

```typescript
// ✅ derive a new array
const withExtra = [...existing, newItem]

// ❌ mutates in place
existing.push(newItem)
```

### 9. Use TypeScript utility types

Prefer built-in utility types over re-defining shapes.

```typescript
// ✅
type PartialConfig = Partial<Config>
type UrlOnly = Pick<PageData, 'url'>
type WithoutScore = Omit<CheckResult, 'score'>

// ❌ manual re-definition
type PartialConfig = { baseUrl?: string; timeout?: number }
```

### 10. Prefer `type` for unions; `interface` for extendable shapes

```typescript
// ✅ union type
type Status = 'pass' | 'fail' | 'warn' | 'info' | 'not-applicable'

// ✅ interface for an object shape that might be extended/merged
export interface CheckResult {
  guidelineId: string
  status: Status
}
```

## Checklist for Code Reviews

When reviewing TypeScript code, verify:

- [ ] All new functions are declared with `const` and have explicit return types
- [ ] Properties are `readonly` unless mutation is explicitly needed
- [ ] `map` / `filter` / `reduce` used instead of `for` loops for data transformation
- [ ] No `class` added without justification in the PR description
- [ ] No thrown exceptions at public API boundaries — use `Result<T, E>` instead
- [ ] No mutation of arrays or objects after creation
- [ ] Functions are single-purpose and ≤ 40 lines
- [ ] Complex operations composed from smaller named helpers
