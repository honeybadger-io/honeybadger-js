import path from 'path'
import { syncCheckins } from '../../../src/server/checkins-sync'
import { cosmiconfigSync } from 'cosmiconfig'
import nock from 'nock';
import { CheckinResponsePayload, CheckinsConfig } from '../../../src/server/checkins-manager/types';
import { Checkin } from '../../../src/server/checkins-manager/checkin';

const configPath = path.resolve(__dirname, '../../../', 'honeybadger.config.js')
jest.mock('cosmiconfig', () => ({
  cosmiconfigSync: jest.fn()
}))
const mockCosmiconfig = cosmiconfigSync as jest.MockedFunction<typeof cosmiconfigSync>

describe('checkins-sync', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should throw an error if config file is not found', async () => {
    mockCosmiconfig.mockImplementation((_moduleName, _options) => {
      return {
        load: jest.fn(),
        clearCaches: jest.fn(),
        clearLoadCache: jest.fn(),
        clearSearchCache: jest.fn(),
        search: () => {
          return {
            isEmpty: true,
            config: null,
            filepath: null
          }
        }
      }
    })
    await expect(syncCheckins()).rejects.toThrow('Could not find a Honeybadger configuration file.')
  })

  it('should throw an error if personal auth token is not set', async () => {
    mockCosmiconfig.mockImplementation((_moduleName, _options) => {
      return {
        load: jest.fn(),
        clearCaches: jest.fn(),
        clearLoadCache: jest.fn(),
        clearSearchCache: jest.fn(),
        search: () => {
          return {
            isEmpty: false,
            config: {},
            filepath: configPath
          }
        }
      }
    })
    await expect(syncCheckins()).rejects.toThrow('personalAuthToken is required')
  })

  it('should not sync if checkins array is empty', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log')
    const consoleErrorSpy = jest.spyOn(console, 'error')
    mockCosmiconfig.mockImplementation((_moduleName, _options) => {
      return {
        load: jest.fn(),
        clearCaches: jest.fn(),
        clearLoadCache: jest.fn(),
        clearSearchCache: jest.fn(),
        search: () => {
          return {
            isEmpty: false,
            config: {
              personalAuthToken: '123'
            },
            filepath: configPath
          }
        }
      }
    })

    await syncCheckins()
    expect(consoleErrorSpy).not.toHaveBeenCalled()
    expect(consoleLogSpy).toHaveBeenCalledWith('No check-ins found to synchronize with Honeybadger.')
  })

  it('should sync checkins', async () => {
    const checkinsConfig: Partial<CheckinsConfig> = {
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
    const consoleLogSpy = jest.spyOn(console, 'log')
    const consoleErrorSpy = jest.spyOn(console, 'error')
    mockCosmiconfig.mockImplementation((_moduleName, _options) => {
      return {
        load: jest.fn(),
        clearCaches: jest.fn(),
        clearLoadCache: jest.fn(),
        clearSearchCache: jest.fn(),
        search: () => {
          return {
            isEmpty: false,
            config: checkinsConfig,
            filepath: configPath
          }
        }
      }
    })
    const listProjectCheckinsRequest = nock('https://app.honeybadger.io')
      .get(`/v2/projects/${checkinsConfig.checkins[0].projectId}/check_ins`)
      .once()
      .reply(200, {
        results: [
          {
            id: '22222',
            ...(new Checkin(checkinsConfig.checkins[0]).asRequestPayload())
          },
        ] as CheckinResponsePayload[]
      })

    await syncCheckins()
    expect(listProjectCheckinsRequest.isDone()).toBe(true)
    expect(consoleErrorSpy).not.toHaveBeenCalled()
    expect(consoleLogSpy).toHaveBeenCalledWith('Check-ins were synchronized with Honeybadger.')
  })
})
