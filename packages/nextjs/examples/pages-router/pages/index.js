import Link from 'next/link'

const Index = () => (
  <div style={{ maxWidth: 700, margin: '0 auto' }}>
    <h2>Honeybadger Error Reporting in Next.js 🚨</h2>
    <p>
      This example demonstrates how to record unhandled exceptions in your code
      with Honeybadger. There are several test pages below that result in various
      kinds of unhandled exceptions.
    </p>
    <p>
      <strong>Important:</strong> exceptions in development mode take a
      different path than in production. These tests should be run on a
      production build (i.e. 'next build').{' '}
      <a href="https://nextjs.org/docs/advanced-features/error-handling" target="_blank">Read more</a>
    </p>

    <h3>Server exceptions</h3>
    <ol>
      <li>
        getInitialProps throws an Error. This should cause _error.js to render
        and record Error('Server Test 1') in Honeybadger.{' '}
        <a href="/server/test1" target="_blank">
          Open in a new tab
        </a>
      </li>
      <li>
        getInitialProps returns a Promise that rejects. This should cause
        _error.js to render and record Error('Server Test 2') in Honeybadger.{' '}
        <a href="/server/test2" target="_blank">
          Open in a new tab
        </a>
      </li>
      <li>
        getInitialProps calls a Promise that rejects, but does not handle the
        rejection or await its result (returning synchronously).{' '}
        Honeybadger shouldrecord Error('Server Test 3').{' '}
        <a href="/server/test3" target="_blank">
          Open in a new tab
        </a>
      </li>
      <li>
        There is a top-of-module Promise that rejects, but its result is not
        awaited. Honeybadger should record Error('Server Test 4'). Note this will
        also be recorded on the client side, once the page is hydrated.{' '}
        <a href="/server/test4" target="_blank">
          Open in a new tab
        </a>
      </li>
    </ol>

    <h3>Client exceptions</h3>
    <ol>
      <li>
        getInitialProps throws an Error. This should cause _error.js to render
        and record Error('Client Test 1') in Honeybadger.{' '}
        <Link legacyBehavior href="/client/test1">
          Perform client side navigation
        </Link>
      </li>
      <li>
        getInitialProps returns a Promise that rejects. This should cause
        _error.js to render and record Error('Client Test 2') in Honeybadger.{' '}
        <Link legacyBehavior href="/client/test2">
          Perform client side navigation
        </Link>
      </li>
      <li>
        getInitialProps calls a Promise that rejects, but does not handle the
        rejection or await its result (returning synchronously). Honeybadger should
        record Error('Client Test 3').{' '}
        <Link legacyBehavior href="/client/test3">
          Perform client side navigation
        </Link>
      </li>
      <li>
        There is a top-of-module Promise that rejects, but its result is not
        awaited. Honeybadger should record Error('Client Test 4').{' '}
        <Link legacyBehavior href="/client/test4">
          Perform client side navigation
        </Link>{' '}
        or{' '}
        <a href="/client/test4" target="_blank">
          Open in a new tab
        </a>
      </li>
      <li>
        There is a top-of-module exception. _error.js should render and record
        ReferenceError('process is not defined') in Honeybadger.{' '}
        <Link legacyBehavior href="/client/test5">
          Perform client side navigation
        </Link>{' '}
        or{' '}
        <a href="/client/test5" target="_blank">
          Open in a new tab
        </a>
      </li>
      <li>
        There is an exception during React lifecycle that is caught by
        Next.js's React Error Boundary. In this case, when the component
        mounts. This should cause _error.js to render and record Error('Client
        Test 6') in Honeybadger.{' '}
        <Link legacyBehavior href="/client/test6">
          Perform client side navigation
        </Link>{' '}
        or{' '}
        <a href="/client/test6" target="_blank">
          Open in a new tab
        </a>
      </li>
      <li>
        There is an unhandled Promise rejection during React lifecycle. In
        this case, when the component mounts. Honeybadger should record
        Error('Client Test 7').{' '}
        <Link legacyBehavior href="/client/test7">
          Perform client side navigation
        </Link>{' '}
        or{' '}
        <a href="/client/test7" target="_blank">
          Open in a new tab
        </a>
      </li>
      <li>
        An Error is thrown from an event handler. Honeybadger should record
        Error('Client Test 8').{' '}
        <Link legacyBehavior href="/client/test8">
          Perform client side navigation
        </Link>{' '}
        or{' '}
        <a href="/client/test8" target="_blank">
          Open in a new tab
        </a>
      </li>
    </ol>
  </div>
)

export default Index
