#!/bin/bash

# ----------------------------------------------------------------------------
#
# Honeybadger.io
# Generate iOS and Android source maps for React Native.
# The main.jsbundle files for iOS and Android are also generated.
#
# USAGE:
# npx honeybadger-generate-sourcemaps
#
# ----------------------------------------------------------------------------

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_ROOT_DIR="$SCRIPT_DIR/../../"

echo "Generating source maps for iOS ..."
npx react-native bundle --platform ios --entry-file "$PROJECT_ROOT_DIR/index.js" --dev false --reset-cache --bundle-output main.jsbundle-ios --assets-dest /dev/null --sourcemap-output sourcemap-ios --sourcemap-sources-root "PROJECT_ROOT_DIR" > /dev/null 2>&1

echo "Generating source maps for Android ..."
npx react-native bundle --platform android --entry-file "$PROJECT_ROOT_DIR/index.js" --dev false --reset-cache --bundle-output main.jsbundle-android --assets-dest /dev/null --sourcemap-output sourcemap-android --sourcemap-sources-root "PROJECT_ROOT_DIR" > /dev/null 2>&1

echo "Done. Your project root directory now contains sourcemap-ios, sourcemap-android, main.jsbundle-ios, and main.jsbundle-android."
