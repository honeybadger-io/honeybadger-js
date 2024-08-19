import fetch from 'jest-fetch-mock';
import Singleton from '../../../src/browser';
import { getUserFeedbackScriptUrl } from '../../../src/browser/feedback-form';
import { nullLogger } from '../helpers';

describe('showUserFeedbackForm', function () {

  let client: typeof Singleton

  beforeEach(function () {
    client = Singleton.factory({
      logger: nullLogger()
    })

    fetch.resetMocks()

    window['honeybadgerUserFeedbackOptions'] = undefined

    for (let i = window.document.scripts.length - 1; i >= 0; i--) {
      if (window.document.scripts[i].src.indexOf('https://js.honeybadger.io') > -1) {
        window.document.scripts[i].parentNode.removeChild(window.document.scripts[i])
      }
    }
  })

  it('should do nothing if client is not properly initialized', function () {
    client.configure({
      apiKey: undefined
    })
    client.showUserFeedbackForm()
    expect(window['honeybadgerUserFeedbackOptions']).toBeUndefined()
  })

  it('should remember id of last reported notice', function () {
    client.configure({
      apiKey: 'testing'
    })
    const id1 = '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
    const id2 = '48b98609-dd3b-48ee-bffc-d51f309a2dfb'
    fetch.mockResponses(
      [JSON.stringify({ id: id1 }), { status: 201 }],
      [JSON.stringify({ id: id2 }), { status: 201 }]
    )

    return new Promise<void>((resolve) => {
      client.afterNotify(function (err, notice) {
        expect(err).toBeUndefined()

        if (notice.message === 'testing') {
          expect(notice.id).toBe(id1)
          // @ts-expect-error __lastNoticeId is private
          expect(client.__lastNoticeId).toBe(id1)
        }

        if (notice.message === 'testing 2') {
          expect(notice.id).toBe(id2)
          // @ts-expect-error __lastNoticeId is private
          expect(client.__lastNoticeId).not.toBe(id1)
          // @ts-expect-error __lastNoticeId is private
          expect(client.__lastNoticeId).toBe(id2)

          resolve()
        }
      })

      client.notify('testing')
      client.notify('testing 2')
    })
  })

  it('should do nothing if no notice has been reported yet', function () {
    client.configure({
      apiKey: 'testing'
    })
    client.showUserFeedbackForm()
    expect(window['honeybadgerUserFeedbackOptions']).toBeUndefined()

  })

  it('should build a feedback script url only with major.minor version', function () {
    const version = '4.8.1'
    const url = getUserFeedbackScriptUrl(version)
    expect(url).toMatch('/v4.8/')
  })

  it('should add user feedback script tag on document.head', function () {
    const id = '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
    client.configure({
      apiKey: 'testing'
    })
    // @ts-expect-error
    client.__lastNoticeId = id
    client.showUserFeedbackForm()
    expect(window['honeybadgerUserFeedbackOptions']).toMatchObject({
      noticeId: id
    })
    expect(window.document.head.innerHTML).toMatch(`<script src="${getUserFeedbackScriptUrl(client.getVersion())}" async="true"></script>`)
  })

  it('should add user feedback options in window object', function () {
    const id = '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
    client.configure({
      apiKey: 'testing'
    })
    // @ts-expect-error
    client.__lastNoticeId = id
    const options = {
      labels: { name: 'Your Name ???' },
      buttons: { cancel: 'Stop!' },
      messages: { thanks: 'Your feedback is greatly appreciated!' }
    }
    client.showUserFeedbackForm(options)
    expect(window['honeybadgerUserFeedbackOptions']).toEqual({
      apiKey: client.config.apiKey,
      endpoint: client.config.userFeedbackEndpoint,
      noticeId: id,
      ...options
    })
  })

  it('should not load feedback script more than once', function () {
    const id = '48b98609-dd3b-48ee-bffc-d51f309a2dfa'
    client.configure({
      apiKey: 'testing'
    })
    // @ts-expect-error
    client.__lastNoticeId = id
    const scriptsCount = window.document.scripts.length
    client.showUserFeedbackForm()
    expect(window.document.scripts.length).toEqual(scriptsCount + 1)
    client.showUserFeedbackForm()
    expect(window.document.scripts.length).toEqual(scriptsCount + 1)
  })
})
