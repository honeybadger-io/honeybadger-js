describe 'Honeybadger', ->
  beforeEach () ->
    Honeybadger.reset()
    Honeybadger.resetContext()

  describe 'default app', ->
    it 'has a configuration object', ->
      expect(Honeybadger.configuration).toBeDefined()
      expect(Honeybadger.configuration).toEqual(jasmine.any(Object))
      expect(Honeybadger.configuration.default).toBeDefined()
      expect(Honeybadger.configuration.default).toEqual(jasmine.any(Configuration))

    describe '.configure', ->
      it 'configures Honeybadger', ->
        expect(Honeybadger.configure).toBeDefined()

        Honeybadger.configure
          api_key: 'asdf'

        expect(Honeybadger.configuration.default.api_key).toEqual('asdf')

      it 'enables notifications on first call', ->
        expect(Honeybadger.configuration.default.disabled).toEqual(true)
        Honeybadger.configure
            api_key: 'asdf'
        expect(Honeybadger.configuration.default.disabled).toEqual(false)

      it 'leaves notifications disabled on subsequent call', ->
        expect(Honeybadger.configuration.default.disabled).toEqual(true)
        Honeybadger.configure
            api_key: 'asdf'
            disabled: true
        Honeybadger.configure
            api_key: 'zxcv'
        expect(Honeybadger.configuration.default.disabled).toEqual(true)

      it 'is chainable', ->
        expect(Honeybadger.configure({})).toBe(Honeybadger)

    it 'has a context object', ->
      expect(Honeybadger.context).toBeDefined()

    describe '.setContext', ->
      it 'merges existing context', ->
        Honeybadger.setContext({ user_id: '1' })
        Honeybadger.setContext({ foo: 'bar' })
        expect(Honeybadger.context.user_id).toBeDefined()
        expect(Honeybadger.context['user_id']).toEqual('1')
        expect(Honeybadger.context.foo).toBeDefined()
        expect(Honeybadger.context['foo']).toEqual('bar')

      it 'is chainable', ->
        expect(Honeybadger.setContext({ user_id: 1 })).toBe(Honeybadger)

      it 'does not accept non-objects', ->
        Honeybadger.setContext('foo')
        expect(Honeybadger.context).toEqual({})

      it 'keeps previous context when called with non-object', ->
        Honeybadger.setContext({ foo: 'bar' })
        Honeybadger.setContext(false)
        expect(Honeybadger.context).toEqual({ foo: 'bar' })

    describe '.resetContext', ->
      it 'empties the context with no arguments', ->
        Honeybadger.setContext({ user_id: '1' })
        Honeybadger.resetContext()
        expect(Honeybadger.context).toEqual({})

      it 'replaces the context with arguments', ->
        Honeybadger.setContext({ user_id: '1' })
        Honeybadger.resetContext({ foo: 'bar' })
        expect(Honeybadger.context).toEqual({ foo: 'bar' })

      it 'empties the context with non-object argument', ->
        Honeybadger.setContext({ foo: 'bar' })
        Honeybadger.resetContext('foo')
        expect(Honeybadger.context).toEqual({})

      it 'is chainable', ->
        expect(Honeybadger.resetContext()).toBe(Honeybadger)

    it 'responds to notify', ->
      expect(Honeybadger.notify).toBeDefined()

    describe '.notify', ->
      beforeEach () ->
        spyOn(Honeybadger, '_sendRequest')
        notice = null

      it 'delivers the notice when enabled', ->
        Honeybadger.configure
          api_key: 'asdf'

        try
          'foo'.bar()
        catch e
          Honeybadger.notify(e)
          notice = new Notice({ error: e })

        expect(Honeybadger._sendRequest).toHaveBeenCalledWith(notice.toJSON(), 'default')

      it 'does not deliver notice when not configured', ->
        try
          'foo'.bar()
        catch e
          Honeybadger.notify(e)
          notice = new Notice({ error: e })

        expect(Honeybadger._sendRequest).not.toHaveBeenCalled()

      it 'does not deliver notice when disabled', ->
        Honeybadger.configure
          api_key: 'asdf',
          disabled: true

        try
          'foo'.bar()
        catch e
          Honeybadger.notify(e)
          notice = new Notice({ error: e })

        expect(Honeybadger._sendRequest).not.toHaveBeenCalled()

      it 'does not deliver notice without arguments', ->
        Honeybadger.configure
          api_key: 'asdf'

        Honeybadger.notify()
        Honeybadger.notify(null)
        Honeybadger.notify(null, {})

        expect(Honeybadger._sendRequest).not.toHaveBeenCalled()

      it 'creates a generic Error from string', ->
        Honeybadger.configure
          api_key: 'asdf'

        expected_notice = new Notice({ error: new Error("Honeybadger don't care, but you might.") })
        Honeybadger.notify("Honeybadger don't care, but you might.")

        expect(Honeybadger._sendRequest).toHaveBeenCalledWith(expected_notice.toJSON(), 'default')

      it 'accepts options as first argument', ->
        Honeybadger.configure
          api_key: 'asdf'

        error = new Error("Honeybadger don't care, but you might.")
        expected_notice = new Notice({ error: error })
        Honeybadger.notify(error: error)

        expect(Honeybadger._sendRequest).toHaveBeenCalledWith(expected_notice.toJSON(), 'default')

      it 'accepts error string and options', ->
        Honeybadger.configure
          api_key: 'asdf'

        error = new Error("Honeybadger don't care, but you might.")
        expected_notice = new Notice({ error: error })
        Honeybadger.notify("Honeybadger don't care, but you might.", user: "123")

        expect(Honeybadger._sendRequest).toHaveBeenCalledWith(expected_notice.toJSON(), 'default')

    describe '.wrap', ->
      beforeEach () ->
        Honeybadger.configure
          api_key: 'asdf'
        spyOn(Honeybadger, 'notify')

      it 'notifies Honeybadger of errors and re-throws', ->
        func = () ->
          'foo'.bar()
        error = null

        try
          Honeybadger.wrap(func)()
        catch e
          error = e

        expect(error).toEqual(jasmine.any(Error))
        expect(Honeybadger.notify).toHaveBeenCalledWith(error, 'default')

    describe 'beforeNotify', ->
      beforeEach () ->
        notice = null
        Honeybadger.beforeNotifyHandlers.length = 0
        Honeybadger.configure
          api_key: 'asdf'
        spyOn(Honeybadger, '_sendRequest')

      it 'does not deliver notice when  beforeNotify callback returns false', ->
        Honeybadger.beforeNotify () -> false

        try
          'foo'.bar()
        catch e
          Honeybadger.notify(e)
          notice = new Notice({ error: e })

        expect(Honeybadger._sendRequest).not.toHaveBeenCalled()

      it 'delivers notice when beforeNotify returns true', ->
        Honeybadger.beforeNotify () -> true

        try
          'foo'.bar()
        catch e
          Honeybadger.notify(e)
          notice = new Notice({ error: e })

        expect(Honeybadger._sendRequest).toHaveBeenCalled()

      it 'delivers notice when beforeNotify has no return', ->
        Honeybadger.beforeNotify () ->

        try
          'foo'.bar()
        catch e
          Honeybadger.notify(e)
          notice = new Notice({ error: e })

        expect(Honeybadger._sendRequest).toHaveBeenCalled()

    describe '._handleTraceKitSubscription', ->
      beforeEach () ->
        Honeybadger.install()
        spyOn Honeybadger, 'notify'

      describe 'default behavior', ->
        it 'ignores unhandled errors', ->
          window.onerror 'testing', 'http://foo.bar', '123'
          expect(Honeybadger.notify).not.toHaveBeenCalled()

      describe 'when onerror is enabled', ->
        beforeEach () ->
          Honeybadger.configure
            api_key: 'asdf',
            onerror: true

        it 'notifies Honeybadger of unhandled exceptions', ->
          stackInfo = 'foo'
          window.onerror 'testing', 'http://foo.bar', '123'

          expect(Honeybadger.notify).toHaveBeenCalledWith(jasmine.any(Object))

  describe 'with app name', ->
    describe '.configure', ->
      it 'configures Honeybadger for a specific app', ->
        expect(Honeybadger.configure).toBeDefined()

        Honeybadger.configure
          app:     'pivotal'
          api_key: 'asdf'

        expect(Honeybadger.configuration.pivotal).toBeDefined()
        expect(Honeybadger.configuration.pivotal.api_key).toEqual('asdf')

      it 'sets the first app as the default', ->
        Honeybadger.configure
          app:     'pivotal'
          api_key: 'asdf'
        Honeybadger.configure
          app:     'digital_ocean'
          api_key: 'lmao'

        expect(Honeybadger.configuration.pivotal).toBeDefined()
        expect(Honeybadger.configuration.digital_ocean).toBeDefined()
        expect(Honeybadger.configuration.default).toBeDefined()
        expect(Honeybadger.configuration.default.api_key).toEqual('asdf')

      it 'enables notifications on first call for a specific app', ->
        Honeybadger.configure
          app:     'pivotal'
          api_key: 'asdf'
        expect(Honeybadger.configuration.pivotal.disabled).toEqual(false)

      it 'leaves notifications disabled on subsequent call for a specific app', ->
        Honeybadger.configure
          app:      'pivotal'
          api_key:  'asdf'
          disabled: true
        Honeybadger.configure
          app:     'pivotal'
          api_key: 'zxcv'
        expect(Honeybadger.configuration.pivotal.disabled).toEqual(true)

    describe '.notify', ->
      beforeEach () ->
        spyOn(Honeybadger, '_sendRequest')
        notice = null

      it 'delivers the notice when enabled', ->
        Honeybadger.configure
          app:     'pivotal'
          api_key: 'asdf'

        try
          'foo'.bar()
        catch e
          Honeybadger.notify(e, 'pivotal')
          notice = new Notice({ error: e })

        expect(Honeybadger._sendRequest).toHaveBeenCalledWith(notice.toJSON(), 'pivotal')

      it 'does not deliver notice when not configured', ->
        try
          'foo'.bar()
        catch e
          Honeybadger.notify(e, 'pivotal')
          notice = new Notice({ error: e })

        expect(Honeybadger._sendRequest).not.toHaveBeenCalled()

      it 'does not deliver notice when disabled', ->
        Honeybadger.configure
          app:      'pivotal'
          api_key:  'asdf'
          disabled: true

        try
          'foo'.bar()
        catch e
          Honeybadger.notify(e, 'pivotal')
          notice = new Notice({ error: e })

        expect(Honeybadger._sendRequest).not.toHaveBeenCalled()

      it 'does not deliver notice without arguments', ->
        Honeybadger.configure
          app:     'pivotal'
          api_key: 'asdf'

        Honeybadger.notify()
        Honeybadger.notify(null, 'pivotal')
        Honeybadger.notify(null, {}, 'pivotal')

        expect(Honeybadger._sendRequest).not.toHaveBeenCalled()

      it 'creates a generic Error from string', ->
        Honeybadger.configure
          app:     'pivotal'
          api_key: 'asdf'

        expected_notice = new Notice({ error: new Error("Honeybadger don't care, but you might.") })
        Honeybadger.notify("Honeybadger don't care, but you might.", 'pivotal')

        expect(Honeybadger._sendRequest).toHaveBeenCalledWith(expected_notice.toJSON(), 'pivotal')

      it 'accepts options as first argument', ->
        Honeybadger.configure
          app:     'pivotal'
          api_key: 'asdf'

        error = new Error("Honeybadger don't care, but you might.")
        expected_notice = new Notice({ error: error })
        Honeybadger.notify(error: error, app: 'pivotal')

        expect(Honeybadger._sendRequest).toHaveBeenCalledWith(expected_notice.toJSON(), 'pivotal')

    describe '.wrap', ->
      beforeEach () ->
        Honeybadger.configure
          app:     'pivotal'
          api_key: 'asdf'
        spyOn(Honeybadger, 'notify')

      it 'notifies Honeybadger of errors and re-throws', ->
        func = () ->
          'foo'.bar()
        error = null

        try
          Honeybadger.wrap(func, 'pivotal')()
        catch e
          error = e

        expect(error).toEqual(jasmine.any(Error))
        expect(Honeybadger.notify).toHaveBeenCalledWith(error, 'pivotal')
