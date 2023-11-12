import { CheckinsManager } from '../../../../src/server/checkins-manager';
import { CheckinsConfig, CheckinResponsePayload, CheckinDto } from '../../../../src/server/checkins-manager/types';
import { nullLogger } from '../../helpers';
import { Checkin } from '../../../../src/server/checkins-manager/checkin';
import nock from 'nock';

describe('CheckinsManager', () => {
  it('should create a checkins manager', () => {
    const config: CheckinsConfig = {
      logger: nullLogger(),
      personalAuthToken: 'abc',
      checkins: []
    }
    const manager = new CheckinsManager(config)
    expect(manager).toBeInstanceOf(CheckinsManager)
  })

  it('should throw if personal auth token is not set', () => {
    const config: CheckinsConfig = {
      logger: nullLogger(),
      personalAuthToken: '',
      checkins: []
    }
    const manager = new CheckinsManager(config)
    expect(manager.sync()).rejects.toThrow('personalAuthToken is required')
  })

  it('should throw if a checkin configuration is invalid', () => {
    const config: CheckinsConfig = {
      logger: nullLogger(),
      personalAuthToken: 'abc',
      checkins: [
        {
          projectId: '11111',
          name: 'a check-in',
          reportPeriod: '1 week',
          gracePeriod: '5 minutes'
        },
      ] as CheckinDto[]
    }
    const manager = new CheckinsManager(config)
    expect(manager.sync()).rejects.toThrow('scheduleType is required for each checkin')
  })

  it('should throw if checkin names are not unique per project', () => {
    const config: CheckinsConfig = {
      logger: nullLogger(),
      personalAuthToken: 'abc',
      checkins: [
        {
          projectId: '11111',
          name: 'a check-in',
          scheduleType: 'simple',
          reportPeriod: '1 week',
          gracePeriod: '5 minutes'
        },
        {
          projectId: '11111',
          name: 'a check-in',
          scheduleType: 'simple',
          reportPeriod: '2 weeks',
          gracePeriod: '5 minutes'
        },
      ] as CheckinDto[]
    }
    const manager = new CheckinsManager(config)
    expect(manager.sync()).rejects.toThrow('check-in names must be unique per project')
  })

  it('should not throw if checkin names are not unique but have different project id', async () => {
    const config: CheckinsConfig = {
      logger: nullLogger(),
      personalAuthToken: 'abc',
      checkins: [
        {
          projectId: '11111',
          name: 'a check-in',
          scheduleType: 'simple',
          reportPeriod: '1 week',
          gracePeriod: '5 minutes'
        },
        {
          projectId: '22222',
          name: 'a check-in',
          scheduleType: 'simple',
          reportPeriod: '2 weeks',
          gracePeriod: '5 minutes'
        },
      ] as CheckinDto[]
    }

    const listProjectCheckinsRequest1 = nock('https://app.honeybadger.io')
      .get('/v2/projects/11111/check_ins')
      .once()
      .reply(200, {
        results: [
          {
            id: 'abc',
            ...(new Checkin(config.checkins[0]).asRequestPayload())
          }
        ]
      })

    const listProjectCheckinsRequest2 = nock('https://app.honeybadger.io')
      .get('/v2/projects/22222/check_ins')
      .once()
      .reply(200, {
        results: [
          {
            id: 'def',
            ...(new Checkin(config.checkins[1]).asRequestPayload())
          }
        ]
      })

    const manager = new CheckinsManager(config)
    const synchronizedCheckins = await manager.sync()
    expect(listProjectCheckinsRequest1.isDone()).toBe(true)
    expect(listProjectCheckinsRequest2.isDone()).toBe(true)
    expect(synchronizedCheckins).toHaveLength(2)
  })

  it('should create checkins from config', async () => {
    const projectId = '11111'
    const simpleCheckinId = '22222'
    const cronCheckinId = '33333'
    const config: CheckinsConfig = {
      logger: nullLogger(),
      personalAuthToken: 'abc',
      checkins: [
        {
          projectId,
          name: 'a check-in',
          scheduleType: 'simple',
          reportPeriod: '1 week',
          gracePeriod: '5 minutes'
        },
        {
          projectId,
          name: 'a cron check-in',
          scheduleType: 'cron',
          cronSchedule: '* * * * 5',
          gracePeriod: '25 minutes'
        }
      ]
    }

    const listProjectCheckinsRequest = nock('https://app.honeybadger.io')
      .get(`/v2/projects/${projectId}/check_ins`)
      .once()
      .reply(200, {
        results: []
      })

    const simpleCheckinPayload = new Checkin(config.checkins[0]).asRequestPayload()
    const createSimpleCheckinRequest = nock('https://app.honeybadger.io')
      .post(`/v2/projects/${projectId}/check_ins`, {
        check_in: simpleCheckinPayload
      })
      .once()
      .reply(201, {
        id: simpleCheckinId,
        ...simpleCheckinPayload
      })

    const cronCheckinPayload = new Checkin(config.checkins[1]).asRequestPayload()
    const createCronCheckinRequest = nock('https://app.honeybadger.io')
      .post(`/v2/projects/${projectId}/check_ins`,{
        check_in: cronCheckinPayload
      })
      .once()
      .reply(201, {
        id: cronCheckinId,
        ...cronCheckinPayload
      })

    const manager = new CheckinsManager(config)
    const synchronizedCheckins = await manager.sync()
    expect(listProjectCheckinsRequest.isDone()).toBe(true)
    expect(createSimpleCheckinRequest.isDone()).toBe(true)
    expect(createCronCheckinRequest.isDone()).toBe(true)
    expect(synchronizedCheckins).toHaveLength(2)
    expect(synchronizedCheckins[0]).toMatchObject(config.checkins[0])
    expect(synchronizedCheckins[0].id).toEqual(simpleCheckinId)
    expect(synchronizedCheckins[1]).toMatchObject(config.checkins[1])
    expect(synchronizedCheckins[1].id).toEqual(cronCheckinId)
  })

  it('should update checkins from config', async () => {
    const projectId = '11111'
    const simpleCheckinId = '22222'
    const cronCheckinId = '33333'
    const config: CheckinsConfig = {
      logger: nullLogger(),
      personalAuthToken: 'abc',
      checkins: [
        {
          projectId,
          name: 'a check-in',
          scheduleType: 'simple',
          reportPeriod: '1 week',
          gracePeriod: '15 minutes' // the value to update
        },
        {
          projectId,
          name: 'a cron check-in',
          scheduleType: 'cron',
          cronSchedule: '* * * 1 5', // the value to update
          gracePeriod: '25 minutes'
        }
      ]
    }

    const listProjectCheckinsRequest = nock('https://app.honeybadger.io')
      .get(`/v2/projects/${projectId}/check_ins`)
      .once()
      .reply(200, {
        results: [
          {
            id: simpleCheckinId,
            name: 'a check-in',
            schedule_type: 'simple',
            report_period: '1 week',
            grace_period: '5 minutes'
          },
          {
            id: cronCheckinId,
            name: 'a cron check-in',
            scheduleType: 'cron',
            cronSchedule: '* * * * 5',
            gracePeriod: '25 minutes'
          }
        ] as CheckinResponsePayload[]
      })

    const simpleCheckinPayload = new Checkin(config.checkins[0]).asRequestPayload()
    const updateSimpleCheckinRequest = nock('https://app.honeybadger.io')
      .put(`/v2/projects/${projectId}/check_ins/${simpleCheckinId}`, {
        check_in: simpleCheckinPayload
      })
      .once()
      .reply(204)

    const cronCheckinPayload = new Checkin(config.checkins[1]).asRequestPayload()
    const updateCronCheckinRequest = nock('https://app.honeybadger.io')
      .put(`/v2/projects/${projectId}/check_ins/${cronCheckinId}`,{
        check_in: cronCheckinPayload
      })
      .once()
      .reply(204)

    const manager = new CheckinsManager(config)
    const synchronizedCheckins = await manager.sync()
    expect(listProjectCheckinsRequest.isDone()).toBe(true)
    expect(updateSimpleCheckinRequest.isDone()).toBe(true)
    expect(updateCronCheckinRequest.isDone()).toBe(true)
    expect(synchronizedCheckins).toHaveLength(2)
    expect(synchronizedCheckins[0]).toMatchObject({
      ...config.checkins[0],
      id: simpleCheckinId,
      gracePeriod: '15 minutes'
    })
    expect(synchronizedCheckins[1]).toMatchObject({
      ...config.checkins[1],
      id: cronCheckinId,
      cronSchedule: '* * * 1 5'
    })
  })

  it('should update checkins from config to unset optional values', async () => {
    const projectId = '11111'
    const simpleCheckinId = '22222'
    const config: CheckinsConfig = {
      logger: nullLogger(),
      personalAuthToken: 'abc',
      checkins: [
        {
          projectId,
          name: 'a check-in',
          scheduleType: 'simple',
          reportPeriod: '1 week',
        },
      ]
    }

    const listProjectCheckinsRequest = nock('https://app.honeybadger.io')
      .get(`/v2/projects/${projectId}/check_ins`)
      .once()
      .reply(200, {
        results: [
          {
            id: simpleCheckinId,
            name: 'a check-in',
            slug: 'a-check-in',
            schedule_type: 'simple',
            report_period: '1 week',
          }
        ] as CheckinResponsePayload[]
      })

    const simpleCheckinPayload = new Checkin(config.checkins[0]).asRequestPayload()
    const updateSimpleCheckinRequest = nock('https://app.honeybadger.io')
      .put(`/v2/projects/${projectId}/check_ins/${simpleCheckinId}`, {
        check_in: simpleCheckinPayload
      })
      .once()
      .reply(204)

    const manager = new CheckinsManager(config)
    const synchronizedCheckins = await manager.sync()
    expect(listProjectCheckinsRequest.isDone()).toBe(true)
    expect(updateSimpleCheckinRequest.isDone()).toBe(true)
    expect(synchronizedCheckins).toHaveLength(1)
    expect(synchronizedCheckins[0]).toMatchObject({
      ...config.checkins[0],
      id: simpleCheckinId,
    })
  })

  it('should remove checkins that are not in config', async () => {
    const projectId = '11111'
    const simpleCheckinId = '22222'
    const checkinIdToRemove = '33333'
    const config: CheckinsConfig = {
      logger: nullLogger(),
      personalAuthToken: 'abc',
      checkins: [
        {
          projectId,
          name: 'a check-in',
          scheduleType: 'simple',
          reportPeriod: '1 week',
          gracePeriod: '5 minutes'
        },
      ]
    }

    const listProjectCheckinsRequest = nock('https://app.honeybadger.io')
      .get(`/v2/projects/${projectId}/check_ins`)
      .once()
      .reply(200, {
        results: [
          {
            id: simpleCheckinId,
            name: 'a check-in',
            schedule_type: 'simple',
            report_period: '1 week',
            grace_period: '5 minutes'
          },
          {
            id: checkinIdToRemove,
            name: 'a cron check-in',
            scheduleType: 'cron',
            cronSchedule: '* * * * 5',
            gracePeriod: '25 minutes'
          }
        ] as CheckinResponsePayload[]
      })

    const removeCheckinRequest = nock('https://app.honeybadger.io')
      .delete(`/v2/projects/${projectId}/check_ins/${checkinIdToRemove}`)
      .once()
      .reply(204)

    const manager = new CheckinsManager(config)
    const synchronizedCheckins = await manager.sync()
    expect(listProjectCheckinsRequest.isDone()).toBe(true)
    expect(removeCheckinRequest.isDone()).toBe(true)
    expect(synchronizedCheckins).toHaveLength(2)
    expect(synchronizedCheckins[0]).toMatchObject({
      ...config.checkins[0],
      id: simpleCheckinId,
    })
    expect(synchronizedCheckins[0].id).toEqual(simpleCheckinId)
    expect(synchronizedCheckins[1]).toMatchObject({
      ...config.checkins[1],
      id: checkinIdToRemove,
    })
    expect(synchronizedCheckins[1].isDeleted()).toEqual(true)
  })
})
