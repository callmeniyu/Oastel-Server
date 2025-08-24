// Minimal declaration for `node-fetch` to satisfy TypeScript builds on environments
// where @types/node-fetch isn't installed. This file keeps types permissive to
// avoid changing runtime behavior. If you prefer stricter types, install
// `@types/node-fetch` or migrate to the built-in global fetch in Node 18+.

declare module 'node-fetch' {
  // Keep it simple: export 'any' typed default. This silences the TS7016 error
  // while leaving runtime behavior intact.
  const fetch: any;
  export default fetch;
}
