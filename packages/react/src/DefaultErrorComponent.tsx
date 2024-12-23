import React from 'react'
import { DefaultErrorComponentProps } from './types';

function DefaultErrorComponent({ error, info }: DefaultErrorComponentProps) {
  return (
    <div className='error'>
      <div>
        An Error Occurred
      </div>
      <div>
        {JSON.stringify(error, null, 2)}
      </div>
      <div>
        {info ? JSON.stringify(info, null, 2) : ''}
      </div>
    </div>
  )
}

export default DefaultErrorComponent;
