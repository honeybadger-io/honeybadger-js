import { syncCheckIns } from '../../../src/server/check-ins-sync'
import nock from 'nock'
import { CheckInResponsePayload, CheckInsConfig } from '../../../src/server/check-ins-manager/types'
import { CheckIn } from '../../../src/server/check-ins-manager/check-in'

describe('check-ins-sync', () => {
  afterEach(() => {
    jest.resetModules()
  })

  it('should throw an error if config file is not found', async () => {
    await expect(syncCheckIns()).rejects.toThrow('Could not find a Honeybadger configuration file.')
  })

  it('should throw an error if personal auth token is not set', async () => {
    jest.doMock('../../../honeybadger.config.js', () => ({}), { virtual: true })

    await expect(syncCheckIns()).rejects.toThrow('personalAuthToken is required')
  })

  it('should not sync if check-ins array is empty', async () => {
    jest.doMock('../../../honeybadger.config.js', () => ({
      personalAuthToken: '123'
    }), { virtual: true })

    const consoleLogSpy = jest.spyOn(console, 'log')
    const consoleErrorSpy = jest.spyOn(console, 'error')

    await syncCheckIns()
    expect(consoleErrorSpy).not.toHaveBeenCalled()
    expect(consoleLogSpy).toHaveBeenCalledWith('No check-ins found to synchronize with Honeybadger.')
  })

  it('should sync checkIns', async () => {
    const checkInsConfig: Partial<CheckInsConfig> = {
      personalAuthToken: '123',
      checkins: [
        {
          projectId: '11111',
          name: 'a check-in',
          scheduleType: 'simple',
          reportPeriod: '1 week',
          gracePeriod: '5 minutes'
        },
      ]
    }
    jest.doMock('../../../honeybadger.config.js', () => checkInsConfig, { virtual: true })

    const consoleLogSpy = jest.spyOn(console, 'log')
    const consoleErrorSpy = jest.spyOn(console, 'error')

    const listProjectCheckInsRequest = nock('https://app.honeybadger.io')
      .get(`/v2/projects/${checkInsConfig.checkins[0].projectId}/check_ins`)
      .once()
      .reply(200, {
        results: [
          {
            id: '22222',
            ...(new CheckIn(checkInsConfig.checkins[0]).asRequestPayload())
          },
        ] as CheckInResponsePayload[]
      })

    await syncCheckIns()
    expect(listProjectCheckInsRequest.isDone()).toBe(true)
    expect(consoleErrorSpy).not.toHaveBeenCalled()
    expect(consoleLogSpy).toHaveBeenCalledWith('Check-ins were synchronized with Honeybadger.')
  })
})
