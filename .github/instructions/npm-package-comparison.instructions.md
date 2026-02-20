---
name: npm-package-comparison
description: Compare Copilot's proposed implementation with popular npm packages that solve the same problem. Examine trade-offs and recommend the npm package when it is compatible with package.json and improves maintainability. Use whenever Copilot proposes custom utility code, helper functions, or any logic that a well-known npm package already handles.
---

# npm Package Comparison Skill

Before finalizing any custom implementation, compare it against popular npm packages that solve the same problem. Prefer a well-maintained npm package over hand-rolled code when it reduces complexity and improves long-term maintainability.

## When to Use This Skill

- Copilot proposes a custom utility function (e.g., date formatting, URL parsing, deep cloning)
- Copilot writes custom HTTP/fetch wrappers or request helpers
- Copilot implements string manipulation, validation, or parsing logic from scratch
- Copilot creates custom data-structure helpers (debounce, throttle, groupBy, etc.)
- Copilot adds file-system, path, or environment-variable helpers
- Any time the phrase "let me write a helper for that" appears in a suggestion

## Evaluation Process

### Step 1 – Identify the Problem Domain

State clearly what the proposed code does in one sentence.
Example: _"This function deep-merges two plain objects."_

### Step 2 – Research Popular npm Alternatives

Search for packages that solve the same problem. Prioritize packages that are:

- **Widely adopted** – millions of weekly downloads on npmjs.com

- **Actively maintained** – recent commits, low open-bug ratio
- **TypeScript-first or well-typed** – ships `@types/*` or built-in types
- **Lightweight** – small bundle size (check bundlephobia.com)
- **Permissively licensed** – MIT, ISC, or Apache-2.0


### Step 3 – Check Compatibility with `package.json`

Before recommending a package, verify:

1. **Node/runtime compatibility** – confirm the package supports the Node version used by the project.
2. **ESM/CJS** – the project uses `"type": "module"` in `package.json`; the package must support ESM or provide an ESM build.
3. **Peer-dependency conflicts** – run a mental (or actual) `npm install --dry-run` to catch version conflicts with existing dependencies (e.g., React, Next.js, TypeScript versions currently listed in `package.json`).
4. **Already installed** – check whether the project already has a package that covers the need before adding a new one.

### Step 4 – Analyse Trade-offs

Produce a concise comparison table:

| Criterion | Custom implementation | npm package |
|---|---|---|
| Lines of code | _N lines_ | _~0 (usage only)_ |
| Test coverage needed | Yes – must be written | Covered by package's own tests |
| TypeScript types | Manual | Included / `@types/*` available |
| Bundle size impact | Minimal | Check bundlephobia |
| Maintenance burden | Owned by this team | Delegated to package maintainers |
| Edge-case handling | Potentially incomplete | Battle-tested across many projects |
| Upgrade path | N/A | Standard `npm update` |

### Step 5 – Recommendation

Apply this decision rule:

> **Use the npm package** when ALL of the following are true:
> 1. It solves the exact problem with no meaningful over-engineering.
> 2. It is compatible with the project's `package.json` (ESM, peer deps, Node version).
> 3. It is actively maintained (last release within 12 months, no critical open CVEs).
> 4. It reduces the total lines of project-owned code that must be tested and maintained.
>
> **Keep the custom implementation** when:
> - No suitable package exists or all candidates are abandoned/unmaintained.
> - The package is far heavier than the problem warrants (e.g., pulling in lodash for one `clamp` call—use `Math.min(max, Math.max(min, value))` instead).
> - Adding the dependency introduces a peer-dependency conflict that cannot be resolved cleanly.
> - The custom code is fewer than ~10 lines, trivial to test, and unlikely to evolve.

## Output Structure

