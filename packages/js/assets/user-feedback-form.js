(function (window, document) {
  // eslint-disable-next-line quotes
  const TEMPLATE = `$$TEMPLATE$$`
  const OPTIONS_KEY = 'honeybadgerUserFeedbackOptions'

  const HoneybadgerUserFeedbackForm = function () {};
  HoneybadgerUserFeedbackForm.prototype.build = function () {
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

    self.applyLabelsFromOptions()
  };

  HoneybadgerUserFeedbackForm.prototype.applyLabelsFromOptions = function () {
    const self = this

    const formOptions = self.getOptions()
    const { messages = {}, buttons = {}, labels = {} } = formOptions
    for (let key in messages) {
      const element = document.getElementById(`honeybadger-feedback-${key}`)
      if (element) {
        element.innerText = messages[key]
      }
    }
    for (let key in labels) {
      const element = document.getElementById(`honeybadger-feedback-label-${key}`)
      if (element) {
        element.innerText = labels[key]
      }
    }
    for (let key in buttons) {
      const element = document.getElementById(`honeybadger-feedback-${key}`)
      if (element) {
        element.value = buttons[key]
      }
    }
  };

  HoneybadgerUserFeedbackForm.prototype.close = function () {
    const self = this
    self.element.parentNode.removeChild(self.element);
  };

  HoneybadgerUserFeedbackForm.prototype.submit = function () {
    const self = this
    if (self.loading) return

    self.loading = true
    document.getElementById('honeybadger-feedback-error').style.display = 'none'
    document.getElementById('honeybadger-feedback-submit').disabled = true

    const script = document.createElement('script')
    const form = document.getElementById('honeybadger-feedback-form')
    script.src = self.getEndpoint() +
        '?format=js' +
        `&api_key=${self.getApiKey()}` +
        `&token=${self.getLastNoticeId()}` +
        `&name=${encodeURIComponent(self.form.name.value)}` +
        `&email=${encodeURIComponent(self.form.email.value)}` +
        `&comment=${encodeURIComponent(self.form.comment.value)}`
    script.onerror = function () {
      self.loading = false
      // unfortunately we don't get any info here about the error (i.e. HTTP 403)
      self.onFormError('')
      // remove script so that user can try again
      form.removeChild(script)
    }
    form.appendChild(script);
  };

  HoneybadgerUserFeedbackForm.prototype.onSuccess = function () {
    document.getElementById('honeybadger-feedback-thanks').style.display = 'block'
    document.getElementById('honeybadger-feedback-form').style.display = 'none'
    document.getElementById('honeybadger-feedback-submit').disabled = false
  };

  HoneybadgerUserFeedbackForm.prototype.onFormError = function (message) {
    document.getElementById('honeybadger-feedback-error').style.display = 'block'
    document.getElementById('honeybadger-feedback-error-detail').innerText = message
    document.getElementById('honeybadger-feedback-submit').disabled = false
  };

  HoneybadgerUserFeedbackForm.prototype.getOptions = function () {
    return window[OPTIONS_KEY]
  }

  HoneybadgerUserFeedbackForm.prototype.getApiKey = function () {
    return this.getOptions().apiKey
  }

  HoneybadgerUserFeedbackForm.prototype.getLastNoticeId = function () {
    return this.getOptions().noticeId
  }

  HoneybadgerUserFeedbackForm.prototype.getEndpoint = function () {
    return this.getOptions().endpoint
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

    form.onFormError(data['error'] || 'An unknown error occurred.')
  }
})(window, document)
