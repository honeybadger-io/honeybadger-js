import { CheckIn } from '../../../../src/server/check-ins-manager/check-in';

describe('CheckIn', function () {
  it('should be able to create a check-in', function () {
    const checkIn = new CheckIn({ slug: 'a-check-in', scheduleType: 'simple' })
    expect(checkIn).toBeInstanceOf(CheckIn)
  })

  it('should be able to mark a checkin as deleted', function () {
    const checkIn = new CheckIn({ slug: 'a-check-in', scheduleType: 'simple' })
    checkIn.markAsDeleted()
    expect(checkIn.isDeleted()).toBeTruthy()
  })

  describe('validate', function () {
    it('should throw an error if the check-in is missing a slug', function () {
      // @ts-expect-error
      const checkIn = new CheckIn({})
      expect(() => checkIn.validate()).toThrowError('slug is required for each check-in')
    })

    it('should throw an error if the check-in is missing a scheduleType', function () {
      // @ts-expect-error
      const checkIn = new CheckIn({ slug: 'a-check-in' })
      expect(() => checkIn.validate()).toThrowError('scheduleType is required for each check-in')
    })

    it('should throw an error if the check-in has an invalid scheduleType', function () {
      const checkIn = new CheckIn({
        slug: 'a-check-in',
        scheduleType: 'invalid' as never
      })
      expect(() => checkIn.validate()).toThrowError('a-check-in [scheduleType] must be "simple" or "cron"')
    })

    it('should throw an error if the check-in is missing a reportPeriod', function () {
      const checkIn = new CheckIn({
        slug: 'a-check-in',
        scheduleType: 'simple'
      })
      expect(() => checkIn.validate()).toThrowError('a-check-in [reportPeriod] is required for simple check-ins')
    })

    it('should throw an error if the check-in is missing a cronSchedule', function () {
      const checkIn = new CheckIn({
        slug: 'a-check-in',
        scheduleType: 'cron'
      })
      expect(() => checkIn.validate()).toThrowError('a-check-in [cronSchedule] is required for cron check-ins')
    })
  })
})
