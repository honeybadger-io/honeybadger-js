import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import App from './App'
import { Honeybadger, HoneybadgerErrorBoundary } from '@honeybadger-io/react'

const config = {
  apiKey: process.env.HONEYBADGER_API_KEY,
  assetsUrl: process.env.HONEYBADGER_ASSETS_URL,
  revision: process.env.HONEYBADGER_REVISION,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
}

const honeybadger = Honeybadger.configure(config)
const root = ReactDOM.createRoot(
  document.getElementById('root')
)
root.render(<HoneybadgerErrorBoundary honeybadger={honeybadger}><App /></HoneybadgerErrorBoundary>)
