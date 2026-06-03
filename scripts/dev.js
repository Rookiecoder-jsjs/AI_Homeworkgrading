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

async function main() {
  const apiPort = await findFreePort(Number(process.env.API_PORT) || 8000);

  console.log(`\n  API → http://localhost:${apiPort}`);
  console.log(`  Web → 5173 起自动选择\n`);

  const env = { ...process.env, VITE_API_PORT: String(apiPort) };

  const api = spawn('python', ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', String(apiPort)], {
    cwd: resolve(root, 'backend'),
    stdio: 'inherit',
    env,
    shell: true,
  });

  const web = spawn('npx', ['vite', '--host', '0.0.0.0'], {
    cwd: resolve(root, 'frontend'),
    stdio: 'inherit',
    env,
    shell: true,
  });

  const cleanup = () => {
    api.kill();
    web.kill();
    process.exit();
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  api.on('exit', (c) => { if (c !== 0 && c !== null) cleanup(); });
  web.on('exit', (c) => { if (c !== 0 && c !== null) cleanup(); });
}

main();
