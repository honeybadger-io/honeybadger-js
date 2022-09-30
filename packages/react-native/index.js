//
// Honeybadger React Native
//


import { Platform, NativeModules, NativeEventEmitter } from 'react-native';


const pkg = require('./package.json');
const HoneybadgerNativeModule = NativeModules.HoneybadgerReactNative;


let _apiKey = null;
let _initialized = false;
let _context = {};
let _logLevel = "warning"; // "error", "warning", "debug"
let _previousJSGlobalExceptionHandler = null;
let _revision = "";
let _projectRoot = "";
let _reportErrors = true;



// ----------------------------------------------------------------------------
// Public Interface
// ----------------------------------------------------------------------------
const honeybadger = {

    /**
     * Initialize and configure the Honeybadger React Native library.
     * @param {string} apiKey - Your Honeybadger API key.
     * @param {boolean} [reportErrors=true] reportErrors - Whether to send error reports to Honeybadger (disable for dev environments, etc.)
     * @param {string=} revision - The git revision of the current build.
     * @param {string=} projectRoot - The path to the project root.
     */
    configure ( apiKey, reportErrors = true, revision = '', projectRoot = '' )
    {
        if ( !isValidAPIKey(apiKey) )
        {
            informUserOfInvalidAPIKey();
            return;
        }

        _apiKey = apiKey.trim();
        _revision = (revision || '').trim();
        _projectRoot = (projectRoot || '').trim();
        _reportErrors = reportErrors;

        if ( !_initialized )
        {
            setNativeExceptionHandler();
            setJavaScriptErrorHandler();
            _initialized = true;
        }
    },

    /**
     * Send any kind of error, exception, object, String, etc. to Honeybadger.
     * @param {string|object} err - The error string or object.
     * @param {string|object} additionalData - Additional data to include with the error.
     */
    notify ( err, additionalData )
    {
        if ( !isValidAPIKey(_apiKey) ) {
            informUserOfInvalidAPIKey();
            return;
        }

        if ( !err || (isString(err) && err.trim().length === 0) || (isObject(err) && err.length === 0) ) {
            logError("Honeybadger.notify() - invalid error");
            return;
        }

        if ( isString(err) ) {
            err = {
                'message' : err.trim(),
            };
        }

        if ( isStringWithValue(additionalData) ) {
            additionalData = {
                'additionalData' : additionalData.trim(),
            };
        }
        else if ( !isObject(additionalData) ) {
            additionalData = {};
        }

        const errName = safeStringFromField(err, 'name', 'Error via notify()');
        const errMsg = safeStringFromField(err, 'message', 'Unknown error message');

        let contextForThisError = {};
        Object.assign(contextForThisError, _context);
        Object.assign(contextForThisError, additionalData);

        let payloadData = {
            errorClass : `React Native ${(Platform.OS === 'ios' ? 'iOS' : 'Android')} ${errName}`,
            errorMsg : errMsg,
            details: {
                initialHandler: 'notify',
            },
            context: contextForThisError,
        };

        let backTrace = backTraceFromJavaScriptError(err);

        if ( arrayHasValues(backTrace.framesFromComponentStack) ) {
            payloadData.backTrace = backTrace.framesFromComponentStack;
            payloadData.details.primaryBackTraceSource = 'ReactNativeComponentStack';
            if ( arrayHasValues(backTrace.framesFromJavaScriptErrorStack) ) {
                payloadData.details.javaScriptStackTrace = backTrace.framesFromJavaScriptErrorStack;
            }
        } else if ( arrayHasValues(backTrace.framesFromJavaScriptErrorStack) ) {
            payloadData.backTrace = backTrace.framesFromJavaScriptErrorStack;
            payloadData.details.primaryBackTraceSource = 'JavaScriptErrorStack';
        }

        sendToHoneybadger(buildPayload(payloadData));
    },


    /**
     * Include additional data whenever an error or an exception occurs. This can be called as many times as needed. New context data will be merged with any previously-set context data.
     * @param {object} context - Additional data to include with all errors and exceptions.
     */
    setContext ( context )
    {
        if ( isObject(context) ) {
            Object.assign(_context, context);
        }
    },


    /**
     * Clears/resets any data previously set through setContext().
     * @param {object=} context - Optional new context to set.
     */
    resetContext ( context )
    {
        _context = (isObject(context) ? context : {});
    },


    /**
     * Sets the logging level for the Honeybadger library. 
     * @param {('debug'|'warning'|'error')} [level=warning] - The logging level.
     */
    setLogLevel ( level = "warning" )
    {
        if ( !level ) {
            return;
        }

        switch (level.toLowerCase())
        {
            case "debug":
            case "warning":
            case "error":
                _logLevel = level.toLowerCase();
                break;

            default:
                logWarning("Honeybadger: Log level should be one of 'debug', 'warning', or 'error'.");
        }
    }
};


