import React from 'react'
import './index.css'
import App from './App'
import reportWebVitals from './reportWebVitals'
import { Honeybadger, HoneybadgerErrorBoundary } from '@honeybadger-io/react'

import ReactDOM from 'react-dom'

Honeybadger.configure({
  apiKey: (process.env.REACT_APP_HONEYBADGER_API_KEY || (prompt('Enter the API key for your Honeybadger project:')) as string),
  environment: 'production',
  reportData: false,
})


ReactDOM.render(
  // @ts-expect-error Getting invalid component when react v17 (example app) and v19 (react package) are both installed
  <HoneybadgerErrorBoundary honeybadger={Honeybadger}>
    <App />
  </HoneybadgerErrorBoundary>,
  document.getElementById('root')
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
