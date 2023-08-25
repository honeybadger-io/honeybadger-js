import { test, expect, Page } from '@playwright/test'
import { resolve } from 'path'
import type Honeybadger from '../../honeybadger'
import type { NoticeTransportPayload }  from '../../../core/src/types'

type Results = { notices: NoticeTransportPayload[], error: Error }
declare const window: { Honeybadger: Honeybadger, results: Results }

const setup = async (page: Page): Promise<void> => {
  await page.goto('/')
  await expect(page).toHaveTitle('Integration Sandbox')

  const hbClient = await page.evaluate<Honeybadger>('window.Honeybadger')
  expect(hbClient).toBeDefined()
  expect(hbClient.config.apiKey).toEqual('integration_sandbox')
}

const triggerException = async (page: Page) => {
  await page.click('button#throw-exception')
}

test.beforeEach(async ({ page }, _testInfo) => {
  await setup(page)
})

test('it notifies Honeybadger of unhandled exceptions', async ({ page }) => {
  await triggerException(page)

  const { notices } = await page.evaluate<Results>('results')
  expect(notices.length).toEqual(1)
  expect(notices[0].error.message).toEqual('unhandled exception with known stack trace')
})

test('it notifies Honeybadger manually', async ({ page }) => {
  const resultHandle = await page.evaluateHandle(_ => window.Honeybadger.notify('expected message'))
  await expect(resultHandle.jsonValue()).resolves.toEqual(true)
  await resultHandle.dispose()

  const { notices } = await page.evaluate<Results>('results')
  expect(notices.length).toEqual(1)
  expect(notices[0].error.message).toEqual('expected message')
})

test('it reports multiple errors in the same process', async ({ page }) => {
  const resultHandle = await page.evaluateHandle(_ => window.Honeybadger.notify('notify 1'))
  await expect(resultHandle.jsonValue()).resolves.toEqual(true)
  await resultHandle.dispose()

  const resultHandle2 = await page.evaluateHandle(_ => window.Honeybadger.notify('notify 2'))
  await expect(resultHandle2.jsonValue()).resolves.toEqual(true)
  await resultHandle2.dispose()

  await triggerException(page)

  const { notices } = await page.evaluate<Results>('results')
  expect(notices.length).toEqual(3)
})

test('it sends console breadcrumbs', async ({ page }) => {
  const resultHandle = await page.evaluateHandle(async _ => {
    console.log('expected message')
    window.Honeybadger.notify('testing')
  })
  await resultHandle.dispose()

  const { notices } = await page.evaluate<Results>('results')
  expect(notices.length).toEqual(1)
  expect(notices[0].breadcrumbs.trail.length).toEqual(2)
  expect(notices[0].breadcrumbs.trail[0].message).toEqual('expected message');
  expect(notices[0].breadcrumbs.trail[0].category).toEqual('log');
})

test('it sends string value console breadcrumbs when null', async ({ page }) => {
  const resultHandle = await page.evaluateHandle(async _ => {
    console.log(null)
    window.Honeybadger.notify('testing')
  })
  await resultHandle.dispose()

  const { notices } = await page.evaluate<Results>('results')
  expect(notices.length).toEqual(1)
  expect(notices[0].breadcrumbs.trail.length).toEqual(2)
  expect(notices[0].breadcrumbs.trail[0].message).toEqual('null')
  expect(notices[0].breadcrumbs.trail[0].category).toEqual('log')
})

test('it sends click breadcrumbs', async ({ page }) => {
  const resultHandle = await page.evaluateHandle(async _ => {
    const button = document.getElementById('normal-button')
    button.click()
    window.Honeybadger.notify('testing')
  })
  await resultHandle.dispose()

  const { notices } = await page.evaluate<Results>('results')
  expect(notices.length).toEqual(1)
  expect(notices[0].breadcrumbs.trail.length).toEqual(2)
  expect(notices[0].breadcrumbs.trail[0].message).toEqual('button#normal-button')
  expect(notices[0].breadcrumbs.trail[0].category).toEqual('ui.click')
  expect(notices[0].breadcrumbs.trail[0].metadata.selector).toEqual('body > div#buttonDivId > button#normal-button')
  expect(notices[0].breadcrumbs.trail[0].metadata.text).toEqual('normal button')
})

