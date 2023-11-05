import { Types } from '@honeybadger-io/core'
import { Checkin } from './checkin'
import { CheckinResponsePayload } from './types';

export class CheckinsClient {
  private readonly BASE_URL = 'https://app.honeybadger.io'
  private readonly cache: Record<string, Checkin[]>
  private readonly config: { personalAuthToken: string; logger: Types.Logger }
  private readonly logger: Types.Logger
  private readonly transport: Types.Transport

  constructor(config: { personalAuthToken: string; logger: Types.Logger }, transport: Types.Transport) {
    this.transport = transport
    this.config = config
    this.logger = config.logger
    this.cache = {}
  }

  public async listForProject(projectId: string): Promise<Checkin[]> {
    if (this.cache[projectId]) {
      return this.cache[projectId]
    }

    if (!this.config.personalAuthToken || this.config.personalAuthToken === '') {
      throw new Error('personalAuthToken is required')
    }

    const response = await this.transport.send({
      method: 'GET',
      headers: this.getAuthHeader(),
      endpoint: `${this.BASE_URL}/v2/projects/${projectId}/check_ins`,
      logger: this.logger,
    })

    if (response.statusCode !== 200) {
      this.logger.debug(`Failed to fetch checkins for project[${projectId}]: ${response.body}`)
      throw new Error(`Failed to fetch checkins for project[${projectId}]`,)
    }

    const data: { results: CheckinResponsePayload[] } = JSON.parse(response.body)
    const checkins = data.results.map((checkin) => Checkin.fromResponsePayload(projectId, checkin))
    this.cache[projectId] = checkins

    return checkins
  }

  public async get(projectId: string, checkinId: string): Promise<Checkin> {
    if (!this.config.personalAuthToken || this.config.personalAuthToken === '') {
      throw new Error('personalAuthToken is required')
    }

    const response = await this.transport.send({
      method: 'GET',
      headers: this.getAuthHeader(),
      endpoint: `${this.BASE_URL}/v2/projects/${projectId}/check_ins/${checkinId}`,
      logger: this.logger,
    })

    if (response.statusCode !== 200) {
      this.logger.debug(`Failed to fetch checkin[${checkinId}] for project[${projectId}]: ${response.body}`)
      throw new Error(`Failed to fetch checkin[${checkinId}] for project[${projectId}]`)
    }

    const data: CheckinResponsePayload = JSON.parse(response.body)
    const checkin = Checkin.fromResponsePayload(projectId, data)
    checkin.projectId = projectId

    return checkin
  }

  public async create(checkin: Checkin): Promise<Checkin> {
    if (!this.config.personalAuthToken || this.config.personalAuthToken === '') {
      throw new Error('personalAuthToken is required')
    }

    const response = await this.transport.send({
      method: 'POST',
      headers: this.getAuthHeader(),
      endpoint: `${this.BASE_URL}/v2/projects/${checkin.projectId}/check_ins`,
      logger: this.logger,
    }, { check_in: checkin.asRequestPayload() })

    if (response.statusCode !== 201) {
      this.logger.debug(`Failed to create checkin[${checkin.name}] for project[${checkin.projectId}]: ${response.body}`)
      throw new Error(`Failed to create checkin[${checkin.name}] for project[${checkin.projectId}]`)
    }

    const data: CheckinResponsePayload = JSON.parse(response.body)
    const result = Checkin.fromResponsePayload(checkin.projectId, data)
    result.projectId = checkin.projectId

    return result
  }

  public async update(checkin: Checkin): Promise<Checkin> {
    if (!this.config.personalAuthToken || this.config.personalAuthToken === '') {
      throw new Error('personalAuthToken is required')
    }

    const response = await this.transport.send({
      method: 'PUT',
      headers: this.getAuthHeader(),
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
    if (!this.config.personalAuthToken || this.config.personalAuthToken === '') {
      throw new Error('personalAuthToken is required')
    }

    const response = await this.transport.send({
      method: 'DELETE',
      headers: this.getAuthHeader(),
      endpoint: `${this.BASE_URL}/v2/projects/${checkin.projectId}/check_ins/${checkin.id}`,
      logger: this.logger,
    })

    if (response.statusCode !== 204) {
      this.logger.debug(`Failed to remove checkin[${checkin.name}] for project[${checkin.projectId}]: ${response.body}`)
      throw new Error(`Failed to remove checkin[${checkin.name}] for project[${checkin.projectId}]`)
    }
  }

  private getAuthHeader() {
    return {
      'Authorization': `Basic ${Buffer.from(`${this.config.personalAuthToken}:`).toString('base64')}`
    }
  }

}
