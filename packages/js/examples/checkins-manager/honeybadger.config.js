module.exports = {
  personalAuthToken: process.env.HONEYBADGER_PERSONAL_AUTH_TOKEN,
  checkins: [
    {
      name: 'Weekly Exports',
      slug: 'weekly-exports-custom-slug',
      projectId: process.env.HONEYBADGER_PROJECT_ID,
      scheduleType: 'simple',
      reportPeriod: '1 week',
      gracePeriod: '10 minutes'
    },
    {
      name: 'Hourly Notifications',
      projectId: process.env.HONEYBADGER_PROJECT_ID,
      scheduleType: 'simple',
      reportPeriod: '1 hour',
      gracePeriod: '5 minutes'
    }
  ]
}
