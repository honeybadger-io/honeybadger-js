import { Honeybadger } from '@honeybadger-io/react';

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
