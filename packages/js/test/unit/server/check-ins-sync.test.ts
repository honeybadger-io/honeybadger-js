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

  it('should throw an error if api key is not set', async () => {
    jest.doMock('../../../honeybadger.config.js', () => ({
      appEndpoint: 'https://app.honeybadger.io',
    }), { virtual: true })

    await expect(syncCheckIns()).rejects.toThrow('apiKey is required')
  })

  it('should throw an error if personal auth token is not set', async () => {
    jest.doMock('../../../honeybadger.config.js', () => ({
      appEndpoint: 'https://app.honeybadger.io',
      apiKey: 'hbp_123',
    }), { virtual: true })

    await expect(syncCheckIns()).rejects.toThrow('personalAuthToken is required')
  })

  it('should sync checkIns', async () => {
    const checkInsConfig: Partial<CheckInsConfig> = {
      appEndpoint: 'https://app.honeybadger.io',
      apiKey: 'hbp_123',
      personalAuthToken: '123',
      checkins: [
        {
          slug: 'a-check-in',
          scheduleType: 'simple',
          reportPeriod: '1 week',
          gracePeriod: '5 minutes'
        },
      ]
    }
    jest.doMock('../../../honeybadger.config.js', () => checkInsConfig, { virtual: true })

    const consoleLogSpy = jest.spyOn(console, 'log')
    const consoleErrorSpy = jest.spyOn(console, 'error')

    const getProjectIdRequest = nock('https://app.honeybadger.io')
      .get(`/v2/project_keys/${checkInsConfig.apiKey}`)
      .once()
      .reply(200, {
        id: checkInsConfig.apiKey,
        project: {
          id: '11111',
          name: 'Test',
        }
      })

    const listProjectCheckInsRequest = nock('https://app.honeybadger.io')
      .get('/v2/projects/11111/check_ins')
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
    expect(getProjectIdRequest.isDone()).toBe(true)
    expect(listProjectCheckInsRequest.isDone()).toBe(true)
    expect(consoleErrorSpy).not.toHaveBeenCalled()
    expect(consoleLogSpy).toHaveBeenCalledWith('Check-ins were synchronized with Honeybadger.')
  })
})
