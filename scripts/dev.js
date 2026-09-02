import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import {
  API_PORT_START, API_PORT_END, API_BIND_GRACE_MS, API_MAX_ATTEMPTS, PROJECT_ROOT,
  findFreePort,
} from './lib/ports.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pythonCommand = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

export async function startApi({ cwd, env } = {}) {
  for (let attempt = 1; attempt <= API_MAX_ATTEMPTS; attempt++) {
    const port = await findFreePort(API_PORT_START, API_PORT_END);
    const portNote = port !== API_PORT_START ? ` (${API_PORT_START} busy)` : '';
    const child = spawn(
      pythonCommand,
      ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', String(port)],
      { cwd: cwd ?? resolve(PROJECT_ROOT, 'backend'), stdio: 'inherit', env },
    );
    const stayedUp = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(true), API_BIND_GRACE_MS);
      child.on('exit', (code) => { clearTimeout(timer); resolve(code === 0 || code === null); });
    });
    if (stayedUp) {
      return { child, port, portNote };
    }
    console.log(`  ⚠ port ${port} got snatched after pick; retrying (${attempt}/${API_MAX_ATTEMPTS})...`);
  }
  throw new Error(
    `could not bind backend after ${API_MAX_ATTEMPTS} attempts in [${API_PORT_START}, ${API_PORT_END}]`,
  );
}

async function main() {
  const { child: api, port: apiPort, portNote } = await startApi();

  console.log(`\n  API → http://localhost:${apiPort}${portNote}`);
  console.log(`  Web → 5173 起自动选择\n`);

  const env = { ...process.env, VITE_API_PORT: String(apiPort), API_PORT: String(apiPort) };

  const viteEntry = resolve(PROJECT_ROOT, 'frontend', 'node_modules', 'vite', 'bin', 'vite.js');
  const web = spawn('node', [viteEntry, '--host', '0.0.0.0'], {
    cwd: resolve(PROJECT_ROOT, 'frontend'),
    stdio: 'inherit',
    env,
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

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main();
}
