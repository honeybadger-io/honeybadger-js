#!/bin/bash

# ----------------------------------------------------------------------------
#
# Generate and upload sourcemaps to Honeybadger
#
# USAGE:
# npx honeybadger-upload-sourcemaps [--expo] [--no-hermes] [--skip-upload] --apiKey <project-api-key> --revision <build-revision>
#
# For Expo projects, the script will automatically detect Expo by checking for app.json, app.config.js, or expo in package.json.
# You can still use the --expo flag to explicitly specify Expo, or override auto-detection if needed.
#
# Hermes is enabled by default in React Native projects as of React Native 0.70.
# This script assumes that Hermes is being used. If you are not using Hermes in
# your React Native project, use the "--no-hermes" flag.
#
# If you just need to generate the sourcemaps without uploading them to
# Honeybadger, use the --skip-upload flag.
#
# ----------------------------------------------------------------------------

USAGE="npx honeybadger-upload-sourcemaps [--expo] [--no-hermes] [--skip-upload] --apiKey <project-api-key> --revision <build-revision>"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_ROOT_DIR="$SCRIPT_DIR/../.."
NODE_MODULES="$PROJECT_ROOT_DIR/node_modules"

ANDROID_PACKAGER_BUNDLE="$PROJECT_ROOT_DIR/index.android.bundle"
ANDROID_PACKAGER_SOURCE_MAP="$PROJECT_ROOT_DIR/index.android.bundle.packager.map"
ANDROID_COMPILER_BUNDLE="$PROJECT_ROOT_DIR/index.android.bundle.hbc"
ANDROID_COMPILER_SOURCE_MAP="$PROJECT_ROOT_DIR/index.android.bundle.hbc.map"
ANDROID_FINAL_SOURCE_MAP="$PROJECT_ROOT_DIR/index.android.bundle.map"

IOS_PACKAGER_BUNDLE="$PROJECT_ROOT_DIR/main.jsbundle"
IOS_PACKAGER_SOURCE_MAP="$PROJECT_ROOT_DIR/main.jsbundle.packager.map"
IOS_COMPILER_BUNDLE="$PROJECT_ROOT_DIR/main.jsbundle.hbc"
IOS_COMPILER_SOURCE_MAP="$PROJECT_ROOT_DIR/main.jsbundle.hbc.map"
IOS_FINAL_SOURCE_MAP="$PROJECT_ROOT_DIR/main.jsbundle.map"

# This is needed for the API call to upload source maps to Honeybadger.
EMPTY_FILE="$PROJECT_ROOT_DIR/empty_file.txt"

API_KEY=""
REVISION=""
USE_HERMES=true
IS_EXPO_PROJECT=false
SKIP_UPLOAD=false

OS_BIN=""



#
# Parse the command line variables.
# We need the apiKey, and the build revision.
# We also need to determine if we should use Hermes.
#

while [[ $# -gt 0 ]]; do
    case "$1" in
    	--expo)
    		IS_EXPO_PROJECT=true
    		shift
    		;;
        --no-hermes)
            USE_HERMES=false
            shift
            ;;
		--skip-upload)
			SKIP_UPLOAD=true
			shift
			;;
        --apiKey)
            shift
            if [[ $# -gt 0 ]]; then
                API_KEY="$1"
                shift
            else
                echo "Error: Missing value for --apiKey"
				echo $USAGE
                exit 1
            fi
            ;;
        --revision)
            shift
            if [[ $# -gt 0 ]]; then
                REVISION="$1"
                shift
            else
                echo "Error: Missing value for --revision"
				echo $USAGE
                exit 1
            fi
            ;;
        *)
            echo "Unknown option: $1"
			echo $USAGE
            exit 1
            ;;
    esac
done


#
# Make sure we have API_KEY and REVISION
#

if [[ -z "$API_KEY" ]]; then
    echo "Error: apiKey is empty"
	echo $USAGE
    exit 1
fi


if [[ -z "$REVISION" ]]; then
    echo "Error: revision is empty"
	echo $USAGE
    exit 1
fi


#
# Determine what the operating system is. This is needed to find the path
# to the Hermes executable.
#

if $USE_HERMES; then

	case "$(uname -s)" in
		Darwin)
			OS_BIN="osx-bin"
			;;
		Linux)
			OS_BIN="linux64-bin"
			;;
		CYGWIN*|MINGW32*|MSYS*)
			OS_BIN="win64-bin"
			;;
		*)
			echo "Unsupported operating system."
			exit 1
			;;
	esac

