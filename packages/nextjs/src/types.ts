export type NextJsRuntime = 'server' | 'browser' | 'edge'
export type HoneybadgerNextJsConfig = {
    apiKey: string
    disableSourceMapUpload: boolean
    silent: boolean
    environment?: string
    revision?: string
    webpackPluginOptions: Pick<HoneybadgerWebpackPluginOptions, 'assetsUrl' | 'endpoint' | 'ignoreErrors' | 'retries' | 'workerCount'> & {
        deploy?: false | {
            repository?: string,
            localUsername?: string,
        }
    }
}

// this should be in @honeybadger-io/webpack
export type HoneybadgerWebpackPluginOptions = {
    apiKey: string
    assetsUrl: string
    revision?: string
    endpoint?: string
    silent?: boolean
    ignoreErrors?: boolean
    retries?: number
    workerCount?: number
    deploy?: false | {
        repository?: string,
        environment?: string,
        localUsername?: string,
    }
}
