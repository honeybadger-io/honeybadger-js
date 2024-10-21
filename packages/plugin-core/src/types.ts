// All our plugin options
export type HbPluginOptions = {
  apiKey: string;
  assetsUrl: string;
  endpoint: string;
  retries: number;
  revision: string;
  silent: boolean;
  deployEndpoint: string;
  deploy: boolean | Deploy;
  ignorePaths: Array<string>;
  ignoreErrors: boolean;
  workerCount: number;
  developmentEnvironments: Array<string>;
}

// Options passed in by a user
export type HbPluginUserOptions = Partial<HbPluginOptions> & Pick<HbPluginOptions, 'apiKey' | 'assetsUrl'>

export type Deploy = {
  repository?: string;
  localUsername?: string;
  environment?: string;
}

export type DeployBody = {
  deploy: {
    revision: string;
    repository?: string;
    local_username?: string;
    environment?: string;
  };
}

export type SourcemapInfo = {
  sourcemapFilename: string;
  sourcemapFilePath: string;
  jsFilename: string;
  jsFilePath: string;
}
