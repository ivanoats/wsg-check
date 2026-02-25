# UI/UX Design Review — WSG Check

## Executive Summary

This review identifies contrast and usability issues in the current design and provides specific recommendations to improve accessibility and visual clarity while maintaining the Park UI design system.

## Critical Issues

### 1. **Poor Text Contrast** ⚠️ WCAG AA Failure

**Current Issues:**

- `fg.muted` is overused for important content (body text, descriptions)
- Custom CSS variables in `globals.css` are not aligned with Park UI semantic tokens
- Text on `bg.subtle` backgrounds may not meet WCAG AA (4.5:1 for normal text, 3:1 for large text)
- Dark mode: sand gray on slate may have insufficient contrast

**Impact:** Users with visual impairments cannot read content. Fails WCAG 2.1 Level AA (1.4.3 Contrast).

---

## Detailed Findings

### A. Color System Architecture

**Problem:** Mixing two incompatible color systems

**Current State:**

```css
/* globals.css — custom variables */
:root {
  --color-bg: #ffffff;
  --color-text: #1a1a1a;
  --color-accent: #166534;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0f172a; /* slate-950 */
    --color-text: #f1f5f9; /* slate-100 */
    --color-accent: #4ade80; /* green-400 */
  }
}
```

**Park UI tokens (from Panda config):**

- `bg.default`, `bg.canvas`, `bg.subtle`, `bg.muted`
- `fg.default`, `fg.muted`, `fg.subtle`, `fg.disabled`
- `accent.default`, `accent.fg`, `accent.emphasized`

**Issue:** The custom CSS variables are **not used** in components; components use Park UI tokens directly. This creates confusion and maintenance overhead.

---

### B. Component-Level Contrast Issues

#### 1. **Home Page** ([src/app/page.tsx](src/app/page.tsx))

```tsx
// ❌ BAD: Muted text for important content
<styled.p fontSize="md" color="fg.muted" mb="6">
  Check any website against the W3C Web Sustainability Guidelines.
</styled.p>

// ❌ BAD: Muted text for step details
<styled.p fontSize="sm" color="fg.muted">
  {detail}
</styled.p>
```

**Fix:** Use `fg.default` for primary descriptive text; reserve `fg.muted` for truly secondary content (timestamps, metadata).

```tsx
// ✅ GOOD
<styled.p fontSize="md" color="fg.default" mb="6">
  Check any website against the W3C Web Sustainability Guidelines.
</styled.p>

// ✅ GOOD: Step details are important
<styled.p fontSize="sm" color="fg.default" lineHeight="relaxed">
  {detail}
</styled.p>
```

---

#### 2. **Header** ([src/app/components/Header.tsx](src/app/components/Header.tsx))

```tsx
// ✅ Uses fg.default — correct!
const homeLinkClass = css({
  color: 'fg.default',
  // ...
})
```

**Status:** ✅ Good contrast. No changes needed.

---

#### 3. **Bottom Navigation** ([src/app/components/BottomNav.tsx](src/app/components/BottomNav.tsx))

```tsx
// ❌ WEAK: Inactive nav items are too faint
const navLinkClass = css({
  color: 'fg.muted', // ⚠️ May not meet contrast on all backgrounds
  _hover: { color: 'fg.default' },
})

// ✅ GOOD: Active state uses accent
const activeLinkClass = css({
  color: 'accent.default',
})
```

**Fix:** Use `fg.subtle` (instead of `fg.muted`) for inactive nav items to ensure sufficient contrast while still indicating non-active state.

```tsx
const navLinkClass = css({
  color: 'fg.subtle', // ✅ Better contrast than fg.muted
  _hover: { color: 'fg.default' },
  _focusVisible: {
    color: 'accent.default',
    outline: '2px solid',
    outlineColor: 'accent.default',
    outlineOffset: '2px',
  },
})
```

---

#### 4. **URL Input Form** ([src/app/components/UrlInputForm.tsx](src/app/components/UrlInputForm.tsx))

```tsx
// ❌ WEAK: Recent checks label is muted
<styled.p fontSize="sm" color="fg.muted" fontWeight="medium">
  Recent checks
</styled.p>
```

**Fix:** Use `fg.default` for section headings, even small ones.

