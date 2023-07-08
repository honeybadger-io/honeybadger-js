// TODO: This could probably be split into Android and IOS data types
export interface NativeExceptionData {
  type: string;
  architecture?: string;
  message?: string;
  name?: string;
  reason?: string;
  userInfo?: object;
  callStackSymbols?: string[];
  initialHandler?: string;
  reactNativeStackTrace?: {
    methodName?: string;
    lineNumber?: string | number;
    file?: string;
    column?: string | number;
  }[];
  localizedDescription?: string;
  errorDomain?: string;
  stackTrace?: {
    method?: string, 
    class?: string, 
    line?: string | number, 
    file?: string
  }[];
}