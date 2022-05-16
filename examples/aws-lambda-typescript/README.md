# Honeybadger AWS Lambda - Serverless Example with Typescript

This example was built and deployed to AWS Lambda with [Serverless.com](https://serverless.com).
The example deploys 5 lambda functions to showcase different scenarios of reporting errors:
- hello -> returns a hello message
- "sync" error -> throws an error in an async handler
- "async" error -> awaits a promise that rejects
- "callback" error -> passes an error to the callback handler (uses the callback-based handler)
- "set timeout" error -> throws an error inside a setTimeout (uses the callback-based handler)

Follow these steps to setup and run the example:

## Setup

1. Install serverless globally: `npm install -g serverless`
2. Install example dependencies: `npm install`
3. Run `serverless` in root folder to configure your serverless installation.
4. If not prompted to deploy from the previous step, run `serverless deploy`.
5. Run `serverless dashboard` to open the dashboard on a web browser and open `honeybadger-io/stage:dev`. Navigate to parameters and add a new key `HONEYBADGER_API_KEY` with your honeybadger api key.
6. Redeploy with `serverless deploy` for the new parameter to take effect.

## Report an error

To report an error:
1. Run `serverless invoke --function syncError --data '{ "body": { "report": "yes" } }'`.
2. Alternatively, if you want to play around without deploying every change you can use `serverless invoke local --function syncError --data '{ "body": { "report": "yes" } }'`.
6. Check your Honeybadger.js dashboard. The error should show up after a few seconds. 
