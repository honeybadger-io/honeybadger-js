import { requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';

import { ThrowErrModuleViewProps } from './ThrowErrModule.types';

const NativeView: React.ComponentType<ThrowErrModuleViewProps> =
  requireNativeViewManager('ThrowErrModule');

export default function ThrowErrModuleView(props: ThrowErrModuleViewProps) {
  return <NativeView {...props} />;
}
