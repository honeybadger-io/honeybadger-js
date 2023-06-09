import { NativeExceptionData } from './types'
import { Types } from '@honeybadger-io/core'

export function errorMessageFromIosException(data:NativeExceptionData):string {
  if ( !data ) {
    return '';
  }

  if (data.localizedDescription) {
    const localizedDescription = data.localizedDescription;
    const startOfNativeIOSCallStack = localizedDescription.indexOf('callstack: (\n');
    if ( startOfNativeIOSCallStack === -1 ) {
      const lines = localizedDescription.split('\n');
      return lines.length === 0 ? localizedDescription : lines[0].trim();
    } else {
      return localizedDescription.substring(0, startOfNativeIOSCallStack).trim();
    }
  } else if (data.name || data.reason) {
    return `${data.name} : ${data.reason}`.trim();
  } else {
    return ''
  }
}

export function backtraceAndDetailsFromIosException(data:NativeExceptionData): {
    backtrace: Types.BacktraceFrame[];
    backtraceDetails: Record<string, string | Record<string, string | number>[]>
} {
  const framesFromComponent = framesFromComponentStack(data.localizedDescription)
  const framesFromReactNativeIos = framesFromReactNativeIosStack(data)
  const framesFromIosCall = framesFromIOSCallStack(data)

  let backtrace = []
  const backtraceDetails:Record<string, string | Record<string, string | number>[]> = {}

  if (framesFromComponent.length) {
    backtrace = framesFromComponent
    backtraceDetails.primaryBackTraceSource = 'ReactNativeComponentStack'
    if (framesFromReactNativeIos.length) {
      backtraceDetails.reactNativeIOSStackTrace = framesFromReactNativeIos
    }
    if (framesFromIosCall.length) {
      backtraceDetails.iosCallStack = framesFromIosCall;
    }
  } else if (framesFromReactNativeIos.length) {
    backtrace = framesFromReactNativeIos;
    backtraceDetails.primaryBackTraceSource = 'ReactNativeIOSStackTrace';
    if (framesFromIosCall.length) {
      backtraceDetails.iosCallStack = framesFromIosCall;
    }
  } else if (framesFromIosCall.length) {
    backtrace = framesFromIosCall;
    backtraceDetails.primaryBackTraceSource = 'iOSCallStack';
  }

  return { backtrace, backtraceDetails }
}

function framesFromComponentStack(str:string) {
  str = str || ''
  const frames = []
  const regex = /^\s*in\s(\S+)(\s\(at\s(\S+):(\S+)\)\s*$)?/gm
  let match
  while ((match = regex.exec(str)) !== null) {
    if ( match.index === regex.lastIndex) {
      regex.lastIndex++;
    }
    frames.push({
      method: match && match.length > 1 ? match[1] : '',
      file: match && match.length > 3 ? match[3] : '',
      number: match && match.length > 4 ? match[4] : '',
    })
  }
  return frames
}

function framesFromReactNativeIosStack(data:NativeExceptionData) {
  if (!data.reactNativeStackTrace) {
    return []
  }

  return data.reactNativeStackTrace.map((frame) => ({
    method: frame.methodName || '',
    number: frame.lineNumber || '',
    file: frame.file || '',
    column: frame.column || '',
  }))
}

function framesFromIOSCallStack(data:NativeExceptionData) {
  let callStack = []

  if (data.localizedDescription && typeof data.localizedDescription === 'string') {
    callStack = data.localizedDescription.split('\n').map(item => item.trim())
  } else if (Array.isArray(data.callStackSymbols) && data.callStackSymbols.length) {
    callStack = data.callStackSymbols.map(item => item.trim());
  }

  const frames = [];
  const regex = /\d+\s+(\S+)\s+(\S+)\s(.+)\s\+\s(\d+)(\s+\((\S+):(\S+)\))?/gm
  let match
  callStack.forEach(element => {
    while ((match = regex.exec(element)) !== null ) {
      if ( match.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      const moduleName = match && match.length > 1 ? match[1] : '';
      const stackAddress = match && match.length > 2 ? match[2] : '';
      const loadAddress = match && match.length > 3 ? match[3] : '';
      const file = match && match.length > 6 ? match[6] : '';
      const line = match && match.length > 7 ? match[7] : '';

      // TODO: Why doesn't this match the BacktraceFrame type?
      frames.push({
        file: file || moduleName || '',
        line: line || '',
        method: loadAddress || '',
        stack_address: stackAddress || '',
      })
    }
  })

  return frames
}