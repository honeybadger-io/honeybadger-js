// Edge bundle: only the runtime hooks, which must load where Node builtins are absent.
// `setup` is deliberately excluded — next.config is evaluated on the Node side only.
export * from './capture-request-error'
export * from './insights'