test.skip('it sends XHR breadcrumbs for relative paths', async ({ page }) => {
  const resultHandle = await page.evaluateHandle(async _ => {
    return new Promise<void>(function (resolve, _reject) {
      const request = new XMLHttpRequest()
      request.open('GET', '/example/path', false);
      request.onreadystatechange = function () {
        if (request.readyState === 4) {
          window.Honeybadger.notify('testing')
          resolve()
        }
      };
      request.send(null)
    })
  })
  await resultHandle.dispose()

  const { notices } = await page.evaluate<Results>('results')
  expect(notices.length).toEqual(1);
  expect(notices[0].breadcrumbs.trail.length).toEqual(2);
  expect(notices[0].breadcrumbs.trail[0].message).toEqual('GET /example/path');
  expect(notices[0].breadcrumbs.trail[0].category).toEqual('request');
  expect(notices[0].breadcrumbs.trail[0].metadata.type).toEqual('xhr');
  expect('message' in notices[0].breadcrumbs.trail[0].metadata).toBe(false);
})

test.skip('it sends XHR breadcrumbs for absolute paths', async ({ page: _ }) => {

})

test.skip('it sends fetch breadcrumbs', async ({ page: _ }) => {

})

test.skip('it sends navigation breadcrumbs', async ({ page: _ }) => {

})

test('it sends notify breadcrumbs', async ({ page }) => {
  const resultHandle = await page.evaluateHandle(async _ => {
    window.Honeybadger.notify('expected message', { name: 'expected name', stack: 'expected stack' });
  })
  await resultHandle.dispose()

  const { notices } = await page.evaluate<Results>('results')
  expect(notices.length).toEqual(1)
  expect(notices[0].breadcrumbs.trail.length).toEqual(1);
  expect(notices[0].breadcrumbs.trail[0].message).toEqual('Honeybadger Notice');
  expect(notices[0].breadcrumbs.trail[0].category).toEqual('notice');
  expect(notices[0].breadcrumbs.trail[0].metadata).toMatchObject({
    name: 'expected name',
    message: 'expected message',
    stack: 'expected stack'
  });
  expect(notices[0].breadcrumbs.trail[0].metadata).not.toHaveProperty('context');
})

test('it sends window.onerror breadcrumbs', async ({ page }) => {
  await triggerException(page)
  const { notices } = await page.evaluate<Results>('results')
  expect(notices.length).toEqual(1)
  expect(notices[0].error.message).toEqual('unhandled exception with known stack trace')
  expect(Array.isArray(notices[0].breadcrumbs.trail)).toEqual(true)

  const errorBreadcrumbs = notices[0].breadcrumbs.trail.filter(function (c) { return c.category === 'error'; })
  expect(errorBreadcrumbs.length).toEqual(1)
  expect(errorBreadcrumbs[0].message).toMatch('Error');
  expect(errorBreadcrumbs[0].category).toEqual('error');
  expect(errorBreadcrumbs[0].metadata).toMatchObject({
    message: 'unhandled exception with known stack trace',
    name: 'Error',
  });
  const errorStack = await page.evaluate<string>('results.error.stack')
  expect(errorBreadcrumbs[0].metadata.stack).toMatch(errorStack)
})

test('it skips onunhandledrejection when already sent', async ({ page }) => {
  const resultHandle = await page.evaluateHandle(_ => !('onunhandledrejection' in window))
  const supportsUnhandledRejectionListener = await resultHandle.jsonValue()
  test.skip(supportsUnhandledRejectionListener, 'onunhandledrejection not supported')

  const resultHandle2 = await page.evaluateHandle(async _ => {
    const promise = new Promise(function (_res, _rej) {
      throw new Error('unhandled exception')
    });
    return promise.catch(function (err) { window.Honeybadger.notify(err) })
  })
  await resultHandle2.dispose()

  const { notices } = await page.evaluate<Results>('results')
  expect(notices.length).toEqual(1)
})

