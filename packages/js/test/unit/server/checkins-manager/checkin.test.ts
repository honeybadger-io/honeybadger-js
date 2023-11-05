import { Checkin } from '../../../../src/server/checkins-manager/checkin';

describe('Checkin', function () {
  it('should be able to create a checkin', function () {
    const checkin = new Checkin({ name: 'a check-in', projectId: '123', scheduleType: 'simple' })
    expect(checkin).toBeInstanceOf(Checkin)
  })

  it('should be able to mark a checkin as deleted', function () {
    const checkin = new Checkin({ name: 'a check-in', projectId: '123', scheduleType: 'simple' })
    checkin.markAsDeleted()
    expect(checkin.isDeleted()).toBeTruthy()
  })

  describe('validate', function () {
    it('should throw an error if the checkin is missing a projectId', function () {
      // @ts-expect-error
      const checkin = new Checkin({ name: 'a check-in' })
      expect(() => checkin.validate()).toThrowError('projectId is required for each checkin')
    })

    it('should throw an error if the checkin is missing a name', function () {
      // @ts-expect-error
      const checkin = new Checkin({ projectId: '11111' })
      expect(() => checkin.validate()).toThrowError('name is required for each checkin')
    })

    it('should throw an error if the checkin is missing a scheduleType', function () {
      // @ts-expect-error
      const checkin = new Checkin({ projectId: '11111', name: 'a check-in' })
      expect(() => checkin.validate()).toThrowError('scheduleType is required for each checkin')
    })

    it('should throw an error if the checkin has an invalid scheduleType', function () {
      const checkin = new Checkin({
        projectId: '11111',
        name: 'a check-in',
        scheduleType: 'invalid' as never
      })
      expect(() => checkin.validate()).toThrowError('a check-in [scheduleType] must be "simple" or "cron"')
    })

    it('should throw an error if the checkin is missing a reportPeriod', function () {
      const checkin = new Checkin({
        projectId: '11111',
        name: 'a check-in',
        scheduleType: 'simple'
      })
      expect(() => checkin.validate()).toThrowError('a check-in [reportPeriod] is required for simple checkins')
    })

    it('should throw an error if the checkin is missing a cronSchedule', function () {
      const checkin = new Checkin({
        projectId: '11111',
        name: 'a check-in',
        scheduleType: 'cron'
      })
      expect(() => checkin.validate()).toThrowError('a check-in [cronSchedule] is required for cron checkins')
    })
  })
})
