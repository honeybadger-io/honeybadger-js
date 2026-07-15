# Breadcrumb Selector Attributes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let browser SDK users opt into legible `ui.click` breadcrumb selectors by tagging elements with a configurable data attribute (default `data-hb-name`), instead of long Tailwind class chains.

**Architecture:** A new `breadcrumbsSelectorAttributes: string[]` option on `BrowserConfig`. When an element carries one of the configured attributes with a non-empty value, that value replaces the element's entire selector segment; a named element also anchors the selector (the ancestor walk stops there). Implemented in the two pure functions `stringNameOfElement` / `stringSelectorOfElement` in the js package's browser util, with the attribute list threaded from `client.config` at the click listener call sites.

**Tech Stack:** TypeScript, Jest (jsdom), Lerna monorepo. Packages touched: `@honeybadger-io/core` (types) and `@honeybadger-io/js` (browser util, breadcrumbs integration, config default).

**Design doc:** `docs/superpowers/specs/2026-07-15-breadcrumb-selector-attributes-design.md`
**Issue:** honeybadger-io/honeybadger-js#1509

## Global Constraints

- The `selector` string is display-only in the Honeybadger UI — it is NOT re-queried against the DOM, so output need not be valid CSS.
- Backward compatible: with no configured attribute present in the DOM and no config change, output must be identical to today.
- Default config value: `['data-hb-name']`. Single source of truth: `DEFAULT_SELECTOR_ATTRIBUTES` exported from `packages/js/src/browser/util.ts`.
- The clean value is normalized: `.trim()`, then internal whitespace/control runs collapsed to a single space via `.replace(/\s+/g, ' ')`, then `truncate(value, 100)` (which appends `...`, so up to 103 chars total).
- Malformed config must never throw: non-array `attributes`, non-string / empty entries, and elements without `getAttribute` are skipped, falling back to normal tag/class output.
- `<html>` is never a named anchor — `stringNameOfElement` returns `''` for it before any attribute check.
- Run tests from the js package with: `cd packages/js && npx jest <path> -t '<name>'`. All new util tests live in the existing `test/unit/browser/util.browser.test.ts`.
- Commit style: conventional commits (`feat(js): ...`, `test(js): ...`, `docs: ...`). Releases run via `lerna publish --conventional-commits`; do NOT add a `.changeset` file.

---

### Task 1: Config option, default, and shared constant

Adds the `breadcrumbsSelectorAttributes` option to `BrowserConfig`, the `DEFAULT_SELECTOR_ATTRIBUTES` constant, and wires the default into the browser client constructor. No behavior change to selectors yet.

**Files:**
- Modify: `packages/core/src/types.ts` (add field to `BrowserConfig`, ~line 95-100)
- Modify: `packages/js/src/browser/util.ts` (add exported constant near top, after imports ~line 3)
- Modify: `packages/js/src/browser.ts` (constructor defaults, ~line 85-91)
- Test: `packages/js/test/unit/browser.test.ts` (default assertion, near the existing `ignoreBrowserExtensionErrors` default test ~line 179)

**Interfaces:**
- Produces: `BrowserConfig.breadcrumbsSelectorAttributes: string[]`
- Produces: `export const DEFAULT_SELECTOR_ATTRIBUTES: string[]` from `packages/js/src/browser/util.ts`

- [ ] **Step 1: Write the failing test**

In `packages/js/test/unit/browser.test.ts`, inside the same `describe` block that contains the existing default-config assertions (the one asserting `client.config.ignoreBrowserExtensionErrors`), add:

```typescript
    it('defaults breadcrumbsSelectorAttributes to [data-hb-name]', function () {
      Singleton.configure()
      expect(Singleton.config.breadcrumbsSelectorAttributes).toEqual(['data-hb-name'])
    })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/js && npx jest test/unit/browser.test.ts -t 'defaults breadcrumbsSelectorAttributes'`
Expected: FAIL — received `undefined`, expected `['data-hb-name']`.

- [ ] **Step 3: Add the type field**