fi


ENTRY_FILE="$PROJECT_ROOT_DIR/index.js"
BUNDLE_COMMAND="react-native bundle"

# Auto-detect Expo project if not explicitly set by flag
if [ -f "$PROJECT_ROOT_DIR/app.json" ] || [ -f "$PROJECT_ROOT_DIR/app.config.js" ] || grep -q '"expo"' "$PROJECT_ROOT_DIR/package.json"; then
  IS_EXPO_PROJECT=true
  echo "Expo project detected automatically."
fi

if $IS_EXPO_PROJECT; then
  if [ -f "$NODE_MODULES/expo-router/entry.js" ]; then
    ENTRY_FILE="$NODE_MODULES/expo-router/entry.js"
  elif [ -f "$NODE_MODULES/expo/AppEntry.js" ]; then
    ENTRY_FILE="$NODE_MODULES/expo/AppEntry.js"
  else
    echo "Error: Could not find Expo entry file (expo-router/entry.js or expo/AppEntry.js)."
    exit 1
  fi
  BUNDLE_COMMAND="expo export:embed"
fi

echo "Using entry file: $ENTRY_FILE"
if [ ! -f "$ENTRY_FILE" ]; then
    echo "Error: Entry file '$ENTRY_FILE' does not exist."
    exit 1
fi

echo "Generating the Android source map ..."

npx $BUNDLE_COMMAND \
	--platform android \
	--dev false \
	--entry-file "$ENTRY_FILE" \
	--reset-cache \
	--bundle-output "$ANDROID_PACKAGER_BUNDLE" \
	--sourcemap-output "$ANDROID_PACKAGER_SOURCE_MAP" \
	--minify false > /dev/null 2>&1


echo "Generating the iOS source map ..."

npx $BUNDLE_COMMAND \
	--platform ios \
	--dev false \
	--entry-file "$ENTRY_FILE" \
	--reset-cache \
	--bundle-output "$IOS_PACKAGER_BUNDLE" \
	--sourcemap-output "$IOS_PACKAGER_SOURCE_MAP" \
	--minify false > /dev/null 2>&1

