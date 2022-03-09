const express = require('express')
const app = express()
const port = 3000

// const Honeybadger = require('@honeybadger-io/js'); // Old version
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

let reqId = 0;
app.get('/test-context', (req, res) => {
  const localReqId = ++reqId;
  Honeybadger.setContext({
    [localReqId]: true
  })

  console.log(Honeybadger.__context); // Old version
  console.log(Honeybadger.__store?.getStore?.()?.context); // Current

  // If the contexts are properly isolated, the logged context should be
  // {2: true}
  // If they're wrongly isolated, it will be {1: true, 2: true, 3: true}
  if (localReqId === 2) setTimeout(() => { throw new Error('Badgers!') }, 100)
  else console.log(`Done: ${localReqId}`);
})

app.use(Honeybadger.errorHandler)

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
