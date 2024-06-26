#!/bin/bash

find . -name 'dist' -type d -prune -exec rm -rf '{}' +;
find . -name 'build' -type d -prune -exec rm -rf '{}' +;
find . -name 'node_modules' -type d -prune -exec rm -rf '{}' +;
find . -name 'tsconfig.tsbuildinfo' -type f -prune -exec rm -rf '{}' +;
find . -name 'tsconfig.types.tsbuildinfo' -type f -prune -exec rm -rf '{}' +;
