import React from 'react'
import './index.css'
import App from './App'
import reportWebVitals from './reportWebVitals'
import { Honeybadger, HoneybadgerErrorBoundary } from '@honeybadger-io/react'

// React < 19
// import ReactDOM from 'react-dom'

// React >= 19
import { createRoot } from 'react-dom/client'

Honeybadger.configure({
    apiKey: (process.env.REACT_APP_HONEYBADGER_API_KEY || (prompt('Enter the API key for your Honeybadger project:')) as string),
    environment: 'production'
})

// React < 19
// ReactDOM.render(
//     // @ts-expect-error "refs" is missing
//     <HoneybadgerErrorBoundary honeybadger={Honeybadger}>
//         <App />
//     </HoneybadgerErrorBoundary>,
//     document.getElementById('root')
// )

// React >= 19
const root = createRoot(document.getElementById('root')!)
root.render(<HoneybadgerErrorBoundary honeybadger={Honeybadger}>
    <App />
</HoneybadgerErrorBoundary>)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
