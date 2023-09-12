const { copyConfigFiles } = require('./copy-config-files')

copyConfigFiles().catch((err) => {
  console.error(err)
  process.exit(1)
})
