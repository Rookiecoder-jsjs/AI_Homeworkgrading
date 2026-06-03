import { spawn } from 'child_process';
import { createServer } from 'net';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function findFreePort(start) {
  return new Promise((resolve) => {
    const s = createServer();
    s.listen(start, () => {
      const port = s.address().port;
      s.close(() => resolve(port));
    });
    s.on('error', () => resolve(findFreePort(start + 1)));
  });
}

const port = await findFreePort(Number(process.env.API_PORT) || 8000);

console.log(`\n  API → http://localhost:${port}\n`);

const api = spawn('python', ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', String(port)], {
  cwd: resolve(root, 'backend'),
  stdio: 'inherit',
  shell: true,
});

api.on('exit', (c) => process.exit(c ?? 0));
process.on('SIGINT', () => { api.kill(); process.exit(); });
