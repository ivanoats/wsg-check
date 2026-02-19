# Copilot Instructions

This is a mobile-first designed web app

Optimize for the ilities:
Usability, Performance, Accessibility, Maintainability, Security, and Sustainability

Use the ParkUI design system <https://park-ui.com/>

Use ReactJS and NodeJS

## Usability

- Review all UI changes for "thumb-friendliness"
- Ensure primary navigation and core actions are placed within the lower half of the screen for easier one-handed use, as recommended in mobile-first UX best practices.
- Validate touch target sizes: Check that all tappable elements are a minimum of 48px square (or equivalent in other units) with adequate spacing to reduce accidental taps.
- Check for responsive design implementation: Verify the use of CSS media queries and flexible layouts that scale up from mobile, rather than down from desktop, as per mobile-first principles.
- Prioritize content and use progressive disclosure: Ensure only essential content is visible initially, using techniques like sticky footers or bottom sheets for secondary actions to reduce cognitive load.
- Flag horizontal scrolling issues: Review the code for any instances that might cause horizontal scrolling on typical mobile device viewports, which is a key indicator of poor mobile optimization.

## Performance

- Measure Lighthouse scores on each PR
- Review asset loading and optimization: Ensure images and other assets are optimized for mobile web (appropriate formats, sizes, and lazy loading) to ensure fast load times.
- Check for performance regressions: Analyze the changes for any potential impacts on load times or rendering speed, prioritizing the critical rendering path.
- Evaluate network request efficiency: Flag inefficient data fetching, excessive API calls, or large payloads that could impact performance on mobile networks.
- Ensure responsive touch feedback: Verify that interactive elements provide quick visual feedback on user interaction to make the experience feel effortless.

## Sustainability

Try to follow the W3C Web Sustainability Guidelines (WSG) <https://www.w3.org/TR/web-sustainability-guidelines/>

## Maintainability

- Clean, modular code with linting and good (but not perfect all the time) test coverage
- Use SonarQube if needed to find code smells
- Regenerate README and other documentation files in markdown (and lint the markdown)
- Enforce established coding conventions and style guides: Review the code for adherence to the project's defined linting and formatting rules.
- Assess code readability and maintainability: Provide feedback on complex logic, suggesting refactoring for clarity or better design patterns where appropriate.
- Ensure adequate unit and integration test coverage: Check for new or updated tests corresponding to code changes, aiming for a target coverage (e.g., exceeding 80%).
- Identify and flag potential security vulnerabilities: Scan for common issues such as SQL injection risks, cross-site scripting (XSS), or improper data handling.
- Verify clear documentation: Ensure new functions, complex logic, and components are well-documented with clear comments, summaries, and updated internal documentation

## Security

- Use SAST tools such as CodeQL to find potential security issues
- Use Dependabot to keep npm packages up to date

## Accessibility

Consider tools such as pa11y and Lighthouse to measure a11y
