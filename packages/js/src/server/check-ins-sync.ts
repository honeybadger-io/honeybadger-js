const { readConfigFromFileSystem } = require('./util');
const { CheckInsManager } = require('./check-ins-manager')

export async function syncCheckIns() {
  const config = readConfigFromFileSystem()
  if (!config) {
    throw new Error('Could not find a Honeybadger configuration file.')
  }
  const checkInsManager = new CheckInsManager(config)
  const checkIns = await checkInsManager.sync()
  if (!checkIns.length) {
    console.log('No check-ins found to synchronize with Honeybadger.')

    return
  }

  const table = checkIns.map((c) => {
    return {
      'Id': c.id,
      'Name': c.name,
      'Slug': c.slug,
      'Schedule Type': c.scheduleType,
      'Report Period': c.reportPeriod,
      'Cron Schedule': c.cronSchedule,
      'Cron Timezone':c.cronTimezone,
      'Grace Period': c.gracePeriod,
      'Status': c.isDeleted() ? '❌ Removed' : '✅ Synchronized'
    }
  })

  console.log('Check-ins were synchronized with Honeybadger.')
  console.table(table);
}
