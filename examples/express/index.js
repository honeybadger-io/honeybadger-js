const express = require('express')
const app = express()
const port = 3000

// const Honeybadger = require('@honeybadger-io/js');
const Honeybadger = require('../../dist/server/honeybadger.js');
Honeybadger.configure({
  apiKey: process.env.HONEYBADGER_API_KEY,
  reportData: true
})

app.use(Honeybadger.requestHandler)

app.use(function(req, res, next) {
  Honeybadger.setContext({
    user_id: '1'
  })
  next()
})

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/fail', (req, res) => {
  Honeybadger.setContext({
    local: 'true'
  })

  throw new Error('Badgers!')
})

app.use(Honeybadger.errorHandler)

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
