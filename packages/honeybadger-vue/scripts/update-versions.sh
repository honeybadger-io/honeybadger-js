#!/bin/sh

set -e

VERSION=$(cat package.json | jq -r '.version')
DATE=$(date +"%Y-%m-%d")

if grep -q "$VERSION" "CHANGELOG.md"; then
  echo "Error: $VERSION already exists in CHANGELOG.md"
  exit 1
fi

# Update CHANGELOG.md
nl=$'\\\n\\\n'
sed -i '' "s/## \[Unreleased\]/## \[Unreleased\]$nl## \[$VERSION\] - $DATE/" CHANGELOG.md

# Stage for version commit
git add -A CHANGELOG.md
