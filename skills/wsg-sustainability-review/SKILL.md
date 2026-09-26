---
name: wsg-sustainability-review
description: Review a website against the W3C Web Sustainability Guidelines (WSG) with wsg-check, then fix the issues in the codebase. Use when asked to check or improve a site's sustainability, carbon footprint, page weight, or WSG conformance, for a deployed URL or a local dev server.
---

# WSG sustainability review

Check a page with [wsg-check](https://github.com/ivanoats/wsg-check), fix what it finds in this codebase, and check again. wsg-check scores a page against the W3C Web Sustainability Guidelines (WSG) and gives each failed or warned check a recommended fix.

## 1. Choose how to run the check

Use the first option that is available:

1. **MCP tools.** If the `check_url`, `list_guidelines`, and `get_guideline` tools are available, use them. `check_url` follows redirects on local dev servers.
2. **CLI.** Otherwise run the npm package; it needs Node.js 22 or later:

   ```bash
   npx -y @sustainablewebsites/wsg-check <url> --format json --output wsg-report.json
   ```

   Read `wsg-report.json`. Progress and log messages go to stderr, and the command exits with 1 if the page can't be fetched. The CLI refuses redirects that stay on `localhost`, so for a local dev server pass the URL the page finally lands on, such as `http://localhost:3000/en` instead of `http://localhost:3000/`.

To add the MCP server instead, see the [wsg-check README](https://github.com/ivanoats/wsg-check#use-with-ai-assistants-mcp).

## 2. Check the right page

- Use the URL the user gave. For work in progress, check the local dev server; start it first if it isn't running, and use the port it reports.
- Check pages the user owns or asked about. Every check sends the page's hostname to the Green Web Foundation for a green-hosting lookup, except for local hostnames.

## 3. Triage the results

Work through failed and warned checks in this order:

1. WSG checks before **related** checks. Related checks (`related: true`), such as security headers and image alt text, are reported but don't affect the score.
2. `high` impact, then `medium`, then `low`.
3. Failures before warnings.

With `check_url`, the summary's `issues` are already in this order. In the CLI report, filter `checks` to `status` `fail` or `warn`; `recommendations` lists the fixes in priority order. Skip `pass`, `info`, and `not-applicable`.

## 4. Fix each issue

1. Understand what the guideline asks for: call `get_guideline` with the check's `guidelineId`, or open the guideline in the W3C specification.
2. Find the code that produces the problem: templates and layouts, CSS, image assets, bundler or framework configuration, or server and hosting configuration for headers, compression, caching, and error pages.
3. Make the smallest change that addresses the guideline itself. Don't game a check; for example, don't add an empty `<meta>` tag or a placeholder file just to pass it.
4. If a fix is outside this codebase, such as the hosting provider or a third-party script someone else controls, say what needs to change and who can change it instead of editing unrelated code.

## 5. Check again

Run the same check again to confirm the fixes. To check only what you changed, pass the guideline slugs: the `guidelines` argument of `check_url`, or `--guidelines slug-one,slug-two` on the CLI. Finish with a full check so that nothing else regressed.

## 6. Report back

Give the score and grade before and after, what you changed for each issue, and what remains, with the reason: out of scope, needs a person to decide, or can't be tested automatically.

## Limits to state honestly

- wsg-check reads the page's HTML and HTTP headers. It doesn't render JavaScript, measure Core Web Vitals, or download every asset, so some guidelines need manual review. `list_guidelines` with `testability: "manual-only"` lists them.
- The CO₂ figure is a model estimate from HTML size, not a measurement.
- Scores are guidance, not certification, and are only comparable within one WSG release. Don't describe a site as WSG-compliant because of its score.
