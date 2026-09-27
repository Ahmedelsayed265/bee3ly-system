import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

const DEV_PORTS = [3000, 5173];
const PG_PORT = 5432;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? rootDir,
    shell: true,
    encoding: 'utf8',
    stdio: options.silent ? 'pipe' : 'inherit',
  });
  if (options.allowFail) return result;
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed (exit ${result.status ?? 'unknown'})`,
    );
  }
  return result;
}

function hasDockerCli() {
  const probe = spawnSync('docker', ['--version'], {
    encoding: 'utf8',
    shell: true,
    stdio: 'pipe',
  });
  return probe.status === 0 && !probe.error;
}

function dockerCompose(args, options = {}) {
  const tryCompose = spawnSync('docker', ['compose', ...args], {
    cwd: rootDir,
    shell: true,
    encoding: 'utf8',
    stdio: options.silent ? 'pipe' : 'inherit',
  });
  if (tryCompose.status === 0 || options.allowFail) return tryCompose;
  return spawnSync('docker-compose', args, {
    cwd: rootDir,
    shell: true,
    encoding: 'utf8',
    stdio: options.silent ? 'pipe' : 'inherit',
  });
}

function pidsListeningOnPort(port) {
  const pids = new Set();
  if (process.platform === 'win32') {
    const out = spawnSync('netstat', ['-ano'], { encoding: 'utf8', shell: true });
    const needle = `:${port}`;
    for (const line of out.stdout?.split('\n') ?? []) {
      if (!line.includes(needle) || !line.includes('LISTENING')) continue;
      const parts = line.trim().split(/\s+/);
      const pid = Number(parts.at(-1));
      if (Number.isFinite(pid) && pid > 0) pids.add(pid);
    }
    return [...pids];
  }

  const out = spawnSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], {
    encoding: 'utf8',
  });
  for (const line of out.stdout?.split('\n') ?? []) {
    const pid = Number(line.trim());
    if (Number.isFinite(pid) && pid > 0) pids.add(pid);
  }
  return [...pids];
}

function killPort(port) {
  for (const pid of pidsListeningOnPort(port)) {
    try {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/F', '/PID', String(pid)], {
          stdio: 'ignore',
          shell: true,
        });
      } else {
        process.kill(pid, 'SIGTERM');
      }
      console.log(`Stopped process ${pid} on port ${port}`);
    } catch {
      // ignore
    }
  }
}

function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    socket.setTimeout(1500);
    socket.once('connect', () => {
      socket.end();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(false));
  });
}

async function waitForPostgres(maxSeconds = 60) {
  for (let i = 0; i < maxSeconds; i++) {
    if (!(await isPortOpen(PG_PORT))) {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }
    const probe = spawnSync(
      'docker',
      [
        'exec',
        'bee3ly-postgres',
        'pg_isready',
        '-U',
        'bay3ly',
        '-d',
        'bay3ly',
      ],
      { encoding: 'utf8', shell: true, stdio: 'pipe' },
    );
    if (probe.status === 0) return;
    // Port open but pg_isready not yet — or docker CLI unavailable; brief pause then continue.
    if (i >= 5 && probe.status !== 0 && !probe.stdout && !probe.stderr) {
      await new Promise((r) => setTimeout(r, 2000));
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`PostgreSQL not ready on port ${PG_PORT} after ${maxSeconds}s`);
}

function stopEmbeddedPostgres() {
  const stopScript = path.join(backendDir, 'scripts', 'stop-local-pg.mjs');
  if (!fs.existsSync(stopScript)) return;
  spawnSync('node', [stopScript], { cwd: backendDir, stdio: 'inherit', shell: true });
}

function startEmbeddedPostgres() {
  const startScript = path.join(backendDir, 'scripts', 'start-local-pg.mjs');
  const pg = spawn('node', [startScript], {
    cwd: backendDir,
    shell: true,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  pg.stdout?.on('data', (chunk) => process.stdout.write(chunk));
  return pg;
}

function startDevServers(extraChildren = []) {
  const children = [...extraChildren];
  const backend = spawn('npm', ['run', 'start:dev'], {
    cwd: backendDir,
    shell: true,
    stdio: 'inherit',
  });
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: frontendDir,
    shell: true,
    stdio: 'inherit',
  });
  children.push(backend, frontend);

  const shutdown = () => {
    for (const child of children) {
      try {
        if (process.platform === 'win32') {
          spawnSync('taskkill', ['/F', '/T', '/PID', String(child.pid)], {
            stdio: 'ignore',
            shell: true,
          });
        } else {
          child.kill('SIGTERM');
        }
      } catch {
        // ignore
      }
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  backend.on('exit', (code) => {
    if (code && code !== 0) shutdown();
  });
  frontend.on('exit', (code) => {
    if (code && code !== 0) shutdown();
  });
}

async function main() {
  const useDocker = hasDockerCli();
  let embeddedPg = null;

  console.log('Stopping previous dev servers (ports 3000, 5173)...');
  for (const port of DEV_PORTS) killPort(port);

  if (useDocker) {
    console.log('Stopping Docker Postgres (if running)...');
    dockerCompose(['down'], { allowFail: true, silent: false });
  }

  console.log('Stopping embedded Postgres (if any)...');
  stopEmbeddedPostgres();
  killPort(PG_PORT);

  if (useDocker) {
    console.log('Starting Docker Postgres (docker compose up -d)...');
    const up = dockerCompose(['up', '-d']);
    if (up.status !== 0) {
      console.error('docker compose up -d failed.');
      process.exit(1);
    }
  } else {
    console.warn(
      'Docker CLI not found — using embedded Postgres (npm run db:local) instead.',
    );
    console.warn(
      'To use Docker: install Docker Desktop, reopen the terminal, then run npm run dev again.\n',
    );
    embeddedPg = startEmbeddedPostgres();
  }

  console.log('Waiting for PostgreSQL...');
  await waitForPostgres();

  console.log('Applying migrations...');
  run('npx', ['prisma', 'migrate', 'deploy'], { cwd: backendDir });

  console.log('Starting backend (3000) and frontend (5173)...');
  console.log(
    useDocker
      ? 'Press Ctrl+C to stop API and UI (Postgres container keeps running).\n'
      : 'Press Ctrl+C to stop API, UI, and embedded Postgres.\n',
  );
  startDevServers(embeddedPg ? [embeddedPg] : []);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
