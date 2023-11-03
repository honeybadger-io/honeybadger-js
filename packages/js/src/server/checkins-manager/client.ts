import { Types } from '@honeybadger-io/core'
import { Checkin } from './checkin'
import { CheckinResponsePayload } from './types';

export class CheckinsClient {
  private readonly BASE_URL = 'https://app.honeybadger.io'
  private readonly cache: Record<string, Checkin[]>
  private readonly logger: Types.Logger
  private readonly transport: Types.Transport

  constructor(transport: Types.Transport, logger: Types.Logger) {
    this.transport = transport
    this.logger = logger
    this.cache = {}
  }

  public async listForProject(projectId: string): Promise<Checkin[]> {
    if (this.cache[projectId]) {
      return this.cache[projectId]
    }

    const response = await this.transport.send({
      method: 'GET',
      endpoint: `${this.BASE_URL}/v2/projects/${projectId}/check_ins`,
      logger: this.logger,
    })

    if (response.statusCode !== 200) {
      this.logger.debug(`Failed to fetch checkins for project[${projectId}]: ${response.body}`)
      throw new Error(`Failed to fetch checkins for project[${projectId}]`,)
    }

    const data: { results: CheckinResponsePayload[] } = JSON.parse(response.body)
    const checkins = data.results.map((checkin) => {
      const result = Checkin.fromResponsePayload(checkin)
      result.projectId = projectId
      return result
    })
    this.cache[projectId] = checkins

    return checkins
  }

  public async get(projectId: string, checkinId: string): Promise<Checkin> {
    const response = await this.transport.send({
      method: 'GET',
      endpoint: `${this.BASE_URL}/v2/projects/${projectId}/check_ins/${checkinId}`,
      logger: this.logger,
    })

    if (response.statusCode !== 200) {
      this.logger.debug(`Failed to fetch checkin[${checkinId}] for project[${projectId}]: ${response.body}`)
      throw new Error(`Failed to fetch checkin[${checkinId}] for project[${projectId}]`)
    }

    const data: CheckinResponsePayload = JSON.parse(response.body)
    const checkin = Checkin.fromResponsePayload(data)
    checkin.projectId = projectId

    return checkin
  }

  public async create(checkin: Checkin): Promise<Checkin> {
    const response = await this.transport.send({
      method: 'POST',
      endpoint: `${this.BASE_URL}/v2/projects/${checkin.projectId}/check_ins`,
      logger: this.logger,
    }, { check_in: checkin.asRequestPayload() })

    if (response.statusCode !== 201) {
      this.logger.debug(`Failed to create checkin[${checkin.name}] for project[${checkin.projectId}]: ${response.body}`)
      throw new Error(`Failed to create checkin[${checkin.name}] for project[${checkin.projectId}]`)
    }

    const data: CheckinResponsePayload = JSON.parse(response.body)
    const result = Checkin.fromResponsePayload(data)
    result.projectId = checkin.projectId

    return result
  }

  public async update(checkin: Checkin): Promise<Checkin> {
    const response = await this.transport.send({
      method: 'PUT',
      endpoint: `${this.BASE_URL}/v2/projects/${checkin.projectId}/check_ins/${checkin.id}`,
      logger: this.logger,
    }, { check_in: checkin.asRequestPayload() })

    if (response.statusCode !== 204) {
      this.logger.debug(`Failed to update checkin[${checkin.name}] for project[${checkin.projectId}]: ${response.body}`)
      throw new Error(`Failed to update checkin[${checkin.name}] for project[${checkin.projectId}]`)
    }

    return checkin
  }

  public async remove(checkin: Checkin): Promise<void> {
    const response = await this.transport.send({
      method: 'DELETE',
      endpoint: `${this.BASE_URL}/v2/projects/${checkin.projectId}/check_ins/${checkin.id}`,
      logger: this.logger,
    })

    if (response.statusCode !== 204) {
      this.logger.debug(`Failed to remove checkin[${checkin.name}] for project[${checkin.projectId}]: ${response.body}`)
      throw new Error(`Failed to remove checkin[${checkin.name}] for project[${checkin.projectId}]`)
    }
  }

}
