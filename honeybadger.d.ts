// Type definitions for honeybadger.js
// Project: https://github.com/honeybadger-io/honeybadger-js
import Server from './dist/server/types/server'
import Browser from './dist/browser/types/browser'
import {
    Logger as BaseLogger,
    Config as BaseConfig,
    BeforeNotifyHandler as BaseBeforeNotifyHandler,
    AfterNotifyHandler as BaseAfterNotifyHandler,
    Notice as BaseNotice,
    BacktraceFrame as BaseBacktraceFrame,
    BreadcrumbRecord as BaseBreadcrumbRecord,
} from './src/core/types'

declare namespace Honeybadger {
    type Logger = BaseLogger

    type Config = BaseConfig

    type BeforeNotifyHandler = BaseBeforeNotifyHandler

    type AfterNotifyHandler = BaseAfterNotifyHandler

    type Notice = BaseNotice

    type BacktraceFrame = BaseBacktraceFrame

    type BreadcrumbRecord = BaseBreadcrumbRecord
}

declare const singleton: typeof Server & typeof Browser
export default singleton
