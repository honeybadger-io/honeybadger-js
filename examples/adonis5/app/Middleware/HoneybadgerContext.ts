import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

// FIle generated with `node ace make:middleware HoneybadgerContext`

const Honeybadger = require("../../../../dist/server/honeybadger.js")

export default class HoneybadgerContext {
  public async handle({ request }: HttpContextContract, next: () => Promise<void>) {
    await Honeybadger.withRequest(request, next)
  }
}