In `packages/core/src/types.ts`, extend the `BrowserConfig` interface (it currently ends with `ignoreBrowserExtensionErrors: boolean`):

```typescript
export interface BrowserConfig extends Config {
  userFeedbackEndpoint: string,
  async: boolean
  maxErrors: number | null,
  ignoreBrowserExtensionErrors: boolean
  breadcrumbsSelectorAttributes: string[]
}
```

- [ ] **Step 4: Add the shared constant**

In `packages/js/src/browser/util.ts`, immediately after the existing `const { globalThisOrWindow } = Util;` line near the top, add:

```typescript
export const DEFAULT_SELECTOR_ATTRIBUTES = ['data-hb-name']
```

- [ ] **Step 5: Wire the default into the constructor**

In `packages/js/src/browser.ts`, import the constant and add it to the defaults object. Update the import from `./browser/util` (add `DEFAULT_SELECTOR_ATTRIBUTES` to the existing named import list from that module; if there is no existing import from `./browser/util`, add `import { DEFAULT_SELECTOR_ATTRIBUTES } from './browser/util'`). Then in the constructor:

```typescript
  constructor (opts: Partial<Types.BrowserConfig> = {}) {
    super({
      userFeedbackEndpoint: 'https://api.honeybadger.io/v2/feedback',
      async: true,
      maxErrors: null,
      ignoreBrowserExtensionErrors: false,
      breadcrumbsSelectorAttributes: DEFAULT_SELECTOR_ATTRIBUTES,
      projectRoot: getProjectRoot(),
      ...opts
    }, new BrowserTransport({
      'User-Agent': userAgent(),
    }))
  }
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd packages/js && npx jest test/unit/browser.test.ts -t 'defaults breadcrumbsSelectorAttributes'`
Expected: PASS.

- [ ] **Step 7: Typecheck the monorepo build**

Run: `npx tsc --noEmit -p packages/core && npx tsc --noEmit -p packages/js`
Expected: no errors. (Confirms the new required `BrowserConfig` field is satisfied everywhere — only `browser.ts` constructs the full browser defaults literal.)

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/types.ts packages/js/src/browser/util.ts packages/js/src/browser.ts packages/js/test/unit/browser.test.ts
git commit -m "feat(js): add breadcrumbsSelectorAttributes config option

