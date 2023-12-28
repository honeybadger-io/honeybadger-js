module.exports = {
  apiKey: process.env.HONEYBADGER_API_KEY,
  personalAuthToken: process.env.HONEYBADGER_PERSONAL_AUTH_TOKEN,
  checkins: [
    {
      name: 'Weekly Exports',
      slug: 'weekly-exports-custom-slug',
      scheduleType: 'simple',
      reportPeriod: '1 week',
      gracePeriod: '10 minutes'
    },
    {
      name: 'Hourly Notifications',
      slug: 'hourly-notifications',
      scheduleType: 'simple',
      reportPeriod: '1 hour',
      gracePeriod: '5 minutes'
    }
  ]
}
