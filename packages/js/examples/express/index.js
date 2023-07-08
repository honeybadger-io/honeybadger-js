const path = require('path')
const fs = require('fs')
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

app.use(Honeybadger.errorHandler)

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
