import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Honeybadger, HoneybadgerErrorBoundary } from '@honeybadger-io/react'

Honeybadger.configure({
  apiKey: (import.meta.env.REACT_APP_HONEYBADGER_API_KEY || (prompt('Enter the API key for your Honeybadger project:')) as string),
  environment: 'production'
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HoneybadgerErrorBoundary honeybadger={Honeybadger}>
      <App />
    </HoneybadgerErrorBoundary>
  </StrictMode>,
)
