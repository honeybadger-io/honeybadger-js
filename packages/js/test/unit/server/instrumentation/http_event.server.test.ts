import {
  buildRequestEventPayload,
  durationMs,
  getOrCreateCorrelationId,
  getOrCreateRequestId,
  seedRequestEventContext,
  startTimer,
} from '../../../../src/server/instrumentation/http_event'

describe('http_event helpers', function () {
  describe('getOrCreateRequestId', function () {
    it('reads x-request-id when present', function () {
      expect(getOrCreateRequestId({ 'x-request-id': 'abc-1' })).toBe('abc-1')
    })

    it('falls back to request-id', function () {
      expect(getOrCreateRequestId({ 'request-id': 'plain-2' })).toBe('plain-2')
    })

    it('prefers x-request-id over request-id', function () {
      expect(getOrCreateRequestId({
        'x-request-id': 'x',
        'request-id': 'plain',
      })).toBe('x')
    })

    it('is case-insensitive', function () {
      expect(getOrCreateRequestId({ 'X-Request-ID': 'mixed-case' })).toBe('mixed-case')
    })

    it('takes the first value when the header is an array', function () {
      expect(getOrCreateRequestId({ 'x-request-id': ['first', 'second'] })).toBe('first')
    })

    it('ignores blank header values', function () {
      const id = getOrCreateRequestId({ 'x-request-id': '   ' })
      expect(id).not.toBe('   ')
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    })

    it('generates a non-empty id when no header is present', function () {
      const id = getOrCreateRequestId({})
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    })

    it('handles null/undefined headers', function () {
      expect(typeof getOrCreateRequestId(null)).toBe('string')
      expect(typeof getOrCreateRequestId(undefined)).toBe('string')
    })
  })

  describe('getOrCreateCorrelationId', function () {
    it('reads x-correlation-id when present', function () {
      expect(getOrCreateCorrelationId({ 'x-correlation-id': 'trace-1' }, 'r')).toBe('trace-1')
    })

    it('falls back to x-amzn-trace-id', function () {
      expect(getOrCreateCorrelationId({ 'x-amzn-trace-id': 'Root=1-x' }, 'r')).toBe('Root=1-x')
    })

    it('prefers x-correlation-id over x-amzn-trace-id', function () {
      expect(getOrCreateCorrelationId({
        'x-correlation-id': 'corr',
        'x-amzn-trace-id': 'amzn',
      }, 'r')).toBe('corr')
    })

    it('falls back to the supplied requestId when no headers match', function () {
      expect(getOrCreateCorrelationId({}, 'fallback')).toBe('fallback')
    })
  })

  describe('seedRequestEventContext', function () {
    it('returns both ids; correlation_id equals request_id when no correlation header', function () {
      const out = seedRequestEventContext({ 'x-request-id': 'r-1' })
      expect(out.request_id).toBe('r-1')
      expect(out.correlation_id).toBe('r-1')
    })

    it('returns distinct ids when both headers are present', function () {
      const out = seedRequestEventContext({
        'x-request-id': 'r-2',
        'x-correlation-id': 'c-2',
      })
      expect(out.request_id).toBe('r-2')
      expect(out.correlation_id).toBe('c-2')
    })

    it('generates ids when no headers are present', function () {
      const out = seedRequestEventContext({})
      expect(out.request_id.length).toBeGreaterThan(0)
      expect(out.correlation_id).toBe(out.request_id)
    })
  })

  describe('startTimer / durationMs', function () {
    it('returns a non-negative integer duration', async function () {
      const t = startTimer()
      await new Promise((r) => setTimeout(r, 5))
      const d = durationMs(t)
      expect(Number.isInteger(d)).toBe(true)
      expect(d).toBeGreaterThanOrEqual(0)
    })
  })

  describe('buildRequestEventPayload', function () {
    it('includes only defined fields', function () {
      const payload = buildRequestEventPayload({
        method: 'GET',
        path: '/x',
        status: 200,
        duration: 12,
      })
      expect(payload).toEqual({
        method: 'GET',
        path: '/x',
        status: 200,
        duration: 12,
      })
    })

    it('omits undefined fields', function () {
      const payload = buildRequestEventPayload({
        method: 'POST',
      })
      expect(payload).toEqual({ method: 'POST' })
    })

    it('merges extra fields without overwriting known keys', function () {
      const payload = buildRequestEventPayload({
        method: 'GET',
        extra: { method: 'should-not-override', custom: 'value' },
      })
      expect(payload.method).toBe('GET')
      expect(payload.custom).toBe('value')
    })

    it('does not drop extras that share names with Object prototype keys', function () {
      const payload = buildRequestEventPayload({
        extra: { toString: 'custom-to-string', constructor: 'custom-ctor' },
      })
      expect(payload.toString).toBe('custom-to-string')
      expect(payload.constructor).toBe('custom-ctor')
    })
  })
})
