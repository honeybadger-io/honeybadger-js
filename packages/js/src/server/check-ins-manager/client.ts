import { Types } from '@honeybadger-io/core'
import { CheckIn } from './check-in'
import { CheckInResponsePayload } from './types';

export class CheckInsClient {
  private readonly BASE_URL = 'https://app.honeybadger.io'
  private readonly cache: Record<string, CheckIn[]>
  private readonly config: { personalAuthToken: string; logger: Types.Logger }
  private readonly logger: Types.Logger
  private readonly transport: Types.Transport

  constructor(config: { personalAuthToken: string; logger: Types.Logger }, transport: Types.Transport) {
    this.transport = transport
    this.config = config
    this.logger = config.logger
    this.cache = {}
  }

  public async listForProject(projectId: string): Promise<CheckIn[]> {
    if (this.cache[projectId]) {
      return this.cache[projectId]
    }

    if (!this.config.personalAuthToken || this.config.personalAuthToken === '') {
      throw new Error('personalAuthToken is required')
    }

    const response = await this.transport.send({
      method: 'GET',
      headers: this.getHeaders(),
      endpoint: `${this.BASE_URL}/v2/projects/${projectId}/check_ins`,
      logger: this.logger,
    })

    if (response.statusCode !== 200) {
      throw new Error(`Failed to fetch checkins for project[${projectId}]: ${this.getErrorMessage(response.body)}`,)
    }

    const data: { results: CheckInResponsePayload[] } = JSON.parse(response.body)
    const checkIns = data.results.map((checkin) => CheckIn.fromResponsePayload(projectId, checkin))
    this.cache[projectId] = checkIns

    return checkIns
  }

  public async get(projectId: string, checkInId: string): Promise<CheckIn> {
    if (!this.config.personalAuthToken || this.config.personalAuthToken === '') {
      throw new Error('personalAuthToken is required')
    }

    const response = await this.transport.send({
      method: 'GET',
      headers: this.getHeaders(),
      endpoint: `${this.BASE_URL}/v2/projects/${projectId}/check_ins/${checkInId}`,
      logger: this.logger,
    })

    if (response.statusCode !== 200) {
      throw new Error(`Failed to fetch check-in[${checkInId}] for project[${projectId}]: ${this.getErrorMessage(response.body)}`)
    }

    const data: CheckInResponsePayload = JSON.parse(response.body)
    const checkIn = CheckIn.fromResponsePayload(projectId, data)
    checkIn.projectId = projectId

    return checkIn
  }

  public async create(checkIn: CheckIn): Promise<CheckIn> {
    if (!this.config.personalAuthToken || this.config.personalAuthToken === '') {
      throw new Error('personalAuthToken is required')
    }

    const response = await this.transport.send({
      method: 'POST',
      headers: this.getHeaders(),
      endpoint: `${this.BASE_URL}/v2/projects/${checkIn.projectId}/check_ins`,
      logger: this.logger,
    }, { check_in: checkIn.asRequestPayload() })

    if (response.statusCode !== 201) {
      throw new Error(`Failed to create check-in[${checkIn.name}] for project[${checkIn.projectId}]: ${this.getErrorMessage(response.body)}`)
    }

    const data: CheckInResponsePayload = JSON.parse(response.body)
    const result = CheckIn.fromResponsePayload(checkIn.projectId, data)
    result.projectId = checkIn.projectId

    return result
  }

  public async update(checkIn: CheckIn): Promise<CheckIn> {
    if (!this.config.personalAuthToken || this.config.personalAuthToken === '') {
      throw new Error('personalAuthToken is required')
    }

    const response = await this.transport.send({
      method: 'PUT',
      headers: this.getHeaders(),
      endpoint: `${this.BASE_URL}/v2/projects/${checkIn.projectId}/check_ins/${checkIn.id}`,
      logger: this.logger,
    }, { check_in: checkIn.asRequestPayload() })

    if (response.statusCode !== 204) {
      throw new Error(`Failed to update checkin[${checkIn.name}] for project[${checkIn.projectId}]: ${this.getErrorMessage(response.body)}`)
    }

    return checkIn
  }

  public async remove(checkIn: CheckIn): Promise<void> {
    if (!this.config.personalAuthToken || this.config.personalAuthToken === '') {
      throw new Error('personalAuthToken is required')
    }

    const response = await this.transport.send({
      method: 'DELETE',
      headers: this.getHeaders(),
      endpoint: `${this.BASE_URL}/v2/projects/${checkIn.projectId}/check_ins/${checkIn.id}`,
      logger: this.logger,
    })

    if (response.statusCode !== 204) {
      throw new Error(`Failed to remove checkin[${checkIn.name}] for project[${checkIn.projectId}]: ${this.getErrorMessage(response.body)}`)
    }
  }

  private getHeaders() {
    return {
      'Authorization': `Basic ${Buffer.from(`${this.config.personalAuthToken}:`).toString('base64')}`,
      'Content-Type': 'application/json'
    }
  }

  private getErrorMessage(responseBody: string) {
    if (!responseBody) {
      return ''
    }

    try {
      const jsonBody: { errors: string } = JSON.parse(responseBody)

      return jsonBody.errors ?? ''
    }
    catch (e) {
      return responseBody
    }
  }

}
