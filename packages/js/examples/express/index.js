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
  insights: {
    enabled: true,
    http: true,
    console: true,
    dispatchIntervalSeconds: 1,
    bulkThreshold: 500,
    sampleRatePercentage: 100,
  },
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
  // should send an event to Honeybadger, with type 'button_click'
  Honeybadger.event('button_click', {
    action: 'buy_now',
    user_id: 123,
    product_id: 456
  })

  // should send an event to Honeybadger, with type 'log'
  console.log('Event sent!', { source: 'console.log' , path: req.url })

  res.send('Done. Check your Honeybadger Insights page!')
})

app.get('/event-flood', async (req, res) => {
  const count = parseInt(req.query.count, 10) || 100000
  const batchSize = 1000
  for (let i = 0; i < count; i++) {
    Honeybadger.event('quota_test', {
      index: i,
      timestamp: Date.now(),
      payload: 'x'.repeat(200),
    })
    if (i > 0 && i % batchSize === 0) {
      await new Promise((resolve) => setImmediate(resolve))
    }
  }
  res.send(`Fired ${count} events. Watch the logs for throttling/quota messages.`)
})

app.get('/event/:name', (req, res) => {
  // should send an event to Honeybadger, with type 'button_click'
  Honeybadger.event('button_click', {
    action: 'buy_now',
    user_id: 123,
    product_id: 456,
    name: req.params.name
  })

  // should send an event to Honeybadger, with type 'log'
  console.log('Event sent!', { source: 'console.log' , path: req.url })

  res.send('Done. Check your Honeybadger Insights page!')
})

app.use(Honeybadger.errorHandler)

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
