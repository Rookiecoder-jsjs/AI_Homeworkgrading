import { createServer } from 'net';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = resolve(__dirname, '..', '..');

export const API_PORT_START = Number(process.env.API_PORT) || 8000;
export const API_PORT_END = API_PORT_START + 99;
export const API_BIND_GRACE_MS = 2500;
export const API_MAX_ATTEMPTS = 3;

export function findFreePort(start, end = start + 99) {
  return new Promise((resolve, reject) => {
    const tryPort = (p) => {
      if (p > end) {
        return reject(new Error(`no free port in [${start}, ${end}]`));
      }
      const s = createServer();
      s.unref();
      s.on('error', () => { tryPort(p + 1); });
      s.listen(p, '0.0.0.0', () => {
        const port = s.address().port;
        s.close(() => resolve(port));
      });
    };
    tryPort(start);
  });
}
