#!/bin/sh

set -e

VERSION=$(cat package.json | jq -r '.version')
DATE=$(date +"%Y-%m-%d")

if grep -q "$VERSION" "CHANGELOG.md"; then
  echo "Error: $VERSION already exists in CHANGELOG.md"
  exit 1
fi

# Update bower.json
tmp=$(mktemp)
cat bower.json | jq ".version |= \"$VERSION\"" > "$tmp" && mv "$tmp" bower.json

# Update CHANGELOG.md
nl=$'\\\n\\\n'
sed -i '' "s/## \[Unreleased\]/## \[Unreleased\]$nl## \[$VERSION\] - $DATE/" CHANGELOG.md

# Stage for version commit
git add -A bower.json CHANGELOG.md
