import { getStats } from '../../../src/server/util'

describe('server/util', function () {
  describe('getStats', function () {
    it('returns the name of the element', function () {
      return new Promise(resolve => {
        getStats(stats => {
          expect(stats.load['one']).toEqual(expect.any(Number))
          expect(stats.load['five']).toEqual(expect.any(Number))
          expect(stats.load['fifteen']).toEqual(expect.any(Number))

          expect(stats.mem['free']).toEqual(expect.any(Number))
          expect(stats.mem['total']).toEqual(expect.any(Number))

          resolve(true)
        })
      })
    })
  })
})
