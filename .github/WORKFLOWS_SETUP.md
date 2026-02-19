# GitHub Actions Setup Guide

This repository includes the following GitHub Actions workflows for continuous integration and code quality:

## Workflows

### 1. CI Workflow (`ci.yml`)

Runs on every push to `main` and on all pull requests. Includes:

- **Lint and Format Check**: Runs ESLint and Prettier to ensure code quality and consistent formatting
- **TypeScript Type Check**: Validates TypeScript types across the codebase
- **Test**: Runs the full test suite (115 tests) with coverage reporting
- **Build**: Builds the production bundle to ensure the project compiles successfully

**Coverage Reporting**: Test coverage is automatically uploaded to Codecov.

### 2. SonarQube Analysis (`sonarqube.yml`)

Runs static code analysis using SonarQube for code quality and security scanning.

- Analyzes code quality metrics
- Detects code smells and bugs
- Tracks technical debt
- Enforces quality gates

## Required Secrets

To enable all features, configure the following repository secrets in GitHub Settings > Secrets and variables > Actions:

### Codecov (Optional but Recommended)

- `CODECOV_TOKEN`: Your Codecov token for uploading coverage reports
  - Sign up at [codecov.io](https://codecov.io)
  - Link your repository and copy the token

### SonarQube (Required for SonarQube workflow)

- `SONAR_TOKEN`: Authentication token for SonarQube
- `SONAR_HOST_URL`: Your SonarQube server URL (e.g., `https://sonarcloud.io` or your self-hosted instance)

**Setting up SonarQube:**

1. For SonarCloud (free for open source):
   - Sign up at [sonarcloud.io](https://sonarcloud.io)
   - Import your GitHub repository
   - Generate a token in Account > Security
   - Set `SONAR_HOST_URL` to `https://sonarcloud.io`

2. For self-hosted SonarQube:
   - Set up your SonarQube server
   - Generate a token in User > My Account > Security
   - Set `SONAR_HOST_URL` to your server URL

## Dependabot

Dependabot is configured to automatically create pull requests for:

- npm package updates (weekly)
- GitHub Actions version updates (weekly)

Configuration file: `.github/dependabot.yml`

## Local Development

Before pushing code, you can run these checks locally:

```bash
# Install dependencies
npm ci

# Generate Panda CSS
npm run prepare

# Run linting
npm run lint

# Check formatting
npx prettier --check "**/*.{js,jsx,ts,tsx,json,css,md}"

# Fix formatting issues
npx prettier --write "**/*.{js,jsx,ts,tsx,json,css,md}"

# Type check
npx tsc --noEmit

# Run tests
npm run test:run

# Run tests with coverage
npm run test:coverage

# Build
npm run build
```

## Workflow Status Badges

Add these badges to your README.md to show workflow status:

```markdown
![CI](https://github.com/ivanoats/speed-and-position/workflows/CI/badge.svg)
![SonarQube](https://github.com/ivanoats/speed-and-position/workflows/SonarQube%20Analysis/badge.svg)
[![codecov](https://codecov.io/gh/ivanoats/speed-and-position/branch/main/graph/badge.svg)](https://codecov.io/gh/ivanoats/speed-and-position)
```

## Troubleshooting

### CI Workflow Failures

1. **ESLint errors**: Run `npm run lint` locally and fix issues
2. **Prettier errors**: Run `npx prettier --write "**/*.{js,jsx,ts,tsx,json,css,md}"` to auto-fix
3. **TypeScript errors**: Run `npx tsc --noEmit` and fix type issues
4. **Test failures**: Run `npm test` locally to debug
5. **Build failures**: Run `npm run build` locally to reproduce

### SonarQube Workflow Failures

1. Verify `SONAR_TOKEN` and `SONAR_HOST_URL` secrets are set correctly
2. Check that your SonarQube project key matches the one in the workflow
3. Ensure test coverage is being generated (`coverage/lcov.info` exists)

## Notes

- All workflows use Node.js 22
- Build artifacts are retained for 7 days
- Coverage reports require the `CODECOV_TOKEN` secret (fails gracefully if not set)
- All workflows use `npm ci` for faster, reproducible installations
- Panda CSS is generated before each workflow step that needs it
