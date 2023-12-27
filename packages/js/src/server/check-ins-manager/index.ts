import { Util, Types } from '@honeybadger-io/core'
import { CheckInsClient } from './client'
import { CheckInsConfig } from './types'
import { ServerTransport } from '../transport';
import { CheckIn } from './check-in';

export class CheckInsManager {

  private readonly client: CheckInsClient

  config: Required<CheckInsConfig>
  logger: Types.Logger

  constructor(config: Partial<CheckInsConfig>, client?: CheckInsClient) {
    this.config = {
      debug: config.debug ?? false,
      apiKey: config.apiKey ?? undefined,
      personalAuthToken: config.personalAuthToken ?? undefined,
      checkins: config.checkins ?? [],
      logger: config.logger ?? console,
    }
    const transport = new ServerTransport()
    this.logger = Util.logger(this)
    this.client = client ?? new CheckInsClient({
      apiKey: config.apiKey,
      personalAuthToken: config.personalAuthToken,
      logger: this.logger
    }, transport)
  }

  public async sync(): Promise<CheckIn[]> {
    // check if api key is set
    if (!this.config.apiKey || this.config.apiKey === '') {
      throw new Error('apiKey is required')
    }

    // check if personal auth token is set
    if (!this.config.personalAuthToken || this.config.personalAuthToken === '') {
      throw new Error('personalAuthToken is required')
    }

    const localCheckIns = this.getLocalCheckIns()
    const createdOrUpdated = await this.createOrUpdate(localCheckIns)
    const removed = await this.remove(localCheckIns)

    return [
      ...createdOrUpdated,
      ...removed
    ]
  }

  private getLocalCheckIns(): CheckIn[] {
    // create check-ins from configuration and validate them
    const localCheckIns = this.config.checkins.map((dto) => {
      const checkIn = new CheckIn(dto)
      checkIn.validate()

      return checkIn
    });

    // validate that we have unique check-in slugs
    const checkInSlugs = localCheckIns.map((checkIn) => checkIn.slug)
    const uniqueCheckInSlugs = new Set(checkInSlugs)
    if (checkInSlugs.length !== uniqueCheckInSlugs.size) {
      throw new Error('check-in slugs must be unique')
    }

    return localCheckIns
  }

  private async createOrUpdate(localCheckIns: CheckIn[]) {
    const results = []
    const projectId = await this.client.getProjectId(this.config.apiKey)
    const remoteCheckins = await this.client.listForProject(projectId)
    // for each check-in from the localCheckIns array, check if it exists in the API
    // if it does not exist, create it
    // if it exists, check if it needs to be updated
    for (const localCheckIn of localCheckIns) {
      const remoteCheckIn = remoteCheckins.find((checkIn) => {
        return checkIn.slug === localCheckIn.slug
      })
      if (!remoteCheckIn) {
        results.push(await this.client.create(projectId, localCheckIn));
      } else if (!localCheckIn.isInSync(remoteCheckIn)) {
        localCheckIn.id = remoteCheckIn.id;
        results.push(await this.client.update(projectId, localCheckIn));
      } else {
        // no change - still need to add to results
        results.push(remoteCheckIn);
      }
    }

    return results
  }

  private async remove(localCheckIns: CheckIn[]) {
    const projectId = await this.client.getProjectId(this.config.apiKey)
    const remoteCheckins = await this.client.listForProject(projectId)

    // get all check-ins from the API
    // if not found in local check-ins, remove it
    const checkInsToRemove = remoteCheckins.filter((remoteCheckIn) => {
      return !localCheckIns.find((localCheckIn) => {
        return localCheckIn.slug === remoteCheckIn.slug
      })
    })

    return Promise.all(checkInsToRemove.map(async (checkIn) => {
      await this.client.remove(projectId, checkIn)
      checkIn.markAsDeleted()

      return checkIn
    }))
  }
}
