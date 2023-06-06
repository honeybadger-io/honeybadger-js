import { NativeModulesProxy, EventEmitter, Subscription } from 'expo-modules-core';

// Import the native module. On web, it will be resolved to ThrowErrModule.web.ts
// and on native platforms to ThrowErrModule.ts
import ThrowErrModule from './src/ThrowErrModule';
import ThrowErrModuleView from './src/ThrowErrModuleView';
import { ChangeEventPayload, ThrowErrModuleViewProps } from './src/ThrowErrModule.types';

// Get the native constant value.
export const PI = ThrowErrModule.PI;

export function throwNativeErr(): string {
  return ThrowErrModule.throwErr();
}

export async function setValueAsync(value: string) {
  return await ThrowErrModule.setValueAsync(value);
}

const emitter = new EventEmitter(ThrowErrModule ?? NativeModulesProxy.ThrowErrModule);

export function addChangeListener(listener: (event: ChangeEventPayload) => void): Subscription {
  return emitter.addListener<ChangeEventPayload>('onChange', listener);
}

export { ThrowErrModuleView, ThrowErrModuleViewProps, ChangeEventPayload };