```tsx
<styled.p fontSize="sm" color="fg.default" fontWeight="semibold">
  Recent checks
</styled.p>
```

---

#### 5. **About Page Grade Scale** ([src/app/about/page.tsx](src/app/about/page.tsx))

```tsx
// ❌ BAD: Hardcoded hex colors bypass dark mode
const GRADE_SCALE = [
  { grade: 'A', range: '90–100', color: '#166534' }, // green-800
  { grade: 'B', range: '75–89', color: '#1e40af' }, // blue-800
  { grade: 'C', range: '60–74', color: '#92400e' }, // amber-900
  { grade: 'D', range: '45–59', color: '#b45309' }, // orange-700
  { grade: 'F', range: '0–44', color: '#991b1b' }, // red-800
]
```

**Issues:**

- Hardcoded hex colors don't adapt to dark mode
- `color: 'white'` text on these backgrounds may fail contrast in dark mode
- Not using Park UI semantic tokens

**Fix:** Use `css()` calls at **module level** with *literal* values — Panda's static extractor scans source files at build time and generates utility classes for every literal value it finds in recognised patterns. Dynamic `bg={variable}` props and `style={{ backgroundColor: cssVar }}` with CSS variable strings are both unreliable:
- Panda's extractor skips dynamic prop values
- CSS variable approach fails when the variable isn't defined by the preset (e.g. `--colors-blue-9`, `--colors-orange-9` may be absent)

```tsx
// Module-level css() calls — Panda's static extractor generates all utility
// classes at build time. This is the correct, idiomatic Panda CSS pattern.
const gradeCircleColor: Readonly<Record<string, string>> = {
  A: css({ bg: 'green.9', color: 'white' }),
  B: css({ bg: 'blue.9', color: 'white' }),
  C: css({ bg: 'amber.9', color: 'amber.12' }), // amber.9/white fails WCAG AA
  D: css({ bg: 'orange.9', color: 'white' }),
  F: css({ bg: 'red.9', color: 'white' }),
}

// In component — apply via className, not style prop or dynamic Panda bg/color:
<span className={cx(circleBase, gradeCircleColor[grade] ?? '')} aria-hidden="true">
  {grade}
</span>
```

Park UI's `.9` scales are designed to have sufficient contrast with white text in both light and dark modes. **Exception:** amber is inherently light — `amber.9` with white text fails WCAG AA (≈2.3:1). Use `amber.12` (dark text) on `amber.9` background instead (≈5.5:1). Do **not** use `amber.10` with white text (≈1.55:1).

---

### C. Global CSS Issues

**File:** [src/app/globals.css](src/app/globals.css)

**Problem:** Custom CSS variables are defined but **never used** in the codebase. Components use Park UI tokens directly.

**Recommendation:** Remove unused variables and rely entirely on Park UI's semantic token system.

```css
/* ❌ REMOVE: Unused custom variables */
:root {
  --color-bg: #ffffff;
  --color-text: #1a1a1a;
  --color-accent: #166534;
  --color-accent-fg: #ffffff;
}
```

**Keep only:**

```css
:root {
  --font-family-base: var(--font-inter, system-ui), ...;
  scroll-padding-bottom: 4rem;
}
```

Park UI handles all color theming automatically via semantic tokens.

---

## Recommended Changes

### Priority 1: Contrast Fixes (Accessibility Blockers)

1. **Replace `fg.muted` with `fg.default`** for all primary body text and descriptions
2. **Use `fg.subtle`** (instead of `fg.muted`) for inactive navigation items
3. **Fix grade scale colors** to use Park UI tokens instead of hardcoded hex values
4. **Remove unused CSS variables** from `globals.css`

### Priority 2: Enhanced Visual Hierarchy

1. **Section headings:** Always use `fg.default` with `fontWeight="semibold"` or `"bold"`
2. **Body text:** Use `fg.default` with `lineHeight="relaxed"` for readability
3. **Metadata/timestamps:** Use `fg.muted` + `fontSize="sm"`
4. **Links:** Ensure `:hover` and `:focus-visible` states are visually distinct

### Priority 3: Park UI Best Practices

1. **Use semantic tokens exclusively:**
   - `bg.canvas` — page background
   - `bg.default` — card backgrounds
   - `bg.subtle` — hover states, secondary surfaces
   - `fg.default` — primary text
   - `fg.subtle` — secondary text (still readable)
   - `fg.muted` — tertiary text (timestamps, captions)

