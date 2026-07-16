export const CONFIG = {
  apiKey: null,
  endpoint: 'https://api.honeybadger.io',
  appEndpoint: 'https://app.honeybadger.io',
  environment: null,
  hostname: null,
  projectRoot: null,
  component: null,
  action: null,
  revision: null,
  reportData: null,
  breadcrumbsEnabled: true,
  // we could decide the value of eventsEnabled based on `env` and `developmentEnvironments`
  eventsEnabled: false,
  maxBreadcrumbs: 40,
  maxObjectDepth: 8,
  logger: console,
  developmentEnvironments: ['dev', 'development', 'test'],
  debug: false,
  tags: null,
  enableUncaught: true,
  enableUnhandledRejection: true,
  afterUncaught: () => true,
  filters: ['creditcard', 'password'],
  __plugins: [],
}

// Browser-only, so it lives outside CONFIG (which is shared with Node).
export const BREADCRUMBS_SELECTOR_ATTRIBUTES = ['data-hb-name']
