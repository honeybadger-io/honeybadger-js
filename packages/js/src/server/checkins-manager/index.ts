import { CheckinsClient } from './client'
import { CheckinsConfig } from './types'
import { ServerTransport } from '../transport';
import { Checkin } from './checkin';

export class CheckinsManager {
  private readonly config: CheckinsConfig
  private readonly client: CheckinsClient

  constructor(config: CheckinsConfig, client?: CheckinsClient) {
    this.config = config
    const transport = new ServerTransport({
      'Authorization': `Basic ${Buffer.from(`${config.personalAuthToken}:`).toString('base64')}`
    })
    this.client = client ?? new CheckinsClient(transport, config.logger)
  }

  public async sync(): Promise<Checkin[]> {
    // check if personal auth token is set
    if (!this.config.personalAuthToken || this.config.personalAuthToken === '') {
      throw new Error('personalAuthToken is required')
    }

    const results: Checkin[] = []

    // create checkins from configuration and validate them
    const localCheckins = this.config.checkins.map((dto) => {
      const checkin = new Checkin(dto)
      checkin.validate()
      return checkin
    });

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

    // get all project ids from local checkins
    // for each project id, get all checkins from the API
    // if not found in local checkins, remove it
    const projectIds = localCheckins.map((checkin) => checkin.projectId)
    const remoteCheckinsPerProject = await Promise.all(projectIds.map((projectId) => {
      return this.client.listForProject(projectId)
    }))
    const allRemoteCheckins = remoteCheckinsPerProject.flat()
    const checkinsToRemove = allRemoteCheckins.filter((remoteCheckin) => {
      return !localCheckins.find((localCheckin) => {
        return localCheckin.name === remoteCheckin.name
      })
    })
    const removed = await Promise.all(checkinsToRemove.map(async (checkin) => {
      await this.client.remove(checkin)
      checkin.markAsDeleted()
      return checkin
    }))

    return [
      ...results,
      ...removed
    ]
  }

}