2. **Prefer recipes over raw CSS:**
   - Use `button()`, `card()`, `link()` recipes for consistent styling
   - Extend recipes with additional props rather than creating custom classes

3. **Ensure focus-visible states:**
   - All interactive elements should have visible focus indicators
   - Use `accent.default` for focus outlines with `outlineOffset: '2px'`

---

## Mobile-First Considerations

### Thumb Zone Optimization ✅ Already Good

- Bottom navigation places primary actions in the lower 50% of the screen ✅
- Touch targets are `minH="12"` (48px), meeting WCAG 2.5.5 ✅
- Form inputs and buttons are large enough for easy tapping ✅

### Suggested Enhancements

1. **Increase font sizes on small screens:**

   ```tsx
   fontSize={{ base: 'md', md: 'lg' }}  // Body text
   fontSize={{ base: '2xl', md: '3xl' }} // H1
   ```

2. **Add sticky header on scroll** (optional):
   - Keep the header visible when scrolling long content
   - Use `position="sticky"` with `top="0"` and `zIndex="sticky"`

3. **Loading states:**
   - Add skeleton loaders for async content
   - Use Park UI's `skeleton-pulse` animation token

---

## Color Palette Recommendations

### Current Setup (Panda Config)

```typescript
createPreset({
  accentColor: green, // ✅ Good for sustainability theme
  grayColor: sand, // ⚠️ May be too low contrast
  radius: 'md',
})
```

### Recommendation: Switch to higher-contrast gray

**Option A: Slate (cooler, higher contrast)**

```typescript
import slate from '@park-ui/panda-preset/colors/slate'

createPreset({
  accentColor: green,
  grayColor: slate, // ✅ Better contrast than sand
  radius: 'md',
})
```

**Option B: Neutral (balanced)**

```typescript
import neutral from '@park-ui/panda-preset/colors/neutral'

createPreset({
  accentColor: green,
  grayColor: neutral, // ✅ Good contrast, warm undertone
  radius: 'md',
})
```

**Reasoning:** Sand is very warm and low-contrast. For a tool focused on accessibility and sustainability, slate or neutral provides better readability.

---

## Testing Checklist

After implementing changes:

- [ ] Run Lighthouse accessibility audit (target: score ≥ 95)
- [ ] Test with Chrome DevTools Contrast Ratio inspector (all text ≥ 4.5:1)
- [ ] Verify dark mode contrast with browser DevTools
- [ ] Tab through entire UI to verify focus indicators are visible
- [ ] Test on mobile device (< 400px width) to verify touch targets
- [ ] Run `pa11y` or `axe-core` automated tests
- [ ] Manual screen reader test (VoiceOver on macOS / NVDA on Windows)

---

## Implementation Plan

### Phase 1: Quick Wins (30 minutes)

1. Replace all `color="fg.muted"` with `color="fg.default"` for primary text
2. Change inactive nav items from `fg.muted` to `fg.subtle`
3. Remove unused CSS variables from `globals.css`

### Phase 2: Color System Refactor (1 hour)

1. Switch gray palette from `sand` to `slate` in `panda.config.ts`
2. Regenerate styled-system: `npm run prepare`
3. Fix grade scale to use Park UI tokens
4. Test all pages in light and dark mode

### Phase 3: Polish (30 minutes)

1. Add enhanced focus states to all interactive elements
2. Improve loading states with skeleton components
3. Add `lineHeight="relaxed"` to body text
4. Run accessibility tests and fix any remaining issues

**Total estimated time:** ~2 hours

---

## Resources

- [Park UI Documentation](https://park-ui.com/)
- [WCAG 2.1 Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Panda CSS Semantic Tokens](https://panda-css.com/docs/concepts/tokens)

---

## Conclusion

The app has a solid foundation with Park UI, but needs focused contrast improvements to meet WCAG AA standards. The primary issues are:

1. **Overuse of `fg.muted`** for important content
2. **Sand gray palette** has insufficient contrast
3. **Hardcoded colors** in grade scale bypass theming

By switching to `slate` or `neutral` gray and using semantic tokens consistently, the app will achieve excellent contrast while maintaining the clean, minimal aesthetic aligned with sustainability principles.
