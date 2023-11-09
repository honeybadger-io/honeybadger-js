module.exports = {
  personalAuthToken: process.env.HONEYBADGER_PERSONAL_AUTH_TOKEN || 'UrCxXYNnp2s-U4KgqVXv',
  checkins: [
    {
      name: 'Weekly Exports',
      slug: 'weekly-exports-custom-slug',
      projectId: '68958',
      scheduleType: 'simple',
      reportPeriod: '1 week',
      gracePeriod: '10 minutes'
    },
    {
      name: 'Cron That Should Not Be Here',
      slug: 'cron-that-should-not-be-here-custom-slug',
      projectId: '68958',
      scheduleType: 'cron',
      cronSchedule: '* * 5 * *',
      gracePeriod: '5 minutes'
    }
  ]
}
