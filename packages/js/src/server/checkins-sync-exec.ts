const { syncCheckins } = require('./checkins-sync')

syncCheckins().catch((err) => {
  console.error(err)
  process.exit(1)
})