```markdown
## Problem
[One-sentence description of what the proposed code does]

## Popular npm Alternatives
| Package | Weekly Downloads | Last Release | Bundle Size | License |
|---------|-----------------|--------------|-------------|---------|
| [pkg-a](https://npmjs.com/package/pkg-a) | ~Xm | YYYY-MM | Xkb | MIT |
| [pkg-b](https://npmjs.com/package/pkg-b) | ~Xm | YYYY-MM | Xkb | MIT |

## Compatibility Check
- **ESM support**: ✅ / ❌
- **Peer-dependency conflicts**: none / [list conflicts]
- **Already in package.json**: yes ([existing-pkg]) / no

## Trade-off Analysis
[Comparison table from Step 4]

## Recommendation
**Use [package-name]** / **Keep custom implementation**

### Rationale
[Two to four sentences explaining the decision]

### Migration (if recommending npm package)
```typescript
// Before (custom)
import { myHelper } from './utils/myHelper';

// After (npm package)
import { helperFn } from 'package-name';
```
```

## Common Patterns and Known Good Packages

The table below covers problem domains frequently encountered in this project (Next.js / React / Node.js / TypeScript):

| Problem domain | Recommended package(s) | Notes |
|---|---|---|
| HTTP requests | [`axios`](https://npmjs.com/package/axios) ✅ already installed | Already in `package.json` |
| HTML parsing / scraping | [`cheerio`](https://npmjs.com/package/cheerio) ✅ already installed | Already in `package.json` |
| Domain name parsing | [`psl`](https://npmjs.com/package/psl) ✅ already installed | Already in `package.json` |
| robots.txt parsing | [`robots-parser`](https://npmjs.com/package/robots-parser) ✅ already installed | Already in `package.json` |
| Environment variables | [`dotenv`](https://npmjs.com/package/dotenv) ✅ already installed | Already in `package.json` |
| Date/time manipulation | [`date-fns`](https://npmjs.com/package/date-fns) or [`dayjs`](https://npmjs.com/package/dayjs) | Prefer `date-fns` for tree-shaking; check bundle size vs native `Intl` |
| Schema validation | [`zod`](https://npmjs.com/package/zod) | TypeScript-first, zero deps |
| Deep object utilities | [`lodash-es`](https://npmjs.com/package/lodash-es) | ESM build; import individual functions |
| URL parsing / building | Node built-in `URL` / `URLSearchParams` | No package needed |
| Slug / URL-safe strings | [`slugify`](https://npmjs.com/package/slugify) | Lightweight, well-typed |
| Markdown → HTML | [`marked`](https://npmjs.com/package/marked) or [`unified`](https://npmjs.com/package/unified) | Check if Next.js MDX plugin is already configured |
| Classname merging (React) | [`clsx`](https://npmjs.com/package/clsx) | Tiny; pairs well with PandaCSS/Tailwind |
| Form handling (React) | [`react-hook-form`](https://npmjs.com/package/react-hook-form) | Minimal re-renders; Zod integration |
| Accessibility testing | [`axe-core`](https://npmjs.com/package/axe-core) | Integrates with Vitest/Playwright |

## Sustainability Consideration

Choosing a well-maintained npm package over custom code aligns with the project's Web Sustainability Guidelines goal:

- Fewer custom lines → less code to transmit and parse.
- Battle-tested packages → fewer bugs → fewer patch releases → less CI energy.
- Reusing community work avoids redundant effort across the ecosystem.

## Security Consideration

Before adding any new package:

1. Run `npm audit` after install to surface known CVEs.
2. Use Dependabot (already configured in this repo) to receive automated security updates.
3. Prefer packages with a published security policy and recent patch history.
4. Avoid packages with no activity in the past 24 months or with fewer than 10k weekly downloads unless there is no viable alternative.

## Best Practices

- **Check first, propose second**: Before writing a helper, check `package.json` and the Common Patterns table above.
- **One package per problem**: Don't install two packages that solve the same problem (e.g., both `axios` and `node-fetch`).
- **Justify additions**: Any new `npm install` must be accompanied by a brief rationale explaining why an existing package was insufficient.
- **Prefer existing deps**: When a package already installed in the project can solve the problem (even if it wasn't the original intent), use it rather than adding a new one.
- **Don't over-bundle**: If only one function from a large library is needed, confirm tree-shaking is effective or use a purpose-built micro-package instead.
