This project has been deployed and tested on Vercel.

## Deploy your own

1. Connect your Vercel account to your GitHub account.
2. Create a new project, i.e. `esbuild-plugin-example-react-app`
3. Override the following `Build & Development Settings`:
   - **Build Command**: `cd ../.. && npm run build && cd examples/react-typescript && npm run build` (we need to build the plugin first, then the example app)
   - **Output Directory**: `.`
   - **Install Command**: `cd ../.. && npm install && cd examples/react-typescript && npm install`
4. Set `Root Directory` as `packages/esbuild-plugin/examples/react-typescript` and make sure `Include source files outside of the Root Directory in the Build Step` is checked.
5. Set the following `Environment Variables`:
   - `HONEYBADGER_REVISION`: `testing-source-maps` (usually this value should be the commit hash or tag of the deployed version, but for this example we use a fixed value)
   - `HONEYBADGER_API_KEY`: `YOUR_HONEYBADGER_API_KEY`
   - `HONEYBADGER_ASSETS_URL`: `https://PROJECT_NAME.vercel.app` (replace project name with the name of your project you set in step 2)
6. Trigger a deployment, by committing and pushing the changes.