if $USE_HERMES; then

    echo "Hermes is enabled ..."

	#
	# Need to find the Hermes compiler executable for Android.
	#

	# react native >= 0.69
	HERMES_PATH_1="$NODE_MODULES/react-native/sdks/hermesc/$OS_BIN/hermesc"

	# react native <= 0.68
	HERMES_PATH_2="$NODE_MODULES/hermes-engine/$OS_BIN/hermesc"

	if [ -f "$HERMES_PATH_1" ]; then
		HERMES_EXECUTABLE="$HERMES_PATH_1"
	elif [ -f "$HERMES_PATH_2" ]; then
		HERMES_EXECUTABLE="$HERMES_PATH_2"
	else
		echo "Error: The Hermes compiler executable for Android was not found in the expected locations."
		exit 1
	fi

	#
	# compile the Android code to bytecode and generate the Hermes sourcemap
	#

	"$HERMES_EXECUTABLE" \
		-O \
		-emit-binary \
		-output-source-map \
		-out="$ANDROID_COMPILER_BUNDLE" \
		"$ANDROID_PACKAGER_BUNDLE" > /dev/null 2>&1

	#
	# merge the two Android sourcemaps
	#

	node "$NODE_MODULES/react-native/scripts/compose-source-maps.js" \
		"$ANDROID_PACKAGER_SOURCE_MAP" \
		"$ANDROID_COMPILER_SOURCE_MAP" \
		-o "$ANDROID_FINAL_SOURCE_MAP" > /dev/null 2>&1


	#
	# For iOS, we're no longer using the hermes output concatenation,
	# even for hermes builds, as it produces incorrect sourcemaps.
	#

	# HERMES_EXECUTABLE="$PROJECT_ROOT_DIR/ios/Pods/hermes-engine/destroot/bin/hermesc"

	# if [ ! -f "$HERMES_EXECUTABLE" ]; then
	# 	echo "Error: The Hermes compiler executable for iOS was not found in the expected location: $HERMES_EXECUTABLE . Did you run pod install in the ios/ directory?"
	# 	exit 1
	# fi

	# echo "Generating Hermes iOS source map ..."

	#
	# Compile the iOS code to bytecode and generate the Hermes sourcemap.
	#

	# "$HERMES_EXECUTABLE" \
	# 	-O \
	# 	-emit-binary \
	# 	-output-source-map \
	# 	-out="$IOS_COMPILER_BUNDLE" \
	# 	"$IOS_PACKAGER_BUNDLE" > /dev/null 2>&1

	#
	# merge the two iOS sourcemaps
	#

	# node "$NODE_MODULES/react-native/scripts/compose-source-maps.js" \
	# 	"$IOS_PACKAGER_SOURCE_MAP" \
	# 	"$IOS_COMPILER_SOURCE_MAP" \
	# 	-o "$IOS_FINAL_SOURCE_MAP" > /dev/null 2>&1


	# Same operation for hermes builds on iOS as with --no-hermes; see note above.
	mv "$IOS_PACKAGER_SOURCE_MAP" "$IOS_FINAL_SOURCE_MAP"

	#
	# cleanup
	#

	rm -f \
		"$ANDROID_PACKAGER_BUNDLE" \
		"$ANDROID_PACKAGER_SOURCE_MAP" \
		"$ANDROID_COMPILER_BUNDLE" \
		"$ANDROID_COMPILER_SOURCE_MAP" \
		"$IOS_PACKAGER_BUNDLE" \
		"$IOS_PACKAGER_SOURCE_MAP" # \
		# "$IOS_COMPILER_BUNDLE" \
		# "$IOS_COMPILER_SOURCE_MAP"

else

    echo "Hermes is not enabled ..."

	#
	# The packager source maps are the only source maps we need.
	#

	mv "$ANDROID_PACKAGER_SOURCE_MAP" "$ANDROID_FINAL_SOURCE_MAP"
	mv "$IOS_PACKAGER_SOURCE_MAP" "$IOS_FINAL_SOURCE_MAP"

	#
	# cleanup
	#

	rm -f "$ANDROID_PACKAGER_BUNDLE" "$IOS_PACKAGER_BUNDLE"

fi


#
# We should now have Android and iOS source maps ready for upload.
#

if $SKIP_UPLOAD; then
	echo "Source maps generated."
	echo "    iOS: main.jsbundle.map"
	echo "    Android: index.android.bundle.map"
	echo "Skipping upload.";
	exit;
fi

echo "Source maps generated. Uploading to Honeybadger ...";

rm -f "$EMPTY_FILE"
touch "$EMPTY_FILE"

curl https://api.honeybadger.io/v1/source_maps \
	-F api_key="$API_KEY" \
	-F revision="$REVISION" \
	-F minified_url=index.android.bundle \
	-F source_map=@"$ANDROID_FINAL_SOURCE_MAP" \
	-F minified_file=@"$EMPTY_FILE" > /dev/null 2>&1

curl https://api.honeybadger.io/v1/source_maps \
	-F api_key="$API_KEY" \
	-F revision="$REVISION" \
	-F minified_url="*/main.jsbundle" \
	-F source_map=@"$IOS_FINAL_SOURCE_MAP" \
	-F minified_file=@"$EMPTY_FILE" > /dev/null 2>&1

#
# Cleanup
#

rm -f "$ANDROID_FINAL_SOURCE_MAP" "$IOS_FINAL_SOURCE_MAP" "$EMPTY_FILE"

echo "Source maps uploaded to Honeybadger."