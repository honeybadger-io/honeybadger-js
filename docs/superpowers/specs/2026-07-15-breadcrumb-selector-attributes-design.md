# Clean names for click-breadcrumb selectors

**Date:** 2026-07-15
**Package:** `@honeybadger-io/js` (browser)
**Status:** Design approved, pending spec review

## Problem

When the browser SDK records a `ui.click` breadcrumb, it builds a CSS selector for the
clicked element and its ancestors. Each element's segment is `tag + #id + .allClasses +
[alt/name/title/type] + :nth-child(n)`, and the selector walks all the way up to `<body>`.

In Tailwind (and similar utility-CSS) apps, every element carries dozens of utility
classes, so the selector becomes an unreadable wall of text. A customer reported a single
click breadcrumb whose selector began:

```
body > div#root > main > div > div.flex.min-h-screen.flex-col.font-sans.antialiased.sm:px-4.sm:py-12.bg-gray-100.dark:bg-black.text-foreground > div.relative.w-full.pb-4.flex.h-full.flex-auto.flex-col.justify-center.sm:mx-auto.sm:max-w-lg.sm:rounded-lg.sm:shadow-md.bg-background > ... (continues for many more segments)
```

There is currently no way to make this legible — no config option, no attribute the SDK
honors. The only attributes ever emitted are the hardcoded list `['alt', 'name', 'title',
'type']`.

## Goal

Let customers opt into clean, human-readable selectors by tagging elements with a data
attribute (e.g. `data-hb-name="deal-card"`), so a click breadcrumb reads
`deal-card > div > h3.text-left.font-semibold` instead of the wall above.

Non-goal: changing default output for untagged apps. The feature is purely additive and
backward-compatible.

## Current implementation

Two functions in `packages/js/src/browser/util.ts`:

- **`stringNameOfElement(element)`** (lines 10–42) — builds one element's segment:
  `tagName.toLowerCase()` + `#id` + every class from `getAttribute('class')` split on
  whitespace + `[alt/name/title/type]` attributes + `:nth-child(n)` when same-tag siblings
  exist. `<html>` returns `''`.
- **`stringSelectorOfElement(element)`** (lines 44–55) — recurses up `element.parentNode`,
  joining each segment with ` > `.

Called from the click listener in
`packages/js/src/browser/integrations/breadcrumbs.ts` (lines 59–82):

```ts
message  = stringNameOfElement(event.target as HTMLElement)  // breadcrumb title (leaf only)
selector = stringSelectorOfElement(event.target)             // metadata.selector (full chain)
text     = stringTextOfElement(event.target)
```

The whole block is wrapped in try/catch with `'[unknown]'` fallbacks. The `selector` is
stored in breadcrumb metadata and displayed in the Honeybadger UI; it is **not** re-queried
against the DOM, so the output does not need to be valid CSS.

## Design

### Config

New option on `BrowserConfig` in `packages/core/src/types.ts`:

```ts
breadcrumbsSelectorAttributes: string[]   // default: ['data-hb-name']
```

Default value is set in the `Honeybadger` constructor in `packages/js/src/browser.ts`,
alongside `userFeedbackEndpoint`, `async`, etc.

Customers can point at attributes they already use:

```js
Honeybadger.configure({
  breadcrumbsSelectorAttributes: ['data-hb-name', 'data-testid']
})
```

### Behavior

When building an element's segment, if the element has any of the configured attributes
with a non-empty (trimmed) value, that value **replaces the entire segment** — no tag, id,
classes, `[attr]`, or `:nth-child`. The first attribute in the configured list that is
present on the element wins. The value is trimmed and truncated to 100 chars; otherwise
used verbatim (no escaping — display-only).

When walking up the ancestor chain, reaching a named element **anchors** the selector: that
named element becomes the root of the selector and the upward walk stops there. Untagged
descendants below the anchor still render normally; class-soup ancestors above the anchor
are dropped.

