#!/bin/sh

set -e

VERSION=$(cat package.json | jq -r '.version')
DATE=$(date +"%Y-%m-%d")

# Update bower.json
tmp=$(mktemp)
cat bower.json | jq ".version |= \"$VERSION\"" > "$tmp" && mv "$tmp" bower.json

# Update CHANGELOG.md
sed -i "s/## \[Unreleased\]/## \[Unreleased\]\n\n## \[$VERSION\] - $DATE/" CHANGELOG.md

# Stage for version commit
git add -A bower.json CHANGELOG.md
