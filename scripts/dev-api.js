import { spawn } from 'child_process';

import {
  API_PORT_START, API_PORT_END, API_BIND_GRACE_MS, API_MAX_ATTEMPTS, PROJECT_ROOT,
  findFreePort,
} from './lib/ports.js';

async function startApiWithRetry() {
  for (let attempt = 1; attempt <= API_MAX_ATTEMPTS; attempt++) {
    const port = await findFreePort(API_PORT_START, API_PORT_END);
    const portNote = port !== API_PORT_START ? ` (${API_PORT_START} busy)` : '';
    const child = spawn(
      'python',
      ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', String(port)],
      { cwd: `${PROJECT_ROOT}/backend`, stdio: 'inherit' },
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

const { child: api, port, portNote } = await startApiWithRetry();

console.log(`\n  API → http://localhost:${port}${portNote}\n`);

api.on('exit', (c) => process.exit(c ?? 0));
process.on('SIGINT', () => { api.kill(); process.exit(); });