Refs #1509"
```

---

### Task 2: Clean-name resolution and single-element selector

Adds `cleanNameOfElement` and makes `stringNameOfElement` return the bare clean name when an element is tagged. Covers normalization, malformed config, precedence, and the `<html>` exception.

**Files:**
- Modify: `packages/js/src/browser/util.ts` (`stringNameOfElement` at ~line 10-42; add `cleanNameOfElement` helper above it)
- Test: `packages/js/test/unit/browser/util.browser.test.ts` (extend the existing `describe('stringNameOfElement')` block)

**Interfaces:**
- Consumes: `DEFAULT_SELECTOR_ATTRIBUTES` (Task 1)
- Produces: `cleanNameOfElement(element, attributes: string[]): string | undefined` (module-local, not exported)
- Produces: updated signature `stringNameOfElement(element: HTMLElement, attributes?: string[]): string` — when an element has a configured attribute with a non-empty value, returns the normalized value bare (no tag/id/classes/attrs/nth-child)

- [ ] **Step 1: Write the failing tests**

In `packages/js/test/unit/browser/util.browser.test.ts`, add these cases inside the existing `describe('stringNameOfElement', ...)` block:

```typescript
    it('returns the clean name from the default data-hb-name attribute', function () {
      const element = document.createElement('button')
      element.setAttribute('class', 'foo bar baz')
      element.setAttribute('data-hb-name', 'foo-button')

      expect(stringNameOfElement(element)).toEqual('foo-button')
    })

    it('honors a custom attribute list and ignores data-hb-name when not listed', function () {
      const element = document.createElement('button')
      element.setAttribute('data-hb-name', 'ignored')
      element.setAttribute('data-testid', 'foo-button')

      expect(stringNameOfElement(element, ['data-testid'])).toEqual('foo-button')
    })

    it('uses the first matching attribute in the list', function () {
      const element = document.createElement('button')
      element.setAttribute('data-hb-name', 'primary')
      element.setAttribute('data-testid', 'secondary')

      expect(stringNameOfElement(element, ['data-hb-name', 'data-testid'])).toEqual('primary')
    })

    it('falls back to tag/class output when the attribute value is blank', function () {
      const element = document.createElement('button')
      element.setAttribute('class', 'foo')
      element.setAttribute('data-hb-name', '   ')

      expect(stringNameOfElement(element)).toEqual('button.foo')
    })

    it('collapses internal whitespace and newlines in the clean name', function () {
      const element = document.createElement('button')
      element.setAttribute('data-hb-name', 'foo   bar\nbaz')

      expect(stringNameOfElement(element)).toEqual('foo bar baz')
    })

    it('truncates long clean names to 100 chars plus ellipsis', function () {
      const element = document.createElement('button')
      element.setAttribute('data-hb-name', 'x'.repeat(150))

      expect(stringNameOfElement(element)).toEqual('x'.repeat(100) + '...')
    })

    it('ignores data-hb-name on the html element', function () {
      const element = document.createElement('html')
      element.setAttribute('data-hb-name', 'nope')

      expect(stringNameOfElement(element)).toEqual('')
    })

    it('does not throw on malformed attributes config', function () {
      const element = document.createElement('button')
      element.setAttribute('class', 'foo')

      // @ts-expect-error intentionally malformed input
      expect(stringNameOfElement(element, null)).toEqual('button.foo')
      // @ts-expect-error intentionally malformed input
      expect(stringNameOfElement(element, [123, ''])).toEqual('button.foo')
    })

    it('disables naming when given an empty attribute list', function () {
      const element = document.createElement('button')
      element.setAttribute('data-hb-name', 'foo-button')

      expect(stringNameOfElement(element, [])).toEqual('button')
    })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/js && npx jest test/unit/browser/util.browser.test.ts -t 'clean name'`
Expected: FAIL — clean-name behavior not implemented (returns `button.foo.bar.baz` etc.).

- [ ] **Step 3: Implement `cleanNameOfElement` and update `stringNameOfElement`**

In `packages/js/src/browser/util.ts`, add the helper directly above `stringNameOfElement`, and insert the clean-name check into `stringNameOfElement` right after the `<html>` guard:

```typescript
function cleanNameOfElement(element, attributes: string[]): string | undefined {
  if (!Array.isArray(attributes)) { return undefined }
  if (!element || typeof element.getAttribute !== 'function') { return undefined }

  for (const attr of attributes) {
    if (typeof attr !== 'string' || attr.length === 0) { continue }
    const value = element.getAttribute(attr)
    if (value && value.trim()) {
      const normalized = value.trim().replace(/\s+/g, ' ')
      return truncate(normalized, 100)
    }
  }

  return undefined
}

export function stringNameOfElement (element: HTMLElement, attributes: string[] = DEFAULT_SELECTOR_ATTRIBUTES): string {
  if (!element || !element.tagName) { return '' }

  let name = element.tagName.toLowerCase()

  // Ignore the root <html> element in selectors and events.
  if (name === 'html') { return '' }

  const cleanName = cleanNameOfElement(element, attributes)
  if (cleanName) { return cleanName }

  if (element.id) {
    name += `#${element.id}`
  }

  const stringClassNames = element.getAttribute('class')
  if (stringClassNames) {
    stringClassNames.split(/\s+/).forEach(className => {
      name += `.${className}`
    })
  }

  ['alt', 'name', 'title', 'type'].forEach(attrName => {
    const attr = element.getAttribute(attrName)
    if (attr) {
      name += `[${attrName}="${attr}"]`
    }
  })

  const siblings = getSiblings(element)
  if (siblings.length > 1) {
    name += `:nth-child(${Array.prototype.indexOf.call(siblings, element) + 1})`
  }

  return name
}
```

Note: `truncate` and `getSiblings` are already defined later in the same file; hoisted `function` declarations make them available here.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/js && npx jest test/unit/browser/util.browser.test.ts`
Expected: PASS — all new `stringNameOfElement` cases plus the pre-existing ones.

