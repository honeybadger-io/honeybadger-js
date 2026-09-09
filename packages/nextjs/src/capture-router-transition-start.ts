// Deliberately @honeybadger-io/js, not @honeybadger-io/react. The react package re-exports
// this exact singleton, but reaching it through there also pulls in the error-boundary class
// component — and this module sits in the main barrel that `instrumentation.ts` imports on
// the server, where React Server Components reject a class component outright under
// Turbopack.
import Honeybadger from '@honeybadger-io/js';

/**
 * Navigation types Next.js reports for an App Router transition.
 */
export type RouterTransitionType = 'push' | 'replace' | 'traverse'

/**
 * Records App Router navigations as breadcrumbs, so a fault carries the trail of routes
 * the user visited before it.
 *
 * Wire it up in `instrumentation-client.ts`:
 *
 * ```ts
 * export const onRouterTransitionStart = captureRouterTransitionStart
 * ```
 *
 * Exported as a ready-made handler rather than left as a function for the template to
 * declare, so the generated file works unchanged as both `.js` and `.ts` — an assignment
 * has no parameters to annotate, so there is no implicit `any` for `noImplicitAny` to
 * reject.
 */
export function captureRouterTransitionStart(url: string, navigationType: RouterTransitionType): void {
  Honeybadger.addBreadcrumb(`Navigated to ${url}`, {
    category: 'navigation',
    metadata: { url, navigationType },
  })
}
