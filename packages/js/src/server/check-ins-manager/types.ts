import { Types } from '@honeybadger-io/core';

export type CheckInDto = {
    /**
     * Checkin identifier.
     */
    id?: string

    /**
     * Checkin name.
     */
    name: string

    /**
     * Checkin slug.
     */
    slug?: string

    /**
     * Valid values are "simple" or "cron".
     * If you specify "cron", then the "cron_schedule" field is required.
     */
    scheduleType: 'simple' | 'cron'

    /**
     * For simple check-ins, the amount of time that can elapse before the check-in is reported as missing.
     * E.g., "1 day" would require a hit to the API daily to maintain the "reporting" status.
     * Valid time periods are "minute", "hour", "day", "week", and "month": "5 minutes", "7 days", etc.
     */
    reportPeriod?: string

    /**
     * The amount of time to allow a job to not report before it's reported as missing.
     * Valid values are the same as the report_report field.
     */
    gracePeriod?: string

    /**
     * For a scheduleType of "cron", the cron-compatible string that defines when the job should be expected to hit the API.
     */
    cronSchedule?: string

    /**
     * The timezone setting for your server that is running the cron job to be monitored.
     * Valid timezone values are listed here {@link https://docs.honeybadger.io/api/check-ins/timezones here}.
     */
    cronTimezone?: string

    /**
     * The project ID that this checkin belongs to.
     */
    projectId: string

}

export type CheckInsConfig = {
    debug?: boolean
    logger?: Types.Logger
    personalAuthToken: string
    checkins: CheckInDto[]
}

export type CheckInPayload = {
    name: string
    slug?: string
    schedule_type: 'simple' | 'cron'
    report_period?: string
    grace_period?: string
    cron_schedule?: string
    cron_timezone?: string
}

export type CheckInTransportPayload = {
    check_in: CheckInPayload
}

export type CheckInResponsePayload = { id: string } & CheckInPayload
