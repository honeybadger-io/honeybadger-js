import { NativeExceptionData } from './types'

export function backtraceFromAndroidException(data:NativeExceptionData) {
  if ( !data || !data.stackTrace ) return []

  function isStringWithValue(val:unknown):boolean {
    return typeof val === 'string' && val.trim().length > 0;
  }

  return data.stackTrace.map((frame) => {
    const method = (isStringWithValue(frame.class) && isStringWithValue(frame.method)) 
      ? `${frame.class}.${frame.method}` 
      : frame.method;
    return {
      method: method || '',
      file: frame.file || '',
      number: frame.line || ''
    }
  })
}