- [ ] **Step 5: Commit**

```bash
git add packages/js/src/browser/util.ts packages/js/test/unit/browser/util.browser.test.ts
git commit -m "feat(js): resolve clean element names from configured attributes

Refs #1509"
```

---

### Task 3: Anchor the selector chain at the nearest named ancestor

Threads `attributes` through `stringSelectorOfElement` and stops the ancestor walk at the first named element.

**Files:**
- Modify: `packages/js/src/browser/util.ts` (`stringSelectorOfElement` at ~line 44-55)
- Test: `packages/js/test/unit/browser/util.browser.test.ts` (extend the existing `describe('stringSelectorOfElement')` block)

**Interfaces:**
- Consumes: `stringNameOfElement`, `cleanNameOfElement`, `DEFAULT_SELECTOR_ATTRIBUTES`
- Produces: updated signature `stringSelectorOfElement(element, attributes?: string[]): string` — walk stops at the nearest named ancestor, which becomes the selector root

- [ ] **Step 1: Write the failing tests**

Add inside the existing `describe('stringSelectorOfElement', ...)` block:

```typescript
    it('anchors the chain at the nearest named ancestor', function () {
      const html = document.createElement('html')
      const body = document.createElement('body')
      const card = document.createElement('div')
      card.setAttribute('data-hb-name', 'deal-card')
      const inner = document.createElement('div')
      const element = document.createElement('h3')
      element.setAttribute('class', 'text-left font-semibold')

      html.appendChild(body)
      body.appendChild(card)
      card.appendChild(inner)
      inner.appendChild(element)

      expect(stringSelectorOfElement(element)).toEqual(
        'deal-card > div > h3.text-left.font-semibold'
      )
    })

    it('returns only the clean name when the leaf itself is named', function () {
      const html = document.createElement('html')
      const body = document.createElement('body')
      const element = document.createElement('button')
      element.setAttribute('data-hb-name', 'foo-button')

      html.appendChild(body)
      body.appendChild(element)

      expect(stringSelectorOfElement(element)).toEqual('foo-button')
    })

    it('uses the nearest named ancestor when multiple ancestors are named', function () {
      const html = document.createElement('html')
      const outer = document.createElement('div')
      outer.setAttribute('data-hb-name', 'outer')
      const inner = document.createElement('div')
      inner.setAttribute('data-hb-name', 'inner')
      const element = document.createElement('button')

      html.appendChild(outer)
      outer.appendChild(inner)
      inner.appendChild(element)

      expect(stringSelectorOfElement(element)).toEqual('inner > button')
    })

    it('honors a custom attribute list in the chain', function () {
      const html = document.createElement('html')
      const card = document.createElement('div')
      card.setAttribute('data-testid', 'deal-card')
      const element = document.createElement('button')

      html.appendChild(card)
      card.appendChild(element)

      expect(stringSelectorOfElement(element, ['data-testid'])).toEqual('deal-card > button')
    })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/js && npx jest test/unit/browser/util.browser.test.ts -t 'anchor'`
Expected: FAIL — chain still walks to `body` and includes soup ancestors.

- [ ] **Step 3: Implement the anchoring walk**

Replace `stringSelectorOfElement` in `packages/js/src/browser/util.ts` with:

```typescript
export function stringSelectorOfElement(element, attributes: string[] = DEFAULT_SELECTOR_ATTRIBUTES) {
  const name = stringNameOfElement(element, attributes)

  // A named element anchors the selector: stop walking up.
  if (name && cleanNameOfElement(element, attributes)) {
    return name
  }

  if (element.parentNode && element.parentNode.tagName) {
    const parentName = stringSelectorOfElement(element.parentNode, attributes)
    if (parentName.length > 0) {
      return `${parentName} > ${name}`
    }
  }

  return name
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/js && npx jest test/unit/browser/util.browser.test.ts`
Expected: PASS — new anchoring cases plus the pre-existing `'includes parent elements'` regression test (`body > div > button`, no attributes → unchanged).

