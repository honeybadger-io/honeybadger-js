import { CheckInsManager } from '../../../../src/server/check-ins-manager';
import { CheckInsConfig, CheckInResponsePayload, CheckInDto } from '../../../../src/server/check-ins-manager/types';
import { nullLogger } from '../../helpers';
import { CheckIn } from '../../../../src/server/check-ins-manager/check-in';
import nock from 'nock';

describe('CheckinsManager', () => {
  it('should create a check-ins manager', () => {
    const config: CheckInsConfig = {
      logger: nullLogger(),
      apiKey: 'hbp_abc',
      personalAuthToken: 'abc',
      checkins: []
    }
    const manager = new CheckInsManager(config)
    expect(manager).toBeInstanceOf(CheckInsManager)
  })

  it('should throw if api key is not set', () => {
    const config: CheckInsConfig = {
      logger: nullLogger(),
      apiKey: '',
      personalAuthToken: '',
      checkins: []
    }
    const manager = new CheckInsManager(config)
    expect(manager.sync()).rejects.toThrow('apiKey is required')
  })

  it('should throw if personal auth token is not set', () => {
    const config: CheckInsConfig = {
      logger: nullLogger(),
      apiKey: 'hbp_123',
      personalAuthToken: '',
      checkins: []
    }
    const manager = new CheckInsManager(config)
    expect(manager.sync()).rejects.toThrow('personalAuthToken is required')
  })

  it('should throw if a check-in configuration is invalid', () => {
    const config: CheckInsConfig = {
      logger: nullLogger(),
      apiKey: 'hbp_abc',
      personalAuthToken: 'abc',
      checkins: [
        {
          slug: 'a-check-in',
          reportPeriod: '1 week',
          gracePeriod: '5 minutes'
        },
      ] as CheckInDto[]
    }
    const manager = new CheckInsManager(config)
    expect(manager.sync()).rejects.toThrow('scheduleType is required for each check-in')
  })

  it('should throw if check-in slugs are not unique', () => {
    const config: CheckInsConfig = {
      logger: nullLogger(),
      apiKey: 'hbp_abc',
      personalAuthToken: 'abc',
      checkins: [
        {
          slug: 'a-check-in',
          scheduleType: 'simple',
          reportPeriod: '1 week',
          gracePeriod: '5 minutes'
        },
        {
          slug: 'a-check-in',
          scheduleType: 'simple',
          reportPeriod: '2 weeks',
          gracePeriod: '5 minutes'
        },
      ] as CheckInDto[]
    }
    const manager = new CheckInsManager(config)
    expect(manager.sync()).rejects.toThrow('check-in slugs must be unique')
  })

  it('should create check-ins from config', async () => {
    const projectId = '11111'
    const simpleCheckInId = '22222'
    const cronCheckInId = '33333'
    const config: CheckInsConfig = {
      logger: nullLogger(),
      apiKey: 'hbp_abc',
      personalAuthToken: 'abc',
      checkins: [
        {
          slug: 'a-check-in',
          scheduleType: 'simple',
          reportPeriod: '1 week',
          gracePeriod: '5 minutes'
        },
        {
          slug: 'a-cron-check-in',
          scheduleType: 'cron',
          cronSchedule: '* * * * 5',
          gracePeriod: '25 minutes'
        }
      ]
    }

    const getProjectIdRequest = nock('https://app.honeybadger.io')
      .get(`/v2/project_keys/${config.apiKey}`)
      .once()
      .reply(200, {
        id: config.apiKey,
        project: {
          id: projectId,
          name: 'Test',
        }
      })

    const listProjectCheckInsRequest = nock('https://app.honeybadger.io')
      .get(`/v2/projects/${projectId}/check_ins`)
      .once()
      .reply(200, {
        results: []
      })

    const simpleCheckInPayload = new CheckIn(config.checkins[0]).asRequestPayload()
    const createSimpleCheckInRequest = nock('https://app.honeybadger.io')
      .post(`/v2/projects/${projectId}/check_ins`, {
        check_in: simpleCheckInPayload
      })
      .once()
      .reply(201, {
        id: simpleCheckInId,
        ...simpleCheckInPayload
      })

    const cronCheckInPayload = new CheckIn(config.checkins[1]).asRequestPayload()
    const createCronCheckInRequest = nock('https://app.honeybadger.io')
      .post(`/v2/projects/${projectId}/check_ins`,{
        check_in: cronCheckInPayload
      })
      .once()
      .reply(201, {
        id: cronCheckInId,
        ...cronCheckInPayload
      })

    const manager = new CheckInsManager(config)
    const synchronizedCheckIns = await manager.sync()
    expect(getProjectIdRequest.isDone()).toBe(true)
    expect(listProjectCheckInsRequest.isDone()).toBe(true)
    expect(createSimpleCheckInRequest.isDone()).toBe(true)
    expect(createCronCheckInRequest.isDone()).toBe(true)
    expect(synchronizedCheckIns).toHaveLength(2)
    expect(synchronizedCheckIns[0]).toMatchObject(config.checkins[0])
    expect(synchronizedCheckIns[0].id).toEqual(simpleCheckInId)
    expect(synchronizedCheckIns[1]).toMatchObject(config.checkins[1])
    expect(synchronizedCheckIns[1].id).toEqual(cronCheckInId)
  })

  it('should update check-ins from config', async () => {
    const projectId = '11111'
    const simpleCheckInId = '22222'
    const cronCheckInId = '33333'
    const config: CheckInsConfig = {
      logger: nullLogger(),
      apiKey: 'hbp_abc',
      personalAuthToken: 'abc',
      checkins: [
        {
          slug: 'a-check-in',
          scheduleType: 'simple',
          reportPeriod: '1 week',
          gracePeriod: '15 minutes' // the value to update
        },
        {
          slug: 'a-cron-check-in',
          scheduleType: 'cron',
          cronSchedule: '* * * 1 5', // the value to update
          gracePeriod: '25 minutes'
        }
      ]
    }

    const getProjectIdRequest = nock('https://app.honeybadger.io')
      .get(`/v2/project_keys/${config.apiKey}`)
      .once()
      .reply(200, {
        id: config.apiKey,
        project: {
          id: projectId,
          name: 'Test',
        }
      })

    const listProjectCheckInsRequest = nock('https://app.honeybadger.io')
      .get(`/v2/projects/${projectId}/check_ins`)
      .once()
      .reply(200, {
        results: [
          {
            id: simpleCheckInId,
            slug: 'a-check-in',
            schedule_type: 'simple',
            report_period: '1 week',
            grace_period: '5 minutes'
          },
          {
            id: cronCheckInId,
            slug: 'a-cron-check-in',
            scheduleType: 'cron',
            cronSchedule: '* * * * 5',
            gracePeriod: '25 minutes'
          }
        ] as CheckInResponsePayload[]
      })

    const simpleCheckInPayload = new CheckIn(config.checkins[0]).asRequestPayload()
    const updateSimpleCheckInRequest = nock('https://app.honeybadger.io')
      .put(`/v2/projects/${projectId}/check_ins/${simpleCheckInId}`, {
        check_in: simpleCheckInPayload
      })
      .once()
      .reply(204)

    const cronCheckInPayload = new CheckIn(config.checkins[1]).asRequestPayload()
    const updateCronCheckInRequest = nock('https://app.honeybadger.io')
      .put(`/v2/projects/${projectId}/check_ins/${cronCheckInId}`,{
        check_in: cronCheckInPayload
      })
      .once()
      .reply(204)

    const manager = new CheckInsManager(config)
    const synchronizedCheckIns = await manager.sync()
    expect(getProjectIdRequest.isDone()).toBe(true)
    expect(listProjectCheckInsRequest.isDone()).toBe(true)
    expect(updateSimpleCheckInRequest.isDone()).toBe(true)
    expect(updateCronCheckInRequest.isDone()).toBe(true)
    expect(synchronizedCheckIns).toHaveLength(2)
    expect(synchronizedCheckIns[0]).toMatchObject({
      ...config.checkins[0],
      id: simpleCheckInId,
      gracePeriod: '15 minutes'
    })
    expect(synchronizedCheckIns[1]).toMatchObject({
      ...config.checkins[1],
      id: cronCheckInId,
      cronSchedule: '* * * 1 5'
    })
  })

  it('should not update check-ins from config if no values changed', async () => {
    const projectId = '11111'
    const simpleCheckInId = '22222'
    const config: CheckInsConfig = {
      logger: nullLogger(),
      apiKey: 'hbp_abc',
      personalAuthToken: 'abc',
      checkins: [
        {
          slug: 'a-check-in',
          scheduleType: 'simple',
          reportPeriod: '1 week',
        },
      ]
    }

    const getProjectIdRequest = nock('https://app.honeybadger.io')
      .get(`/v2/project_keys/${config.apiKey}`)
      .once()
      .reply(200, {
        id: config.apiKey,
        project: {
          id: projectId,
          name: 'Test',
        }
      })

    const listProjectCheckInsRequest = nock('https://app.honeybadger.io')
      .get(`/v2/projects/${projectId}/check_ins`)
      .once()
      .reply(200, {
        results: [
          {
            id: simpleCheckInId,
            name: 'a random generated value that should not cause an update',
            slug: 'a-check-in',
            schedule_type: 'simple',
            report_period: '1 week',
          }
        ] as CheckInResponsePayload[]
      })

    const manager = new CheckInsManager(config)
    const synchronizedCheckIns = await manager.sync()
    expect(getProjectIdRequest.isDone()).toBe(true)
    expect(listProjectCheckInsRequest.isDone()).toBe(true)
    expect(synchronizedCheckIns).toHaveLength(1)
    expect(synchronizedCheckIns[0]).toMatchObject({
      ...config.checkins[0],
      id: simpleCheckInId,
    })
  })

  it('should remove checkins that are not in config', async () => {
    const projectId = '11111'
    const simpleCheckInId = '22222'
    const checkInIdToRemove = '33333'
    const config: CheckInsConfig = {
      logger: nullLogger(),
      apiKey: 'hbp_abc',
      personalAuthToken: 'abc',
      checkins: [
        {
          slug: 'a-check-in',
          scheduleType: 'simple',
          reportPeriod: '1 week',
          gracePeriod: '5 minutes'
        },
      ]
    }

    const getProjectIdRequest = nock('https://app.honeybadger.io')
      .get(`/v2/project_keys/${config.apiKey}`)
      .once()
      .reply(200, {
        id: config.apiKey,
        project: {
          id: projectId,
          name: 'Test',
        }
      })

    const listProjectCheckInsRequest = nock('https://app.honeybadger.io')
      .get(`/v2/projects/${projectId}/check_ins`)
      .once()
      .reply(200, {
        results: [
          {
            id: simpleCheckInId,
            slug: 'a-check-in',
            schedule_type: 'simple',
            report_period: '1 week',
            grace_period: '5 minutes'
          },
          {
            id: checkInIdToRemove,
            slug: 'a-cron-check-in',
            scheduleType: 'cron',
            cronSchedule: '* * * * 5',
            gracePeriod: '25 minutes'
          }
        ] as CheckInResponsePayload[]
      })

    const removeCheckInRequest = nock('https://app.honeybadger.io')
      .delete(`/v2/projects/${projectId}/check_ins/${checkInIdToRemove}`)
      .once()
      .reply(204)

    const manager = new CheckInsManager(config)
    const synchronizedCheckIns = await manager.sync()
    expect(getProjectIdRequest.isDone()).toBe(true)
    expect(listProjectCheckInsRequest.isDone()).toBe(true)
    expect(removeCheckInRequest.isDone()).toBe(true)
    expect(synchronizedCheckIns).toHaveLength(2)
    expect(synchronizedCheckIns[0]).toMatchObject({
      ...config.checkins[0],
      id: simpleCheckInId,
    })
    expect(synchronizedCheckIns[0].id).toEqual(simpleCheckInId)
    expect(synchronizedCheckIns[1]).toMatchObject({
      ...config.checkins[1],
      id: checkInIdToRemove,
    })
    expect(synchronizedCheckIns[1].isDeleted()).toEqual(true)
  })
})
