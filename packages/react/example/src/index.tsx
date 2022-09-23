import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'
import reportWebVitals from './reportWebVitals'
import {Honeybadger, HoneybadgerErrorBoundary} from '@honeybadger-io/react'

Honeybadger.configure({
  apiKey: (process.env.REACT_APP_HONEYBADGER_API_KEY || (prompt('Enter the API key for your Honeybadger project:')) as string),
  environment: 'production'
})

ReactDOM.render(
  <HoneybadgerErrorBoundary honeybadger={Honeybadger}>
    <App />
  </HoneybadgerErrorBoundary>,
  document.getElementById('root')
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
