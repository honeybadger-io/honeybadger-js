import { requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';

import { ThowErrModuleViewProps } from './ThowErrModule.types';

const NativeView: React.ComponentType<ThowErrModuleViewProps> =
  requireNativeViewManager('ThowErrModule');

export default function ThowErrModuleView(props: ThowErrModuleViewProps) {
  return <NativeView {...props} />;
}
