const express = require('express')
const app = express()
const port = 3000

const Honeybadger = require('@honeybadger-io/js')
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

app.get('/fail', (_req, res) => {
  Honeybadger.setContext({
    local: 'true'
  })

  const err = new Error('Cause is error!', { cause: new Error('cause') });
  Honeybadger.notifyAsync(err).then(() => res.send('Done! Check HB Dashboard.'))
})

app.get('/checkin/:id', (req, res) => {
  Honeybadger.checkIn(req.params.id)
    .then(() => {
      res.send('Done!')
    })
})

app.use(Honeybadger.errorHandler)

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
