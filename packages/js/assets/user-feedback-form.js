/**
 * todo: this js file (bundled with the html file) should either:
 * - come from the server (through a GET request)
 * - or bundled in the js package as a post-build step (? - not yet explored)
 */
(function (window, document) {
  // eslint-disable-next-line quotes
  const TEMPLATE = `$$TEMPLATE$$`
  const ENDPOINT = 'https://api.honeybadger.io/v1/feedback'
  const OPTIONS_KEY = 'honeybadgerUserFeedbackOptions'

  const HoneybadgerUserFeedbackForm = function () {};
  HoneybadgerUserFeedbackForm.prototype.build = function () {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    self.element = document.createElement('div')
    self.element.id = 'honeybadger-feedback-wrapper'
    self.element.innerHTML = TEMPLATE

    document.body.appendChild(self.element)

    self.form = self.element.getElementsByTagName('form')[0]
    self.form.addEventListener('submit', function (e) {
      e.preventDefault()
      self.submit()
    })

    const cancelButton = document.getElementById('honeybadger-feedback-cancel')
    cancelButton.onclick = (e) => {
      e.preventDefault()
      self.close()
    }

    const formOptions = self.getOptions()
    const { messages = {}, buttons = {}, labels = {} } = formOptions
    for (let i in messages) {
      const element = document.getElementById(`honeybadger-feedback-${i}`)
      if (element) {
        element.innerText = messages[i]
      }
    }
    for (let i in labels) {
      const element = document.getElementById(`honeybadger-feedback-label-${i}`)
      if (element) {
        element.innerText = labels[i]
      }
    }
    for (let i in buttons) {
      const element = document.getElementById(`honeybadger-feedback-${i}`)
      if (element) {
        element.value = buttons[i]
      }
    }
  };

  HoneybadgerUserFeedbackForm.prototype.close = function () {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    self.element.parentNode.removeChild(self.element);
  };

  HoneybadgerUserFeedbackForm.prototype.submit = function () {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    if (self.loading) return
    self.loading = true

    window.fetch(ENDPOINT +
        '?format=js' +
        `&token=${self.getLastNoticeId()}` +
        `&name=${encodeURIComponent(self.form.name.value)}` +
        `&email=${encodeURIComponent(self.form.email.value)}` +
        `&comment=${encodeURIComponent(self.form.comment.value)}`,
    {
      method: 'GET',
      // todo: this should not be here
      // server should respond with header "Access-Control-Allow-Origin: CALLER_HOST"
      mode: 'no-cors'
    })
      .then(response => {
        self.loading = false
        if (!response.ok) {
          console.error('Error in HoneybadgerFeedbackForm')
          self.onFormError(response.body.toString())
          return
        }
        self.onSuccess()
      })
      .catch(err => {
        self.loading = false
        console.error('Error in HoneybadgerFeedbackForm')
        console.error(err)
        self.onFormError(err.message)
      })
  };

  HoneybadgerUserFeedbackForm.prototype.onSuccess = function () {
    document.getElementById('honeybadger-feedback-success').style.display = 'block'
    document.getElementById('honeybadger-feedback-form').style.display = 'none'
  };

  HoneybadgerUserFeedbackForm.prototype.onFormError = function (message) {
    console.error('error, todo', message)
  };

  HoneybadgerUserFeedbackForm.prototype.getOptions = function () {
    return window[OPTIONS_KEY]
  }

  HoneybadgerUserFeedbackForm.prototype.getLastNoticeId = function () {
    return this.getOptions().noticeId
  }

  const form = new HoneybadgerUserFeedbackForm()
  form.build()
  // todo: remove - this is for debugging
  window['honeybadgerUserFeedbackForm'] = form
})(window, document)
