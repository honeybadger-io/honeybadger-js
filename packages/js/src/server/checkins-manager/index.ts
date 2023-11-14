import { Util, Types } from '@honeybadger-io/core'
import { CheckinsClient } from './client'
import { CheckinsConfig } from './types'
import { ServerTransport } from '../transport';
import { Checkin } from './checkin';

export class CheckinsManager {

  private readonly client: CheckinsClient

  config: Required<CheckinsConfig>
  logger: Types.Logger

  constructor(config: Partial<CheckinsConfig>, client?: CheckinsClient) {
    this.config = {
      debug: config.debug ?? false,
      personalAuthToken: config.personalAuthToken ?? undefined,
      checkins: config.checkins ?? [],
      logger: config.logger ?? console,
    }
    const transport = new ServerTransport()
    this.logger = Util.logger(this)
    this.client = client ?? new CheckinsClient({
      personalAuthToken: config.personalAuthToken,
      logger: this.logger
    }, transport)
  }

  public async sync(): Promise<Checkin[]> {
    // check if personal auth token is set
    if (!this.config.personalAuthToken || this.config.personalAuthToken === '') {
      throw new Error('personalAuthToken is required')
    }

    const localCheckins = this.getLocalCheckins()
    const createdOrUpdated = await this.createOrUpdate(localCheckins)
    const removed = await this.remove(localCheckins)

    return [
      ...createdOrUpdated,
      ...removed
    ]
  }

  private getLocalCheckins(): Checkin[] {
    // create checkins from configuration and validate them
    const localCheckins = this.config.checkins.map((dto) => {
      const checkin = new Checkin(dto)
      checkin.validate()

      return checkin
    });

    // validate that we have unique checkin names
    // throw error if there are checkins with the same name and project id
    const checkinNames = localCheckins.map((checkin) => `${checkin.projectId}_${checkin.name}`)
    const uniqueCheckinNames = new Set(checkinNames)
    if (checkinNames.length !== uniqueCheckinNames.size) {
      throw new Error('check-in names must be unique per project')
    }

    return localCheckins
  }

  private async createOrUpdate(localCheckins: Checkin[]) {
    const results = []
    // for each checkin from the localCheckins array, check if it exists in the API
    // if it does not exist, create it
    // if it exists, check if it needs to be updated
    for (const localCheckin of localCheckins) {
      const projectCheckins = await this.client.listForProject(localCheckin.projectId)
      const remoteCheckin = projectCheckins.find((checkin) => {
        return checkin.name === localCheckin.name
      })
      if (!remoteCheckin) {
        results.push(await this.client.create(localCheckin));
      } else if (!localCheckin.isInSync(remoteCheckin)) {
        localCheckin.id = remoteCheckin.id;
        results.push(await this.client.update(localCheckin));
      } else {
        // no change - still need to add to results
        results.push(remoteCheckin);
      }
    }

    return results
  }

  private async remove(localCheckins: Checkin[]) {
    // get all project ids from local checkins
    // for each project id, get all checkins from the API
    // if not found in local checkins, remove it
    const projectIds = Array.from(new Set(localCheckins.map((checkin) => checkin.projectId)))
    const remoteCheckinsPerProject = await Promise.all(projectIds.map((projectId) => {
      return this.client.listForProject(projectId)
    }))
    const allRemoteCheckins = remoteCheckinsPerProject.flat()
    const checkinsToRemove = allRemoteCheckins.filter((remoteCheckin) => {
      return !localCheckins.find((localCheckin) => {
        return localCheckin.name === remoteCheckin.name
      })
    })

    return Promise.all(checkinsToRemove.map(async (checkin) => {
      await this.client.remove(checkin)
      checkin.markAsDeleted()

      return checkin
    }))
  }
}
