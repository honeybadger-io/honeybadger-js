'use strict'
/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */


// File generated with `adonis make:middleware HoneybadgerContext`


const Honeybadger = require("../../../../dist/server/honeybadger.js")

class HoneybadgerContext {
  /**
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Function} next
   */
  async handle ({ request, response }, next) {
    await Honeybadger.withRequest(request, next)
  }
}

module.exports = HoneybadgerContext
