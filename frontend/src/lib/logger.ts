/**
 * Tiny logging utility.
 *
 * `log`, `debug`, and `info` only emit output during development
 * (`import.meta.env.DEV`), keeping the production console quiet.
 *
 * `warn` and `error` always emit -- they represent real signals that
 * should surface in every environment.
 */

// Vite replaces `import.meta.env.DEV` at build time. This project's tsconfig
// does not pull in Vite's client types, so we access it through a narrow cast
// to keep the type checker happy without changing runtime behavior.
const isDev = (import.meta as unknown as { env: { DEV: boolean } }).env.DEV;

type LogFn = (...args: unknown[]) => void;

const noop: LogFn = () => {};

export const logger = {
  log: (isDev ? console.log.bind(console) : noop) as LogFn,
  debug: (isDev ? console.debug.bind(console) : noop) as LogFn,
  info: (isDev ? console.info.bind(console) : noop) as LogFn,
  warn: console.warn.bind(console) as LogFn,
  error: console.error.bind(console) as LogFn,
};

export default logger;
