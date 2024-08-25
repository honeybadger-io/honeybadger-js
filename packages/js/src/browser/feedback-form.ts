import { Types, Util } from '@honeybadger-io/core'
const { globalThisOrWindow } = Util

export class BrowserFeedbackForm {

  private readonly config: Types.BrowserConfig
  private readonly logger: Types.Logger
  private readonly scriptUrl: string

  constructor(config: Types.BrowserConfig, logger: Types.Logger, scriptUrl: string) {
    this.config = config
    this.logger = logger
    this.scriptUrl = scriptUrl
  }

  /* ROLLUP_STRIP_CODE_CHROME_EXTENSION_START */
  public show(lastNoticeId: string, options: Types.UserFeedbackFormOptions = {}) {
    if (!this.config || !this.config.apiKey) {
      this.logger.debug('Client not initialized')
      return
    }

    if (!lastNoticeId) {
      this.logger.debug("Can't show user feedback form without a notice already reported")
      return
    }

    const global = globalThisOrWindow()
    if (typeof global.document === 'undefined') {
      this.logger.debug('global.document is undefined. Cannot attach script')
      return
    }

    if (this.isUserFeedbackScriptUrlAlreadyVisible()) {
      this.logger.debug('User feedback form is already visible')
      return
    }

    global['honeybadgerUserFeedbackOptions'] = {
      ...options,
      apiKey: this.config.apiKey,
      endpoint: this.config.userFeedbackEndpoint,
      noticeId: lastNoticeId,
    }

    this.appendUserFeedbackScriptTag(global, options)

  }

  private appendUserFeedbackScriptTag(window: typeof globalThis, options: Types.UserFeedbackFormOptions = {}) {
    const script = window.document.createElement('script')
    script.setAttribute('src', this.scriptUrl)
    script.setAttribute('async', 'true')
    if (options.onLoad) {
      script.onload = options.onLoad
    }
    (global.document.head || global.document.body).appendChild(script)
  }

  private isUserFeedbackScriptUrlAlreadyVisible() {
    const global = globalThisOrWindow()
    const feedbackScriptUrl = this.scriptUrl
    for (let i = 0; i < global.document.scripts.length; i++) {
      const script = global.document.scripts[i]
      if (script.src === feedbackScriptUrl) {
        return true
      }
    }

    return false
  }
  /* ROLLUP_STRIP_CODE_CHROME_EXTENSION_END */
}
