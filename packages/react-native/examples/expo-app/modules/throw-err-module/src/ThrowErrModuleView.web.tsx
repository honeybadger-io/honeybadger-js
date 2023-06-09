import * as React from 'react';

import { ThrowErrModuleViewProps } from './ThrowErrModule.types';

export default function ThrowErrModuleView(props: ThrowErrModuleViewProps) {
  return (
    <div>
      <span>{props.name}</span>
    </div>
  );
}
