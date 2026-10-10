/** Minimal terminal styling with no dependencies. Honours NO_COLOR and non-TTY output. */
const enabled = process.stdout.isTTY && !process.env.NO_COLOR && process.env.TERM !== 'dumb';

const wrap = (open: number, close: number) => (s: string) =>
  enabled ? `\x1b[${open}m${s}\x1b[${close}m` : s;

export const c = {
  bold: wrap(1, 22),
  dim: wrap(2, 22),
  red: wrap(31, 39),
  green: wrap(32, 39),
  yellow: wrap(33, 39),
  cyan: wrap(36, 39),
  ember: (s: string) => (enabled ? `\x1b[38;2;255;106;61m${s}\x1b[39m` : s),
};

export const log = {
  info: (msg: string) => console.log(msg),
  step: (msg: string) => console.log(`${c.ember('›')} ${msg}`),
  success: (msg: string) => console.log(`${c.green('✔')} ${msg}`),
  warn: (msg: string) => console.warn(`${c.yellow('!')} ${msg}`),
  error: (msg: string) => console.error(`${c.red('✖')} ${msg}`),
  blank: () => console.log(''),
};

export class CliError extends Error {
  constructor(
    message: string,
    readonly hint?: string,
  ) {
    super(message);
  }
}
