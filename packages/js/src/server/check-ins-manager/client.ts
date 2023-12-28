import { Types } from '@honeybadger-io/core'
import { CheckIn } from './check-in'
import { CheckInResponsePayload, CheckInsConfig } from './types';

export class CheckInsClient {
  private readonly BASE_URL = 'https://app.honeybadger.io'
  private readonly config: Pick<CheckInsConfig, 'apiKey' | 'personalAuthToken' | 'logger'>
  private readonly logger: Types.Logger
  private readonly transport: Types.Transport

  constructor(config: Pick<CheckInsConfig, 'apiKey' | 'personalAuthToken' | 'logger'>, transport: Types.Transport) {
    this.transport = transport
    this.config = config
    this.logger = config.logger
  }

  public async getProjectId(projectApiKey: string): Promise<string> {
    if (!this.config.personalAuthToken || this.config.personalAuthToken === '') {
      throw new Error('personalAuthToken is required')
    }

    const response = await this.transport.send({
      method: 'GET',
      headers: this.getHeaders(),
      endpoint: `${this.BASE_URL}/v2/project_keys/${projectApiKey}`,
      logger: this.logger,
    })

    if (response.statusCode !== 200) {
      throw new Error(`Failed to fetch project[${projectApiKey}]: ${this.getErrorMessage(response.body)}`)
    }

    const data: { project: { id: string; name: string; created_at: string; } } = JSON.parse(response.body)

    return data?.project?.id
  }

  public async listForProject(projectId: string): Promise<CheckIn[]> {
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

    return data.results.map((checkin) => CheckIn.fromResponsePayload(checkin))
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
    return CheckIn.fromResponsePayload(data)
  }

  public async create(projectId: string, checkIn: CheckIn): Promise<CheckIn> {
    if (!this.config.personalAuthToken || this.config.personalAuthToken === '') {
      throw new Error('personalAuthToken is required')
    }

    const response = await this.transport.send({
      method: 'POST',
      headers: this.getHeaders(),
      endpoint: `${this.BASE_URL}/v2/projects/${projectId}/check_ins`,
      logger: this.logger,
    }, { check_in: checkIn.asRequestPayload() })

    if (response.statusCode !== 201) {
      throw new Error(`Failed to create check-in[${checkIn.slug}] for project[${projectId}]: ${this.getErrorMessage(response.body)}`)
    }

    const data: CheckInResponsePayload = JSON.parse(response.body)

    return CheckIn.fromResponsePayload(data)
  }

  public async update(projectId: string, checkIn: CheckIn): Promise<CheckIn> {
    if (!this.config.personalAuthToken || this.config.personalAuthToken === '') {
      throw new Error('personalAuthToken is required')
    }

    const response = await this.transport.send({
      method: 'PUT',
      headers: this.getHeaders(),
      endpoint: `${this.BASE_URL}/v2/projects/${projectId}/check_ins/${checkIn.id}`,
      logger: this.logger,
    }, { check_in: checkIn.asRequestPayload() })

    if (response.statusCode !== 204) {
      throw new Error(`Failed to update checkin[${checkIn.slug}] for project[${projectId}]: ${this.getErrorMessage(response.body)}`)
    }

    return checkIn
  }

  public async remove(projectId: string, checkIn: CheckIn): Promise<void> {
    if (!this.config.personalAuthToken || this.config.personalAuthToken === '') {
      throw new Error('personalAuthToken is required')
    }

    const response = await this.transport.send({
      method: 'DELETE',
      headers: this.getHeaders(),
      endpoint: `${this.BASE_URL}/v2/projects/${projectId}/check_ins/${checkIn.id}`,
      logger: this.logger,
    })

    if (response.statusCode !== 204) {
      throw new Error(`Failed to remove checkin[${checkIn.slug}] for project[${projectId}]: ${this.getErrorMessage(response.body)}`)
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
