import { CheckInDto, CheckInPayload, CheckInResponsePayload } from './types'

export class CheckIn implements CheckInDto {
  id?: string
  projectId: string
  name: string
  scheduleType: 'simple' | 'cron'
  slug?: string
  reportPeriod?: string
  gracePeriod?: string
  cronSchedule?: string
  cronTimezone?: string

  /**
     * Only set when the check-in has been deleted
     * after an update request.
     * Note: this property exists only locally.
     */
  private deleted: boolean

  constructor(props: CheckInDto) {
    this.id = props.id
    this.name = props.name
    this.slug = props.slug
    this.scheduleType = props.scheduleType as 'simple' | 'cron'
    this.reportPeriod = props.reportPeriod
    this.gracePeriod = props.gracePeriod
    this.cronSchedule = props.cronSchedule
    this.cronTimezone = props.cronTimezone
    this.projectId = props.projectId
    this.deleted = false
  }

  public isDeleted() {
    return this.deleted
  }

  public markAsDeleted() {
    this.deleted = true
  }

  public validate() {
    if (!this.projectId) {
      throw new Error('projectId is required for each check-in')
    }

    if (!this.name) {
      throw new Error('name is required for each check-in')
    }

    if (!this.scheduleType) {
      throw new Error('scheduleType is required for each check-in')
    }

    if (!['simple', 'cron'].includes(this.scheduleType)) {
      throw new Error(`${this.name} [scheduleType] must be "simple" or "cron"`)
    }

    if (this.scheduleType === 'simple' && !this.reportPeriod) {
      throw new Error(`${this.name} [reportPeriod] is required for simple check-ins`)
    }

    if (this.scheduleType === 'cron' && !this.cronSchedule) {
      throw new Error(`${this.name} [cronSchedule] is required for cron check-ins`)
    }
  }

  public asRequestPayload() {
    const payload: CheckInPayload = {
      name: this.name,
      schedule_type: this.scheduleType,
      slug: this.slug ?? '', // default is empty string
      grace_period: this.gracePeriod ?? '' // default is empty string
    }

    if (this.scheduleType === 'simple') {
      payload.report_period = this.reportPeriod
    }
    else {
      payload.cron_schedule = this.cronSchedule
      payload.cron_timezone = this.cronTimezone ?? '' // default is empty string
    }

    return payload
  }

  /**
   * Compares two check-ins, usually the one from the API and the one from the config file.
   * If the one in the config file does not match the check-in from the API,
   * then we issue an update request.
   */
  public isInSync(other: CheckIn) {
    return this.name === other.name
        && this.projectId === other.projectId
        && this.scheduleType === other.scheduleType
        && this.reportPeriod === other.reportPeriod
        && this.cronSchedule === other.cronSchedule
        && (this.slug ?? '') === (other.slug ?? '')
        && (this.gracePeriod ?? '') === (other.gracePeriod ?? '')
        && (this.cronTimezone ?? '') === (other.cronTimezone ?? '')
  }

  public static fromResponsePayload(projectId: string, payload: CheckInResponsePayload) {
    return new CheckIn({
      projectId,
      id: payload.id,
      name: payload.name,
      slug: payload.slug,
      scheduleType: payload.schedule_type as 'simple' | 'cron',
      reportPeriod: payload.report_period,
      gracePeriod: payload.grace_period,
      cronSchedule: payload.cron_schedule,
      cronTimezone: payload.cron_timezone,
    })
  }
}