test('it sends window.onunhandledrejection breadcrumbs when rejection is an Error', async ({ page }) => {
  // let errorStack = null
  // page.on('pageerror', (err) => errorStack = err.stack)
  const resultHandle = await page.evaluateHandle(_ => !('onunhandledrejection' in window))
  const supportsUnhandledRejectionListener = await resultHandle.jsonValue()
  test.skip(supportsUnhandledRejectionListener, 'onunhandledrejection not supported')

  const handle = await page.evaluateHandle(_ => {
    const myPromise = new Promise<void>(() => {
      throw new Error('unhandled rejection')
    })
    myPromise.then(() => { })
    return Promise.resolve()
  })
  await handle.dispose()

  const { notices } = await page.evaluate<Results>('results')
  expect(notices.length).toEqual(1)
  expect(Array.isArray(notices[0].breadcrumbs.trail)).toEqual(true)

  const errorBreadcrumbs = notices[0].breadcrumbs.trail.filter(function (c) { return c.category === 'error' })
  expect(errorBreadcrumbs.length).toEqual(1)
  expect(errorBreadcrumbs[0].message).toEqual('window.onunhandledrejection: Error')
  expect(errorBreadcrumbs[0].category).toEqual('error')
  expect(errorBreadcrumbs[0].metadata).toMatchObject({
    message: 'UnhandledPromiseRejectionWarning: Error: unhandled rejection',
    name: 'Error',
  })

  // fixme: only works in chromium
  // expect(errorBreadcrumbs[0].metadata.stack).toMatch(errorStack)
})

test('it skips window.onunhandledrejection breadcrumbs when rejection is not Error', async ({ page }) => {
  const resultHandle = await page.evaluateHandle(_ => !('onunhandledrejection' in window))
  const supportsUnhandledRejectionListener = await resultHandle.jsonValue()
  test.skip(supportsUnhandledRejectionListener, 'onunhandledrejection not supported')

  const handle = await page.evaluateHandle(_ => {
    const myPromise = new Promise<void>((_, reject) => {
      reject('whatever')
    })
    myPromise.then(() => { })
    return Promise.resolve()
  })
  await handle.dispose()

  const { notices } = await page.evaluate<Results>('results')
  expect(notices.length).toEqual(1)
  expect(Array.isArray(notices[0].breadcrumbs.trail)).toEqual(true)

  const errorBreadcrumbs = notices[0].breadcrumbs.trail.filter(function (c) { return c.category === 'error' })
  expect(errorBreadcrumbs.length).toEqual(0)
})

test('it shows user feedback form', async ({ page }) => {
  const handle = await page.evaluateHandle(_ => {
    // @ts-ignore private access
    window.Honeybadger.isUserFeedbackScriptUrlAlreadyVisible = () => false
    // @ts-ignore private access
    window.Honeybadger.appendUserFeedbackScriptTag = () => { }
    window.Honeybadger.afterNotify(() => {
      window.Honeybadger.showUserFeedbackForm()
    })
    window.Honeybadger.notify('an error message')
  })
  await handle.dispose()

  const relativePath = '../../dist/browser/honeybadger-feedback-form.js'
  await page.addScriptTag({
    path: resolve(__dirname, relativePath)
  })
  await page.waitForSelector('div#honeybadger-feedback')

  const { notices } = await page.evaluate<Results>('results')
  expect(notices.length).toEqual(1)

  const noticeId = await page.evaluate('window.honeybadgerUserFeedbackOptions.noticeId')
  expect(noticeId).toEqual('test')

  const formHeading = page.locator('h2#honeybadger-feedback-heading')
  await expect(formHeading.textContent()).resolves.toMatch('Care to help us fix this?')
})

