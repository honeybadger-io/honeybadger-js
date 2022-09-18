const core = require('@actions/core')
const fs = require('fs')
const path = require('path');

async function main() {
  const ROOT_PACKAGES_FOLDER = 'packages'
  core.info('Reading package versions from monorepo')
  const result = []
  const packages = await fs.promises.readdir(ROOT_PACKAGES_FOLDER)
  for (let i = 0; i < packages.length; i++) {
    const p = packages[i]
    const packageJsonPath = path.join(ROOT_PACKAGES_FOLDER, p, 'package.json')
    try {
      const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf8'))
      core.info(`${packageJson.name}: ${packageJson.version}`)
      result.push({
        name: packageJson.name,
        version: packageJson.version
      })
    }
    catch (error) {
      core.error(`There was an error reading package[${p}]: ${error.message}`)
    }
  }
  core.setOutput('packages', JSON.stringify(result))
  core.info('Done')
}

main().catch(error => core.setFailed(error.message))