- [ ] **Step 5: Commit**

```bash
git add packages/js/src/browser/util.ts packages/js/test/unit/browser/util.browser.test.ts
git commit -m "feat(js): anchor click-breadcrumb selectors at nearest named ancestor

Refs #1509"
```

---

### Task 4: Thread config to the click listener call sites

Passes `client.config.breadcrumbsSelectorAttributes` into both util calls in the click listener, and proves it works end-to-end (including reconfiguration after the plugin loads).

**Files:**
- Modify: `packages/js/src/browser/integrations/breadcrumbs.ts` (click listener at ~line 59-82)
- Create: `packages/js/test/unit/browser/integrations/breadcrumbs.browser.test.ts`

**Interfaces:**
- Consumes: `stringNameOfElement`, `stringSelectorOfElement` (Tasks 2-3), `client.config.breadcrumbsSelectorAttributes` (Task 1)

- [ ] **Step 1: Write the failing tests**

Create `packages/js/test/unit/browser/integrations/breadcrumbs.browser.test.ts`:

```typescript
import { Types } from '@honeybadger-io/core'
import breadcrumbs from '../../../../src/browser/integrations/breadcrumbs'
import { nullLogger, TestClient, TestTransport } from '../../helpers'

describe('breadcrumbs click integration', function () {
  let client, mockAddBreadcrumb, handlers, fakeWindow

  beforeEach(function () {
    // { dom: true } isolates the click listener so the console/fetch/navigation
    // instrumentation is not installed on the minimal fakeWindow.
    client = new TestClient(
      { logger: nullLogger(), breadcrumbsEnabled: { dom: true } },
      new TestTransport()
    )
    mockAddBreadcrumb = jest.fn()
    client.addBreadcrumb = mockAddBreadcrumb

    handlers = {}
    fakeWindow = {
      addEventListener: (type, handler) => { handlers[type] = handler },
      location: { href: 'https://example.com' },
      history: {}
    }
  })

  function click(target) {
    handlers['click']({ target, isTrusted: true })
  }

  it('builds the selector using the default breadcrumbsSelectorAttributes', function () {
    // client.config.breadcrumbsSelectorAttributes is undefined here (TestClient does
    // not apply browser defaults), so the util default ['data-hb-name'] is used.
    breadcrumbs(fakeWindow).load(client)

    const card = document.createElement('div')
    card.setAttribute('data-hb-name', 'deal-card')
    const h3 = document.createElement('h3')
    h3.setAttribute('class', 'text-left font-semibold')
    card.appendChild(h3)

    click(h3)

    const metadata = mockAddBreadcrumb.mock.calls[0][1].metadata
    expect(metadata.selector).toEqual('deal-card > h3.text-left.font-semibold')
  })

  it('reflects breadcrumbsSelectorAttributes changed after the plugin loads', function () {
    breadcrumbs(fakeWindow).load(client)
    // Cast: breadcrumbsSelectorAttributes lives on BrowserConfig, but TestClient is
    // typed to core Config. Casting the literal avoids the excess-property check.
    client.configure({ breadcrumbsSelectorAttributes: ['data-testid'] } as Partial<Types.BrowserConfig>)

    const card = document.createElement('div')
    card.setAttribute('data-testid', 'deal-card')
    const button = document.createElement('button')
    card.appendChild(button)

    click(button)

    const metadata = mockAddBreadcrumb.mock.calls[0][1].metadata
    expect(metadata.selector).toEqual('deal-card > button')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/js && npx jest test/unit/browser/integrations/breadcrumbs.browser.test.ts`
Expected: FAIL — first test yields the full class-soup selector (config not threaded); second yields `deal-card`-less output.

- [ ] **Step 3: Thread the config into the call sites**

In `packages/js/src/browser/integrations/breadcrumbs.ts`, update the click listener's `try` block (currently lines ~61-69):

