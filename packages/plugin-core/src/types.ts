export interface HbPluginOptions {
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
}

export interface Deploy {
  repository?: string;
  localUsername?: string;
  environment?: string;
}

export interface DeployBody {
  deploy: {
    revision: string;
    repository?: string;
    local_username?: string;
    environment?: string;
  };
}

export interface SourcemapInfo {
  sourcemapFilename: string;
  sourcemapFilePath: string;
  jsFilename: string;
  jsFilePath: string;
}
