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

Non-goals:
- Changing default output for apps that don't use the `data-hb-name` attribute.
- Handling Shadow DOM retargeting or `composedPath()`. The click listener already uses
  `event.target` and inherits its limitations; this feature does not change that.

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

**Single source of truth.** Export one constant from `packages/js/src/browser/util.ts`:

```ts
export const DEFAULT_SELECTOR_ATTRIBUTES = ['data-hb-name']
```

The `Honeybadger` constructor in `packages/js/src/browser.ts` uses this constant to set the
default, alongside `userFeedbackEndpoint`, `async`, etc. The util functions do **not**
duplicate the default in their signatures (see "Function changes"): they receive an already
normalized list from the call site.

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
present on the element wins.

The value is normalized before use: trimmed, then internal runs of whitespace/control
characters (including newlines) collapsed to a single space, so a stray newline can't
resemble a new selector segment or line. It is then truncated with the existing `truncate`
helper at 100 retained characters — note this appends an ellipsis, so the final string can
be up to 103 characters. Otherwise the value is used verbatim (no CSS escaping — the
selector is display-only).

When walking up the ancestor chain, reaching a named element **anchors** the selector: that
named element becomes the root of the selector and the upward walk stops there. Untagged
descendants below the anchor still render normally; class-soup ancestors above the anchor
are dropped. When multiple ancestors are named, the **nearest** named ancestor wins and any
named ancestors above it are discarded (they're above the anchor, so they never appear).

`<html>` is never a named anchor: `stringNameOfElement` returns `''` for `<html>` before any
attribute check, matching today's behavior. Tagging `<html data-hb-name="...">` has no
effect.

### Function changes (`packages/js/src/browser/util.ts`)

Both functions gain an `attributes: string[]` parameter defaulting to
`DEFAULT_SELECTOR_ATTRIBUTES`, so they remain safe to call with a single argument (older
bundlers, direct util calls, tests). The call site passes a normalized list; the default is
the same constant, so there is one source of truth.

A helper both resolves and normalizes the clean name, and tolerates malformed config
(non-array, non-string entries, missing `getAttribute`) without throwing:

```ts
function cleanNameOfElement(element, attributes) {
  if (!Array.isArray(attributes) || !element || typeof element.getAttribute !== 'function') {
    return undefined
  }
  for (const attr of attributes) {
    if (typeof attr !== 'string' || !attr) { continue }
    const value = element.getAttribute(attr)
    if (value && value.trim()) {
      // collapse internal whitespace/control chars so a value can't fake a segment break
      const normalized = value.trim().replace(/\s+/g, ' ')
      return truncate(normalized, 100)
    }
  }
  return undefined
}
```

To avoid resolving the clean name twice, `stringNameOfElement` computes it once, and
`stringSelectorOfElement` re-derives anchoring from whether the returned segment came from a
clean name. Simplest robust form — have `stringNameOfElement` return the name, and let the
selector walker call `cleanNameOfElement` once per element and reuse it:

```
stringNameOfElement(element, attributes = DEFAULT_SELECTOR_ATTRIBUTES):
  if !element || !element.tagName: return ''
  if tagName === 'html': return ''            // <html> is never a named anchor
  cleanName = cleanNameOfElement(element, attributes)
  if cleanName: return cleanName              // bare — skip tag/id/classes/attrs/nth-child
  ...existing logic unchanged...

stringSelectorOfElement(element, attributes = DEFAULT_SELECTOR_ATTRIBUTES):
  name = stringNameOfElement(element, attributes)
  if name && cleanNameOfElement(element, attributes): return name   // anchor — stop, no parent
  if element.parentNode && element.parentNode.tagName:
    parentName = stringSelectorOfElement(element.parentNode, attributes)
    if parentName.length > 0: return `${parentName} > ${name}`
  return name
```

(If the redundant `cleanNameOfElement` call proves measurable, the walker can be rewritten
as an iterative ancestor loop resolving each segment + named-status once; not required for
correctness.)

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
  defaults to `DEFAULT_SELECTOR_ATTRIBUTES` in the function signature.
- **Malformed runtime config** (`null`, non-array, non-string or empty entries) →
  `cleanNameOfElement` guards each case and skips it, so a bad `configure()` value can't turn
  every click into the `'[unknown]'` fallback — it just yields normal tag/class output.
- Overly long / unusual values → trimmed, internal whitespace/control chars collapsed to a
  single space, then truncated via the existing `truncate` helper (100 retained chars +
  ellipsis, so up to 103 chars total); used verbatim otherwise (display-only, no CSS
  escaping).

## Testing

Unit tests in `packages/js/test/unit/browser/util.browser.test.ts`:

1. Element with `data-hb-name` → segment is the bare value; no tag/classes/`:nth-child`.
2. Leaf unnamed, ancestor named → chain anchors at the named ancestor; everything above
   dropped (the worked example).
3. Named leaf → both `stringNameOfElement` and `stringSelectorOfElement` return just the
   name.
4. Custom `['data-testid']` → honored; `data-hb-name` ignored when not in the list.
5. First-match precedence when an element has two configured attributes.
6. Nested named ancestors → nearest one wins; ancestors above it are absent.
7. Empty / whitespace attribute value → falls back to normal tag/class output.
8. Value with newlines/control chars → whitespace collapsed to single spaces.
9. `<html data-hb-name="...">` → ignored (`<html>` returns `''`).
10. Malformed config (`null`, `[123]`, `['']`, non-array) → no throw; normal output.
11. `[]` (empty list) → naming disabled entirely; output identical to current behavior.
12. `undefined` attributes arg → falls back to `DEFAULT_SELECTOR_ATTRIBUTES`.
13. **Regression:** no configured attribute present in DOM → output identical to current
    behavior.
14. Long value → truncated (100 retained chars + ellipsis).

Integration tests in the breadcrumbs test:
- `client.config.breadcrumbsSelectorAttributes` is threaded to both call sites.
- Calling `configure({ breadcrumbsSelectorAttributes: [...] })` **after** the plugin has
  loaded takes effect on the next click (the listener reads `client.config` per event, so no
  plugin reload is required).

## Docs & release

- The repo releases via **Lerna with conventional commits** (`lerna publish
  --conventional-commits`); there is no Changesets setup. A `feat(js): ...` commit drives the
  minor version bump — no `.changeset` file.
- Short README note in the js package documenting `breadcrumbsSelectorAttributes` with the
  `data-hb-name` example.

## Backward compatibility

The default is `['data-hb-name']`, a Honeybadger-namespaced attribute, so real-world
collisions are effectively nil. For any app that does not use that attribute — and makes no
config change — `cleanNameOfElement` always returns `undefined`, and both functions behave
exactly as they do today; existing selectors are unchanged.

The one honest caveat: an app that *already* has `data-hb-name` on some element (unlikely,
given the namespace) would see those segments render as the attribute value after upgrading.
This is the intended behavior of the feature, not a regression, but it is a visible output
change for that narrow case rather than a strict no-op. Apps that want to guarantee no change
can set `breadcrumbsSelectorAttributes: []` to disable naming entirely.
