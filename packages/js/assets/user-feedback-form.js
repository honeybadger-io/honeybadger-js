/**
 * todo: this js file (bundled with the html file) should either:
 * - come from the server (through a GET request)
 * - or bundled in the js package as a post-build step (? - not yet explored)
 */
(function (window, document) {
  // eslint-disable-next-line quotes
  const TEMPLATE = `$$TEMPLATE$$`
  const ENDPOINT = 'https://api.honeybadger.io/v1/feedback'

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
  };

  HoneybadgerUserFeedbackForm.prototype.onFormError = function (message) {
    console.error('error, todo', message)
  };

  HoneybadgerUserFeedbackForm.prototype.getLastNoticeId = function () {
    // todo
    return 'ae4bd6aa-999d-4d8c-bd8b-08b6fd09285c';
  }

  new HoneybadgerUserFeedbackForm().build()
})(window, document)
