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
      personalAuthToken: config.personalAuthToken ?? undefined,
      checkins: config.checkins ?? [],
      logger: config.logger ?? console,
    }
    const transport = new ServerTransport()
    this.logger = Util.logger(this)
    this.client = client ?? new CheckInsClient({
      personalAuthToken: config.personalAuthToken,
      logger: this.logger
    }, transport)
  }

  public async sync(): Promise<CheckIn[]> {
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

    // validate that we have unique check-in names
    // throw error if there are check-ins with the same name and project id
    const checkInNames = localCheckIns.map((checkIn) => `${checkIn.projectId}_${checkIn.name}`)
    const uniqueCheckInNames = new Set(checkInNames)
    if (checkInNames.length !== uniqueCheckInNames.size) {
      throw new Error('check-in names must be unique per project')
    }

    return localCheckIns
  }

  private async createOrUpdate(localCheckIns: CheckIn[]) {
    const results = []
    // for each check-in from the localCheckIns array, check if it exists in the API
    // if it does not exist, create it
    // if it exists, check if it needs to be updated
    for (const localCheckIn of localCheckIns) {
      const projectCheckIns = await this.client.listForProject(localCheckIn.projectId)
      const remoteCheckIn = projectCheckIns.find((checkIn) => {
        return checkIn.name === localCheckIn.name
      })
      if (!remoteCheckIn) {
        results.push(await this.client.create(localCheckIn));
      } else if (!localCheckIn.isInSync(remoteCheckIn)) {
        localCheckIn.id = remoteCheckIn.id;
        results.push(await this.client.update(localCheckIn));
      } else {
        // no change - still need to add to results
        results.push(remoteCheckIn);
      }
    }

    return results
  }

  private async remove(localCheckIns: CheckIn[]) {
    // get all project ids from local check-ins
    // for each project id, get all check-ins from the API
    // if not found in local check-ins, remove it
    const projectIds = Array.from(new Set(localCheckIns.map((checkIn) => checkIn.projectId)))
    const remoteCheckInsPerProject = await Promise.all(projectIds.map((projectId) => {
      return this.client.listForProject(projectId)
    }))
    const allRemoteCheckIns = remoteCheckInsPerProject.flat()
    const checkInsToRemove = allRemoteCheckIns.filter((remoteCheckIn) => {
      return !localCheckIns.find((localCheckIn) => {
        return localCheckIn.name === remoteCheckIn.name
      })
    })

    return Promise.all(checkInsToRemove.map(async (checkIn) => {
      await this.client.remove(checkIn)
      checkIn.markAsDeleted()

      return checkIn
    }))
  }
}
