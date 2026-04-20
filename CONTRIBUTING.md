# Contributing to WSG-Check

Thank you for your interest in contributing to WSG-Check! This guide will help you get started with local development, testing, and submitting pull requests.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Running Tests](#running-tests)
- [Code Style](#code-style)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

---

## Development Setup

### Prerequisites

- **Node.js** v22 or later
- **npm** v10 or later
- **Git**

### 1. Fork and Clone

```bash
git clone https://github.com/ivanoats/wsg-check.git
cd wsg-check
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Generate Panda CSS Tokens

The project uses [Panda CSS](https://panda-css.com/) for styling. Generate the token files before running the dev server:

```bash
npm run prepare
```

### 4. Copy Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in any required values (see `.env.example` for documentation).

### 5. Start the Development Server

```bash
npm run dev
```

The app will be available at <http://localhost:3000>.

---

## Project Structure

```
wsg-check/
├── src/
│   ├── api/          # Next.js Route Handlers (REST API)
│   ├── app/          # Next.js App Router pages and components
│   ├── checks/       # Individual WSG check functions
│   ├── cli/          # Command-line interface (commander)
│   ├── config/       # Configuration loader and defaults
│   ├── core/         # WsgChecker, CheckRunner, scorer
│   ├── report/       # Report types and formatters
│   ├── types/        # Shared TypeScript types
│   └── utils/        # HTTP client, HTML parser, logger, etc.
├── tests/
│   ├── e2e/          # Playwright end-to-end tests
│   ├── integration/  # Full-pipeline integration tests
│   └── unit/         # Unit tests (mirrors src/ structure)
├── public/           # Static assets
└── ...
```

The codebase follows **Hexagonal Architecture**: domain logic (`core/`, `checks/`) has zero knowledge of frameworks or I/O. All I/O is handled by adapters in the outermost layer (`api/`, `cli/`, `app/`).

---

## Running Tests

### Unit & Integration Tests

```bash
# Run all tests once
npm run test:run

# Run all tests with coverage report
npm run test:coverage

# Run tests in watch mode
npm test
```

Coverage must remain at or above **80%**. The project currently achieves ~98% statement coverage.

### End-to-End Tests (Playwright)

```bash
# Build the project first
npm run build

# Run Playwright tests
npm run test:e2e
```

### Accessibility Tests (pa11y-ci)

```bash
# Start the production server in the background, then:
npm run test:a11y
```

### Performance Tests (Lighthouse CI)

```bash
npm run test:lighthouse
```

---

## Code Style

### TypeScript

All TypeScript code is written in a **functional programming style**:

- Use `const` arrow functions with explicit return types
- Prefer `readonly` properties and `ReadonlyArray<T>` to prevent mutation
- Use `map` / `filter` / `reduce` instead of imperative `for` loops
- Return `Result<T, E>` discriminated unions at public boundaries instead of throwing
- Avoid `class` unless mutable state is genuinely required

### Formatting & Linting

The project uses [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/). Run both before committing:

```bash
# Check for lint errors
npm run lint

# Auto-fix lint errors
npm run lint:fix

# Format all files
npm run format

# Check formatting without writing
npm run format:check

# Type-check without emitting
npm run type-check
```

[Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/okonet/lint-staged) are configured to run linting and formatting automatically on `git commit`.

---

## Submitting a Pull Request

> **Contributor License Agreement (CLA)**
> By opening a pull request you agree to the terms of the [CLA](./CLA.md). Add a `Signed-off-by` trailer to every commit (`git commit -s`) to indicate your acceptance.

1. **Create a branch** from `main`:

   ```bash
   git checkout -b feat/my-feature
   ```

2. **Make your changes** following the code-style guidelines above.

3. **Write or update tests** to cover the new behaviour. Aim for ≥80% coverage on changed files.

4. **Run the full test suite** locally and confirm everything passes:

   ```bash
   npm run lint && npm run type-check && npm run test:run
   ```

5. **Commit** with a descriptive message following [Conventional Commits](https://www.conventionalcommits.org/) and include a `Signed-off-by` trailer:

   ```
   feat: add check for unused CSS

   Signed-off-by: Your Name <your-email@example.com>
   ```

   Use `git commit -s` to add the sign-off automatically.

6. **Open a PR** against `main` and fill in the PR template.

CI will run lint, type-check, tests (with coverage upload to Codecov), build, accessibility (pa11y-ci), and performance (Lighthouse CI) checks automatically.

---

## Reporting Bugs

Please [open an issue](https://github.com/ivanoats/wsg-check/issues/new) and include:

- A clear title and description
- Steps to reproduce the problem
- Expected vs. actual behaviour
- Node.js and npm versions (`node -v && npm -v`)
- Any relevant error output or screenshots

---

## Requesting Features

Open an issue with the `enhancement` label describing:

- The problem you are trying to solve
- Your proposed solution or approach
- Any relevant WSG guideline references (<https://www.w3.org/TR/web-sustainability-guidelines/>)
