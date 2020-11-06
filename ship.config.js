/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const semver = require('semver')

// eslint-disable-next-line no-undef
module.exports = {
  getNextVersion: ({ _revisionRange, _commitTitles, _commitBodies, currentVersion, dir }) => {
    const changelog = new Changelog(`${dir}/CHANGELOG.md`)
    return changelog.nextVersion(currentVersion)
  },
  versionUpdated: ({ _version, _releaseType, _dir, _exec }) => {
    // Update CHANGELOG.md heading for latest release
    true
  }
}

class Changelog {
  releaseType = "patch"
  releaseTag = "latest"

  constructor(path) {
    const data = fs.readFileSync(path, 'utf8')
    const lines = data.split(/\r?\n/)
    const headings = []
    let unreleased = false
    lines.every((line) => {
      if (line.startsWith("## [Unreleased]")) {
        unreleased = true
        const tagMatch = line.match(/## \[Unreleased\]\[(.*)\]/)
        if (tagMatch) {
          this.releaseTag = tagMatch[1].trim()
        }
      } else if (line.startsWith("## ")) {
        return false
      }

      if (unreleased) {
        if (line.startsWith("### ")) {
          headings.push(line.match(/### (.*)/)[1].trim())
        }
      }

      return true
    });

    if (headings.includes("Changed")) {
      this.releaseType = "major"
    } else if (headings.includes("Added")) {
      this.releaseType = "minor"
    } else if (headings.includes("Fixed")) {
      this.releaseType = "patch"
    }
  }

  nextVersion(version) {
    const parsedVersion = semver.parse(version)

    if (this.releaseTag !== "latest") {
      if (parsedVersion.prerelease.length) {
        parsedVersion.inc("prerelease", this.releaseTag)
      } else {
        parsedVersion.inc(this.releaseType)
        parsedVersion.prerelease = [ this.releaseTag, 0 ]
        parsedVersion.format()
      }
    } else {
      parsedVersion.inc(this.releaseType)
    }

    return parsedVersion.version
  }
}