### Function changes (`packages/js/src/browser/util.ts`)

Both functions gain an `attributes: string[]` parameter, defaulting to `['data-hb-name']`
in the signature so they remain safe to call with a single argument (older bundlers, direct
util calls, tests). A small helper resolves the clean name:

```ts
function cleanNameOfElement(element, attributes) {
  for (const attr of attributes) {
    const value = element.getAttribute && element.getAttribute(attr)
    if (value && value.trim()) { return truncate(value.trim(), 100) }
  }
  return undefined
}
```

```
stringNameOfElement(element, attributes = ['data-hb-name']):
  if !element || !element.tagName: return ''
  if tagName === 'html': return ''
  cleanName = cleanNameOfElement(element, attributes)
  if cleanName: return cleanName          // bare — skip tag/id/classes/attrs/nth-child
  ...existing logic unchanged...

stringSelectorOfElement(element, attributes = ['data-hb-name']):
  name = stringNameOfElement(element, attributes)
  if cleanNameOfElement(element, attributes): return name   // anchor — stop, no parent
  if element.parentNode && element.parentNode.tagName:
    parentName = stringSelectorOfElement(element.parentNode, attributes)
    if parentName.length > 0: return `${parentName} > ${name}`
  return name
```

### Call-site changes (`packages/js/src/browser/integrations/breadcrumbs.ts`)

```ts
const attributes = client.config.breadcrumbsSelectorAttributes
message  = stringNameOfElement(event.target as HTMLElement, attributes)
selector = stringSelectorOfElement(event.target, attributes)
```

### Worked example

Click `<h3 class="text-left font-semibold">` inside `<div data-hb-name="deal-card">`:

- `message`  → `h3.text-left.font-semibold` (leaf is not named → unchanged)
- `selector` → `deal-card > div > h3.text-left.font-semibold`
  (walk stops at `deal-card`; the `body > div#root > main > …` soup above it is dropped)

If the customer tags the button itself (`<button data-hb-name="foo-button">`), both
`message` and `selector` collapse to `foo-button`.

## Error handling

- The click listener already wraps selector building in try/catch with `'[unknown]'`
  fallbacks, so a malformed attribute or DOM access cannot break notice reporting.
- Missing / empty / whitespace-only attribute value → `cleanNameOfElement` returns
  `undefined`; falls through to today's tag/class logic.
- Absent config (older bundlers, direct core use, tests) → the `attributes` parameter
  defaults to `['data-hb-name']` in the function signature.
- Overly long / unusual values → trimmed and truncated to 100 chars via the existing
  `truncate` helper; used verbatim otherwise (display-only, no escaping).

## Testing

Unit tests in `packages/js/test/unit/browser/util.browser.test.ts`:

1. Element with `data-hb-name` → segment is the bare value; no tag/classes/`:nth-child`.
2. Leaf unnamed, ancestor named → chain anchors at the named ancestor; everything above
   dropped (the worked example).
3. Named leaf → both `stringNameOfElement` and `stringSelectorOfElement` return just the
   name.
4. Custom `['data-testid']` → honored; `data-hb-name` ignored when not in the list.
5. First-match precedence when an element has two configured attributes.
6. Empty / whitespace attribute value → falls back to normal tag/class output.
7. **Regression:** no attributes present → output identical to current behavior.
8. Long value → truncated to 100 chars.

Integration test in the breadcrumbs test confirming
`client.config.breadcrumbsSelectorAttributes` is threaded to both call sites.

## Docs & release

- `.changeset` entry — minor bump (new opt-in feature).
- Short README note in the js package documenting `breadcrumbsSelectorAttributes` with the
  `data-hb-name` example.

## Backward compatibility

With no configured attribute present in the DOM and no config change, `cleanNameOfElement`
always returns `undefined` and both functions behave exactly as they do today. Existing
selectors are unchanged byte-for-byte.
