import { Client, Util, Types } from '@honeybadger-io/core'
import { Transport } from './transport'

class Honeybadger extends Client {
  constructor(opts: Partial<Types.Config> = {}) {
    super(opts, new Transport())
    this.logger.info('Honeybadger client init')
  }

  public factory(opts?: Partial<Types.BrowserConfig>): this {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Honeybadger(opts) as any
  }

  public checkIn(): Promise<void> {
    throw new Error('Honeybadger.checkIn() is not yet supported on react-native')
  }

  public showUserFeedbackForm(): Promise<void> {
    throw new Error('Honeybadger.showUserFeedbackForm() is not yet supported on react-native')
  }
}

export { Types } from '@honeybadger-io/core'
export default new Honeybadger()