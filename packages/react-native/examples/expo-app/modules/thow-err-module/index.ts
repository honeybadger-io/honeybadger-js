import { NativeModulesProxy, EventEmitter, Subscription } from 'expo-modules-core';

// Import the native module. On web, it will be resolved to ThowErrModule.web.ts
// and on native platforms to ThowErrModule.ts
import ThowErrModule from './src/ThowErrModule';
import ThowErrModuleView from './src/ThowErrModuleView';
import { ChangeEventPayload, ThowErrModuleViewProps } from './src/ThowErrModule.types';

// Get the native constant value.
export const PI = ThowErrModule.PI;

export function throwNativeErr(): string {
  return ThowErrModule.throwErr();
}

export async function setValueAsync(value: string) {
  return await ThowErrModule.setValueAsync(value);
}

const emitter = new EventEmitter(ThowErrModule ?? NativeModulesProxy.ThowErrModule);

export function addChangeListener(listener: (event: ChangeEventPayload) => void): Subscription {
  return emitter.addListener<ChangeEventPayload>('onChange', listener);
}

export { ThowErrModuleView, ThowErrModuleViewProps, ChangeEventPayload };