```typescript
          let message, selector, text
          try {
            const attributes = client.config.breadcrumbsSelectorAttributes
            message = stringNameOfElement(event.target as HTMLElement, attributes)
            selector = stringSelectorOfElement(event.target, attributes)
            text = stringTextOfElement(event.target)
          } catch (e) {
            message = 'UI Click'
            selector = '[unknown]'
            text = '[unknown]'
          }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/js && npx jest test/unit/browser/integrations/breadcrumbs.browser.test.ts`
Expected: PASS — both integration tests.

- [ ] **Step 5: Commit**

```bash
git add packages/js/src/browser/integrations/breadcrumbs.ts packages/js/test/unit/browser/integrations/breadcrumbs.browser.test.ts
git commit -m "feat(js): thread breadcrumbsSelectorAttributes into click breadcrumbs

Refs #1509"
```

---

### Task 5: Documentation and full verification

Documents the option and runs the whole js suite to confirm no regressions.

**Files:**
- Modify: `packages/js/README.md` (breadcrumbs / config section)

**Interfaces:** none (docs + verification only)

- [ ] **Step 1: Locate the config docs section**

Run: `grep -n "breadcrumbsEnabled\|maxBreadcrumbs\|## Config\|### " packages/js/README.md | head -30`
Expected: shows where breadcrumb/config options are documented. If `packages/js/README.md` has no config-options section, add the note under the breadcrumbs discussion; if the README defers to the main docs site, add the note near the other `breadcrumbs*` mentions instead.

- [ ] **Step 2: Add the documentation**

Add this to the appropriate config section of `packages/js/README.md`:

```markdown
#### `breadcrumbsSelectorAttributes`

An array of element attributes to prefer when building the CSS selector for
`ui.click` breadcrumbs. Defaults to `['data-hb-name']`. When a clicked element —
or one of its ancestors — has one of these attributes with a non-empty value,
that value replaces the element's tag/class selector segment, and the named
ancestor anchors the selector (the chain stops there). This keeps click
breadcrumbs legible in utility-CSS apps (e.g. Tailwind) where elements carry
many classes.

```js
Honeybadger.configure({
  apiKey: 'project api key',
  // Reuse an attribute you already have, or add data-hb-name to key elements:
  breadcrumbsSelectorAttributes: ['data-hb-name', 'data-testid'],
})
```

Given `<div data-hb-name="deal-card"><h3 class="...">…</h3></div>`, clicking the
heading records the selector `deal-card > h3.…` instead of the full
`body > div#root > … ` chain. Set to `[]` to disable this behavior entirely.
```

- [ ] **Step 3: Commit the docs**

```bash
git add packages/js/README.md
git commit -m "docs(js): document breadcrumbsSelectorAttributes option

Refs #1509"
```

- [ ] **Step 4: Run the full js unit suite**

Run: `cd packages/js && npx jest test/unit`
Expected: PASS — entire browser/server unit suite, confirming no regression in existing selector/breadcrumb behavior.

- [ ] **Step 5: Typecheck and lint the changed packages**

Run: `npx tsc --noEmit -p packages/core && npx tsc --noEmit -p packages/js && npx eslint packages/js/src packages/core/src`
Expected: no errors.

---

## Self-Review Notes

- **Spec coverage:** config option + default (Task 1); clean-name resolution, normalization, malformed-config guard, `<html>` exception, precedence, truncation (Task 2); anchoring + nearest-named-ancestor + custom-list chain (Task 3); call-site threading + configure-after-load (Task 4); docs + release mechanism + full verification (Task 5). Backward-compat is covered by the untouched pre-existing `stringNameOfElement`/`stringSelectorOfElement` regression tests plus the `[]`-disables case.
- **Non-goal (Shadow DOM / composedPath):** intentionally not implemented; no task.
- **Type consistency:** `DEFAULT_SELECTOR_ATTRIBUTES`, `cleanNameOfElement`, and the `attributes` parameter names/types are consistent across Tasks 1-4. `stringNameOfElement(element, attributes?)` and `stringSelectorOfElement(element, attributes?)` signatures match their call sites in Task 4.