export default honeybadger;



// -----------------------------------------------------------------------------
// Internal
// -----------------------------------------------------------------------------

function informUserOfInvalidAPIKey() {
    logError('Please initialize Honeybadger by calling configure() with a valid Honeybadger.io API key.');
}


function isValidAPIKey(apiKey) {
    return apiKey && apiKey.trim().length > 0;
}



function setJavaScriptErrorHandler() 
{
    logDebug("Setting up the JavaScript global error handler.");
    
    _previousJSGlobalExceptionHandler = global.ErrorUtils.getGlobalHandler();

    global.ErrorUtils.setGlobalHandler(function(err, isFatal) {
        logDebug("JavaScript global error handler triggered.");

        onJavaScriptError(err, {
            initialHandler: 'Global JavaScript Error Handler',
        });

        // Allowing the default error handler to process the error after
        // we're done with it will show the useful RN red info box in dev. 
        if ( _previousJSGlobalExceptionHandler && _previousJSGlobalExceptionHandler != this ) {
            logDebug("Passing error to previous error handler.");
            _previousJSGlobalExceptionHandler(err, isFatal);
        }
    });
}



function setNativeExceptionHandler() {
    if ( !HoneybadgerNativeModule ) {
        logError('Honeybadger: The native module was not found. Please review the installation instructions.');
        return;
    }

    logDebug("Starting HoneyBadger native module.");
    HoneybadgerNativeModule.start();

    const nativeEventEmitter = new NativeEventEmitter(HoneybadgerNativeModule);

    logDebug("Listening for native exceptions...");
    nativeEventEmitter.addListener('native-exception-event', function(data) {
        switch ( Platform.OS ) {
            case 'ios': onNativeIOSException(data); break;
            case 'android': onNativeAndroidException(data); break;
        }
    });
}



function sendToHoneybadger(payload) {
    if ( !payload || !isValidAPIKey(_apiKey) || !_reportErrors ) {
        return;
    }


    logDebug("Sending error report to Honeybadger...");

    const params = {
        method: 'POST',
        headers: {
            'Content-Type' : 'application/json',
            'Accept' : 'text/json, application/json',
            'X-API-Key' : _apiKey,
            'User-Agent' : buildUserAgent(),
        },
        body: JSON.stringify(payload)
    };

    fetch('https://api.honeybadger.io/v1/notices/js', params).then(response => {
        if ( !response.ok ) {
            logDebug(`Failed to post error to Honeybadger: ${response.status}`);
            logDebug(response);
        } else {
            logDebug('Successful post to Honeybadger.');
            logDebug(response);
        }
    });
}



function buildUserAgent() {
    let reactNativeVersion = `${Platform.constants.reactNativeVersion.major}.${Platform.constants.reactNativeVersion.minor}.${Platform.constants.reactNativeVersion.patch}`;
    const nativePlatformName = Platform.constants.systemName || (Platform.OS === 'ios' ? 'iOS' : 'Android');
    const nativePlatformVersion = Platform.constants.osVersion || '';
    let nativePlatform = `${nativePlatformName} ${nativePlatformVersion}`;
    return `${pkg.name} ${pkg.version}; ${reactNativeVersion}; ${nativePlatform}`;
}



function buildPayload ( data ) {
    let payload = {
        notifier : {
            name : pkg.name,
            url : pkg.repository.url,
            version : pkg.version,
        },
        error : {
            class : data.errorClass || 'React Native Error',
            message : data.errorMsg || 'Unknown Error',
            backtrace : data.backTrace,
        },
        request : {
            context: data.context,
        },
        server : {
            environment_name: (__DEV__ ? "development" : "production"),
            project_root: _projectRoot || '',
            revision: _revision || ''
        },
    };

    if ( data.details && data.details.length > 0 ) {
        payload.details = {
            'React Native' : data.details
        }
    }

    return payload;
}



