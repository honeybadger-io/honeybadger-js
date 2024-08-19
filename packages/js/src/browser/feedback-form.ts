import { Types, Util } from '@honeybadger-io/core'
const { globalThisOrWindow } = Util

export const getUserFeedbackScriptUrl = (version: string) => {
  const majorMinorVersion = version.split('.').slice(0,2).join('.')
  return `https://js.honeybadger.io/v${majorMinorVersion}/honeybadger-feedback-form.js`
}

export class BrowserFeedbackForm {

  private readonly config: Types.BrowserConfig
  private readonly logger: Types.Logger
  private readonly pluginVersion: string

  constructor(config: Types.BrowserConfig, logger: Types.Logger, pluginVersion: string) {
    this.config = config
    this.logger = logger
    this.pluginVersion = pluginVersion
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
    script.setAttribute('src', this.getUserFeedbackSubmitUrl())
    script.setAttribute('async', 'true')
    if (options.onLoad) {
      script.onload = options.onLoad
    }
    (global.document.head || global.document.body).appendChild(script)
  }

  private isUserFeedbackScriptUrlAlreadyVisible() {
    const global = globalThisOrWindow()
    const feedbackScriptUrl =this.getUserFeedbackSubmitUrl()
    for (let i = 0; i < global.document.scripts.length; i++) {
      const script = global.document.scripts[i]
      if (script.src === feedbackScriptUrl) {
        return true
      }
    }

    return false
  }

  private getUserFeedbackSubmitUrl() {
    return getUserFeedbackScriptUrl(this.pluginVersion)
  }
  /* ROLLUP_STRIP_CODE_CHROME_EXTENSION_END */
}
