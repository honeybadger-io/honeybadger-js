# Next.js with Honeybadger Error Reporting

This is a simple example showing how to use
[Honeybadger](https://www.honeybadger.io/for/javascript) to catch & report
errors on both client + server side in Next.js.

- `_app.js` renders on both the server and client. It initializes Honeybadger to catch any unhandled exceptions
- `_error.js` is rendered by Next.js while handling certain types of exceptions for you. It is overridden so those exceptions can be passed along to Honeybadger
- `next.config.js` enables source maps in production and uploads them to Honeybadger

## Getting Started

Execute [`create-next-app`](https://github.com/zeit/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init) or [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/) to bootstrap the example:

```bash
npm init next-app --example https://github.com/honeybadger-io/nextjs-with-honeybadger nextjs-with-honeybadger
# or
yarn create next-app --example https://github.com/honeybadger-io/nextjs-with-honeybadger nextjs-with-honeybadger
```

Next, copy the `.env.local.example` file in this directory to `.env.local` (which will be ignored by Git):

```bash
cd nextjs-with-honeybadger
cp .env.local.example .env.local
```

Open the `.env.local` and set your `HONEYBADGER_API_KEY` from your [Honeybadger project settings page](https://app.honeybadger.io).

> **Note:** Errors are not reported in development mode by default. To enable reporting in development, see the `reportData` option in `_app.js`.

Finally, install it and run:

**NPM**

```bash
npm install
npm run dev
```

**Yarn**

```bash
yarn
yarn dev
```

Your app should be up and running on [http://localhost:3000](http://localhost:3000)! If it doesn't work, email us at support@honeybadger.io.

## Testing error reporting locally
When enabled in development mode, error handling [works differently than in production](https://nextjs.org/docs/advanced-features/error-handling). To test error reporting locally, you should run a production build, i.e.

```bash
npm run build
npm start
```

## Deployment

Since this example project is inside a monorepo, you will have to follow the guide available [here](https://vercel.com/docs/concepts/monorepos)
to get it working. Alternatively, you can clone this folder into a new repository.

You must add the following configuration values when deploying:

- `NEXT_PUBLIC_HONEYBADGER_API_KEY` - The API key from your **project settings page** in [Honeybadger](https://app.honeybadger.io).
- `NEXT_PUBLIC_HONEYBADGER_ASSETS_URL` - Required by [honeybadger-webpack](https://github.com/honeybadger-io/honeybadger-webpack#configuration) to upload source maps to Honeybadger. Replace `[host]` with your domain name: `https://[host]/_next` (if using Vercel's domain, the host looks like this: `[your app name].vercel.app`)
- `NEXT_PUBLIC_HONEYBADGER_REVISION` - The version (i.e. 1.0.0) of your the app. This is necessary to in order to apply source maps to errors in Honeybadger.

## Notes

- By default, neither sourcemaps nor error tracking is enabled in development mode (see Configuration).

- The build output will contain warning about unhandled Promise rejections. This is caused by the test pages, and is expected.

- `@honeybadger-io/webpack` is added to `dependencies` (rather than `devDependencies`) because when used with SSR (ex. heroku), this plugin is used during production for sending the generated sourcemaps to Honeybadger.

- See the [Honeybadger webpack plugin docs](https://github.com/honeybadger-io/honeybadger-webpack#configuration) and the [Using Source Maps guide](https://docs.honeybadger.io/lib/javascript/guides/using-source-maps.html) for more info about source map upload.

- See the [honeybadger.js user documentation](https://docs.honeybadger.io/lib/javascript/index.html) for usage guides and more.