function framesFromComponentStack(str) {
    str = str || '';
    let frames = [];
    const regex = /^\s*in\s(\S+)(\s\(at\s(\S+):(\S+)\)\s*$)?/gm;
    let match;
    while ( (match = regex.exec(str)) !== null ) {
        if ( match.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        frames.push({
            method: match && match.length > 1 ? match[1] : '',
            file: match && match.length > 3 ? match[3] : '',
            number: match && match.length > 4 ? match[4] : '',
        });
    }
    return frames;
}



function logDebug(data) {
    if ( data && _logLevel.toLowerCase() === "debug" ) {
        console.log(data);
    }
}



function logWarning(data) {
    if ( data && _logLevel.toLowerCase() === "warning" || _logLevel.toLowerCase() === "error" ) {
        console.warn(data);
    }
}



function logError(data) {
    if ( data ) {
        console.error(data);
    }
}



// ----------------------------------------------------------------------------
// JavaScript
// ----------------------------------------------------------------------------

function onJavaScriptError(err, data) {
    if ( !err ) {
        return;
    }

    let payloadData = {
        errorClass: `React Native ${(Platform.OS === 'ios' ? 'iOS' : 'Android')} Error`,
        errorMsg: errorMessageFromJavaScriptError(err),
        details: {
            initialHandler: data.initialHandler || '',
        },
        context: _context || {},
    };

    let backTrace = backTraceFromJavaScriptError(err);

    if ( arrayHasValues(backTrace.framesFromComponentStack) ) {
        payloadData.backTrace = backTrace.framesFromComponentStack;
        payloadData.details.primaryBackTraceSource = 'ReactNativeComponentStack';
        if ( arrayHasValues(backTrace.framesFromJavaScriptErrorStack) ) {
            payloadData.details.javaScriptStackTrace = backTrace.framesFromJavaScriptErrorStack;
        }
    } else if ( arrayHasValues(backTrace.framesFromJavaScriptErrorStack) ) {
        payloadData.backTrace = backTrace.framesFromJavaScriptErrorStack;
        payloadData.details.primaryBackTraceSource = 'JavaScriptErrorStack';
    }

    sendToHoneybadger(buildPayload(payloadData));
}



function errorMessageFromJavaScriptError(err) {
    if ( !err ) {
        return '';
    }

    if ( isStringWithValue(err) ) {
        return err.trim();
    }
    else if ( isObject(err) && err.message && err.message.length > 0 ) {
        return err.message;
    }

    return '';
}



function backTraceFromJavaScriptError(err) {
    return {
        framesFromComponentStack: ( isObjectWithField(err, 'componentStack') ? framesFromComponentStack(err.componentStack) : []),
        framesFromJavaScriptErrorStack: ( isObjectWithField(err, 'stack') ? framesFromJavaScriptErrorStack(err.stack) : []),
    };
}



function framesFromJavaScriptErrorStack(stack) {
    let frames = [];
    let lines = stack.split('\n');
    const javaScriptCoreRe = /^\s*(?:([^@]*)(?:\((.*?)\))?@)?(\S.*?):(\d+)(?::(\d+))?\s*$/i;
    for ( let i = 0 ; i < lines.length ; ++i ) {
        const line = lines[i];
        const parts = javaScriptCoreRe.exec(line);
        if ( parts ) {
            frames.push({
                file: parts[3] || '',
                method: parts[1] || '',
                number: (parts[4] ? +parts[4] : ''),
                column: (parts[5] ? +parts[5] : ''),
            });
        } else if ( line.indexOf('[native code]') !== -1 ) {
            let parts = line.split('@');
            if ( parts && parts.length === 2 ) {
                frames.push({
                    file: parts[1],
                    method: parts[0],
                    number: '',
                    column: '',
                });
            }
        }
    }
    return frames;
}



// ----------------------------------------------------------------------------
// Android
// ----------------------------------------------------------------------------

function onNativeAndroidException(data)
{
    let payloadData = {
        errorClass: `React Native Android ${data.type}`,
        errorMsg: data.message || '',
        context: _context || {},
    };

    let backTrace = backTraceFromAndroidException(data);

    if ( arrayHasValues(backTrace) ) {
        payloadData.backTrace = backTrace;
    }

    sendToHoneybadger(buildPayload(payloadData));
}



function backTraceFromAndroidException(data)
{
    if ( !data || !data.stackTrace ) return [];
    return data.stackTrace.map ( (frame) => {
        let method = ( isStringWithValue(frame.class) && isStringWithValue(frame.method) ) ? (frame.class + '.' + frame.method) : frame.method;
        return {
            method: method || '',
            file: frame.file || '',
            number: frame.line || ''
        };
    });
}



// ----------------------------------------------------------------------------
// iOS
// ----------------------------------------------------------------------------

function onNativeIOSException(data)
{
    let payloadData = {
        errorClass: `React Native iOS ${data.type}`,
        errorMsg: errorMessageFromIOSException(data),
        details: {
            errorDomain: data.errorDomain || '',
            initialHandler: data.initialHandler || '',
            userInfo: data.userInfo || {},
            architecture: data.architecture || '',
        },
        context: _context || {},
    };

    let backTrace = backTraceFromIOSException(data);

    if ( arrayHasValues(backTrace.framesFromComponentStack) )
    {
        payloadData.backTrace = backTrace.framesFromComponentStack;
        payloadData.details.primaryBackTraceSource = 'ReactNativeComponentStack';
        if ( arrayHasValues(backTrace.framesFromReactNativeIOSStackTrace) ) {
            payloadData.details.reactNativeIOSStackTrace = backTrace.framesFromReactNativeIOSStackTrace;
        }
        if ( arrayHasValues(backTrace.framesFromIOSCallStack) ) {
            payloadData.details.iosCallStack = backTrace.framesFromIOSCallStack;
        }
    }
    else if ( arrayHasValues(backTrace.framesFromReactNativeIOSStackTrace) )
    {
        payloadData.backTrace = backTrace.framesFromReactNativeIOSStackTrace;
        payloadData.details.primaryBackTraceSource = 'ReactNativeIOSStackTrace';
        if ( arrayHasValues(backTrace.framesFromIOSCallStack) ) {
            payloadData.details.iosCallStack = backTrace.framesFromIOSCallStack;
        }
    }
    else if ( arrayHasValues(backTrace.framesFromIOSCallStack) )
    {
        payloadData.backTrace = backTrace.framesFromIOSCallStack;
        payloadData.details.primaryBackTraceSource = 'iOSCallStack';
    }

    sendToHoneybadger(buildPayload(payloadData));
}



function errorMessageFromIOSException(data) {
    if ( !data ) {
        return '';
    }

    if ( data.localizedDescription && data.localizedDescription !== '' ) {
        const localizedDescription = data.localizedDescription;
        const startOfNativeIOSCallStack = localizedDescription.indexOf('callstack: (\n');
        if ( startOfNativeIOSCallStack === -1 ) {
            const lines = localizedDescription.split('\n');
            return lines.length === 0 ? localizedDescription : lines[0].trim();
        } else {
            return localizedDescription.substr(0, startOfNativeIOSCallStack).trim();
        }
    }
    else if ( (data.name && data.name !== '') || (data.reason && data.reason !== '') ) {
        return `${data.name} : ${data.reason}`.trim();
    }

    return '';
}



function backTraceFromIOSException(data) {
    return {
        framesFromComponentStack: framesFromComponentStack(data.localizedDescription),
        framesFromReactNativeIOSStackTrace: framesFromReactNativeIOSStackTrace(data),
        framesFromIOSCallStack: framesFromIOSCallStack(data),
    };
}



function framesFromReactNativeIOSStackTrace(data) {
    if ( !data.reactNativeStackTrace ) {
        return [];
    }
    let frames = [];
    data.reactNativeStackTrace.forEach( (frame) => {
        frames.push({
            method: frame.methodName || '',
            number: frame.lineNumber || '',
            file: frame.file || '',
            column: frame.column || '',
        });
    });
    return frames;
}



function framesFromIOSCallStack(data) {
    let callStack = [];

    if ( isStringWithValue(data.localizedDescription) ) {
        callStack = data.localizedDescription.split('\n').map(item => item.trim());
    }
    else if ( arrayHasValues(data.callStackSymbols) ) {
        callStack = data.callStackSymbols.map(item => item.trim());
    }

    let frames = [];
    const regex = /\d+\s+(\S+)\s+(\S+)\s(.+)\s\+\s(\d+)(\s+\((\S+):(\S+)\))?/gm;
    let match;
    callStack.forEach(element => {
        while ( (match = regex.exec(element)) !== null ) {
            if ( match.index === regex.lastIndex) {
                regex.lastIndex++;
            }

            let moduleName = match && match.length > 1 ? match[1] : '';
            let stackAddress = match && match.length > 2 ? match[2] : '';
            let loadAddress = match && match.length > 3 ? match[3] : '';
            // let symbolOffset = match && match.length > 4 ? match[4] : '';
            let file = match && match.length > 6 ? match[6] : '';
            let line = match && match.length > 7 ? match[7] : '';

            frames.push({
                file: file || moduleName || '',
                line: line || '',
                method: loadAddress || '',
                stack_address: stackAddress || '',
            });
        }
    });

    return frames;
}



// ----------------------------------------------------------------------------
// Util
// ----------------------------------------------------------------------------

function isObject(val) {
    return val != null && (typeof val === 'object') && !(Array.isArray(val));
}

function isObjectWithField(possibleObj, field) {
    return isObject(possibleObj) && (field in possibleObj);
}

function isString(val) {
    return val != null && typeof val === 'string';
}

function isStringWithValue(val) {
    return isString(val) && val.trim().length > 0;
}

function arrayHasValues(obj) {
    return obj != null && Array.isArray(obj) && obj.length !== 0;
}

function safeStringFromField(obj, field, defaultValue = '') {
    if ( isObjectWithField(obj, field) && isStringWithValue(obj[field]) ) {
        return obj[field].trim();
    }
    return defaultValue;
}

