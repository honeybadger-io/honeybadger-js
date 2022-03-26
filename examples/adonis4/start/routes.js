'use strict'

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| Http routes are entry points to your web application. You can create
| routes for different URLs and bind Controller actions to them.
|
| A complete guide on routing is available here.
| http://adonisjs.com/docs/4.0/routing
|
*/

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */
const Route = use('Route')

const {setTimeout} = require("node:timers/promises");
const Honeybadger = require("../../../dist/server/honeybadger.js")
Honeybadger.configure({});

let reqId = 0;
Route.get('/test-context', () => {
  const localReqId = ++reqId;
  Honeybadger.setContext({
    [localReqId]: true
  })

  console.log(Honeybadger.__store.getStore().context);

  return setTimeout(100).then(() => {
    if (localReqId === 2) throw new Error('Badgers!');
    else console.log(`Done: ${localReqId}`)
    return "OK";
  });
})

Route.get('/', () => {
  return `
  <html>
    <head>
      <link rel="stylesheet" href="/style.css" />
    </head>
    <body>
      <section>
        <div class="logo"></div>
        <div class="title"></div>
        <div class="subtitle">
          <p>AdonisJs simplicity will make you feel confident about your code</p>
          <p>
            Don't know where to start? Read the <a href="https://adonisjs.com/docs">documentation</a>.
          </p>    
      </div>
      </section>
    </body>
  </html>
  `
})
