module.exports = {
  personalAuthToken: process.env.HONEYBADGER_PERSONAL_AUTH_TOKEN || 'UrCxXYNnp2s-U4KgqVXv',
  checkins: [
    {
      name: 'Weekly Exports',
      slug: 'weekly-exports-custom-slug',
      projectId: '68958',
      scheduleType: 'simple',
      reportPeriod: '1 week',
      gracePeriod: '5 minutes'
    }
  ]
}
