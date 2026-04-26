# Releasing

Runbook for cutting releases of `@sustainablewebsites/wsg-check` to npm.

## Normal flow (you want to ship what's on main)

1. **Wait for or open the Release PR.** The [release-please](https://github.com/googleapis/release-please) workflow watches pushes to `main` and keeps a rolling PR titled `chore(main): release X.Y.Z`. It updates `package.json`, `.release-please-manifest.json`, and `CHANGELOG.md` as conventional-commit PRs land.
   - `feat:` bumps minor, `fix:` bumps patch, `feat!:` / `BREAKING CHANGE:` bumps major.
   - `ci:`, `chore:`, `test:`, `style:` commits don't trigger a release on their own — release-please stays silent until a user-visible change lands.

2. **Review the Release PR's CHANGELOG diff.** The sections map from conventional-commit types in `release-please-config.json`:

   | Commit type                             | Section      |
   | --------------------------------------- | ------------ |
   | `feat`                                  | Added        |
   | `fix`                                   | Fixed        |
   | `security`                              | Security     |
   | `perf` / `refactor` / `revert` / `docs` | Changed      |
   | `build` / `deps`                        | Dependencies |

3. **Merge the Release PR.** release-please creates the git tag (`v0.1.3`, `v0.2.0`, etc.) and a GitHub release on merge.

4. **Dispatch `publish.yml` manually.** GitHub's anti-loop policy blocks `GITHUB_TOKEN`-created releases from triggering other workflows, so the publish step is manual:
   - From the repo's **Actions** tab → **Publish to npm** → **Run workflow** → pick `main` → **Run workflow**
   - Or from the CLI:
     ```bash
     gh workflow run publish.yml --ref main
     ```

   The workflow checks out the workflow run ref, bundles the CLI with `tsup`, and runs `npm publish --provenance --access public`. For manual dispatch, that's the ref you selected (for the normal flow, `main`); for a `release: published` run, that's the tag commit (`GITHUB_SHA`). Auth is OIDC via [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers) — no long-lived token involved.

5. **Verify on npm.**
   ```bash
   npm view @sustainablewebsites/wsg-check version
   ```

## Manual flow (release-please isn't applicable)

Use this when you need to ship an out-of-band patch that doesn't fit the conventional-commit-driven flow — e.g. a hotfix from a named branch, or re-publishing a previously-failed release.

1. Bump the version on main (via PR) and keep all release-tracking files in sync:
   - `package.json`
   - `.release-please-manifest.json`
   - any other version source touched by the release
2. Merge. Main now has the new version recorded consistently for both npm and future release-please runs.
3. Tag and create a release:
   ```bash
   gh release create vX.Y.Z --title "vX.Y.Z" --generate-notes
   ```
4. The release event fires `publish.yml` automatically (no dispatch needed). OIDC publish runs end-to-end.

## Infrastructure

| Component                              | Purpose                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `.github/workflows/release-please.yml` | Watches main, maintains a rolling Release PR                                                           |
| `release-please-config.json`           | Single-package node config; `include-v-in-tag: true`; Keep a Changelog section mapping                 |
| `.release-please-manifest.json`        | Current version baseline                                                                               |
| `.github/workflows/publish.yml`        | Runs on `release: published` or `workflow_dispatch`; bundles + publishes                               |
| npm Trusted Publishers                 | Registered on npmjs.com; binds `@sustainablewebsites/wsg-check` → `ivanoats/wsg-check` → `publish.yml` |

## Prerequisites (already satisfied — for reference)

- **Trusted Publishing** configured for the package at https://www.npmjs.com/package/@sustainablewebsites/wsg-check/access
- **No `NPM_TOKEN` secret** — intentionally absent. If OIDC ever breaks, reverting to token auth is a one-line workflow change plus adding back an Automation-type token.
- **`publish.yml` uses Node 24** — the actual requirement for npm Trusted Publishing is **npm 11.5.1 or newer** for the OIDC → publish-token exchange. Node 24 is the currently chosen compatible runtime in the workflow, rather than the only possible way to meet that requirement.

## Troubleshooting

### `404 Not Found - PUT https://registry.npmjs.org/@sustainablewebsites%2fwsg-check`

Despite being a 404, this is actually an **auth failure** on a scoped package. npm hides the existence of private/unauthenticated scopes.

- Provenance signed but publish 404s → npm CLI too old for OIDC token exchange. Check `publish.yml` uses Node 24 with npm 11.5.1 or newer.
- Provenance also fails → Trusted Publisher config on npmjs.com doesn't match the workflow's OIDC claims. Verify the configured `workflow_ref` matches `publish.yml`.

### `403 Forbidden - Package name too similar to existing package`

npm's name-similarity filter rejects the unscoped name. The package is scoped (`@sustainablewebsites/`) specifically to avoid this. If you ever fork/rename, keep it scoped.

### `EOTP — This operation requires a one-time password`

A `NODE_AUTH_TOKEN` was set and it's a **Publish** token (requires interactive 2FA) rather than an **Automation** token (bypasses 2FA for CI). The expected state is no `NODE_AUTH_TOKEN` at all — if you see this, someone re-added the token; remove it.

### Release PR isn't appearing

release-please only opens a Release PR when there's a user-visible commit since the last release. If every commit since the last tag is `ci:` / `chore:` / `test:` / `style:` (which are `hidden: true` in the config), release-please stays silent. Land a `feat:` or `fix:` to trigger one.

### The Release PR was merged but nothing published

`GITHUB_TOKEN`-created releases don't trigger `publish.yml`. You need to manually dispatch it — see step 4 of the normal flow.

## Version history

- **v0.1.0** — failed publish (EOTP — wrong token type). Never reached npm; sigstore provenance inert.
- **v0.1.1** — first successful publish via Automation token.
- **v0.1.2** — first publish via Trusted Publishing / OIDC.
