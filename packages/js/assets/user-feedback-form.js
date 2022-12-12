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
    self.element.onclick = function (e) {
      if (e.target !== self.element) return;
      self.close();
    }

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
    const closeButton = document.getElementById('honeybadger-feedback-close')
    closeButton.onclick = (e) => {
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
    document.getElementById('honeybadger-feedback-error').style.display = 'none'
    document.getElementById('honeybadger-feedback-submit').disabled = true

    const script = document.createElement('script')
    const form = document.getElementById('honeybadger-feedback-form')
    script.src = ENDPOINT +
        '?format=js' +
        `&token=${self.getLastNoticeId()}` +
        `&name=${encodeURIComponent(self.form.name.value)}` +
        `&email=${encodeURIComponent(self.form.email.value)}` +
        `&comment=${encodeURIComponent(self.form.comment.value)}`
    form.appendChild(script);
  };

  HoneybadgerUserFeedbackForm.prototype.onSuccess = function () {
    document.getElementById('honeybadger-feedback-thanks').style.display = 'block'
    document.getElementById('honeybadger-feedback-form').style.display = 'none'
    document.getElementById('honeybadger-feedback-submit').disabled = false
  };

  HoneybadgerUserFeedbackForm.prototype.onFormError = function (message) {
    console.error('error, todo', message)
    document.getElementById('honeybadger-feedback-error').style.display = 'block'
    document.getElementById('honeybadger-feedback-error-detail').innerText = message
    document.getElementById('honeybadger-feedback-submit').disabled = false
  };

  HoneybadgerUserFeedbackForm.prototype.getOptions = function () {
    return window[OPTIONS_KEY]
  }

  HoneybadgerUserFeedbackForm.prototype.getLastNoticeId = function () {
    return this.getOptions().noticeId
  }

  const form = new HoneybadgerUserFeedbackForm()
  form.build()

  // this function needs to be defined and will be called from the feedback script submission
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  window['honeybadgerFeedbackResponse'] = function honeybadgerFeedbackResponse(data) {
    form.loading = false

    if (data['result'] === 'OK') {
      form.onSuccess()

      return
    }

    form.onFormError(data['error'] || 'An unknown error occurred. Please try again.')
  }
})(window, document)
