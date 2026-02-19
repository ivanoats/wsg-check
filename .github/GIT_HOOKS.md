# Git Hooks Setup

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged) to automatically run code quality checks before commits and pushes.

## What's Configured

### Pre-commit Hook

Runs automatically before every commit:

- **ESLint**: Fixes linting errors in staged JavaScript/TypeScript files
- **Prettier**: Formats all staged files (JS, TS, JSON, CSS, MD)

Only staged files are checked, making commits fast and efficient.

### Pre-push Hook

Runs automatically before every push:

- **Test Suite**: Runs all 115 tests to ensure nothing is broken

## Installation

The hooks are automatically installed when you run:

```bash
npm install
```

The `prepare` script in `package.json` sets up Husky automatically.

## Manual Commands

If you want to run these checks manually:

```bash
# Format all files
npm run format

# Check formatting without changing files
npm run format:check

# Fix linting issues
npm run lint:fix

# Run tests
npm run test:run
```

## Bypassing Hooks (Not Recommended)

In rare cases where you need to bypass hooks:

```bash
# Skip pre-commit hook
git commit --no-verify

# Skip pre-push hook
git push --no-verify
```

**Warning**: Only bypass hooks when absolutely necessary, as this can introduce code quality issues.

## Configuration

### lint-staged Configuration

Located in `package.json`:

```json
"lint-staged": {
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,css,md}": [
    "prettier --write"
  ]
}
```

### Husky Hooks

Located in `.husky/` directory:

- `.husky/pre-commit` - Runs lint-staged
- `.husky/pre-push` - Runs test suite

## Troubleshooting

### Hooks not running

If hooks aren't running, try:

```bash
npm run prepare
```

### Permission denied errors

Make sure hook files are executable:

```bash
chmod +x .husky/pre-commit
chmod +x .husky/pre-push
```

### Slow commits

If commits are slow, it's likely due to:

1. Large number of staged files
2. Panda CSS generation in prepare script

You can temporarily skip the pre-commit hook if needed (see "Bypassing Hooks" above).

## Benefits

- **Consistent Code Style**: Everyone commits formatted code
- **Catch Issues Early**: Linting and tests run before code is pushed
- **Faster CI**: Issues are caught locally, reducing CI failures
- **Better Code Quality**: Automated checks ensure standards are maintained
