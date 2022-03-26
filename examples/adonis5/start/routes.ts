/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer'
|
*/

import Route from '@ioc:Adonis/Core/Route'

Route.get('/', async () => {
  return { hello: 'world' }
})


const {setTimeout} = require("timers/promises");
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
