# Honeybadger AWS Lambda - Serverless Example with TypeScript

This example was built and deployed to AWS Lambda with [Serverless.com](https://serverless.com).
It deploys 6 lambda functions to showcase different scenarios of reporting errors:

- `hello` -> returns a hello message
- "sync" error -> throws an error in an async handler
- "async" error -> awaits a promise that rejects
- "callback" error -> passes an error to the callback handler (uses the callback-based handler)
- "set timeout" error -> throws an error inside a `setTimeout` (uses the callback-based handler)
- "timeout warning" -> runs until the function times out

The Honeybadger integration lives in [`app/honeybadger.ts`](app/honeybadger.ts), which wraps each
handler with `Honeybadger.lambdaHandler`.

Serverless Framework v4 compiles TypeScript out of the box, so this example needs no TypeScript
build plugin.

## Setup

1. Install the example's dependencies (this installs Serverless locally, no global install needed):
   ```bash
   npm install
   ```
2. Authenticate the Serverless Framework. v4 requires an account for every command that
   builds or deploys the service:
   ```bash
   npx serverless login
   ```
3. Type-check the handlers:
   ```bash
   npm run typecheck
   ```
4. Provide your Honeybadger API key. Either export it in your shell:
   ```bash
   export HONEYBADGER_API_KEY=your-api-key
   ```
   or set it as a Serverless Dashboard parameter named `HONEYBADGER_API_KEY` (run
   `npx serverless dashboard`, open `honeybadger-io/stage:dev`, and add it under parameters).
5. Deploy:
   ```bash
   npx serverless deploy
   ```

To build the deployment artifact without deploying, run `npx serverless package`.

## Report an error

To report an error:

1. Run `npx serverless invoke --function syncError --data '{ "body": { "report": "yes" } }'`.
2. Alternatively, to play around without deploying every change, use
   `npx serverless invoke local --function syncError --data '{ "body": { "report": "yes" } }'`.
3. Check your Honeybadger dashboard. The error should show up after a few seconds.

Each error handler only reports when you pass `{ "body": { "report": "yes" } }`, so you can call
them without sending anything to Honeybadger. The `timeoutWarning` function takes
`{ "body": { "timeout": "yes" } }` instead.

## Run locally

```bash
npm run local
```

This starts [serverless-offline](https://github.com/dherault/serverless-offline) and serves the
functions on `http://localhost:3000`.
