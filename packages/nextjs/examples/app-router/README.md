This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## What is this?

This project demonstrates Honeybadger's error reporting for Next.js, using the new App Router that comes with Next.js v13:
- Error thrown while rendering in `app/counter/page.tsx` (`http://localhost:3000/counter?fail=true`).
- Error thrown while data fetching in `app/data-fetching/page.tsx` (`http://localhost:3000/data-fetching?fail=true`).
- Error thrown in middleware (`http://localhost:3000/middleware-test`), which will be caught with the global `window.onerror` handler.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

Since this example project is inside a monorepo, you will have to follow the guide available [here](https://vercel.com/docs/concepts/monorepos)
to get it working. Alternatively, you can clone this folder into a new repository.

You must add the following environment values when deploying:

- `NEXT_PUBLIC_HONEYBADGER_API_KEY` - The API key from your **project settings page** in [Honeybadger](https://app.honeybadger.io).
- `NEXT_PUBLIC_HONEYBADGER_ASSETS_URL` - Required by [honeybadger-webpack](https://github.com/honeybadger-io/honeybadger-webpack#configuration) to upload source maps to Honeybadger. Replace `[host]` with your domain name: `https://[host]/_next` (if using Vercel's domain, the host looks like this: `[your app name].vercel.app`)
- `NEXT_PUBLIC_HONEYBADGER_REVISION` - The version (i.e. 1.0.0) of your the app. This is necessary to in order to apply source maps to errors in Honeybadger.

You should override build and install commands:
- Build: `cd ../.. && npm run build && cd examples/app-router && npm run build`
- Install: `cd ../../.. && npm install`

The above overrides bootstrap the monorepo, allowing to import honeybadger packages that haven't been published to npm yet.
