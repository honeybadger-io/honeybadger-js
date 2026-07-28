// Jest's node environment does not expose Node's Fetch API globals
// (Request/Response/etc.) into the VM context. Wire undici (Node's fetch
// implementation) and the web streams it depends on onto globalThis.
// Streams must be installed before requiring undici — it reads them at load.
const { ReadableStream, TransformStream, WritableStream } = require('node:stream/web')
const { MessagePort, MessageChannel } = require('node:worker_threads')

Object.assign(globalThis, {
  ReadableStream,
  TransformStream,
  WritableStream,
  MessagePort,
  MessageChannel,
})

const { Request, Response, Headers, fetch, FormData, File, Blob } = require('undici')

Object.assign(globalThis, {
  Request,
  Response,
  Headers,
  fetch,
  FormData,
  File,
  Blob,
})
