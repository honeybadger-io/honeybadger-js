import * as React from 'react';

import { ThowErrModuleViewProps } from './ThowErrModule.types';

export default function ThowErrModuleView(props: ThowErrModuleViewProps) {
  return (
    <div>
      <span>{props.name}</span>
    </div>
  );
}
