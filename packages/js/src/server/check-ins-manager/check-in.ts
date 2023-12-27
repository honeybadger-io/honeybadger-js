import { CheckInDto, CheckInPayload, CheckInResponsePayload } from './types'

export class CheckIn implements CheckInDto {
  id?: string
  name?: string
  scheduleType: 'simple' | 'cron'
  slug: string
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
    this.deleted = false
  }

  public isDeleted() {
    return this.deleted
  }

  public markAsDeleted() {
    this.deleted = true
  }

  public validate() {
    if (!this.slug) {
      throw new Error('slug is required for each check-in')
    }

    if (!this.scheduleType) {
      throw new Error('scheduleType is required for each check-in')
    }

    if (!['simple', 'cron'].includes(this.scheduleType)) {
      throw new Error(`${this.slug} [scheduleType] must be "simple" or "cron"`)
    }

    if (this.scheduleType === 'simple' && !this.reportPeriod) {
      throw new Error(`${this.slug} [reportPeriod] is required for simple check-ins`)
    }

    if (this.scheduleType === 'cron' && !this.cronSchedule) {
      throw new Error(`${this.slug} [cronSchedule] is required for cron check-ins`)
    }
  }

  public update(other: CheckIn) {
    this.id = other.id
    this.slug = other.slug
    this.name = other.name
    this.scheduleType = other.scheduleType
    this.reportPeriod = other.reportPeriod
    this.gracePeriod = other.gracePeriod
    this.cronSchedule = other.cronSchedule
    this.cronTimezone = other.cronTimezone
  }

  public asRequestPayload() {
    const payload: CheckInPayload = {
      name: this.name,
      schedule_type: this.scheduleType,
      slug: this.slug,
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
   *
   * `name`, `gracePeriod` and `cronTimezone` are optional fields that are automatically
   * set to a value from the server if one is not provided,
   * so we ignore their values if they are not set locally.
   */
  public isInSync(other: CheckIn) {
    const ignoreNameCheck = this.name === undefined
    const ignoreGracePeriodCheck = this.gracePeriod === undefined
    const ignoreCronTimezoneCheck = this.cronTimezone === undefined

    return this.slug === other.slug
        && this.scheduleType === other.scheduleType
        && this.reportPeriod === other.reportPeriod
        && this.cronSchedule === other.cronSchedule
        && (ignoreNameCheck || this.name === other.name)
        && (ignoreGracePeriodCheck || this.gracePeriod === other.gracePeriod)
        && (ignoreCronTimezoneCheck || this.cronTimezone === other.cronTimezone)
  }

  public static fromResponsePayload(payload: CheckInResponsePayload) {
    return new CheckIn({
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
