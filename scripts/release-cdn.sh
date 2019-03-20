#!/bin/sh

set -e

if [[ -z "${HONEYBADGER_JS_S3_BUCKET}" ]]; then
  echo "Error: please set HONEYBADGER_JS_S3_BUCKET"
  exit 1
fi

VERSION=$(cat package.json | jq -r '.version | capture("^(?<match>[0-9]+.[0-9]+).[0-9]+$") | .match')
if [[ -z "${VERSION}" ]]; then
  echo "Not a production version; skipping CDN upload."
  exit
fi

PREFIX=v$VERSION

aws s3 sync dist/ s3://$HONEYBADGER_JS_S3_BUCKET/$PREFIX \
  --acl 'public-read' \
  --exclude '*' \
  --include 'honeybadger.js' \
  --include 'honeybadger.js.map'\
  --include 'honeybadger.min.js' \
  --include 'honeybadger.min.js.map'
