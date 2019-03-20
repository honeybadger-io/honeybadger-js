#!/bin/sh

set -e

if [[ -z "${HONEYBADGER_JS_S3_BUCKET}" ]]; then
  echo "Error: please set HONEYBADGER_JS_S3_BUCKET"
  exit 1
fi

VERSION_INFO=$(cat package.json | jq '.version | capture("^(?<minor>[0-9]+.[0-9]+).[0-9]+((?<tag>-beta).[0-9]+)?$")')
VERSION=$(echo $VERSION_INFO | jq -r '.minor')
TAG=$(echo $VERSION_INFO | jq -r '.tag')

if [[ -z "${VERSION}" ]]; then
  echo "Not a production version; skipping CDN upload."
  exit
fi

PREFIX=v$VERSION
if [ "$TAG" != "null" ] && [ ! -z "$TAG" ]; then
  PREFIX=$PREFIX$TAG
fi

aws s3 sync dist/ s3://$HONEYBADGER_JS_S3_BUCKET/$PREFIX \
  --acl 'public-read' \
  --exclude '*' \
  --include 'honeybadger.js' \
  --include 'honeybadger.js.map'\
  --include 'honeybadger.min.js' \
  --include 'honeybadger.min.js.map'
