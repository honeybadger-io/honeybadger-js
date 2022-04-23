/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const semver = require('semver')

// eslint-disable-next-line no-undef
module.exports = {
  // todo: remove all except publishCommand + afterPublish when Conventional Commits transition is complete
  updateChangelog: false,
  shouldPrepare: ({ commits }) => {
    if (commits === '') {
      return false;
    }

    const data = fs.readFileSync('CHANGELOG.md', 'utf8')

    const match = data.match(
      /## \[Unreleased\]\[.+?\]\s+###\s+(?:Fixed|Added|Modified|Removed|Changed|Deprecated|Security)\s+-/
    )
    if (!match) {
      console.log('No unreleased changes');
      return false;
    }

    return true;
  },
  getNextVersion: ({ _revisionRange, _commitTitles, _commitBodies, currentVersion, dir }) => {
    const changelog = new Changelog(`${dir}/CHANGELOG.md`)
    return changelog.nextVersion(currentVersion)
  },
  beforeCommitChanges: ({ nextVersion, _releaseType, _exec, dir }) => {
    // Update CHANGELOG.md heading for latest release
    const parsedVersion = semver.parse(nextVersion)
    if (parsedVersion.prerelease.length) { return }

    const changelogFile = `${dir}/CHANGELOG.md`
    const data = fs.readFileSync(changelogFile, 'utf8')

    const match = data.match(/## \[Unreleased\](?:\[(.*)\])?/)
    if (!match) { throw(new Error('Release heading not found in CHANGELOG.md')) }

    const result = data.replace(match[0], `## [Unreleased][${match[1] || 'latest'}]\n\n## [${nextVersion}] - ${getDateString()}`)
    fs.writeFileSync(changelogFile, result, 'utf8')

    function getDateString() {
      const today = new Date()
      const dd = String(today.getDate()).padStart(2, '0')
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const yyyy = today.getFullYear();
      return `${yyyy}-${mm}-${dd}`
    }
  },
  // todo: uncomment when Conventional Commits transition is complete
  // publishCommand: ({ defaultCommand, tag }) =>
  //  `${defaultCommand} --access public --tag ${tag}`,
  afterPublish: ({ exec }) => {
    exec('./scripts/release-cdn.sh')
  },
}

// todo: remove when Conventional Commits transition is complete
class Changelog {
  releaseType = 'patch'
  releaseTag = 'latest'

  constructor(path) {
    const data = fs.readFileSync(path, 'utf8')
    const lines = data.split(/\r?\n/)
    const headings = []
    let unreleased = false
    lines.every((line) => {
      if (line.startsWith('## [Unreleased]')) {
        unreleased = true
        const tagMatch = line.match(/## \[Unreleased\]\[(.*)\]/)
        if (tagMatch) {
          this.releaseTag = tagMatch[1].trim()
        }
      } else if (line.startsWith('## ')) {
        return false
      }

      if (unreleased) {
        if (line.startsWith('### ')) {
          headings.push(line.match(/### (.*)/)[1].trim())
        }
      }

      return true
    });

    if (headings.includes('Changed')) {
      this.releaseType = 'major'
    } else if (headings.includes('Added')) {
      this.releaseType = 'minor'
    } else if (headings.includes('Fixed')) {
      this.releaseType = 'patch'
    }
  }

  nextVersion(version) {
    const parsedVersion = semver.parse(version)

    if (this.releaseTag !== 'latest') {
      if (parsedVersion.prerelease.length) {
        parsedVersion.inc('prerelease', this.releaseTag)
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