test('it shows user feedback form with custom labels', async ({ page }) => {
  const handle = await page.evaluateHandle(_ => {
    // @ts-ignore private access
    window.Honeybadger.isUserFeedbackScriptUrlAlreadyVisible = () => false
    // @ts-ignore private access
    window.Honeybadger.appendUserFeedbackScriptTag = () => { }
    window.Honeybadger.afterNotify(() => {
      window.Honeybadger.showUserFeedbackForm({
        messages: {
          heading: 'Help us fix this',
        }
      })
    })
    window.Honeybadger.notify('an error message')
  })
  await handle.dispose()

  const relativePath = '../../dist/browser/honeybadger-feedback-form.js'
  await page.addScriptTag({
    path: resolve(__dirname, relativePath)
  })
  await page.waitForSelector('div#honeybadger-feedback')

  const { notices } = await page.evaluate<Results>('results')
  expect(notices.length).toEqual(1)

  const noticeId = await page.evaluate('window.honeybadgerUserFeedbackOptions.noticeId')
  expect(noticeId).toEqual('test')

  const formHeading = page.locator('h2#honeybadger-feedback-heading')
  await expect(formHeading.textContent()).resolves.toMatch('Help us fix this')
})

test('it sends user feedback for notice on submit', async ({ page }) => {
  const handle = await page.evaluateHandle(_ => {
    // @ts-ignore private access
    window.Honeybadger.isUserFeedbackScriptUrlAlreadyVisible = () => false
    // @ts-ignore private access
    window.Honeybadger.appendUserFeedbackScriptTag = () => { }
    window.Honeybadger.afterNotify(() => {
      window.Honeybadger.showUserFeedbackForm()
    })
    window.Honeybadger.notify('an error message')
  })
  await handle.dispose()

  const relativePath = '../../dist/browser/honeybadger-feedback-form.js'
  await page.addScriptTag({
    path: resolve(__dirname, relativePath)
  })
  await page.waitForSelector('div#honeybadger-feedback')

  const { notices } = await page.evaluate<Results>('results')
  expect(notices.length).toEqual(1)

  const noticeId = await page.evaluate('window.honeybadgerUserFeedbackOptions.noticeId')
  expect(noticeId).toEqual('test')

  const name = 'integration test'
  const email = 'integration-test@honeybadger.io'
  const comment = 'ci integration comment'
  await page.type('#honeybadger-feedback-name', name)
  await page.type('#honeybadger-feedback-email', email)
  await page.type('#honeybadger-feedback-comment', comment)
  await page.click('#honeybadger-feedback-submit')

  const feedbackSubmitUrl = 'https://api.honeybadger.io/v2/feedback' +
      '?format=js' +
      '&amp;api_key=integration_sandbox' +
      '&amp;token=test' +
      `&amp;name=${encodeURIComponent(name)}` +
      `&amp;email=${encodeURIComponent(email)}` +
      `&amp;comment=${encodeURIComponent(comment)}`

  const form = page.locator('form#honeybadger-feedback-form')
  const htmlString = await form.innerHTML()
  expect(htmlString).toContain(`<script src="${feedbackSubmitUrl}"></script>`)
})

test('it closes user feedback form on cancel', async ({ page }) => {
  const handle = await page.evaluateHandle(_ => {
    // @ts-ignore private access
    window.Honeybadger.isUserFeedbackScriptUrlAlreadyVisible = () => false
    // @ts-ignore private access
    window.Honeybadger.appendUserFeedbackScriptTag = () => { }
    window.Honeybadger.afterNotify(() => {
      window.Honeybadger.showUserFeedbackForm()
    })
    window.Honeybadger.notify('an error message')
  })
  await handle.dispose()

  const relativePath = '../../dist/browser/honeybadger-feedback-form.js'
  await page.addScriptTag({
    path: resolve(__dirname, relativePath)
  })
  await page.waitForSelector('div#honeybadger-feedback')

  const { notices } = await page.evaluate<Results>('results')
  expect(notices.length).toEqual(1)

  const noticeId = await page.evaluate('window.honeybadgerUserFeedbackOptions.noticeId')
  expect(noticeId).toEqual('test')

  expect(await page.locator('#honeybadger-feedback-wrapper').count()).toEqual(1);
  await page.click('#honeybadger-feedback-cancel')
  expect(await page.locator('#honeybadger-feedback-wrapper').count()).toEqual(0);
})
