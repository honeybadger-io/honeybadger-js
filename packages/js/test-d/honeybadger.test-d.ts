/**
 * This file is not in tsconfig.json, that's why there it throws errors without the
 * ts-ignore. It's not supposed to be under tsconfig.json, since it's used to test the result
 * of tsc --build
 */
// @ts-ignore
import Honeybadger from '../'

Honeybadger.configure({
  apiKey: 'project api key',
})
