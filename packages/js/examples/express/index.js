const path = require('path')
const fs = require('fs')
const express = require('express')
const app = express()
const port = 3000

const Honeybadger = require('../../dist/server/honeybadger')
Honeybadger.configure({
  apiKey: process.env.HONEYBADGER_API_KEY,
  reportData: true,
  eventsEnabled: true,
  debug: true,
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

app.get('/feedback-form', (_req, res) => {
  const htmlFilePath = path.resolve(__dirname, '../../assets/user-feedback-form.html')
  const htmlData = fs.readFileSync(htmlFilePath, 'utf-8')
  const jsFilePath = path.resolve(__dirname, '../../assets/user-feedback-form.js')
  let jsData = fs.readFileSync(jsFilePath, 'utf-8')
  jsData = jsData.replace('$$TEMPLATE$$', htmlData)

  res.setHeader('Content-Type', 'text/javascript')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.send(jsData)
})

app.get('/fail', (_req, _res) => {
  Honeybadger.setContext({
    local: 'true'
  })

  throw new Error('Badgers!')
})

app.get('/checkin/:id', (req, res) => {
  Honeybadger.checkIn(req.params.id)
    .then(() => {
      res.send('Done!')
    })
})

app.get('/event', (req, res) => {
  // should send an event to Honeybadger, with type 'test-event'
  Honeybadger.event('test-event', { message: 'Event sent!', source: 'Honeybadger.event', path: req.url })

  // should send an event to Honeybadger, with type 'log'
  console.log('Event sent!', { source: 'console.log' , path: req.url })

  res.send('Done. Check your Honeybadger Insights page!')
})

app.use(Honeybadger.errorHandler)

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
