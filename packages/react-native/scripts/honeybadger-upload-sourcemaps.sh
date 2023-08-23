#!/bin/bash

# ----------------------------------------------------------------------------
#
# Generate and upload sourcemaps to Honeybadger
#
# USAGE:
# npx honeybadger-upload-sourcemaps [--no-hermes] --apiKey <project-api-key> --revision <build-revision>
#
# Hermes is enabled by default in React Native projects as of React Native 0.70.
# This script assumes that Hermes is being used. If you are not using Hermes in 
# your React Native project, use the "--no-hermes" flag.
#
# ----------------------------------------------------------------------------

USAGE="npx honeybadger-upload-sourcemaps [--no-hermes] --apiKey <project-api-key> --revision <build-revision>"

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

# For debugging, set SUPPRESS_OUTPUT to an empty string
SUPPRESS_OUTPUT=" > /dev/null 2>&1"
# SUPPRESS_OUTPUT=""

API_KEY=""
REVISION=""
USE_HERMES=true

OS_BIN=""


#
# Parse the command line variables.
# We need the apiKey, and the build revision.
# We also need to determine if we should use Hermes.
#

while [[ $# -gt 0 ]]; do
    case "$1" in
        --no-hermes)
            USE_HERMES=false
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


echo "Generating the Android source map ..."

npx react-native bundle \
	--platform android \
	--dev false \
	--entry-file "$PROJECT_ROOT_DIR/index.js" \
	--reset-cache \
	--bundle-output "$ANDROID_PACKAGER_BUNDLE" \
	--sourcemap-output "$ANDROID_PACKAGER_SOURCE_MAP" \
	--minify false $SUPPRESS_OUTPUT


echo "Generating the iOS source map ..."

npx react-native bundle \
	--platform ios \
	--dev false \
	--entry-file index.js \
	--reset-cache \
	--bundle-output "$IOS_PACKAGER_BUNDLE" \
	--sourcemap-output "$IOS_PACKAGER_SOURCE_MAP" \
	--minify false $SUPPRESS_OUTPUT


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

	
	echo "Generating Hermes Android source map ..."

	#
	# compile the Android code to bytecode and generate the Hermes sourcemap
	#

	"$HERMES_EXECUTABLE" \
		-O \
		-emit-binary \
		-output-source-map \
		-out="$ANDROID_COMPILER_BUNDLE" \
		"$ANDROID_PACKAGER_BUNDLE" $SUPPRESS_OUTPUT

	#
	# merge the two Android sourcemaps
	#

	node "$NODE_MODULES/react-native/scripts/compose-source-maps.js" \
		"$ANDROID_PACKAGER_SOURCE_MAP" \
		"$ANDROID_COMPILER_SOURCE_MAP" \
		-o "$ANDROID_FINAL_SOURCE_MAP" $SUPPRESS_OUTPUT


	#
	# Need to find the Hermes compiler executable for iOS.
	#

	HERMES_EXECUTABLE="$PROJECT_ROOT_DIR/ios/Pods/hermes-engine/destroot/bin/hermesc"

	if [ ! -f "$HERMES_EXECUTABLE" ]; then
		echo "Error: The Hermes compiler executable for iOS was not found in the expected location: $HERMES_EXECUTABLE"
		exit 1
	fi

	
	echo "Generating Hermes iOS source map ..."

	#
	# Compile the iOS code to bytecode and generate the Hermes sourcemap.
	# 

	"$HERMES_EXECUTABLE" \
		-O \
		-emit-binary \
		-output-source-map \
		-out="$IOS_COMPILER_BUNDLE" \
		"$IOS_PACKAGER_BUNDLE" $SUPPRESS_OUTPUT

	#
	# merge the two iOS sourcemaps
	#

	node "$NODE_MODULES/react-native/scripts/compose-source-maps.js" \
		"$IOS_PACKAGER_SOURCE_MAP" \
		"$IOS_COMPILER_SOURCE_MAP" \
		-o "$IOS_FINAL_SOURCE_MAP" $SUPPRESS_OUTPUT


	#
	# cleanup
	#

	rm -f \
		"$ANDROID_PACKAGER_BUNDLE" \
		"$ANDROID_PACKAGER_SOURCE_MAP" \
		"$ANDROID_COMPILER_BUNDLE" \
		"$ANDROID_COMPILER_SOURCE_MAP" \
		"$IOS_PACKAGER_BUNDLE" \
		"$IOS_PACKAGER_SOURCE_MAP" \
		"$IOS_COMPILER_BUNDLE" \
		"$IOS_COMPILER_SOURCE_MAP"

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

echo "Source maps generated. Uploading to Honeybadger ...";

rm -f "$EMPTY_FILE"
touch "$EMPTY_FILE"

curl https://api.honeybadger.io/v1/source_maps \
	-F api_key="$API_KEY" \
	-F revision="$REVISION" \
	-F minified_url=index.android.bundle \
	-F source_map=@"$ANDROID_FINAL_SOURCE_MAP" \
	-F minified_file=@"$EMPTY_FILE" $SUPPRESS_OUTPUT

curl https://api.honeybadger.io/v1/source_maps \
	-F api_key="$API_KEY" \
	-F revision="$REVISION" \
	-F minified_url=main.jsbundle \
	-F source_map=@"$IOS_FINAL_SOURCE_MAP" \
	-F minified_file=@"$EMPTY_FILE" $SUPPRESS_OUTPUT
	
#
# Cleanup
#

rm -f "$ANDROID_FINAL_SOURCE_MAP" "$IOS_FINAL_SOURCE_MAP" "$EMPTY_FILE"

echo "Source maps uploaded to Honeybadger."
